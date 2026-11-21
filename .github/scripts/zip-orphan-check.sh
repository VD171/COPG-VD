#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2026  VD171
# zip-orphan-check - build-time guardian: a flashable zip must never ship an ORPHAN .sha256 companion
# (a `<file>.sha256` entry whose target `<file>` is NOT in the zip). (STANDARDS.md §8.)
#
# WHY: tooling/gen-sha256.sh writes a `<file>.sha256` for EVERY file in a payload. If a release
# workflow runs gen-sha256 on the tree and THEN the `zip -x` excludes some files (placeholders like
# bin/*/.gitkeep, dev docs like vdlu/RELEASE.md) but NOT their `.sha256` companions, the zip ships an
# orphan companion. On-device the MANDATORY sha256-gate (customize.sh sources tooling/sha256-gate.sh)
# runs `sha256sum -c` on it, the target is missing, and it ABORTS THE ENTIRE FLASH - the module is
# unflashable. The CORRECT pattern is prune-before-hash: remove everything the zip would -x BEFORE
# gen-sha256, so no orphan companion is ever created. This guardian checks the FINAL artifact, so it
# catches the bug regardless of how the workflow prunes/excludes - a release that would ship an orphan
# fails here, in CI, instead of on-device. The on-device gate stays strict: an orphan is a genuine
# corruption signal and must never be weakened to "tolerate" it.
#
# Usage: zip-orphan-check.sh <zip> [<zip>...]
# Exit: 0 all zips clean (or no lister available - skip-safe) · 1 an orphan .sha256 was found · 2 bad usage.
set -eu

[ "$#" -ge 1 ] || { echo "usage: zip-orphan-check.sh <zip> [<zip>...]" >&2; exit 2; }

# Pick a zip entry lister. Prefer zipinfo/unzip; if neither exists, SKIP cleanly (rc 0) so a CI runner
# without unzip does not hard-break (prefer vendoring unzip; this is only a graceful fallback).
LISTER=""
if command -v zipinfo >/dev/null 2>&1; then LISTER=zipinfo
elif command -v unzip >/dev/null 2>&1; then LISTER=unzip
fi
if [ -z "$LISTER" ]; then
	echo "zip-orphan-check: neither zipinfo nor unzip available; skipping orphan check" >&2
	exit 0
fi

# list_entries <zip> -> one entry path per line
list_entries() {
	case "$LISTER" in
		zipinfo) zipinfo -1 -- "$1" ;;
		unzip)   unzip -Z1 -- "$1" ;;
	esac
}

rc=0
for zip; do
	if [ ! -f "$zip" ]; then
		echo "zip-orphan-check: not a file: $zip" >&2
		rc=2
		continue
	fi

	entries=$(list_entries "$zip") || { echo "zip-orphan-check: cannot read zip: $zip" >&2; rc=2; continue; }

	# For every `<path>.sha256` entry, the companion `<path>` must ALSO be an entry in the same zip.
	orphans=0
	for comp in $(printf '%s\n' "$entries" | grep '\.sha256$' || true); do
		target=${comp%.sha256}
		if ! printf '%s\n' "$entries" | grep -qxF "$target"; then
			echo "zip-orphan-check: ORPHAN .sha256 in $zip: $comp (target $target absent)" >&2
			orphans=$((orphans + 1))
		fi
	done

	if [ "$orphans" -gt 0 ]; then
		echo "zip-orphan-check: $zip -> $orphans orphan .sha256 companion(s) - would abort the flash" >&2
		rc=1
	else
		echo "zip-orphan-check: $zip -> OK (no orphan .sha256)"
	fi
done

exit "$rc"
