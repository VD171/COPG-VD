#!/bin/sh
# ======================================================================
#  VD-ModuleKit  ::  provenance-check.sh
#  Build-time guardian: every bundled, pre-compiled binary must have a
#  PROVENANCE.json beside it that names it (STANDARDS 8, HARD).
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
#
#  Licensed under the Apache License, Version 2.0; you may obtain a copy at
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/COPG-VD
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
#  Vendored from VD-ModuleKit; the host module fills the contact chain and keeps
#  its own license and product banner.
# ======================================================================
#
# provenance-check - every bundled pre-compiled binary must ship a PROVENANCE.json beside it (source,
# version, build flags, how to reproduce) and be NAMED in it (STANDARDS.md §8, HARD). A binary with no
# provenance is an un-auditable blob. This guards the auditability requirement at build/CI.
#
# A "bundled binary" = a regular file under an ABI dir (bin/<abi>/ or lib/<abi>/, the 4 ABIs), excluding
# its own `.sha256` companion, `.gitkeep` placeholders and `PROVENANCE.json` itself. For each such file:
#   1) a PROVENANCE.json must exist in the SAME directory, and
#   2) the binary's basename must appear in that PROVENANCE.json (listed under binaries[].file).
# The name test uses a plain substring (no jq on-device / minimal CI), which is conservative: it never
# false-fails a correctly listed binary.
#
# A module that bundles NO binary passes cleanly (nothing to audit) - unlike abi-lint, this does not
# require binaries to exist.
#
# Usage: provenance-check.sh <module-root> [...]   (default: .)
# Exit: 0 every bundled binary has naming provenance - 1 a binary is missing it - 2 bad usage.
set -u

ABIS='armeabi-v7a arm64-v8a x86 x86_64'
[ "$#" -gt 0 ] || set -- .

rc=0
found=0
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT INT TERM

for root; do
	if [ ! -d "$root" ]; then
		echo "provenance-check: not a directory: $root" >&2
		rc=2
		continue
	fi
	# every ABI dir anywhere under root (build/vcs dirs pruned)
	: > "$tmp"
	for a in $ABIS; do
		find "$root" \( -name .git -o -name build -o -name .cxx -o -name .gradle -o -name node_modules \) -prune \
			-o -type d -name "$a" -print 2>/dev/null >> "$tmp"
	done
	while IFS= read -r d; do
		[ -n "$d" ] || continue
		prov="$d/PROVENANCE.json"
		for bin in "$d"/*; do
			[ -f "$bin" ] || continue
			case "$bin" in
			*.sha256|*/.gitkeep|*/PROVENANCE.json) continue ;;
			esac
			found=1
			base=$(basename "$bin")
			if [ ! -f "$prov" ]; then
				echo "FAIL  $bin -> no PROVENANCE.json beside it" >&2
				rc=1
			elif ! grep -qF "$base" "$prov" 2>/dev/null; then
				echo "FAIL  $bin -> PROVENANCE.json exists but does not name '$base'" >&2
				rc=1
			else
				echo "ok    $bin (provenance present and names it)"
			fi
		done
	done < "$tmp"
done

if [ "$rc" = 0 ] && [ "$found" = 0 ]; then
	echo "provenance-check: no bundled binary under: $* (nothing to audit)" >&2
elif [ "$rc" = 0 ]; then
	echo "provenance-check: every bundled binary has naming provenance" >&2
elif [ "$rc" = 1 ]; then
	echo "provenance-check: a bundled binary is missing PROVENANCE.json (add one per STANDARDS 8)" >&2
fi
exit "$rc"
