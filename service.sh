#!/system/bin/sh

# Paths as per your request
CONFIG_JSON="/data/adb/modules/COPG/config.json"
TOGGLE_FILE="/data/adb/copg_state"
STATE_FILE="/data/adb/copg_previous_state"

# Function to extract package names from config.json
get_packages() {
    cat "$CONFIG_JSON" | grep -oE '"com\.[^"]+"' | tr -d '"'
}

# Function to save current brightness and DND states
save_default_states() {
    su -c settings get system screen_brightness_mode > "$STATE_FILE.brightness"
    su -c settings get global zen_mode > "$STATE_FILE.dnd"
}

# Function to restore default states
restore_default_states() {
    if [ -f "$STATE_FILE.brightness" ] && [ -f "$STATE_FILE.dnd" ]; then
        su -c settings put system screen_brightness_mode "$(cat "$STATE_FILE.brightness")"
        su -c cmd notification set_dnd off
        rm -f "$STATE_FILE.brightness" "$STATE_FILE.dnd"
    fi
}

# Function to apply toggle settings
apply_toggle_settings() {
    if [ -f "$TOGGLE_FILE" ]; then
        . "$TOGGLE_FILE"  # Source the toggle file
        [ "$AUTO_BRIGHTNESS_OFF" = "1" ] && su -c settings put system screen_brightness_mode 0
        [ "$DND_ON" = "1" ] && su -c cmd notification set_dnd on
    fi
}

# Main monitoring loop
last_app=""
while true; do
    window=$(dumpsys window)
    current_app=$(echo "$window" | grep -E 'mCurrentFocus|mFocusedApp' | grep -Eo "$(get_packages | tr '\n' '|' | sed 's/|$//')")

    if [ -n "$current_app" ] && [ "$current_app" != "$last_app" ]; then
        echo "Game/App started: $current_app"
        save_default_states
        apply_toggle_settings
        last_app="$current_app"
    elif [ -z "$current_app" ] && [ -n "$last_app" ]; then
        echo "Game/App exited: $last_app"
        restore_default_states
        last_app=""
    fi

    sleep 1
done
