#!/system/bin/sh

# Paths
CONFIG_JSON="/data/adb/modules/COPG/config.json"
TOGGLE_FILE="/data/adb/copg_state"
DEFAULTS_FILE="/data/adb/copg_defaults"  # Base name for .brightness, .dnd, and .timeout
LOG_FILE="/data/adb/copg_debug.log"

# Function to execute root commands
exec_root() {
    local cmd="$1"
    su -c "$cmd" >/dev/null 2>&1
    return $?
}

# Function to log debug messages (to stderr and file)
log_debug() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE" 2>/dev/null
    echo "[DEBUG] $1" >&2
}

# Function to save current DND, brightness, and screen timeout states
save_current_states() {
    val=$(settings get system screen_brightness_mode) && echo "$val" > "$DEFAULTS_FILE.brightness"
    val=$(settings get global zen_mode) && echo "$val" > "$DEFAULTS_FILE.dnd"
    val=$(settings get system screen_off_timeout) && echo "$val" > "$DEFAULTS_FILE.timeout"
    log_debug "Saved current states: brightness=$val, dnd=$val, timeout=$val"
}

# Function to apply toggle settings
apply_toggles() {
    if [ -f "$TOGGLE_FILE" ]; then
        . "$TOGGLE_FILE" 2>/dev/null
        [ "$AUTO_BRIGHTNESS_OFF" = "1" ] && exec_root "settings put system screen_brightness_mode 0" && log_debug "Auto-brightness off"
        [ "$DND_ON" = "1" ] && exec_root "cmd notification set_dnd priority" && log_debug "DND on"
        [ "$DISABLE_LOGGING" = "1" ] && exec_root "stop logd" && log_debug "Logging disabled"
        [ "$KEEP_SCREEN_ON" = "1" ] && exec_root "settings put system screen_off_timeout 0" && log_debug "Keep screen on enabled"
    fi
}

# Function to restore saved states
restore_saved_states() {
    if [ -f "$DEFAULTS_FILE.brightness" ] && [ -f "$DEFAULTS_FILE.dnd" ] && [ -f "$DEFAULTS_FILE.timeout" ]; then
        local brightness=$(cat "$DEFAULTS_FILE.brightness")
        exec_root "settings put system screen_brightness_mode $brightness"
        log_debug "Restored brightness: $brightness"

        local dnd=$(cat "$DEFAULTS_FILE.dnd")
        case "$dnd" in
            0) exec_root "cmd notification set_dnd off" ;;
            1) exec_root "cmd notification set_dnd priority" ;;
            2) exec_root "cmd notification set_dnd total" ;;
            3) exec_root "cmd notification set_dnd alarms" ;;
        esac
        log_debug "Restored DND: $dnd"

        local timeout=$(cat "$DEFAULTS_FILE.timeout")
        exec_root "settings put system screen_off_timeout $timeout"
        log_debug "Restored timeout: $timeout"

        if [ -f "$TOGGLE_FILE" ]; then
            . "$TOGGLE_FILE" 2>/dev/null
            [ "$DISABLE_LOGGING" = "1" ] && exec_root "start logd" && log_debug "Logging re-enabled"
        fi

        rm -f "$DEFAULTS_FILE.brightness" "$DEFAULTS_FILE.dnd" "$DEFAULTS_FILE.timeout"
        log_debug "Cleared default state files"
    fi
}

# Function to check if a process is running
is_process_running() {
    local package="$1"
    pidof "$package" >/dev/null 2>&1
    return $?
}

# Function to extract package names from config.json (future-proof)
get_packages() {
    if [ ! -f "$CONFIG_JSON" ]; then
        log_debug "Error: config.json not found at $CONFIG_JSON"
        exit 1
    fi

    # Try jq if available (best method for JSON parsing)
    if command -v jq >/dev/null 2>&1; then
        log_debug "Using jq to parse config.json"
        jq -r 'to_entries[] | select(.key | startswith("PACKAGES_") and endswith("_DEVICE") | not) | .value[]' "$CONFIG_JSON" 2>/dev/null
        if [ $? -eq 0 ]; then
            return 0
        else
            log_debug "Warning: jq failed, falling back to grep"
        fi
    fi

    # Fallback: Extract package names from PACKAGES_* arrays
    log_debug "Using grep fallback to parse config.json"
    # Debug what grep sees
    local raw_output=$(cat "$CONFIG_JSON" | grep '"PACKAGES_')
    if [ -n "$raw_output" ]; then
        log_debug "Raw grep output: $raw_output"
    else
        log_debug "No lines matched 'PACKAGES_' in config.json"
    fi

    # Extract quoted strings with dots
    cat "$CONFIG_JSON" | grep '"PACKAGES_' | grep -oE '"[^"]+"' | tr -d '"' | grep '\.' | sort -u
    if [ $? -ne 0 ] || [ -z "$(cat "$CONFIG_JSON" | grep '"PACKAGES_' | grep -oE '"[^"]+"' | tr -d '"' | grep '\.')" ]; then
        log_debug "Error: Failed to extract packages with grep - consider installing 'jq' with 'pkg install jq' in Termux for reliable JSON parsing"
        exit 1
    fi
}

# Main monitoring loop
last_app=""
debounce_count=0
DEBOUNCE_THRESHOLD=3

# Test root access
log_debug "Starting script and checking root..."
exec_root "whoami" >/dev/null
if [ $? -ne 0 ]; then
    log_debug "Error: No root access"
    exit 1
fi
log_debug "Root access confirmed"

# Ensure log file is writable
su -c "touch $LOG_FILE" >/dev/null 2>&1
su -c "chmod 666 $LOG_FILE" >/dev/null 2>&1
log_debug "Log file setup at $LOG_FILE"

# Pre-cache package list
log_debug "Loading packages from config.json..."
PACKAGE_LIST=$(get_packages)
if [ -z "$PACKAGE_LIST" ]; then
    log_debug "Error: No packages found in config.json"
    exit 1
fi
PACKAGE_LIST=$(echo "$PACKAGE_LIST" | tr '\n' '|' | sed 's/|$//')
log_debug "Packages loaded: $PACKAGE_LIST"

while true; do
    window=$(su -c "dumpsys window" 2>/dev/null)
    if [ $? -ne 0 ]; then
        log_debug "Warning: Failed to get window dump"
        sleep 1
        continue
    fi

    current_app=$(echo "$window" | grep -E 'mCurrentFocus|mFocusedApp' | grep -Eo "$PACKAGE_LIST" | head -n 1)

    if [ -n "$current_app" ] && [ "$current_app" != "$last_app" ]; then
        debounce_count=$((debounce_count + 1))
        if [ "$debounce_count" -ge "$DEBOUNCE_THRESHOLD" ]; then
            log_debug "Detected new app: $current_app"
            save_current_states
            apply_toggles
            last_app="$current_app"
            debounce_count=0
        fi
    elif [ -z "$current_app" ] && [ -n "$last_app" ]; then
        debounce_count=$((debounce_count + 1))
        if [ "$debounce_count" -ge "$DEBOUNCE_THRESHOLD" ]; then
            if ! is_process_running "$last_app"; then
                log_debug "App closed: $last_app, restoring states"
                restore_saved_states
                last_app=""
            fi
            debounce_count=0
        fi
    else
        debounce_count=0
    fi

    sleep 1
done
