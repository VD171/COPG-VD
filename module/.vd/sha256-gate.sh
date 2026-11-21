#!/system/bin/sh
# ======================================================================
#  VD-ModuleKit  ::  flash-time .sha256 integrity gate  (STANDARDS 8)
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
#
#  Source this from customize.sh AFTER the payload is unpacked at $MODPATH:
#      . "$MODPATH/.vd/sha256-gate.sh"
#  Owner decision (19/11): ABORT the flash if any shipped file does not match
#  its <file>.sha256 companion (a corrupted or truncated zip). If the flash
#  environment has no `sha256sum -c`, the gate SKIPS (a missing tool is not a
#  mismatch) so a legitimate install is never blocked. Companions are produced
#  at build by tooling/gen-sha256.sh. Vendored byte-identical into each module;
#  see tooling/vendor-parity.sh.
# ======================================================================
command -v ui_print >/dev/null 2>&1 || ui_print() { echo "$1"; }
command -v abort    >/dev/null 2>&1 || abort()    { echo "$1" >&2; exit 1; }

vd_sha256_gate() {
	_d="${1:-$MODPATH}"
	[ -n "$_d" ] && [ -d "$_d" ] || { ui_print "  ! sha256 gate: no payload dir, skipping"; return 0; }
	# capability probe: does this environment's sha256sum support -c ?
	_p="$_d/.vdprobe"; rm -rf "$_p"; mkdir -p "$_p" 2>/dev/null; echo vd >"$_p/f" 2>/dev/null
	if ! ( cd "$_p" && sha256sum f >f.sha256 2>/dev/null && sha256sum -c f.sha256 >/dev/null 2>&1 ); then
		rm -rf "$_p"; ui_print "  ! sha256sum -c unavailable; skipping .sha256 integrity gate"; return 0
	fi
	rm -rf "$_p"
	# verify every companion; a flag file lets the pipe-subshell signal the parent
	_bad="$_d/.vdbad"; rm -f "$_bad"
	find "$_d" -type f -name '*.sha256' | while IFS= read -r _s; do
		( cd "${_s%/*}" && sha256sum -c "${_s##*/}" >/dev/null 2>&1 ) || { ui_print "  ! sha256 mismatch: ${_s#$_d/}"; : >"$_bad"; }
	done
	if [ -f "$_bad" ]; then rm -f "$_bad"; abort "! Integrity check failed (.sha256 mismatch). Flash aborted - re-download the zip."; fi
	rm -f "$_bad"
	ui_print "  - integrity verified (.sha256)"
}

vd_sha256_gate "$MODPATH"
