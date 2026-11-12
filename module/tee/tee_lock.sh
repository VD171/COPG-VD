#!/system/bin/sh
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
# Source this file. FD 0 is intentionally used because mksh may close private FDs on exec.
tee_lock_acquire() {
 tee_lock_path=$1
 tee_lock_wait=${2:-3}
 case "$tee_lock_wait" in ''|*[!0-9]*) echo 'status: Invalid lock timeout' >&2; return 2;; esac
 exec 0<>"$tee_lock_path"
 tee_lock_error=$(mktemp "${tee_lock_path}.error.XXXXXX") || return 2
 tee_lock_bb=''
 if ! command -v flock >/dev/null 2>&1; then
  for tee_lock_candidate in /data/adb/magisk/busybox /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox; do
   [ -x "$tee_lock_candidate" ] && tee_lock_bb=$tee_lock_candidate && break
  done
  if [ -z "$tee_lock_bb" ]; then rm -f "$tee_lock_error"; echo 'status: flock unavailable' >&2; return 2; fi
 fi
 tee_lock_elapsed=0
 while :; do
  if [ -n "$tee_lock_bb" ]; then
   if "$tee_lock_bb" flock -n 0 2>"$tee_lock_error"; then rm -f "$tee_lock_error"; return 0; else tee_lock_rc=$?; fi
  else
   if flock -n 0 2>"$tee_lock_error"; then rm -f "$tee_lock_error"; return 0; else tee_lock_rc=$?; fi
  fi
  tee_lock_message=$(cat "$tee_lock_error")
  if [ "$tee_lock_rc" -ne 1 ] || { [ -n "$tee_lock_message" ] && ! printf '%s' "$tee_lock_message" | grep -qiE 'temporarily unavailable|would block|try again'; }; then
   rm -f "$tee_lock_error"
   printf 'status: Lock error (exit %s): %s\n' "$tee_lock_rc" "$tee_lock_message" >&2
   return 2
  fi
  if [ "$tee_lock_elapsed" -ge "$tee_lock_wait" ]; then
   rm -f "$tee_lock_error"; echo 'status: Busy: another TEE operation is running' >&2; return 1
  fi
  tee_lock_elapsed=$((tee_lock_elapsed+1)); sleep 1
 done
}
