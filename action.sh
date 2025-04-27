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
chmod 0644 "$CONFIG_PATH"
chcon u:object_r:system_file:s0 "$CONFIG_PATH"
echo "✨ COPG config update complete!"
