#!/system/bin/sh
# ================================================
# COPG-VD.json updater
# ================================================
# Pulls the build props of the newest Google image from the COPG-VD repo, where the
# "Update COPG-VD.json" workflow keeps module/COPG-VD.json.example refreshed.
#
#   fingerprint-update.sh check           what would change (writes nothing)
#   fingerprint-update.sh apply           update the config file(s) now
#   fingerprint-update.sh boot            once per boot, waits for the network, then applies
#   fingerprint-update.sh analyze         audit the config as it stands (writes nothing)
#   fingerprint-update.sh sync-settings   COPG-VD-Settings from the JSON -> the flag files
#
# What it will NOT touch:
#   * the device identity (BRAND/DEVICE/MANUFACTURER/MODEL/PRODUCT). If yours differs
#     from upstream you are spoofing another device, so nothing is applied at all - a
#     Pixel fingerprint on a non-Pixel profile is worse than an old fingerprint.
#   * any other key of the file: extra fields, BOOTLOADER/BOARD/HARDWARE, other objects,
#     key order, indentation and the duplicated "Instructions" lines all survive, because
#     only the value of each known build field is rewritten in place.
#   * the Android version. ANDROID_VERSION, SDK_INT, SDK_FULL and CODENAME describe the ROM,
#     not the build being spoofed. Telling apps the SDK is newer than the framework really is
#     makes them call APIs that do not exist: Google's apps crash, the device reboots, and it
#     repeats - a softloop, which leaves no trace in the boot logs. They are never written
#     here, and applying them at all is gated by the semaphore below.
#
# Exit status: 0 when the check ran (see "status:" in the output), 1 on failure.

MODDIR=${0%/*}
MODULE_ID="COPG-VD"
BRANCH="main"
REMOTE_URL="https://raw.githubusercontent.com/VD171/COPG-VD/$BRANCH/module/COPG-VD.json.example"

# Both are updated when both exist: /data/adb is what the module reads, the copy inside
# the module directory is a convention of some setups and must not drift from it.
MODULE_DIR="/data/adb/modules/$MODULE_ID"
CONFIG_PATHS="/data/adb/COPG-VD.json $MODULE_DIR/COPG-VD.json"

# The only honest source for what the ROM really is. Never getprop: the module rewrites those
# very props, so asking the system would be asking our own lie. /build.prop does not exist on
# these devices; only /system/build.prop, and on a custom ROM the fingerprint line in it is
# stale garbage inherited from the base image - the ro.build.version.* lines are the good part.
ROM_PROP="/system/build.prop"
# Never refreshed from upstream, and only applied when the semaphore allows.
VERSION_FIELDS="ANDROID_VERSION SDK_INT SDK_FULL CODENAME"
SETTINGS_OBJECT="COPG-VD-Settings"
# Keys the module actually understands - anything else in the object does nothing.
# One line, deliberately: Android's awk refuses a newline inside a -v assignment ("newline in
# string ... at source line 1") and the whole program dies. Fedora's gawk accepts it, so this
# only ever breaks on the device - which is exactly where it matters.
KNOWN_KEYS="BRAND DEVICE MANUFACTURER MODEL FINGERPRINT PRODUCT BOOTLOADER BOARD HARDWARE DISPLAY ID HOST INCREMENTAL TIMESTAMP PREVIEW_SDK USER SDK_FINGERPRINT UUID SECURITY_PATCH ANDROID_VERSION SDK_INT SDK_FULL CODENAME TAGS TYPE ODM_SKU SKU"
STATE_FILE="/data/adb/$MODULE_ID.update.state"
LOG_FILE="/data/adb/$MODULE_ID.update.log"
LOG_MAX=32768
# /data/adb is root-only; /data/local/tmp is shared with the shell user and could be raced.
TMP_FILE="/data/adb/.$MODULE_ID.update.$$"

# The WebUI calls this through ksu.exec, whose PATH has none of the root manager's busybox.
AWK=$(command -v awk 2>/dev/null)
if [ -z "$AWK" ]; then
    for bb in /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox /data/adb/magisk/busybox; do
        [ -x "$bb" ] && AWK="$bb awk" && break
    done
fi

# Refreshed from upstream. Everything else in the file is left alone.
# Single line for the same reason as KNOWN_KEYS: this one is passed to awk by write_fields,
# so a newline here meant every update failed on a real device while passing on a PC.
FIELDS="FINGERPRINT ID DISPLAY INCREMENTAL TIMESTAMP SECURITY_PATCH PREVIEW_SDK SDK_FINGERPRINT UUID HOST USER"
# Must match upstream, otherwise the user is spoofing something else.
IDENTITY="BRAND DEVICE MANUFACTURER MODEL PRODUCT"
# Re-evaluate attestation with the new props. com.android.vending is deliberately left
# alone: killing it interrupts downloads, and it picks the change up on its own.
KILL_PACKAGES="com.google.android.gms com.google.android.gsf com.google.android.gms.unstable"

BOOT_RETRY_MAX=40          # network attempts at boot ...
BOOT_RETRY_SLEEP=15        # ... every 15s, so ~10 min of waiting for wifi

log() {
    echo "[$MODULE_ID] $*"
    [ -f "$LOG_FILE" ] && [ "$(stat -c %s "$LOG_FILE" 2>/dev/null || echo 0)" -gt "$LOG_MAX" ] &&
        tail -c 8192 "$LOG_FILE" > "$LOG_FILE.trim" 2>/dev/null && mv "$LOG_FILE.trim" "$LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG_FILE" 2>/dev/null
}

cleanup() {
    rm -f "$TMP_FILE" "$TMP_FILE.new" 2>/dev/null
}
trap cleanup EXIT

# --------------------------------------------------------------------- download
find_downloader() {
    for cmd in curl wget; do
        command -v "$cmd" >/dev/null 2>&1 && echo "$cmd" && return 0
    done
    for bb in /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox /data/adb/magisk/busybox \
              /data/adb/modules/busybox-ndk/system/bin/busybox; do
        [ -x "$bb" ] && echo "$bb wget" && return 0
    done
    command -v busybox >/dev/null 2>&1 && echo "busybox wget" && return 0
    return 1
}

download() {
    # TLS is as good as the downloader available, and on a plain Android that is busybox
    # wget, which prints "TLS certificate validation not implemented" and means it. Nothing
    # here disables verification, but nothing can promise it either - which is why every value
    # is validated before use and why an older build is refused instead of applied.
    case "$DOWNLOADER" in
        curl) curl -fsSL --max-time 60 -o "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
        wget) wget -q -T 60 -O "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
        *)    $DOWNLOADER -q -T 60 -O "$TMP_FILE" "$REMOTE_URL" 2>/dev/null ;;
    esac
}

# --------------------------------------------------------------------- json helpers
# Same grep/sed style the module already uses in service.sh: one key per line, strings only.
json_get() {
    grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$1" 2>/dev/null | head -n 1 |
        sed "s/^\"[^\"]*\"[[:space:]]*:[[:space:]]*\"//; s/\"$//"
}

# Values land in props and in sed/awk, so anything outside this alphabet is refused.
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

# Bare values too (true/false/numbers), which the settings object uses.
json_get_raw() {
    grep -o "\"$2\"[[:space:]]*:[[:space:]]*[^,}[:space:]]*" "$1" 2>/dev/null | head -n 1 |
        sed "s/^\"[^\"]*\"[[:space:]]*:[[:space:]]*//; s/\"//g"
}

# --------------------------------------------------------------------- the ROM, for real
rom_prop() {
    grep -m 1 "^$1=" "$ROM_PROP" 2>/dev/null | cut -d= -f2-
}

# never = the version group is never applied (default) | rom = only what does not exceed the
# ROM | force = whatever the config says, which is what caused the softloop.
# force lives ONLY in the flag file: a config file travels through backups and restores, and
# restoring an old one must never re-arm the dangerous mode behind your back.
spoof_version_policy() {
    case "$(cat "$MODULE_DIR/.spoof.version" 2>/dev/null)" in
        rom) echo rom ;;
        force) echo force ;;
        *) echo never ;;
    esac
}

# AOSP: RELEASE_OR_CODENAME = "REL".equals(CODENAME) ? RELEASE : CODENAME.
# Copying CODENAME into it - which is what the mapping used to do - publishes the literal
# string "REL" in a field that must hold the version number. No real device reports that.
release_or_codename() {
    if [ "$1" = "REL" ] || [ -z "$1" ]; then echo "$2"; else echo "$1"; fi
}

# What the version group would actually become, given the config and the semaphore.
# Echoes "<field> <value>" for each field that WILL be applied; silence means "none".
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

# --------------------------------------------------------------------- settings <- json
# The JSON declares, the flag files are the cache the shell and the zygisk module read.
sync_settings() {
    conf=""
    for path in $CONFIG_PATHS; do [ -f "$path" ] && conf="$path" && break; done
    [ -n "$conf" ] || return 0
    grep -q "\"$SETTINGS_OBJECT\"" "$conf" 2>/dev/null || return 0

    for pair in "resetprop .skip.resetprop" "autoupdate .skip.autoupdate" \
                "spoof_manufacturer .skip.manufacturer"; do
        key=${pair%% *}; flag=${pair##* }
        case "$(json_get_raw "$conf" "$key")" in
            false) [ -e "$MODULE_DIR/$flag" ] || { : > "$MODULE_DIR/$flag"; log "settings: $key off"; } ;;
            true)  [ -e "$MODULE_DIR/$flag" ] && { rm -f "$MODULE_DIR/$flag"; log "settings: $key on"; } ;;
        esac
    done

    case "$(json_get_raw "$conf" spoof_version)" in
        never) echo never > "$MODULE_DIR/.spoof.version" ;;
        rom)   echo rom   > "$MODULE_DIR/.spoof.version" ;;
        force) echo rom   > "$MODULE_DIR/.spoof.version"
               log "settings: spoof_version=force in the config is downgraded to 'rom' - arm it in the WebUI" ;;
    esac
    return 0
}

# Rewrites the values of $FIELDS inside the "COPG-VD" object of $1 and nothing else.
# Values arrive through the environment (COPG_V_<FIELD>) so no quoting can bite.
write_fields() {
    target="$1"
    [ -n "$AWK" ] || { log "no awk available"; return 1; }
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
        # pass 1: which keys already live inside the object
        NR == FNR {
            if (!inblock && $0 ~ "\"" id "\"[ \t]*:[ \t]*\\{") { inblock = 1; depth = depth_of($0); next }
            if (inblock) {
                depth += depth_of($0)
                if (depth <= 0) { inblock = 0; next }
                for (k in want) if ($0 ~ "\"" k "\"[ \t]*:") seen[k] = 1
            }
            next
        }
        # pass 2: rewrite in place, inserting whatever was missing right after the header
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
            # outside the object: only the provenance line is refreshed
            if (src != "" && $0 ~ /"Strings extracted from"[ \t]*:[ \t]*"/)
                sub(/:[ \t]*"[^"]*"/, ": \"" src "\"", $0)
            print
        }
    ' "$target" "$target" > "$TMP_FILE.new" || return 1

    [ -s "$TMP_FILE.new" ] || { log "refusing to write an empty file over $target"; return 1; }
    grep -q "\"$MODULE_ID\"[[:space:]]*:[[:space:]]*{" "$TMP_FILE.new" ||
        { log "refusing to write a broken file over $target"; return 1; }

    cp -f "$target" "$target.bak" 2>/dev/null
    cat "$TMP_FILE.new" > "$target" || return 1
    chmod 0644 "$target" 2>/dev/null
    chcon u:object_r:system_file:s0 "$target" 2>/dev/null
    return 0
}

# Drops the version keys from the "COPG-VD" object of $1 - scoped to that object, so another
# profile in the same file is untouched. Used by the installer when coming from a version that
# still wrote them.
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

# The installer calls this when upgrading from a version that still wrote the version group.
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

# --------------------------------------------------------------------- analyze
# Verdicts: [ok] nothing to say | [warn] incoherent but deliberate or harmless |
# [RED] this is what breaks the device or silently disables the whole module.
A_RED=0; A_WARN=0
say_ok()   { log "  [ok]   $*"; }
say_warn() { log "  [warn] $*"; A_WARN=$((A_WARN + 1)); }
say_red()  { log "  [RED]  $*"; A_RED=$((A_RED + 1)); }

# The C++ parses this file with a real JSON parser: if it is malformed the module logs one
# line to logcat and spoofs NOTHING. That failure is invisible from the outside, so it is
# checked first. This validates the shape the module writes and expects - one "KEY": "value"
# per line - not arbitrary JSON.
check_shape() {
    conf="$1"
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
    # Read whole, checked at the end: the comma rule needs to know what comes next, and a
    # missing comma is the most common way a hand-edited config stops parsing.
    bad=$($AWK '
        { line[NR] = $0 }
        END {
            for (i = 1; i <= NR; i++) {
                l = line[i]
                if (l ~ /^[ \t]*$/) continue
                if (l ~ /^[ \t]*[{}][ \t]*,?[ \t]*$/) continue
                if (l ~ /^[ \t]*"[^"]*"[ \t]*:[ \t]*\{[ \t]*$/) continue
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
            say_red "config asks for SDK $sdk on a framework that is SDK $rom_sdk, and the semaphore is letting it through - this is the softloop"
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

# The fingerprint is not free text: it carries six of the other fields inside it.
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

    # Segment 4 is release_or_codename, so it has to match what the device will actually
    # report - which is what the semaphore lets through, not what the config asks for.
    aplicados=$(effective_version_fields "$conf")
    cod=$(echo "$aplicados" | grep "^CODENAME " | cut -d" " -f2-)
    [ -n "$cod" ] || cod=$(rom_prop ro.build.version.codename)
    rel=$(echo "$aplicados" | grep "^ANDROID_VERSION " | cut -d" " -f2-)
    [ -n "$rel" ] || rel=$(rom_prop ro.build.version.release)
    efetivo=$(release_or_codename "$cod" "$rel")
    if [ -n "$efetivo" ] && [ "$fp_relcod" != "$efetivo" ]; then
        say_warn "FINGERPRINT carries ':$fp_relcod/' but this device reports '$efetivo' - deliberate: matching it would need a target build of the same Android version, and rewriting the fingerprint would break attestation"
    else
        say_ok "FINGERPRINT agrees with the version this device reports"
    fi

    preview=$(json_get "$conf" PREVIEW_SDK)
    if [ -n "$preview" ] && [ "$preview" != "0" ] && [ "$efetivo" = "$rel" ]; then
        say_warn "PREVIEW_SDK=$preview marks a preview build while the device reports a release one ($rel)"
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
        say_warn "security patch ($patch) is ${dias}d away from the build date ($build) - real builds ship within a couple of months"
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

check_applied() {
    conf="$1"
    fp_conf=$(json_get "$conf" FINGERPRINT)
    fp_live=$(getprop ro.build.fingerprint 2>/dev/null)
    if [ -e "$MODULE_DIR/.skip.resetprop" ]; then
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
    check_applied "$conf"
    log "$A_RED red, $A_WARN warn"
    if [ "$A_RED" -gt 0 ]; then echo "status: analyze-red"; return 1; fi
    [ "$A_WARN" -gt 0 ] && echo "status: analyze-warn" || echo "status: analyze-ok"
    return 0
}

# --------------------------------------------------------------------- steps
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

# 0 = something to do, 1 = already current, 2 = other device, 3 = no config,
# 4 = upstream is older than what is installed file
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

    # Only ever move forward. "different" is not "newer": the repo can legitimately sit behind
    # the device (a config updated by hand, a branch not merged yet), and on Android the only
    # downloader available is busybox wget, which cannot validate certificates - so an older
    # build arriving over the wire is exactly what a downgrade would look like.
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

    # resetprop and the zygisk spoof must not disagree: re-apply the props right away.
    if [ -e "$MODDIR/.skip.resetprop" ]; then
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
    # android.os.Build is written by zygisk when zygote starts, so the Java side of the
    # spoof only picks the new values up on the next boot.
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
    [ -n "$boot_id" ] || return 1                       # cannot tell: let it run
    [ -f "$STATE_FILE" ] && grep -q "^boot_id=$boot_id$" "$STATE_FILE" 2>/dev/null
}

mark_ran_this_boot() {
    # Only after the network answered: a boot that never got wifi must not burn its turn.
    [ -n "$boot_id" ] || return 0
    echo "boot_id=$boot_id" > "$STATE_FILE"
    chmod 0600 "$STATE_FILE" 2>/dev/null
}

# --------------------------------------------------------------------- main
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
        # Refuse to write into a file the module cannot read - that would carry the damage
        # forward and get the blame for it. A red on the version group does NOT block here:
        # that is a risk the owner armed on purpose, and it has nothing to do with the
        # fingerprint being refreshed.
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
        [ -e "$MODDIR/.skip.autoupdate" ] && exit 0
        wait_for_boot
        already_ran_this_boot && exit 0
        attempt=1
        while [ "$attempt" -le "$BOOT_RETRY_MAX" ]; do
            # No connectivity probe: the download itself is the honest test, and wifi can
            # take minutes to come up after boot_completed.
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
                exit 0
            fi
            attempt=$((attempt + 1))
            sleep "$BOOT_RETRY_SLEEP"
        done
        log "gave up after $BOOT_RETRY_MAX attempts, no network"
        exit 1
        ;;

    analyze)
        analyze
        exit $?
        ;;

    sync-settings)
        sync_settings
        exit 0
        ;;

    migrate)
        migrate_version && echo "status: migrated" || echo "status: nothing-to-migrate"
        exit 0
        ;;

    *)
        echo "usage: ${0##*/} check|apply|boot|analyze|sync-settings|migrate"
        exit 1
        ;;
esac
