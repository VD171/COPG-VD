#!/bin/sh
# ======================================================================
#  VD-ModuleKit  ::  gen-sha256.sh
#  Write a <file>.sha256 companion next to every file in a flashable payload
#  (STANDARDS 8).
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
