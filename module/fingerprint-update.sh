#!/system/bin/sh
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
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
        [ -f "$old" ] && { [ -e "$new" ] || mv -f "$old" "$new" 2>/dev/null; rm -f "$old" 2>/dev/null; }
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

find_downloader() {
    for bb in /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox /data/adb/magisk/busybox \
              /data/adb/modules/busybox-ndk/system/bin/busybox; do
        [ -x "$bb" ] && echo "$bb wget" && return 0
    done
    command -v busybox >/dev/null 2>&1 && echo "busybox wget" && return 0
    for cmd in curl wget; do
        command -v "$cmd" >/dev/null 2>&1 && echo "$cmd" && return 0
    done
    return 1
}

download() {
    case "$DOWNLOADER" in
        curl) curl -fsSL --max-time 60 -o "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
        wget) wget -q -T 60 -O "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
        *)    $DOWNLOADER -q -T 60 -O "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
    esac
}

download_to() {
    _u="$1"; _o="$2"; DL_INFO=""
    case "$DOWNLOADER" in
        curl) DL_INFO=$(curl -fsSL --max-time 60 -w 'http=%{http_code}' -o "$_o" "$_u" 2>/dev/null); _rc=$?
              [ "$_rc" -ne 0 ] && DL_INFO="${DL_INFO} curl=$_rc" ;;
        wget) wget -q -T 60 -O "$_o" "$_u" 2>/dev/null; _rc=$?
              [ "$_rc" -ne 0 ] && DL_INFO="wget=$_rc" ;;
        *)    $DOWNLOADER -q -T 60 -O "$_o" "$_u" 2>/dev/null; _rc=$?
              [ "$_rc" -ne 0 ] && DL_INFO="dl=$_rc" ;;
    esac
    [ -s "$_o" ]
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

write_fields() {
    target="$1"
    [ -n "$AWK" ] || { log "no awk available"; return 1; }
    normalize_if_minified "$target"
    $AWK -v id="$MODULE_ID" -v keys="$FIELDS" -v src="$COPG_V_SOURCE" '
        function depth_of(s,   i, ch, d) {
            d = 0
            for (i = 1; i <= length(s); i++) {
                ch = substr(s, i, 1)
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
    cat "$TMP_FILE.new" > "$target" || return 1
    chmod 0644 "$target" 2>/dev/null
    chcon u:object_r:system_file:s0 "$target" 2>/dev/null
    return 0
}

drop_version_fields() {
    target="$1"
    [ -n "$AWK" ] || return 1
    $AWK -v id="$MODULE_ID" -v keys="$VERSION_FIELDS" '
        function depth_of(s,   i, ch, d) {
            d = 0
            for (i = 1; i <= length(s); i++) {
                ch = substr(s, i, 1)
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
    cat "$TMP_FILE.new" > "$target" || return 1
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

MODE="${1:-check}"

case "$MODE" in
    check|apply)
        fetch_remote || { echo "status: failed"; exit 1; }
        compare
        case $? in
            1) log "already on the newest build"; echo "status: up-to-date"; exit 0 ;;
            2) log "this is not the upstream device profile, nothing applied"
               echo "status: skipped-custom-device"; exit 0 ;;
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
                    2) log "this is not the upstream device profile, nothing applied" ;;
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
        grep -q '^ro\.build\.' "$PROP_TMP" 2>/dev/null || { rm -f "$PROP_TMP"; echo "status: bad-prop"; exit 1; }
        echo "$FETCH_MAP" | while IFS= read -r pair; do
            key=${pair%%:*}; cands=${pair#*:}
            val=""; old_ifs=$IFS; IFS=,
            for p in $cands; do
                v=$(grep -m 1 "^$p=" "$PROP_TMP" | cut -d= -f2-)
                [ -n "$v" ] && { val="$v"; break; }
            done
            IFS=$old_ifs
            [ -n "$val" ] && printf '%s\n' "COPG_V_$key=$val"
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
