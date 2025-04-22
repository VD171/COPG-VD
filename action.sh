#!/system/bin/sh
MODDIR="/data/adb/modules/COPG"
CONFIG_URL="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/config.json"
CONFIG_PATH="$MODDIR/config.json"
TEMP_CONFIG="/data/adb/copg_temp_config.json"

# Determine downloader
if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl -s -o"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget -q -O"
else
    echo "❌ Error: curl or wget not found. Please install one to download config."
    exit 1
fi

echo "⬇️ Downloading config.json from GitHub..."
$DOWNLOADER "$TEMP_CONFIG" "$CONFIG_URL"

if [ $? -ne 0 ]; then
    echo "❌ Failed to download config.json. Check your internet or URL."
    rm -f "$TEMP_CONFIG"
    exit 1
fi

# Compare with existing config (if it exists)
if [ -f "$CONFIG_PATH" ]; then
    OLD_HASH=$(md5sum "$CONFIG_PATH" 2>/dev/null | awk '{print $1}')
    NEW_HASH=$(md5sum "$TEMP_CONFIG" 2>/dev/null | awk '{print $1}')
    
    if [ "$OLD_HASH" = "$NEW_HASH" ]; then
        echo "✅ Your config is already up-to-date!"
        rm -f "$TEMP_CONFIG"
        echo "✨ COPG config check complete!"
        exit 0
    fi
fi

# If different or no local config exists, update it
echo "✅ Config downloaded successfully!"
mv "$TEMP_CONFIG" "$CONFIG_PATH"
echo "📍 Saved to: $CONFIG_PATH"
chmod 644 "$CONFIG_PATH"
echo "🔄 Reboot required to apply changes"

# Prompt for reboot with volume keys
echo "❓ Reboot now to apply changes? (Volume Up: Yes, Volume Down: No)"

# Time-based timeout (10 seconds)
TIMEOUT=10
START_TIME=$(date +%s)

while true; do
    # Check elapsed time
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "⏰ Timeout reached (10 seconds). No reboot initiated."
        echo "✨ COPG config update complete!"
        exit 0
    fi

    # Capture one input event with timeout (if available)
    if command -v timeout >/dev/null 2>&1; then
        EVENT=$(timeout 0.1 getevent -lc1 2>/dev/null | tr -d '\r')
    else
        EVENT=$(getevent -lc1 2>/dev/null | tr -d '\r')
    fi
    
    # Check for volume key presses
    if [ -n "$EVENT" ]; then
        if echo "$EVENT" | grep -q "KEY_VOLUMEUP.*DOWN"; then
            echo "✅ Volume Up pressed. Rebooting now..."
            reboot
            exit 0
        elif echo "$EVENT" | grep -q "KEY_VOLUMEDOWN.*DOWN"; then
            echo "❌ Volume Down pressed. No reboot initiated."
            echo "✨ COPG config update complete!"
            exit 0
        fi
    fi
    
    # Short sleep to reduce CPU usage
    sleep 0.05
done
