#!/system/bin/sh

# Paths
CONFIG_JSON="/data/adb/modules/COPG/config.json"
TOGGLE_FILE="/data/adb/copg_state"

# Function to extract package names from config.json
get_packages() {
    cat "$CONFIG_JSON" | grep -oE '"com\.[^"]+"' | tr -d '"'
}

# Function to apply toggle settings
apply_toggle_settings() {
    if [ -f "$TOGGLE_FILE" ]; then
        . "$TOGGLE_FILE"  # Source the toggle file
        [ "$AUTO_BRIGHTNESS_OFF" = "1" ] && su -c settings put system screen_brightness_mode 0
        [ "$DND_ON" = "1" ] && su -c cmd notification set_dnd on
        [ "$DISABLE_LOGGING" = "1" ] && su -c stop logd
    fi
}

# Function to restore settings
restore_settings() {
    if [ -f "$TOGGLE_FILE" ]; then
        . "$TOGGLE_FILE"
        [ "$AUTO_BRIGHTNESS_OFF" = "1" ] && su -c settings put system screen_brightness_mode 1  # Re-enable auto-brightness
        [ "$DND_ON" = "1" ] && su -c cmd notification set_dnd off  # Disable DND
        [ "$DISABLE_LOGGING" = "1" ] && su -c start logd  # Restart logd
    fi
}

# Main monitoring loop
last_app=""
while true; do
    # Use dumpsys activity to track top activity more reliably
    current_app=$(dumpsys activity | grep -m 1 "mResumedActivity" | grep -Eo "$(get_packages | tr '\n' '|' | sed 's/|$//')")

    if [ -n "$current_app" ] && [ "$current_app" != "$last_app" ]; then
        echo "Game/App started: $current_app"
        apply_toggle_settings
        last_app="$current_app"
    elif [ -z "$current_app" ] && [ -n "$last_app" ]; then
        echo "Game/App exited: $last_app"
        restore_settings
        last_app=""
    fi

    sleep 1
done
