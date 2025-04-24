#!/system/bin/sh

# Paths
CONFIG_JSON="/data/adb/modules/COPG/config.json"
TOGGLE_FILE="/data/adb/copg_state"
DEFAULTS_FILE="/data/adb/copg_defaults"  # Base name for .brightness, .dnd, and .timeout

# Function to execute root commands
exec_root() {
    su -c "$1" >/dev/null 2>&1
    return $?
}

# Function to save current DND, brightness, and timeout states
save_current_states() {
    local brightness_val dnd_val timeout_val
    brightness_val=$(settings get system screen_brightness_mode) && echo "$brightness_val" > "$DEFAULTS_FILE.brightness" && chmod 644 "$DEFAULTS_FILE.brightness" && sync || return 1
    dnd_val=$(settings get global zen_mode) && echo "$dnd_val" > "$DEFAULTS_FILE.dnd" && chmod 644 "$DEFAULTS_FILE.dnd" && sync || return 1
    timeout_val=$(settings get system screen_off_timeout) && echo "$timeout_val" > "$DEFAULTS_FILE.timeout" && chmod 644 "$DEFAULTS_FILE.timeout" && sync || return 1
    return 0
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

# Function to restore saved states with retry
restore_saved_states() {
    if [ -f "$DEFAULTS_FILE.brightness" ] && [ -f "$DEFAULTS_FILE.dnd" ] && [ -f "$DEFAULTS_FILE.timeout" ]; then
        local brightness=$(cat "$DEFAULTS_FILE.brightness" 2>/dev/null)
        if [ -n "$brightness" ]; then
            local retry=0
            local max_retries=5
            while [ $retry -lt $max_retries ]; do
                exec_root "settings put system screen_brightness_mode $brightness" && break
                sleep 2
                retry=$((retry + 1))
            done
            [ $retry -eq $max_retries ] && exec_root "settings put system screen_brightness 128"  # Fallback
        fi

        local dnd=$(cat "$DEFAULTS_FILE.dnd" 2>/dev/null)
        if [ -n "$dnd" ]; then
            local retry=0
            local max_retries=5
            while [ $retry -lt $max_retries ]; do
                case "$dnd" in
                    0) exec_root "cmd notification set_dnd off" ;;
                    1) exec_root "cmd notification set_dnd priority" ;;
                    2) exec_root "cmd notification set_dnd total" ;;
                    3) exec_root "cmd notification set_dnd alarms" ;;
                esac
                [ $? -eq 0 ] && break
                sleep 2
                retry=$((retry + 1))
            done
        fi

        local timeout=$(cat "$DEFAULTS_FILE.timeout" 2>/dev/null)
        [ -n "$timeout" ] && exec_root "settings put system screen_off_timeout $timeout"

        if [ -f "$TOGGLE_FILE" ]; then
            . "$TOGGLE_FILE" 2>/dev/null
            [ "$DISABLE_LOGGING" = "1" ] && exec_root "start logd"
        fi

        rm -f "$DEFAULTS_FILE.brightness" "$DEFAULTS_FILE.dnd" "$DEFAULTS_FILE.timeout"
    fi
}

# Function to check if any package from the list is running
is_any_package_running() {
    local package_list="$1"
    for package in $(echo "$package_list" | tr '|' ' '); do
        pidof "$package" >/dev/null 2>&1 && return 0
    done
    return 1
}

# Function to extract package names from config.json using jq
get_packages() {
    if ! command -v jq >/dev/null 2>&1; then
        exit 1
    fi
    if [ -f "$CONFIG_JSON" ]; then
        jq -r 'to_entries[] | select(.key | startswith("PACKAGES_") and endswith("_DEVICE") | not) | .value[]' "$CONFIG_JSON" 2>/dev/null || exit 1
    else
        exit 1
    fi
}

# Boot-time restoration
exec_root "whoami" >/dev/null || exit 1
restore_saved_states

# Main monitoring loop
last_app=""
debounce_count=0
DEBOUNCE_THRESHOLD=5
states_saved=0

PACKAGE_LIST=$(get_packages | tr '\n' '|' | sed 's/|$//')
[ -z "$PACKAGE_LIST" ] && exit 1

while true; do
    window=$(su -c "dumpsys window" 2>/dev/null) || { sleep 1; continue; }
    current_app=$(echo "$window" | grep -E 'mCurrentFocus|mFocusedApp' | grep -Eo "$PACKAGE_LIST" | head -n 1)

    if [ -n "$current_app" ] && [ "$current_app" != "$last_app" ] && [ "$states_saved" -eq 0 ]; then
        debounce_count=$((debounce_count + 1))
        if [ "$debounce_count" -ge "$DEBOUNCE_THRESHOLD" ]; then
            save_current_states && apply_toggles
            states_saved=1
            last_app="$current_app"
            debounce_count=0
        fi
    elif [ -n "$current_app" ] && [ "$current_app" != "$last_app" ] && [ "$states_saved" -eq 1 ]; then
        last_app="$current_app"
        debounce_count=0
    elif [ -z "$current_app" ] && [ "$states_saved" -eq 1 ]; then
        debounce_count=$((debounce_count + 1))
        if [ "$debounce_count" -ge "$DEBOUNCE_THRESHOLD" ]; then
            if ! is_any_package_running "$PACKAGE_LIST"; then
                restore_saved_states
                states_saved=0
                last_app=""
            fi
            debounce_count=0
        fi
    else
        debounce_count=0
    fi
    sleep 0.5
done
