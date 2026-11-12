#!/system/bin/sh
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
# Independent keybox adapter. Validation is structural, not a revocation verdict.
set -eu
umask 077
D=/data/adb/COPG-VD/tee
P=/data/adb/COPG-VD
M=${0%/*}
fail() { echo "status: $*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || fail 'Root required'
[ -f "$D/.initialized" ] || fail 'Reboot to initialize TEE first'
mode() {
 v=$(tr -d '\r\n' < "$D/keybox.mode") || fail 'Keybox settings unavailable'
 case "$v" in auto|personal) printf '%s\n' "$v";; *) fail 'Invalid saved keybox mode';; esac
}
endpoint() { v=$(cat "$D/keybox.endpoint" 2>/dev/null || true); printf '%s\n' "${v:-http://evoker.qzz.io}"; }
operation=${1:-config}; shift || true
if [ "$operation" = config ]; then current=$(mode) || exit 1; address=$(endpoint); printf 'mode=%s\nendpoint=%s\n' "$current" "$address"; exit 0; fi
BB=''
for b in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /data/adb/modules/busybox-ndk/system/*/busybox "$(command -v busybox 2>/dev/null || true)"; do
 [ -n "$b" ] && [ -x "$b" ] && BB=$b && break
done
exec 9>"$P/.tee.lock"
lock_try() { if command -v flock >/dev/null 2>&1; then flock -n 9; elif [ -n "$BB" ]; then "$BB" flock -n 9; else fail 'flock unavailable'; fi; }
i=0
until lock_try; do i=$((i+1)); [ "$i" -lt 10 ] || fail 'Another TEE operation is running'; sleep 1; done
T=$(mktemp -d "$D/.keybox.XXXXXX")
trap 'rm -rf "$T"' EXIT HUP INT TERM
url_valid() {
 clean=$(printf '%s' "$1" | tr -d '\r\n')
 [ "$clean" = "$1" ] && [ "${#1}" -le 2048 ] && printf '%s' "$1" | grep -qE '^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/%?&=+#-]*)?$'
}
normalize_url() {
 u=${1%%#*}; u=${u%/}
 case "$u" in
 http://evoker.qzz.io|https://evoker.qzz.io) u=$u/key ;;
 http://evoker.qzz.io/keys|https://evoker.qzz.io/keys) u=${u%/keys}/key ;;
 esac
 printf '%s\n' "$u"
}
b64decode() { if command -v base64 >/dev/null 2>&1; then base64 -d; elif [ -n "$BB" ]; then "$BB" base64 -d; else return 127; fi; }
validate() {
 [ -s "$1" ] && [ "$(wc -c < "$1")" -le 2097152 ] || fail 'Empty or oversized keybox'
 ! grep -qiE '<!DOCTYPE|<!ENTITY|<html' "$1" || fail 'HTML pages and XML entities are not keyboxes; use a direct download URL'
 for tag in AndroidAttestation Keybox PrivateKey Certificate; do grep -q "<$tag" "$1" || fail 'Invalid keybox structure'; done
 grep -q '</AndroidAttestation>' "$1" || fail 'Incomplete keybox XML'
}
write_mode() { printf '%s\n' "$1" > "$T/mode"; chmod 600 "$T/mode"; mv -f "$T/mode" "$D/keybox.mode"; }
install_candidate() {
 validate "$T/candidate.xml"
 if [ -f "$D/keybox.xml" ]; then cp -p "$D/keybox.xml" "$D/keybox.previous.xml"; chmod 600 "$D/keybox.previous.xml"; fi
 chmod 600 "$T/candidate.xml"; mv -f "$T/candidate.xml" "$D/keybox.xml"
}
case "$operation" in
configure)
 selected=${1:-}; case "$selected" in auto|personal) ;; *) fail 'Invalid mode';; esac
 printf '%s' "${2:-}" | b64decode > "$T/endpoint" || fail 'Invalid endpoint encoding'
 url=$(cat "$T/endpoint"); [ -n "$url" ] || url=http://evoker.qzz.io
 url_valid "$url" || fail 'Invalid endpoint URL'
 printf '%s' "$url" > "$T/endpoint"; chmod 600 "$T/endpoint"
 mv -f "$T/endpoint" "$D/keybox.endpoint"; write_mode "$selected"
 echo settings_saved; exit 0 ;;
import)
 printf '%s' "${1:-}" | b64decode > "$T/candidate.xml" || fail 'Invalid keybox encoding'
 validate "$T/candidate.xml"; write_mode personal; install_candidate
 echo imported; exit 0 ;;
update) [ "$(mode)" = auto ] || fail 'Personal keybox protected' ;;
*) fail 'Unknown keybox operation' ;;
esac
url=$(endpoint); url_valid "$url" || fail 'Invalid saved endpoint URL'
url=$(normalize_url "$url")
case "$(uname -m)" in aarch64) abi=arm64-v8a;; armv7*|armv8l) abi=armeabi-v7a;; x86_64) abi=x86_64;; *) abi=unsupported;; esac
ASFETCH="$M/bin/$abi/asfetch"
TO=''
if timeout -k 1 2 true >/dev/null 2>&1; then TO='timeout -k 3'
elif timeout 2 true >/dev/null 2>&1; then TO=timeout
elif [ -n "$BB" ] && "$BB" timeout -k 1 2 true >/dev/null 2>&1; then TO="$BB timeout -k 3"
elif [ -n "$BB" ] && "$BB" timeout 2 true >/dev/null 2>&1; then TO="$BB timeout"; fi
[ -n "$TO" ] || fail 'No bounded timeout available'
bounded() { $TO 90 "$@"; }
run_download() (
 ulimit -f 6144
 case "$1" in
 asfetch) [ -f "$ASFETCH" ] || return 127; chmod 755 "$ASFETCH"; bounded "$ASFETCH" -T 15 -o "$T/payload" "$url" ;;
 bb) [ -n "$BB" ] || return 127; bounded "$BB" wget -q -T 20 -O "$T/payload" "$url" ;;
 curl) command -v curl >/dev/null 2>&1 || return 127
  case "$url" in https://*) redirects='=https';; *) redirects='=http,https';; esac
  bounded curl -fsSL --proto '=http,https' --proto-redir "$redirects" --connect-timeout 15 --speed-limit 1 --speed-time 20 --max-time 85 --max-filesize 3145728 -o "$T/payload" "$url" ;;
 wget) command -v wget >/dev/null 2>&1 || return 127; bounded wget -q -T 20 -O "$T/payload" "$url" ;;
 *) return 127 ;;
 esac
)
preferred=$(cat "$D/keybox.fetcher" 2>/dev/null || true)
case "$preferred" in asfetch|bb|curl|wget) ;; *) preferred='';; esac
seen=''; chosen=''
for engine in "$preferred" asfetch bb curl wget; do
 [ -n "$engine" ] || continue
 case " $seen " in *" $engine "*) continue;; esac
 seen="$seen $engine"; rm -f "$T/payload"
 if run_download "$engine" > "$T/$engine.out" 2> "$T/$engine.err"; then
  if [ -s "$T/payload" ] && [ "$(wc -c < "$T/payload")" -le 3145728 ]; then chosen=$engine; break; fi
  echo "download: $engine returned an empty or oversized payload" >&2
 else
  rc=$?; echo "download: $engine failed (exit $rc)" >&2
  tail -n 1 "$T/$engine.err" >&2 || true
 fi
done
[ -n "$chosen" ] || fail 'All download methods failed; existing keybox preserved'
if head -c 1024 "$T/payload" | grep -q '<AndroidAttestation'; then cp "$T/payload" "$T/candidate.xml"
else b64decode < "$T/payload" > "$T/candidate.xml" || fail 'Expected keybox XML or base64, not a repository webpage'; fi
validate "$T/candidate.xml"
printf '%s\n' "$chosen" > "$D/keybox.fetcher"
# A byte-for-byte comparison has the same change-detection purpose as a SHA-256 comparison.
if cmp -s "$T/candidate.xml" "$D/keybox.xml"; then echo unchanged; exit 0; fi
install_candidate
echo updated
