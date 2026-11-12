#!/system/bin/sh
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
set -eu
umask 077
P=/data/adb/COPG-VD
D=$P/tee
S=/data/adb/tricky_store
M=${0%/*}
fail() { echo "status: $*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || fail 'Root required'
cmd=${1:-status}; shift || true
case "$cmd" in
status)
 state=pending; pid=$(cat "$D/engine.pid" 2>/dev/null || true)
 case "$pid" in ''|*[!0-9]*) ;; *)
  if [ "$(cat "$D/boot.id" 2>/dev/null || true)" = "$(cat /proc/sys/kernel/random/boot_id)" ] && kill -0 "$pid" 2>/dev/null; then state=starting; tr '\000' ' ' < "/proc/$pid/cmdline" | grep -F -q "$M" && state=running; else state=stopped; fi ;;
 esac
 echo "engine=$state"
 echo "mode=$(cat "$D/keybox.mode" 2>/dev/null || echo personal)"
 echo "endpoint=$(cat "$D/keybox.endpoint" 2>/dev/null || true)"
 echo "migration=$(cat "$D/migration.state" 2>/dev/null || echo pending)"
 echo "keys=$(find "$D/persistent_keys" -type f 2>/dev/null | wc -l)"
 cat "$D/security_patch.txt" 2>/dev/null || true; exit 0 ;;
read-target) cat "$D/target.txt"; exit 0 ;;
logs) tail -n 100 "$D/runtime.log" 2>/dev/null || true; exit 0 ;;
esac
mkdir -p "$P"
exec 9>"$P/.tee.lock"
if command -v flock >/dev/null 2>&1; then flock -n 9 || fail Busy
else
 bb=''; for b in /data/adb/magisk/busybox /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox; do [ -x "$b" ] && bb=$b && break; done
 [ -n "$bb" ] || fail 'flock unavailable'
 "$bb" flock -n 9 || fail Busy
fi
T=$(mktemp -d "$P/.tee-tmp.XXXXXX")
trap 'rm -rf "$T"' EXIT HUP INT TERM
manifest() { (cd "$1" && find . -type f -exec sha256sum {} \; | LC_ALL=C sort); }
backup() { B=$P/tee-backups/$(date +%Y%m%d-%H%M%S)-$$; mkdir -p "$B"; chmod 700 "$P/tee-backups" "$B"; }
conflicts() {
 for dir in /data/adb/modules/* /data/adb/modules_update/*; do
  [ -f "$dir/module.prop" ] || continue
  [ "${dir##*/}" = COPG-VD ] && continue
  if grep -iE '^(id|name)=.*(tricky.?store|teesimulator|teesim|alwaysstrong|alwayswrong)' "$dir/module.prop" >/dev/null; then
   if [ "$1" = disable ]; then touch "$dir/disable"; echo "Disabled TEE conflict: ${dir##*/}"
   elif [ ! -e "$dir/disable" ] && [ ! -e "$dir/remove" ]; then fail "Enabled TEE conflict: ${dir##*/}"; fi
  fi
 done
}
init_data() {
 [ ! -e "$D/.initialized" ] || return 0
 [ ! -e "$D" ] || fail 'Unknown existing TOPG data; refusing overwrite'
 mkdir "$T/data"
 case "$(cat "$M/install.mode" 2>/dev/null || echo missing)" in
 migrate)
  [ -d "$S" ] && [ ! -L "$S" ] || fail 'Migration source missing or linked'
  [ -z "$(find "$S" ! -type f ! -type d -print)" ] || fail 'Links or special files require manual review'
  manifest "$S" > "$T/before"; backup; cp -a "$S" "$B/legacy"
  manifest "$S" > "$T/after"; manifest "$B/legacy" > "$T/copied"
  cmp -s "$T/before" "$T/after" && cmp -s "$T/before" "$T/copied" || fail 'Snapshot verification failed'
  cp -a "$B/legacy/." "$T/data/"; manifest "$T/data" > "$T/staged"
  cmp -s "$T/copied" "$T/staged" || fail 'Staging verification failed'
  echo migrated > "$T/data/migration.state" ;;
 clean) echo clean > "$T/data/migration.state" ;;
 *) fail 'Installation choice missing' ;;
 esac
 [ -f "$T/data/hbk" ] || head -c 32 /dev/urandom > "$T/data/hbk"
 for name in hbk boot_key.bin boot_hash.bin; do
  if [ -e "$T/data/$name" ]; then [ -f "$T/data/$name" ] && [ "$(wc -c < "$T/data/$name")" -eq 32 ] || fail "Invalid $name"; fi
 done
 [ -f "$T/data/keybox.xml" ] || cp "$M/default-keybox.xml" "$T/data/keybox.xml"
 [ -f "$T/data/target.txt" ] || cp "$M/default-target.txt" "$T/data/target.txt"
 rm -f "$T/data/reset.pending" "$T/data/boot.id" "$T/data/engine.pid"
 echo personal > "$T/data/keybox.mode"; touch "$T/data/.initialized"
 mv "$T/data" "$D"
}
sync_patch() {
 sp=$(grep -o '"SECURITY_PATCH"[[:space:]]*:[[:space:]]*"[^"]*"' "$P/COPG-VD.json" | head -n 1 | sed 's/.*:[[:space:]]*"\([^"]*\)"/\1/' || true)
 case "$sp" in
 ????-??-??) printf 'system=%s\nboot=%s\nvendor=%s\n' "$(echo "$sp" | tr -d '-' | cut -c1-6)" "$sp" "$sp" > "$T/patch" ;;
 *) printf 'system=prop\n' > "$T/patch" ;;
 esac
 chmod 600 "$T/patch"; mv "$T/patch" "$D/security_patch.txt"
}
valid_url() { printf '%s' "$1" | grep -qE '^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/%?&=+-]*)?$'; }
validate_keybox() {
 [ -s "$1" ] && [ "$(wc -c < "$1")" -le 49152 ] || fail 'Invalid keybox size'
 ! grep -qiE '<!DOCTYPE|<!ENTITY' "$1" || fail 'XML entities forbidden'
 for tag in AndroidAttestation Keybox PrivateKey Certificate; do grep -q "<$tag" "$1" || fail 'Invalid keybox structure'; done
 grep -q '</AndroidAttestation>' "$1" || fail 'Incomplete keybox'
}
fetch_keybox() {
 [ "$(cat "$D/keybox.mode")" = auto ] || fail 'Personal keybox protected'
 url=$(cat "$D/keybox.endpoint" 2>/dev/null || true); valid_url "$url" || fail 'Invalid mirror URL'
 if command -v curl >/dev/null 2>&1; then
  curl -fsSL --proto '=http,https' --proto-redir '=https' --connect-timeout 15 --max-time 60 --max-filesize 131072 "$url/key" -o "$T/download" || fail 'Download failed'
 elif command -v wget >/dev/null 2>&1; then timeout 60 wget -q -T 20 -O "$T/download" "$url/key" || fail 'Download failed'
 else fail 'curl or wget required'; fi
 [ "$(wc -c < "$T/download")" -le 131072 ] || fail 'Download too large'
 base64 -d < "$T/download" > "$T/keybox" || fail 'Invalid base64 payload'
 validate_keybox "$T/keybox"
 if cmp -s "$T/keybox" "$D/keybox.xml"; then echo unchanged; return; fi
 cp -p "$D/keybox.xml" "$D/keybox.previous.xml"; chmod 600 "$T/keybox"; mv "$T/keybox" "$D/keybox.xml"; echo updated
}
case "$cmd" in
install)
 [ "${MODPATH:-}" = "${M%/tee}" ] || fail 'Invalid installation context'
 [ "${API:-0}" -ge 29 ] || fail 'Android 10 or newer required'
 case "${ARCH:-}" in arm64) abi=arm64-v8a;; arm) abi=armeabi-v7a;; x64) abi=x86_64;; *) fail 'Unsupported architecture';; esac
 for pair in 'classes.dex:classes.dex' 'daemon:daemon' "lib/$abi/libTEESimulator.so:libTEESimulator.so" "lib/$abi/libcertgen.so:libcertgen.so" "lib/$abi/libinject.so:inject" "lib/$abi/libsupervisor.so:supervisor" "bin/resetprop-$abi:resetprop-rs"; do
  unzip -p "$M/engine.zip" "${pair%:*}" > "$M/${pair##*:}" || fail 'Engine extraction failed'
  [ -s "$M/${pair##*:}" ] || fail 'Missing engine component'
 done
 chmod 755 "$M/daemon" "$M/inject" "$M/supervisor" "$M/resetprop-rs"
 if [ -f "$D/.initialized" ]; then mode=keep
 elif [ -e "$D" ]; then fail 'Unknown existing TOPG TEE directory'
 elif [ -d "$S" ] && [ -n "$(ls -A "$S")" ]; then
  echo 'Volume Up: Migrate existing data. Volume Down: Clean installation.'
  mode=''; deadline=$(( $(date +%s) + 30 ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
   event=$(timeout 1 getevent -lc 1 2>/dev/null || true)
   case "$event" in *KEY_VOLUMEUP*DOWN*) mode=migrate; break;; *KEY_VOLUMEDOWN*DOWN*) mode=clean; break;; esac
  done
  [ -n "$mode" ] || fail 'No choice received; installation cancelled'
 else mode=clean; fi
 echo "$mode" > "$M/install.mode"; conflicts disable
 for dir in /data/adb/modules/*; do
  [ -f "$dir/module.prop" ] || continue
  if grep -iE '^(id|name)=.*(play.?integrity|integrity.?fix|pif)' "$dir/module.prop" >/dev/null; then echo "Review and uninstall PIF conflict: ${dir##*/}"; fi
 done
 echo 'Uninstall all PIF / Play Integrity Fix modules and other conflicting TEE managers after verifying migration. Do not delete their data first. Reboot required.'
 echo 'Migration and startup occur after reboot.' ;;
boot)
 conflicts check; init_data
 bootid=$(cat /proc/sys/kernel/random/boot_id)
 [ "$(cat "$D/boot.id" 2>/dev/null || true)" != "$bootid" ] || exit 0
 if [ -f "$D/reset.pending" ]; then backup; cp -a "$D" "$B/before-reset"; rm -rf "$D/persistent_keys"; rm -f "$D/reset.pending"; fi
 echo disable > "$D/boot_props_mode"; sync_patch
 chown -R 0:0 "$D"; find "$D" -type d -exec chmod 700 {} \;; find "$D" -type f -exec chmod 600 {} \;
 chcon -R u:object_r:adb_data_file:s0 "$D" || fail 'Cannot label TEE data'
 echo "$bootid" > "$D/boot.id"
 (exec 9>&-; cd "$M"; sleep 30; exec ./supervisor ./daemon "$M") >> "$D/runtime.log" 2>&1 &
 echo "$!" > "$D/engine.pid"
 (exec 9>&-; sleep 90; while true; do
  if [ "$(cat "$D/keybox.mode")" = auto ]; then sh "$M/tee_manager.sh" update >> "$D/update.log" 2>&1 || true; fi
  sleep 21600
 done) >/dev/null 2>&1 & ;;
*)
 [ -f "$D/.initialized" ] || fail 'Reboot to initialize TEE first'
 case "$cmd" in
 save-target)
  printf '%s' "${1:-}" | base64 -d > "$T/target" || fail 'Invalid encoding'
  [ "$(wc -c < "$T/target")" -le 49152 ] || fail 'Target too large'
  awk 'BEGIN {ok=1} /^[[:space:]]*($|#)/ {next} /^\[[A-Za-z0-9_.-]+\.xml\]$/ {next} /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+[!?]?$/ {next} {ok=0} END {exit !ok}' "$T/target" || fail 'Invalid target entry'
  cp -p "$D/target.txt" "$D/target.bak"; chmod 600 "$T/target"; mv "$T/target" "$D/target.txt" ;;
 import)
  printf '%s' "${1:-}" | base64 -d > "$T/keybox" || fail 'Invalid encoding'; validate_keybox "$T/keybox"
  cp -p "$D/keybox.xml" "$D/keybox.previous.xml"; echo personal > "$D/keybox.mode"
  chmod 600 "$T/keybox"; mv "$T/keybox" "$D/keybox.xml" ;;
 configure)
  case "${1:-}" in personal|auto) ;; *) fail 'Invalid mode';; esac
  printf '%s' "${2:-}" | base64 -d > "$T/endpoint" || fail 'Invalid encoding'
  [ "$(wc -c < "$T/endpoint")" -le 2048 ] || fail 'URL too long'
  if [ "$1" = auto ]; then valid_url "$(cat "$T/endpoint")" || fail 'Invalid mirror URL'; fi
  mv "$T/endpoint" "$D/keybox.endpoint"; echo "$1" > "$D/keybox.mode" ;;
 update) fetch_keybox ;;
 reset) [ "${1:-}" = CONFIRM ] || fail 'Confirmation required'; touch "$D/reset.pending"; echo 'Reset scheduled for next reboot with backup.' ;;
 *) fail 'Unknown operation' ;;
 esac ;;
esac
