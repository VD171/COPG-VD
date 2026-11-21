#!/bin/sh
# gen-sha256.sh - write a <file>.sha256 companion next to every file in a flashable payload (STANDARDS 8).
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2026  VD171
# Run at build, after assembling the module payload and BEFORE zipping.
# Run it on the FINAL per-variant tree (after any ABI pruning) so each companion matches the files
# that variant actually ships.
# The .sha256 companions are ALWAYS gitignored, zip-only, and NEVER committed to the source: they are
# regenerated fresh at build/CI and ride only inside the flashable zip. The old "committed companions"
# variant was RETIRED. vdlu-pack skips *.sha256, so companions never enter the VDLU feed or baseline.json
# (and this tool skips *.sha256, so no recursion).
# Each companion holds `sha256sum <basename>` output, so `sha256sum -c <basename>.sha256` verifies it.
# Redundant with the VDLU baseline.json by design (owner's call): an extra, human-checkable fail-safe.
# The flash gate is MANDATORY and ABORTS: customize.sh sources tooling/sha256-gate.sh, which runs this
# tool's --check on-device and aborts the flash on any mismatch (a corrupted or truncated zip). Note:
# in-zip hashes catch accidental corruption, not tampering (an attacker edits the file AND its .sha256)
# - signed integrity stays the VDLU manifest's job.
# Usage: gen-sha256.sh [--check] <payload-dir> [...]
#   (no flag) generate/refresh companions ; --check verify them. Idempotent.
set -eu

mode=gen
[ "${1:-}" = "--check" ] && { mode=check; shift; }
[ "$#" -ge 1 ] || { echo "usage: gen-sha256.sh [--check] <payload-dir> [...]" >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo "gen-sha256: sha256sum required" >&2; exit 2; }

rc=0
for dir; do
	[ -d "$dir" ] || { echo "gen-sha256: not a directory: $dir" >&2; rc=2; continue; }
	if [ "$mode" = gen ]; then
		find "$dir" -type f ! -name '*.sha256' -exec sh -c '
			for f; do ( cd "$(dirname "$f")" && sha256sum "$(basename "$f")" >"$(basename "$f").sha256" ); done
		' _ {} +
		echo "gen-sha256: $dir -> $(find "$dir" -type f -name '*.sha256' | wc -l | tr -d ' ') companions"
	else
		find "$dir" -type f -name '*.sha256' -exec sh -c '
			for s; do ( cd "$(dirname "$s")" && sha256sum -c "$(basename "$s")" >/dev/null ) || { echo "MISMATCH: $s" >&2; exit 1; }; done
		' _ {} + || rc=1
		[ "$rc" = 0 ] && echo "gen-sha256: $dir -> all companions verified"
	fi
done
exit "$rc"
