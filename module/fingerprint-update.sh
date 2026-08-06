#!/system/bin/sh
# ================================================
# COPG-VD.json updater
# ================================================
# Pulls the build props of the newest Google image from the COPG-VD repo, where the
# "Update COPG-VD.json" workflow keeps module/COPG-VD.json.example refreshed.
#
#   fingerprint-update.sh check    what would change (writes nothing)
#   fingerprint-update.sh apply    update the config file(s) now
#   fingerprint-update.sh boot     once per boot, waits for the network, then applies
#
# What it will NOT touch:
#   * the device identity (BRAND/DEVICE/MANUFACTURER/MODEL/PRODUCT). If yours differs
#     from upstream you are spoofing another device, so nothing is applied at all - a
#     Pixel fingerprint on a non-Pixel profile is worse than an old fingerprint.
#   * any other key of the file: extra fields, BOOTLOADER/BOARD/HARDWARE, other objects,
#     key order, indentation and the duplicated "Instructions" lines all survive, because
#     only the value of each known build field is rewritten in place.
#
# Exit status: 0 when the check ran (see "status:" in the output), 1 on failure.

MODDIR=${0%/*}
MODULE_ID="COPG-VD"
BRANCH="main"
REMOTE_URL="https://raw.githubusercontent.com/VD171/COPG-VD/$BRANCH/module/COPG-VD.json.example"

# Both are updated when both exist: /data/adb is what the module reads, the copy inside
# the module directory is a convention of some setups and must not drift from it.
CONFIG_PATHS="/data/adb/COPG-VD.json /data/adb/modules/$MODULE_ID/COPG-VD.json"
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
FIELDS="FINGERPRINT ID DISPLAY INCREMENTAL TIMESTAMP SECURITY_PATCH CODENAME
        ANDROID_VERSION SDK_INT SDK_FULL PREVIEW_SDK SDK_FINGERPRINT UUID HOST USER"
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
                    0) apply ;;
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

    *)
        echo "usage: ${0##*/} check|apply|boot"
        exit 1
        ;;
esac
