#!/system/bin/sh
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build: Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
#  Fork by VD171.
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
# ======================================================================

MODDIR=${0%/*}
MODULE_ID="COPG-VD"
BRANCH="main"
REMOTE_URL="https://raw.githubusercontent.com/VD171/COPG-VD/$BRANCH/module/COPG-VD.json.example"

MODULE_DIR="/data/adb/modules/$MODULE_ID"
DATA_DIR="/data/adb/COPG-VD"
LEGACY_JSON="/data/adb/COPG-VD.json"
CONFIG_PATHS="$DATA_DIR/COPG-VD.json $LEGACY_JSON $MODULE_DIR/COPG-VD.json"
FORCE_MARKER="$DATA_DIR/.force"

ROM_PROP="/system/build.prop"
VERSION_FIELDS="ANDROID_VERSION SDK_INT SDK_FULL CODENAME"
SETTINGS_OBJECT="COPG-VD-Settings"
KNOWN_KEYS="BRAND DEVICE MANUFACTURER MODEL FINGERPRINT PRODUCT BOOTLOADER BOARD HARDWARE DISPLAY ID HOST INCREMENTAL TIMESTAMP PREVIEW_SDK USER SDK_FINGERPRINT UUID SECURITY_PATCH ANDROID_VERSION SDK_INT SDK_FULL CODENAME TAGS TYPE ODM_SKU SKU FIRST_API_LEVEL DRM_SECURITY_LEVEL"
STATE_FILE="$DATA_DIR/update.state"
LOG_FILE="$DATA_DIR/update.log"
STATUS_FILE="$DATA_DIR/update.status"
LOG_MAX=32768
TMP_FILE="$DATA_DIR/.update.$$"

migrate_data_dir() {
    mkdir -p "$DATA_DIR" 2>/dev/null
    chmod 0700 "$DATA_DIR" 2>/dev/null
    chcon u:object_r:system_file:s0 "$DATA_DIR" 2>/dev/null
    for pair in "$LEGACY_JSON|$DATA_DIR/COPG-VD.json" \
                "/data/adb/COPG-VD.json.bak|$DATA_DIR/COPG-VD.json.bak" \
                "/data/adb/COPG-VD.update.state|$STATE_FILE" \
                "/data/adb/COPG-VD.update.log|$LOG_FILE"; do
        old=${pair%%|*}; new=${pair##*|}
        [ -f "$old" ] && { [ -e "$new" ] || mv -f "$old" "$new" 2>/dev/null; [ -e "$new" ] && rm -f "$old" 2>/dev/null; }
    done
    rm -f /data/adb/.COPG-VD.update.* 2>/dev/null
    [ -f "$LOG_FILE" ] || : > "$LOG_FILE" 2>/dev/null
    chmod 0600 "$LOG_FILE" 2>/dev/null
}
migrate_data_dir

cfg_setting() {
    conf=""
    for p in $CONFIG_PATHS; do [ -f "$p" ] && conf="$p" && break; done
    [ -f "$conf" ] || return 0
    tr -d '\n' < "$conf" 2>/dev/null \
      | grep -o '"COPG-VD-Settings"[[:space:]]*:[[:space:]]*{[^}]*}' \
      | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*(\"[^\"]*\"|true|false)" | head -n 1 \
      | sed 's/.*:[[:space:]]*//; s/"//g'
}

AWK=$(command -v awk 2>/dev/null)
if [ -z "$AWK" ]; then
    for bb in /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox /data/adb/magisk/busybox; do
        [ -x "$bb" ] && AWK="$bb awk" && break
    done
fi

FIELDS="FINGERPRINT ID DISPLAY INCREMENTAL TIMESTAMP SECURITY_PATCH PREVIEW_SDK SDK_FINGERPRINT UUID HOST USER"
IDENTITY="BRAND DEVICE MANUFACTURER MODEL PRODUCT"
KILL_PACKAGES="com.google.android.gms com.google.android.gsf com.google.android.gms.unstable"

BOOT_RETRY_MAX=40
BOOT_RETRY_SLEEP=15

log() {
    echo "[$MODULE_ID] $*"
    [ -f "$LOG_FILE" ] && [ "$(stat -c %s "$LOG_FILE" 2>/dev/null || echo 0)" -gt "$LOG_MAX" ] &&
        tail -c 8192 "$LOG_FILE" > "$LOG_FILE.trim" 2>/dev/null && mv "$LOG_FILE.trim" "$LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG_FILE" 2>/dev/null
}

cleanup() {
    rm -f "$TMP_FILE" "$TMP_FILE.new" "$TMP_FILE.norm" 2>/dev/null
}
trap cleanup EXIT

# Android's CA store, for curl to validate the server certificate.
ca_path() {
    for _d in /system/etc/security/cacerts /apex/com.android.conscrypt/cacerts; do
        [ -d "$_d" ] && { echo "$_d"; return 0; }
    done
}
# curl validates TLS (with --capath); busybox wget does NOT, so it is a last resort
# (the feed is unauthenticated there until the dataset itself is signed). Prefer curl.
find_downloader() {
    command -v curl >/dev/null 2>&1 && echo curl && return 0
    for bb in /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox /data/adb/magisk/busybox \
              /data/adb/modules/busybox-ndk/system/bin/busybox; do
        [ -x "$bb" ] && echo "$bb wget" && return 0
    done
    command -v busybox >/dev/null 2>&1 && echo "busybox wget" && return 0
    command -v wget >/dev/null 2>&1 && echo wget && return 0
    return 1
}

download() {
    _ca=$(ca_path)
    case "$DOWNLOADER" in
        curl) curl -fsSL --max-time 60 ${_ca:+--capath "$_ca"} -o "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
        wget) wget -q -T 60 -O "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
        *)    $DOWNLOADER -q -T 60 -O "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
    esac
}

download_to() {
    _u="$1"; _o="$2"; DL_INFO=""; _ca=$(ca_path)
    case "$DOWNLOADER" in
        curl) DL_INFO=$(curl -fsSL --max-time 60 ${_ca:+--capath "$_ca"} -w 'http=%{http_code}' -o "$_o" "$_u" 2>/dev/null); _rc=$?
              [ "$_rc" -ne 0 ] && DL_INFO="${DL_INFO} curl=$_rc" ;;
        wget) wget -q -T 60 -O "$_o" "$_u" 2>/dev/null; _rc=$?
              [ "$_rc" -ne 0 ] && DL_INFO="wget=$_rc" ;;
        *)    $DOWNLOADER -q -T 60 -O "$_o" "$_u" 2>/dev/null; _rc=$?
              [ "$_rc" -ne 0 ] && DL_INFO="dl=$_rc" ;;
    esac
    [ -s "$_o" ]
}

# --- feed signature (detached ed25519, same chain as the VDLU module feed) ---------------------------
# A fetched profile is applied only if it carries a valid signature from the release key. The signature
# is base64(ed25519_sign(sha256_hex(content))) in "<key_id>:<sig>" form, verified with the embedded
# ed25519-mini + keyring/<key_id>.pub (raw 32 bytes) - no openssl on-device. See the design doc.
# REQUIRE_FEED_SIG is 0 until the feeds publish their .sig; the cutover flips it to 1 (fail-closed).
# FEED_KEY_ID pins the feed to its OWN dedicated key - not the module-release key vd-2026, so a
# compromise of one key never forges the other (separation of concerns).
REQUIRE_FEED_SIG="${REQUIRE_FEED_SIG:-0}"
FEED_KEY_ID="vd-fp-2026"

find_mini() {
    _h="$MODDIR/vdlu"
    [ -x "$_h/ed25519-mini" ] && { echo "$_h/ed25519-mini"; return 0; }
    _a=$(getprop ro.product.cpu.abi 2>/dev/null)
    [ -n "$_a" ] && [ -x "$_h/verify/$_a/ed25519-mini" ] && { echo "$_h/verify/$_a/ed25519-mini"; return 0; }
    for _d in "$_h"/verify/*/ed25519-mini; do [ -x "$_d" ] && { echo "$_d"; return 0; }; done
    return 1
}

verify_feed_sig() {   # <content_file> <sig_file> -> rc 0 if the detached signature is valid
    _f="$1"; _s="$2"
    [ -s "$_s" ] || { log "feed signature missing"; return 1; }
    _line=$(cat "$_s"); _kid=${_line%%:*}; _sb64=${_line#*:}
    [ "$_kid" = "$FEED_KEY_ID" ] || { log "feed sig: key_id '$_kid' is not the feed key ($FEED_KEY_ID)"; return 1; }
    [ -n "$_sb64" ] && [ "$_sb64" != "$_line" ] || { log "feed sig: malformed"; return 1; }
    _pub="$MODDIR/vdlu/keyring/$_kid.pub"
    [ -f "$_pub" ] && [ "$(wc -c <"$_pub" 2>/dev/null || echo 0)" -eq 32 ] || { log "feed sig: no 32B keyring for $_kid"; return 1; }
    _mini=$(find_mini) || { log "feed sig: ed25519-mini not found"; return 1; }
    _hex=$(sha256sum "$_f" | cut -d' ' -f1)
    _td=$(mktemp -d "${TMPDIR:-/data/local/tmp}/fpsig.XXXXXX" 2>/dev/null || mktemp -d)
    printf '%s' "$_hex" > "$_td/msg"
    printf '%s' "$_sb64" | base64 -d > "$_td/sig" 2>/dev/null
    if [ "$(wc -c <"$_td/sig" 2>/dev/null || echo 0)" -eq 64 ] && "$_mini" "$_pub" "$_td/msg" "$_td/sig" >/dev/null 2>&1; then
        rm -rf "$_td"; return 0
    fi
    rm -rf "$_td"; log "feed signature REJECTED"; return 1
}

require_sig() {   # <content_file> <content_url> -> rc 0 if ok or not required; rc 1 if required and bad
    [ "$REQUIRE_FEED_SIG" = 1 ] || return 0
    _st="$1.sig.tmp"
    download_to "$2.sig" "$_st" || { log "feed: signature unavailable for $(basename "$2")"; rm -f "$_st"; return 1; }
    verify_feed_sig "$1" "$_st"; _vr=$?; rm -f "$_st"; return $_vr
}

FETCH_BASE_URL="https://raw.githubusercontent.com/VictorGabriel7Dev/build.prop/main"
FETCH_FIELDS="BRAND DEVICE MANUFACTURER MODEL FINGERPRINT PRODUCT DISPLAY ID HOST INCREMENTAL TIMESTAMP PREVIEW_SDK USER SDK_FINGERPRINT UUID SECURITY_PATCH FIRST_API_LEVEL BOARD HARDWARE"
FETCH_MAP="BRAND:ro.product.system_dlkm.brand,ro.product.brand_for_attestation,ro.product.brand
DEVICE:ro.product.system_dlkm.device,ro.product.device_for_attestation,ro.product.device
MANUFACTURER:ro.product.system_dlkm.manufacturer,ro.product.manufacturer_for_attestation,ro.product.manufacturer
MODEL:ro.product.system_dlkm.model,ro.product.model_for_attestation,ro.product.model
FINGERPRINT:ro.system_dlkm.build.fingerprint,ro.product.build.fingerprint,ro.build.fingerprint
PRODUCT:ro.product.system_dlkm.name,ro.product.name_for_attestation,ro.product.name
DISPLAY:ro.build.display.id,ro.system_dlkm.build.id
ID:ro.system_dlkm.build.id,ro.build.id
HOST:ro.build.host
INCREMENTAL:ro.system_dlkm.build.version.incremental,ro.build.version.incremental
TIMESTAMP:ro.system_dlkm.build.date.utc,ro.build.date.utc
PREVIEW_SDK:ro.build.version.preview_sdk
USER:ro.build.user
SDK_FINGERPRINT:ro.build.version.preview_sdk_fingerprint
UUID:ro.system_dlkm.build.uuid,ro.build.uuid
SECURITY_PATCH:ro.build.version.security_patch
FIRST_API_LEVEL:ro.product.first_api_level,ro.board.first_api_level
BOARD:ro.product.board,ro.board.platform
HARDWARE:ro.hardware,ro.boot.hardware"

json_get() {
    grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$1" 2>/dev/null | head -n 1 |
        sed "s/^\"[^\"]*\"[[:space:]]*:[[:space:]]*\"//; s/\"$//"
}

sane_value() {
    case "$1" in
        FINGERPRINT) printf '%s' "$2" | grep -qE '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+:[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+:[a-z]+/[a-z-]+$' ;;
        SECURITY_PATCH) printf '%s' "$2" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' ;;
        TIMESTAMP|SDK_INT|PREVIEW_SDK|INCREMENTAL) printf '%s' "$2" | grep -qE '^[0-9]+$' ;;
        SDK_FULL) printf '%s' "$2" | grep -qE '^[0-9]+(\.[0-9]+)?$' ;;
        *) printf '%s' "$2" | grep -qE '^[A-Za-z0-9 ._:/+-]+$' ;;
    esac
}

validate_remote() {
    [ -s "$TMP_FILE" ] || { log "remote file is empty"; return 1; }
    grep -q "\"$MODULE_ID\"[[:space:]]*:[[:space:]]*{" "$TMP_FILE" ||
        { log "remote file has no \"$MODULE_ID\" object"; return 1; }
    for field in $IDENTITY $FIELDS; do
        value=$(json_get "$TMP_FILE" "$field")
        [ -n "$value" ] || { log "remote file has no $field"; return 1; }
        sane_value "$field" "$value" || { log "remote $field is not sane: '$value'"; return 1; }
    done
    return 0
}

rom_prop() {
    grep -m 1 "^$1=" "$ROM_PROP" 2>/dev/null | cut -d= -f2-
}

spoof_version_policy() {
    [ -e "$FORCE_MARKER" ] && { echo force; return; }
    case "$(cfg_setting spoof_version)" in
        rom|force) echo rom ;;
        *) echo never ;;
    esac
}

release_or_codename() {
    if [ "$1" = "REL" ] || [ -z "$1" ]; then echo "$2"; else echo "$1"; fi
}

effective_version_fields() {
    conf="$1"
    policy=$(spoof_version_policy)
    [ "$policy" = "never" ] && return 0
    rom_sdk=$(rom_prop ro.build.version.sdk)
    for field in $VERSION_FIELDS; do
        value=$(json_get "$conf" "$field")
        [ -n "$value" ] || continue
        if [ "$policy" = "rom" ]; then
            case "$field" in
                SDK_INT)
                    case "$value$rom_sdk" in *[!0-9]*) continue ;; esac
                    [ "$value" -le "$rom_sdk" ] || continue ;;
                ANDROID_VERSION)
                    [ "$value" = "$(rom_prop ro.build.version.release)" ] || continue ;;
                CODENAME)
                    [ "$value" = "$(rom_prop ro.build.version.codename)" ] || continue ;;
                SDK_FULL)
                    case "$value" in "$rom_sdk"|"$rom_sdk".*) : ;; *) continue ;; esac ;;
            esac
        fi
        echo "$field $value"
    done
}

normalize_json() {
    $AWK '
    function ind(d,  r,k){ r=""; for(k=0;k<d;k++) r=r "  "; return r }
    { s = s $0 "\n" }
    END {
        instr=0; esc=0; depth=0; n=length(s)
        for(i=1;i<=n;i++){
            c=substr(s,i,1)
            if(instr){ out=out c; if(esc)esc=0; else if(c=="\\")esc=1; else if(c=="\"")instr=0; continue }
            if(c=="\""){ instr=1; out=out c; continue }
            if(c=="{"||c=="["){ depth++; out=out c "\n" ind(depth); continue }
            if(c=="}"||c=="]"){ depth--; out=out "\n" ind(depth) c; continue }
            if(c==","){ out=out c "\n" ind(depth); continue }
            if(c==":"){ out=out ": "; continue }
            if(c==" "||c=="\t"||c=="\n"||c=="\r") continue
            out=out c
        }
        print out
    }' "$1"
}

normalize_if_minified() {
    [ -f "$1" ] || return 0
    [ "$(wc -l < "$1" 2>/dev/null || echo 0)" -ge 3 ] && return 0
    [ -n "$AWK" ] || return 0
    normalize_json "$1" > "$TMP_FILE.norm" 2>/dev/null
    [ -s "$TMP_FILE.norm" ] && grep -q "\"$MODULE_ID\"" "$TMP_FILE.norm" && cp "$TMP_FILE.norm" "$1"
    rm -f "$TMP_FILE.norm"
}

# Always rewrite the config into the canonical, string-aware pretty form before a merge. This is what
# makes the line-based field merge below safe on ANY input: after this, the "<id>": { block opener is on
# one line and brace depth is balanced, with any "{"/"}" that lives inside a string value left untouched.
# It replaces the file only when the result still holds the module block; a file that normalize_json
# cannot round-trip (truly malformed JSON) is left as-is for the merge and its write-guard to reject
# rather than silently corrupting the user's config.
canonicalize_config() {
    [ -f "$1" ] && [ -n "$AWK" ] || return 0
    normalize_json "$1" > "$TMP_FILE.norm" 2>/dev/null
    [ -s "$TMP_FILE.norm" ] && grep -q "\"$MODULE_ID\"[[:space:]]*:[[:space:]]*{" "$TMP_FILE.norm" \
        && cp "$TMP_FILE.norm" "$1"
    rm -f "$TMP_FILE.norm"
}

# Robust JSON path: do the config edit with a real parser (org.json) in the bundled dex, run as root
# via app_process. This replaces the fragile awk field merge for any VALID config layout (the #20 class).
# It writes a candidate to a temp; this function validates (module block present) + backs up + commits.
# Returns non-zero if the dex is absent, app_process cannot start, the config does not parse, or the
# output is bad - the callers then fall through to the proven awk path, so this can only help.
#   _fp_dex <verb> <target> [extra args...]   (verb: merge-fp | drop-ver)
_fp_dex() {
    _verb="$1"; _tgt="$2"; shift 2
    _D=/data/adb/modules/COPG-VD/etc/copgvd_scope.dex
    [ -f "$_D" ] || return 1
    _out="$TMP_FILE.dex"
    rm -f "$_out"
    (
        if [ -z "$BOOTCLASSPATH" ]; then
            _S=$(pgrep system_server 2>/dev/null | head -1)
            export $(cat /proc/"$_S"/environ 2>/dev/null | tr '\0' '\n' | grep -E '^(BOOTCLASSPATH|DEX2OATBOOTCLASSPATH|SYSTEMSERVERCLASSPATH|ANDROID_ART_ROOT|ANDROID_I18N_ROOT|ANDROID_TZDATA_ROOT|ANDROID_DATA|ANDROID_ROOT)=')
        fi
        LD_LIBRARY_PATH= app_process -Djava.class.path="$_D" /system/bin com.vd171.copgvd.Scope "$_verb" "$_tgt" "$MODULE_ID" "$_out" "$@" >/dev/null 2>&1
    )
    [ -s "$_out" ] || return 1
    tr -d '\n' < "$_out" | grep -q "\"$MODULE_ID\"[[:space:]]*:[[:space:]]*{" || { rm -f "$_out"; return 1; }
    cp -f "$_tgt" "$_tgt.bak" 2>/dev/null
    mv -f "$_out" "$_tgt" || { rm -f "$_out"; return 1; }
    chmod 0644 "$_tgt" 2>/dev/null
    chcon u:object_r:system_file:s0 "$_tgt" 2>/dev/null
    rm -f "$_out"
    return 0
}

write_fields() {
    target="$1"
    _fp_dex merge-fp "$target" && return 0
    [ -n "$AWK" ] || { log "no awk available"; return 1; }
    canonicalize_config "$target"
    $AWK -v id="$MODULE_ID" -v keys="$FIELDS" -v src="$COPG_V_SOURCE" '
        function depth_of(s,   i, ch, d, instr, esc) {
            d = 0; instr = 0; esc = 0
            for (i = 1; i <= length(s); i++) {
                ch = substr(s, i, 1)
                if (instr) { if (esc) esc = 0; else if (ch == "\\") esc = 1; else if (ch == "\"") instr = 0; continue }
                if (ch == "\"") { instr = 1; continue }
                if (ch == "{") d++
                else if (ch == "}") d--
            }
            return d
        }
        BEGIN {
            n = split(keys, K, /[ \t\n]+/)
            for (i = 1; i <= n; i++) if (K[i] != "") want[K[i]] = 1
        }
        NR == FNR {
            if (!inblock && $0 ~ "\"" id "\"[ \t]*:[ \t]*\\{") { inblock = 1; depth = depth_of($0); next }
            if (inblock) {
                depth += depth_of($0)
                if (depth <= 0) { inblock = 0; next }
                for (k in want) if ($0 ~ "\"" k "\"[ \t]*:") seen[k] = 1
            }
            next
        }
        {
            if (!inblock2 && $0 ~ "\"" id "\"[ \t]*:[ \t]*\\{") {
                print
                inblock2 = 1
                depth2 = depth_of($0)
                for (i = 1; i <= n; i++) {
                    k = K[i]
                    if (k != "" && !seen[k] && ENVIRON["COPG_V_" k] != "")
                        print "    \"" k "\": \"" ENVIRON["COPG_V_" k] "\","
                }
                next
            }
            if (inblock2) {
                depth2 += depth_of($0)
                if (depth2 <= 0) { inblock2 = 0; print; next }
                for (i = 1; i <= n; i++) {
                    k = K[i]
                    if (k == "" || ENVIRON["COPG_V_" k] == "") continue
                    if ($0 ~ "\"" k "\"[ \t]*:[ \t]*\"") {
                        sub(/:[ \t]*"[^"]*"/, ": \"" ENVIRON["COPG_V_" k] "\"", $0)
                        break
                    }
                }
                print
                next
            }
            if (src != "" && $0 ~ /"Strings extracted from"[ \t]*:[ \t]*"/)
                sub(/:[ \t]*"[^"]*"/, ": \"" src "\"", $0)
            print
        }
    ' "$target" "$target" > "$TMP_FILE.new" || return 1

    [ -s "$TMP_FILE.new" ] || { log "refusing to write an empty file over $target"; return 1; }
    tr -d '\n' < "$TMP_FILE.new" | grep -q "\"$MODULE_ID\"[[:space:]]*:[[:space:]]*{" ||
        { log "refusing to write a broken file over $target"; return 1; }

    cp -f "$target" "$target.bak" 2>/dev/null
    mv -f "$TMP_FILE.new" "$target" || return 1
    chmod 0644 "$target" 2>/dev/null
    chcon u:object_r:system_file:s0 "$target" 2>/dev/null
    return 0
}

drop_version_fields() {
    target="$1"
    # shellcheck disable=SC2086
    _fp_dex drop-ver "$target" $VERSION_FIELDS && return 0
    [ -n "$AWK" ] || return 1
    canonicalize_config "$target"
    $AWK -v id="$MODULE_ID" -v keys="$VERSION_FIELDS" '
        function depth_of(s,   i, ch, d, instr, esc) {
            d = 0; instr = 0; esc = 0
            for (i = 1; i <= length(s); i++) {
                ch = substr(s, i, 1)
                if (instr) { if (esc) esc = 0; else if (ch == "\\") esc = 1; else if (ch == "\"") instr = 0; continue }
                if (ch == "\"") { instr = 1; continue }
                if (ch == "{") d++; else if (ch == "}") d--
            }
            return d
        }
        BEGIN { n = split(keys, K, /[ \t\n]+/); for (i = 1; i <= n; i++) if (K[i] != "") drop[K[i]] = 1 }
        !inblock && $0 ~ "\"" id "\"[ \t]*:[ \t]*\\{" { inblock = 1; depth = depth_of($0); print; next }
        inblock {
            depth += depth_of($0)
            if (depth <= 0) { inblock = 0; print; next }
            for (k in drop) if ($0 ~ "\"" k "\"[ \t]*:") next
        }
        { print }
    ' "$target" > "$TMP_FILE.new" || return 1
    [ -s "$TMP_FILE.new" ] || return 1
    grep -q "\"$MODULE_ID\"[[:space:]]*:[[:space:]]*{" "$TMP_FILE.new" || return 1
    cp -f "$target" "$target.bak" 2>/dev/null
    mv -f "$TMP_FILE.new" "$target" || return 1
    chmod 0644 "$target" 2>/dev/null
    chcon u:object_r:system_file:s0 "$target" 2>/dev/null
    return 0
}

migrate_version() {
    rom_sdk=$(rom_prop ro.build.version.sdk)
    rom_cod=$(rom_prop ro.build.version.codename)
    mexeu=1
    for target in $CONFIG_PATHS; do
        [ -f "$target" ] || continue
        achadas=""
        for field in $VERSION_FIELDS; do
            value=$(json_get "$target" "$field")
            [ -n "$value" ] && achadas="$achadas $field=$value"
        done
        [ -n "$achadas" ] || continue
        if drop_version_fields "$target"; then
            log "removed from $target:$achadas (ROM is SDK $rom_sdk, codename $rom_cod) - backup at $target.bak"
            mexeu=0
        else
            log "could not clean $target - left untouched"
        fi
    done
    return $mexeu
}

A_RED=0; A_WARN=0
say_ok()   { log "  [ok]   $*"; }
say_info() { log "  [info] $*"; }
say_warn() { log "  [warn] $*"; A_WARN=$((A_WARN + 1)); }
say_red()  { log "  [RED]  $*"; A_RED=$((A_RED + 1)); }

check_shape() {
    conf="$1"
    normalize_if_minified "$conf"
    opens=$(tr -cd '{' < "$conf" | wc -c); closes=$(tr -cd '}' < "$conf" | wc -c)
    quotes=$(tr -cd '"' < "$conf" | wc -c)
    if [ "$opens" != "$closes" ]; then
        say_red "braces do not balance ($opens '{' vs $closes '}') - the module will not spoof at all"
        return
    fi
    if [ $((quotes % 2)) -ne 0 ]; then
        say_red "odd number of quotes ($quotes) - the module will not spoof at all"
        return
    fi
    bad=$($AWK '
        { line[NR] = $0 }
        END {
            inarr = 0
            for (i = 1; i <= NR; i++) {
                l = line[i]
                if (l ~ /^[ \t]*$/) continue
                if (inarr) {
                    if (l ~ /^[ \t]*"[^"]*"[ \t]*,?[ \t]*$/) continue
                    if (l ~ /^[ \t]*][ \t]*,?[ \t]*$/) { inarr = 0; continue }
                    print i ": " l
                    continue
                }
                if (l ~ /^[ \t]*[{}][ \t]*,?[ \t]*$/) continue
                if (l ~ /^[ \t]*"[^"]*"[ \t]*:[ \t]*\{[ \t]*$/) continue
                if (l ~ /^[ \t]*"[^"]*"[ \t]*:[ \t]*\[.*][ \t]*,?[ \t]*$/) continue
                if (l ~ /^[ \t]*"[^"]*"[ \t]*:[ \t]*\[[ \t]*$/) { inarr = 1; continue }
                if (l !~ /^[ \t]*"[^"]*"[ \t]*:[ \t]*("[^"]*"|true|false|[0-9]+)[ \t]*,?[ \t]*$/) {
                    print i ": " l
                    continue
                }
                prox = ""
                for (j = i + 1; j <= NR; j++) if (line[j] !~ /^[ \t]*$/) { prox = line[j]; break }
                fecha = (prox ~ /^[ \t]*}/)
                virgula = (l ~ /,[ \t]*$/)
                if (!virgula && !fecha) print i ": missing comma -> " l
                if (virgula && fecha) print i ": comma before the closing brace -> " l
            }
        }' "$conf" | head -n 3)
    [ -n "$bad" ] && { say_red "lines the module cannot read:"; log "         $bad"; return; }
    say_ok "file shape is what the module expects"
}

check_version() {
    conf="$1"
    rom_sdk=$(rom_prop ro.build.version.sdk)
    rom_rel=$(rom_prop ro.build.version.release)
    rom_cod=$(rom_prop ro.build.version.codename)
    policy=$(spoof_version_policy)
    if [ -z "$rom_sdk" ]; then
        say_warn "could not read $ROM_PROP - cannot tell what this ROM really is"
        return
    fi
    log "  ROM (from $ROM_PROP): Android $rom_rel, SDK $rom_sdk, codename $rom_cod | semaphore: $policy"

    presentes=""
    for field in $VERSION_FIELDS; do
        value=$(json_get "$conf" "$field")
        [ -n "$value" ] && presentes="$presentes $field=$value"
    done
    if [ -z "$presentes" ]; then
        say_ok "version group absent from the config - the ROM's own version is used"
        return
    fi

    aplicados=$(effective_version_fields "$conf")
    sdk=$(json_get "$conf" SDK_INT)
    case "$sdk" in ''|*[!0-9]*) sdk="" ;; esac
    if [ -n "$sdk" ] && [ "$sdk" -gt "$rom_sdk" ]; then
        if echo "$aplicados" | grep -q "^SDK_INT "; then
            say_red "config asks for SDK $sdk on a framework that is SDK $rom_sdk, and the semaphore is letting it through - unsafe, remove it"
        else
            say_warn "config carries SDK $sdk (> ROM $rom_sdk) but the semaphore blocks it - dead weight, safe to delete"
        fi
    fi
    cod=$(json_get "$conf" CODENAME)
    if [ -n "$cod" ] && [ "$cod" != "$rom_cod" ]; then
        if echo "$aplicados" | grep -q "^CODENAME "; then
            say_red "config asks for codename '$cod' while the ROM is '$rom_cod' and the semaphore is letting it through"
        else
            say_warn "config carries codename '$cod' (ROM is '$rom_cod') but the semaphore blocks it"
        fi
    fi
    [ -n "$aplicados" ] && log "         applied by the semaphore:$(echo "$aplicados" | tr '\n' ' ')"
    return 0
}

check_fingerprint() {
    conf="$1"
    fp=$(json_get "$conf" FINGERPRINT)
    [ -n "$fp" ] || { say_warn "no FINGERPRINT in the config"; return; }
    fp_brand=${fp%%/*}; resto=${fp#*/}
    fp_product=${resto%%/*}; resto=${resto#*/}
    fp_device=${resto%%:*}; resto=${resto#*:}
    fp_relcod=${resto%%/*}; resto=${resto#*/}
    fp_id=${resto%%/*}; resto=${resto#*/}
    fp_incr=${resto%%:*}

    for par in "BRAND $fp_brand" "PRODUCT $fp_product" "DEVICE $fp_device" \
               "ID $fp_id" "INCREMENTAL $fp_incr"; do
        key=${par%% *}; dentro=${par#* }
        fora=$(json_get "$conf" "$key")
        [ -n "$fora" ] && [ "$fora" != "$dentro" ] &&
            say_red "FINGERPRINT says $key='$dentro' but the config says '$fora' - one of them was edited alone"
    done

    aplicados=$(effective_version_fields "$conf")
    cod=$(echo "$aplicados" | grep "^CODENAME " | cut -d" " -f2-)
    [ -n "$cod" ] || cod=$(rom_prop ro.build.version.codename)
    rel=$(echo "$aplicados" | grep "^ANDROID_VERSION " | cut -d" " -f2-)
    [ -n "$rel" ] || rel=$(rom_prop ro.build.version.release)
    efetivo=$(release_or_codename "$cod" "$rel")
    if [ -n "$efetivo" ] && [ "$fp_relcod" != "$efetivo" ]; then
        say_info "FINGERPRINT carries ':$fp_relcod/' and this device reports '$efetivo'. Deliberate: that segment is release_or_codename (a preview build shows a word, a release a number) - kept as-is on purpose"
    else
        say_ok "FINGERPRINT agrees with the version this device reports"
    fi

    preview=$(json_get "$conf" PREVIEW_SDK)
    if [ -n "$preview" ] && [ "$preview" != "0" ] && [ "$efetivo" = "$rel" ]; then
        say_info "PREVIEW_SDK=$preview comes from the spoofed preview build while the device reports a release one ($rel). Kept on purpose"
    fi
}

check_dates() {
    conf="$1"
    id=$(json_get "$conf" ID); patch=$(json_get "$conf" SECURITY_PATCH)
    dia=$(printf '%s' "$id" | grep -oE '\.[0-9]{6}\.' | tr -d '.')
    [ -n "$dia" ] && [ -n "$patch" ] || { say_ok "dates: nothing to compare"; return; }
    build="20$(echo "$dia" | cut -c1-2)-$(echo "$dia" | cut -c3-4)-$(echo "$dia" | cut -c5-6)"
    e_build=$(date -u -d "$build" +%s 2>/dev/null)
    e_patch=$(date -u -d "$patch" +%s 2>/dev/null)
    if [ -z "$e_build" ] || [ -z "$e_patch" ]; then
        say_ok "dates: this date(1) cannot convert them, skipped"
        return
    fi
    dias=$(( (e_patch - e_build) / 86400 ))
    if [ "$dias" -lt -60 ] || [ "$dias" -gt 60 ]; then
        say_warn "security patch ($patch) is ${dias}d away from the build date ($build) - consider aligning them"
    else
        say_ok "security patch ($patch) fits the build date ($build), ${dias}d apart"
    fi
}

check_unknown_keys() {
    conf="$1"
    desconhecidas=$($AWK -v id="$MODULE_ID" -v conhecidas="$KNOWN_KEYS" '
        BEGIN { n = split(conhecidas, K, /[ \t\n]+/); for (i = 1; i <= n; i++) ok[K[i]] = 1 }
        !dentro && $0 ~ "\"" id "\"[ \t]*:[ \t]*\\{" { dentro = 1; next }
        dentro && /^[ \t]*}/ { dentro = 0; next }
        dentro && match($0, /"[A-Za-z0-9_]+"[ \t]*:/) {
            k = substr($0, RSTART + 1, RLENGTH - 3); sub(/"[ \t]*$/, "", k)
            if (!(k in ok)) print k
        }' "$conf" | tr '\n' ' ')
    [ -n "$desconhecidas" ] &&
        say_warn "keys the module does not read (typos do nothing, silently): $desconhecidas" ||
        say_ok "every key in the object is one the module understands"
}

check_delete() {
    conf="$1"
    dlist=$(tr -d '\n' < "$conf" |
            grep -o "\"COPG-VD-Delete\"[[:space:]]*:[[:space:]]*\[[^]]*\]" |
            grep -o '"[^"]*"' | sed 's/"//g' | grep -v '^COPG-VD-Delete$')
    [ -n "$dlist" ] || { say_ok "no COPG-VD-Delete list"; return; }
    log "  COPG-VD-Delete removes:$(echo "$dlist" | tr '\n' ' ')"
    for d in $dlist; do
        case " $VERSION_FIELDS " in
            *" $d "*) say_warn "'$d' is a version field - delete never touches the version group (that is the semaphore's job), so this entry does nothing" ; continue ;;
        esac
        case " FINGERPRINT $IDENTITY " in
            *" $d "*) say_red "deletes '$d', an identity field - identity fields should be set, not deleted" ; continue ;;
        esac
        grep -q "\"$d\"[[:space:]]*:[[:space:]]*\"" "$conf" &&
            say_warn "'$d' is both set and deleted - delete wins, the set value is dead weight"
    done
}

check_applied() {
    conf="$1"
    fp_conf=$(json_get "$conf" FINGERPRINT)
    fp_live=$(getprop ro.build.fingerprint 2>/dev/null)
    if [ "$(cfg_setting resetprop)" = false ]; then
        say_warn "resetprop is off - the props keep the ROM's values (the zygisk side still spoofs)"
    elif [ -n "$fp_conf" ] && [ "$fp_conf" != "$fp_live" ]; then
        say_warn "the config asks for a fingerprint the props do not show yet - reboot, or resetprop failed"
    else
        say_ok "props already carry what the config asks for"
    fi
}

analyze() {
    conf=""
    for path in $CONFIG_PATHS; do [ -f "$path" ] && conf="$path" && break; done
    [ -n "$conf" ] || { log "no config file found in: $CONFIG_PATHS"; echo "status: no-config"; return 1; }
    [ -n "$AWK" ] || { log "no awk available"; echo "status: failed"; return 1; }
    A_RED=0; A_WARN=0
    log "analyzing $conf"
    check_shape "$conf"
    [ "$A_RED" -eq 0 ] || { log "the file cannot be read - the rest of the analysis would be noise"
                            echo "status: analyze-red"; return 1; }
    check_version "$conf"
    check_fingerprint "$conf"
    check_dates "$conf"
    check_unknown_keys "$conf"
    check_delete "$conf"
    check_applied "$conf"
    log "$A_RED red, $A_WARN warn"
    if [ "$A_RED" -gt 0 ]; then echo "status: analyze-red"; return 1; fi
    [ "$A_WARN" -gt 0 ] && echo "status: analyze-warn" || echo "status: analyze-ok"
    return 0
}

existing_targets() {
    found=""
    for path in $CONFIG_PATHS; do
        [ -f "$path" ] && found="$found $path"
    done
    echo "$found"
}

fetch_remote() {
    DOWNLOADER=$(find_downloader) || { log "no curl/wget/busybox available"; return 1; }
    download || { log "download failed ($REMOTE_URL)"; return 1; }
    require_sig "$TMP_FILE" "$REMOTE_URL" || return 1
    validate_remote || return 1
    return 0
}

compare() {
    TARGETS=$(existing_targets)
    [ -n "$TARGETS" ] || { log "no config file found in: $CONFIG_PATHS"; return 3; }
    for path in $TARGETS; do REFERENCE="$path"; break; done

    for field in $IDENTITY; do
        local_value=$(json_get "$REFERENCE" "$field")
        remote_value=$(json_get "$TMP_FILE" "$field")
        if [ -n "$local_value" ] && [ "$local_value" != "$remote_value" ]; then
            log "local $field is '$local_value', upstream is '$remote_value'"
            return 2
        fi
    done

    LOCAL_ID=$(json_get "$REFERENCE" ID)
    LOCAL_INCREMENTAL=$(json_get "$REFERENCE" INCREMENTAL)
    REMOTE_ID=$(json_get "$TMP_FILE" ID)
    REMOTE_INCREMENTAL=$(json_get "$TMP_FILE" INCREMENTAL)
    log "local:  $LOCAL_ID ($(json_get "$REFERENCE" SECURITY_PATCH))"
    log "remote: $REMOTE_ID ($(json_get "$TMP_FILE" SECURITY_PATCH))"
    [ "$LOCAL_ID" = "$REMOTE_ID" ] && [ "$LOCAL_INCREMENTAL" = "$REMOTE_INCREMENTAL" ] && return 1

    case "$LOCAL_INCREMENTAL$REMOTE_INCREMENTAL" in
        *[!0-9]*|"") log "non-numeric incremental, refusing to guess which build is newer"
                     return 4 ;;
    esac
    [ "$REMOTE_INCREMENTAL" -le "$LOCAL_INCREMENTAL" ] && return 4
    return 0
}

export_values() {
    for field in $FIELDS; do
        value=$(json_get "$TMP_FILE" "$field")
        [ -n "$value" ] && sane_value "$field" "$value" || value=""
        eval "export COPG_V_$field=\"\$value\""
    done
    COPG_V_SOURCE=$(json_get "$TMP_FILE" "Strings extracted from")
    case "$COPG_V_SOURCE" in
        https://*) : ;;
        *) COPG_V_SOURCE="" ;;
    esac
    export COPG_V_SOURCE
}

apply() {
    export_values
    written=""
    for target in $TARGETS; do
        if write_fields "$target"; then
            log "updated $target (backup at $target.bak)"
            written="$written $target"
        else
            log "FAILED to update $target"
        fi
    done
    [ -n "$written" ] || return 1

    if [ "$(cfg_setting resetprop)" = false ]; then
        log "resetprop is disabled, props not re-applied"
    elif [ -f "$MODDIR/service.sh" ]; then
        sh "$MODDIR/service.sh" --props-only >/dev/null 2>&1 &&
            log "props re-applied" || log "could not re-apply props"
    fi

    for package in $KILL_PACKAGES; do
        pid=$(pidof "$package" 2>/dev/null)
        [ -n "$pid" ] && kill -9 $pid 2>/dev/null
    done
    log "attestation processes killed: $KILL_PACKAGES"
    log "reboot to apply the new build to android.os.Build"
    return 0
}

wait_for_boot() {
    while [ "$(getprop sys.boot_completed)" != "1" ]; do
        sleep 5
    done
}

already_ran_this_boot() {
    boot_id=$(cat /proc/sys/kernel/random/boot_id 2>/dev/null)
    [ -n "$boot_id" ] || return 1
    [ -f "$STATE_FILE" ] && grep -q "^boot_id=$boot_id$" "$STATE_FILE" 2>/dev/null
}

mark_ran_this_boot() {
    [ -n "$boot_id" ] || return 0
    echo "boot_id=$boot_id" > "$STATE_FILE"
    chmod 0600 "$STATE_FILE" 2>/dev/null
}

# --- device-aware update (issue #28) --------------------------------------
# A profile fetched from VictorGabriel7Dev/build.prop (any Pixel other than the
# bundled example) could never update: the updater only knew the example profile,
# so compare() returned "skipped-custom-device" and the user was stuck. Resolve the
# newest .prop for the device the config actually carries, from the build.prop
# index, and refresh that device instead of forcing the bundled one.
index_field() {
    # <index_file> <device> <channel> <field> -> value on stdout; rc 1 if absent
    $AWK -v dev="\"$2\":" -v chan="\"$3\":" -v fld="\"$4\":" '
        { s = s $0 "\n" }
        END {
            di = index(s, dev); if (!di) exit 1
            s = substr(s, di + length(dev)); depth = 0; obj = ""
            for (i = 1; i <= length(s); i++) {
                c = substr(s, i, 1); obj = obj c
                if (c == "{") depth++
                else if (c == "}") { if (--depth == 0) break }
            }
            ci = index(obj, chan); if (!ci) exit 1
            t = substr(obj, ci + length(chan)); ce = index(t, "}"); t = substr(t, 1, ce)
            fi = index(t, fld); if (!fi) exit 1
            v = substr(t, fi + length(fld)); sub(/^[ \t]*/, "", v)
            if (substr(v, 1, 1) == "\"") { v = substr(v, 2); q = index(v, "\""); print substr(v, 1, q - 1) }
            else { match(v, /[0-9A-Za-z._-]+/); print substr(v, RSTART, RLENGTH) }
            exit 0
        }' "$1"
}

fetched_device_update() {
    # uses $REFERENCE (set by compare); sets DEV_LATEST/DEV_LINCR/DEV_RINCR on rc 0.
    # rc: 0 newer available, 1 already newest, 2 not a build.prop device, 3 no network
    [ -n "$AWK" ] || return 2
    _dev=$(json_get "$REFERENCE" DEVICE); [ -n "$_dev" ] || return 2
    case "$_dev" in *[!A-Za-z0-9_-]*) return 2 ;; esac
    _src=$(json_get "$REFERENCE" "Strings extracted from")
    case "$_src" in *_beta_*|*beta/*) _chan=beta ;; *) _chan=release ;; esac
    DOWNLOADER="${DOWNLOADER:-$(find_downloader)}"; [ -n "$DOWNLOADER" ] || return 3
    _idx="$TMP_FILE.idx"
    download_to "$FETCH_BASE_URL/index.json" "$_idx" || { rm -f "$_idx"; return 3; }
    require_sig "$_idx" "$FETCH_BASE_URL/index.json" || { rm -f "$_idx"; return 3; }
    DEV_LATEST=$(index_field "$_idx" "$_dev" "$_chan" latest)
    DEV_RINCR=$(index_field "$_idx" "$_dev" "$_chan" incremental)
    rm -f "$_idx"
    [ -n "$DEV_LATEST" ] && [ -n "$DEV_RINCR" ] || return 2
    case "$DEV_LATEST" in */*.prop) : ;; *) return 2 ;; esac
    DEV_LINCR=$(json_get "$REFERENCE" INCREMENTAL)
    case "$DEV_LINCR$DEV_RINCR" in *[!0-9]*|"") return 1 ;; esac
    [ "$DEV_RINCR" -le "$DEV_LINCR" ] && return 1
    return 0
}

MODE="${1:-check}"

case "$MODE" in
    check|apply)
        fetch_remote || { echo "status: failed"; exit 1; }
        compare
        case $? in
            1) log "already on the newest build"; echo "status: up-to-date"; exit 0 ;;
            2) fetched_device_update
               case $? in
                   0) if [ "$MODE" = "check" ]; then
                          log "update available for $_dev: $DEV_LINCR -> $DEV_RINCR"
                          echo "status: update-available"; exit 0
                      fi
                      if sh "$0" fetch "$DEV_LATEST" >/dev/null 2>&1; then
                          [ "$(cfg_setting resetprop)" != false ] && [ -f "$MODDIR/service.sh" ] &&
                              sh "$MODDIR/service.sh" --props-only >/dev/null 2>&1
                          log "refreshed $_dev to the newest build ($DEV_RINCR)"
                          echo "status: applied"; exit 0
                      fi
                      echo "status: failed"; exit 1 ;;
                   1) log "fetched device already on the newest build"
                      echo "status: up-to-date"; exit 0 ;;
                   3) echo "status: failed"; exit 1 ;;
                   *) log "this is not an upstream build.prop device, nothing applied"
                      echo "status: skipped-custom-device"; exit 0 ;;
               esac ;;
            3) echo "status: no-config"; exit 1 ;;
            4) log "upstream ($REMOTE_ID) is not newer than what is installed ($LOCAL_ID)"
               echo "status: local-newer"; exit 0 ;;
        esac
        if [ "$MODE" = "check" ]; then
            log "update available: $LOCAL_ID -> $REMOTE_ID"
            echo "status: update-available"
            exit 0
        fi
        A_RED=0; A_WARN=0
        check_shape "$REFERENCE"
        if [ "$A_RED" -gt 0 ]; then
            log "the config file is broken - fix it before updating (run: analyze)"
            echo "status: analyze-red"; exit 1
        fi
        apply || { echo "status: failed"; exit 1; }
        echo "status: applied"
        ;;

    boot)
        [ "$(cfg_setting autoupdate)" = false ] && exit 0
        wait_for_boot
        already_ran_this_boot && exit 0
        attempt=1
        while [ "$attempt" -le "$BOOT_RETRY_MAX" ]; do
            if fetch_remote; then
                mark_ran_this_boot
                compare
                case $? in
                    0) A_RED=0; A_WARN=0; check_shape "$REFERENCE"
                       if [ "$A_RED" -eq 0 ]; then apply
                       else log "config file is broken - not updating on top of it"; fi ;;
                    1) log "already on the newest build" ;;
                    2) fetched_device_update
                       case $? in
                           0) if sh "$0" fetch "$DEV_LATEST" >/dev/null 2>&1; then
                                  [ "$(cfg_setting resetprop)" != false ] && [ -f "$MODDIR/service.sh" ] &&
                                      sh "$MODDIR/service.sh" --props-only >/dev/null 2>&1
                                  log "refreshed $_dev to the newest build ($DEV_RINCR)"
                              else log "failed to refresh $_dev"; fi ;;
                           1) log "fetched device already on the newest build" ;;
                           *) log "this is not an upstream build.prop device, nothing applied" ;;
                       esac ;;
                    3) log "no config file to update" ;;
                    4) log "upstream is not newer than what is installed, nothing applied" ;;
                esac
                echo "ok $(date '+%Y-%m-%d %H:%M')" > "$STATUS_FILE" 2>/dev/null
                chmod 0600 "$STATUS_FILE" 2>/dev/null
                exit 0
            fi
            attempt=$((attempt + 1))
            sleep "$BOOT_RETRY_SLEEP"
        done
        log "gave up after $BOOT_RETRY_MAX attempts, upstream unreachable or gone"
        echo "no-network $(date '+%Y-%m-%d %H:%M')" > "$STATUS_FILE" 2>/dev/null
        chmod 0600 "$STATUS_FILE" 2>/dev/null
        exit 1
        ;;

    analyze)
        analyze
        exit $?
        ;;

    sync-settings)
        migrate_data_dir
        exit 0
        ;;

    migrate)
        migrate_version && echo "status: migrated" || echo "status: nothing-to-migrate"
        exit 0
        ;;

    fetch-index)
        DOWNLOADER="${DOWNLOADER:-$(find_downloader)}"
        [ -n "$DOWNLOADER" ] || { echo "status: no-downloader"; exit 1; }
        IDX_TMP="$TMP_FILE.idx"
        download_to "$FETCH_BASE_URL/index.json" "$IDX_TMP" || { echo "status: download-failed${DL_INFO:+ $DL_INFO}"; exit 1; }
        require_sig "$IDX_TMP" "$FETCH_BASE_URL/index.json" || { rm -f "$IDX_TMP"; echo "status: sig-failed"; exit 1; }
        grep -q '"devices"' "$IDX_TMP" 2>/dev/null || { rm -f "$IDX_TMP"; echo "status: bad-index"; exit 1; }
        cat "$IDX_TMP"
        rm -f "$IDX_TMP"
        exit 0
        ;;

    fetch)
        relpath="$2"
        [ -n "$relpath" ] || { echo "status: no-arg"; exit 1; }
        case "$relpath" in
            */*.prop) : ;;
            *) echo "status: bad-path"; exit 1 ;;
        esac
        case "$relpath" in
            *..*|/*|*' '*|*'"'*|*'$'*|*'`'*) echo "status: bad-path"; exit 1 ;;
        esac
        DOWNLOADER="${DOWNLOADER:-$(find_downloader)}"
        [ -n "$DOWNLOADER" ] || { echo "status: no-downloader"; exit 1; }
        PROP_TMP="$TMP_FILE.prop"
        download_to "$FETCH_BASE_URL/$relpath" "$PROP_TMP" || { echo "status: download-failed${DL_INFO:+ $DL_INFO}"; exit 1; }
        require_sig "$PROP_TMP" "$FETCH_BASE_URL/$relpath" || { rm -f "$PROP_TMP"; echo "status: sig-failed"; exit 1; }
        grep -q '^ro\.build\.' "$PROP_TMP" 2>/dev/null || { rm -f "$PROP_TMP"; echo "status: bad-prop"; exit 1; }
        echo "$FETCH_MAP" | while IFS= read -r pair; do
            key=${pair%%:*}; cands=${pair#*:}
            val=""; old_ifs=$IFS; IFS=,
            for p in $cands; do
                v=$(grep -m 1 "^$p=" "$PROP_TMP" | cut -d= -f2-)
                [ -n "$v" ] && { val="$v"; break; }
            done
            IFS=$old_ifs
            [ -n "$val" ] && sane_value "$key" "$val" && printf '%s\n' "COPG_V_$key=$val"
        done > "$TMP_FILE.env"
        while IFS='=' read -r k v; do [ -n "$k" ] && export "$k=$v"; done < "$TMP_FILE.env"
        rm -f "$PROP_TMP" "$TMP_FILE.env"
        [ -n "$COPG_V_FINGERPRINT" ] && [ -n "$COPG_V_BRAND" ] && [ -n "$COPG_V_MODEL" ] ||
            { echo "status: map-failed"; exit 1; }
        target=""
        for c in $CONFIG_PATHS; do [ -f "$c" ] && { target="$c"; break; }; done
        [ -n "$target" ] || { echo "status: no-config"; exit 1; }
        FIELDS="$FETCH_FIELDS"
        export COPG_V_SOURCE="github.com/VictorGabriel7Dev/build.prop ($relpath)"
        if write_fields "$target"; then
            log "fetched $COPG_V_MODEL ($COPG_V_FINGERPRINT) from $relpath"
            echo "status: fetched"
            exit 0
        fi
        echo "status: write-failed"; exit 1
        ;;

    *)
        echo "usage: ${0##*/} check|apply|boot|analyze|sync-settings|migrate|fetch-index|fetch <path>"
        exit 1
        ;;
esac
