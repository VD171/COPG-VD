#!/system/bin/sh

# Paths
CONFIG_JSON="/data/adb/modules/COPG/config.json"
TOGGLE_FILE="/data/adb/copg_state"
DEFAULTS_FILE="/data/adb/copg_defaults"  # Base name for .brightness, .dnd, and .timeout

# Function to execute root commands
exec_root() {
    local cmd="$1"
    su -c "$cmd" >/dev/null 2>&1
    return $?
}

# Function to save current DND, brightness, and timeout states
save_current_states() {
    val=$(settings get system screen_brightness_mode) && echo "$val" > "$DEFAULTS_FILE.brightness"
    val=$(settings get global zen_mode) && echo "$val" > "$DEFAULTS_FILE.dnd"
    val=$(settings get system screen_off_timeout) && echo "$val" > "$DEFAULTS_FILE.timeout"
}

# Function to apply toggle settings
apply_toggles() {
    if [ -f "$TOGGLE_FILE" ]; then
        . "$TOGGLE_FILE" 2>/dev/null
        [ "$AUTO_BRIGHTNESS_OFF" = "1" ] && exec_root "settings put system screen_brightness_mode 0"
        [ "$DND_ON" = "1" ] && exec_root "cmd notification set_dnd priority"
        [ "$DISABLE_LOGGING" = "1" ] && exec_root "stop logd"
        [ "$KEEP_SCREEN_ON" = "1" ] && exec_root "settings put system screen_off_timeout 300000000"
    fi
}

# Function to restore saved states
restore_saved_states() {
    if [ -f "$DEFAULTS_FILE.brightness" ] && [ -f "$DEFAULTS_FILE.dnd" ] && [ -f "$DEFAULTS_FILE.timeout" ]; then
        local brightness=$(cat "$DEFAULTS_FILE.brightness")
        exec_root "settings put system screen_brightness_mode $brightness"

        local dnd=$(cat "$DEFAULTS_FILE.dnd")
        case "$dnd" in
            0) exec_root "cmd notification set_dnd off" ;;
            1) exec_root "cmd notification set_dnd priority" ;;
            2) exec_root "cmd notification set_dnd total" ;;
            3) exec_root "cmd notification set_dnd alarms" ;;
        esac

        local timeout=$(cat "$DEFAULTS_FILE.timeout")
        exec_root "settings put system screen_off_timeout $timeout"

        if [ -f "$TOGGLE_FILE" ]; then
            . "$TOGGLE_FILE" 2>/dev/null
            [ "$DISABLE_LOGGING" = "1" ] && exec_root "start logd"
        fi
    fi
    # Delete default files after applying states
    rm -f "$DEFAULTS_FILE.brightness" "$DEFAULTS_FILE.dnd" "$DEFAULTS_FILE.timeout"
}

# Function to check if a process is running
is_process_running() {
    local package="$1"
    pidof "$package" >/dev/null 2>&1
    return $?
}

# Function to extract package names from config.json using jq
get_packages() {
    if [ -f "$CONFIG_JSON" ]; then
        jq -r 'to_entries[] | select(.key | startswith("PACKAGES_") and endswith("_DEVICE") | not) | .value[]' "$CONFIG_JSON" 2>/dev/null || exit 1
    else
        exit 1
    fi
}

# Main monitoring loop
last_app=""
debounce_count=0
DEBOUNCE_THRESHOLD=3

# Test root access
exec_root "whoami" >/dev/null
if [ $? -ne 0 ]; then
    exit 1
fi

# Pre-cache package list
PACKAGE_LIST=$(get_packages | tr '\n' '|' | sed 's/|$//')
if [ -z "$PACKAGE_LIST" ]; then
    exit 1
fi

while true; do
    window=$(su -c "dumpsys window" 2>/dev/null)
    if [ $? -ne 0 ]; then
        sleep 1
        continue
    fi

    current_app=$(echo "$window" | grep -E 'mCurrentFocus|mFocusedApp' | grep -Eo "$PACKAGE_LIST" | head -n 1)

    if [ -n "$current_app" ] && [ "$current_app" != "$last_app" ]; then
        debounce_count=$((debounce_count + 1))
        if [ "$debounce_count" -ge "$DEBOUNCE_THRESHOLD" ]; then
            save_current_states
            apply_toggles
            last_app="$current_app"
            debounce_count=0
        fi
    elif [ -z "$current_app" ] && [ -n "$last_app" ]; then
        debounce_count=$((debounce_count + 1))
        if [ "$debounce_count" -ge "$DEBOUNCE_THRESHOLD" ]; then
            if ! is_process_running "$last_app"; then
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
