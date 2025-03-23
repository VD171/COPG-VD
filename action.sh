#!/system/bin/sh
MODDIR="/data/adb/modules/COPG"
CONFIG_URL="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/config.json"
CONFIG_PATH="$MODDIR/config.json"
TEMP_CONFIG="/data/adb/copg_temp_config.json"
LOG_FILE="/data/adb/copg_action.log"

# Function to log messages with timestamp and emojis
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 🌟 [COPG] $1" >> "$LOG_FILE"
    echo "🌟 [COPG] $1"  # Echo to stdout for WebView output
}

# Ensure log file exists
touch "$LOG_FILE"

# Determine downloader
if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl -s -o"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget -q -O"
else
    log "❌ Error: curl or wget not found. Please install one to download config."
    exit 1
fi

log "⬇️ Downloading config.json from GitHub..."
$DOWNLOADER "$TEMP_CONFIG" "$CONFIG_URL"

if [ $? -ne 0 ]; then
    log "❌ Failed to download config.json. Check your internet or URL."
    rm -f "$TEMP_CONFIG"
    exit 1
fi

# Compare with existing config (if it exists)
if [ -f "$CONFIG_PATH" ]; then
    OLD_HASH=$(md5sum "$CONFIG_PATH" 2>/dev/null | awk '{print $1}')
    NEW_HASH=$(md5sum "$TEMP_CONFIG" 2>/dev/null | awk '{print $1}')
    
    if [ "$OLD_HASH" = "$NEW_HASH" ]; then
        log "✅ Your config is already up-to-date!"
        rm -f "$TEMP_CONFIG"
        log "✨ COPG config check complete!"
        exit 0
    fi
fi

# If different or no local config exists, update it
log "✅ Config downloaded successfully!"
mv "$TEMP_CONFIG" "$CONFIG_PATH"
log "📍 Saved to: $CONFIG_PATH"
chmod 644 "$CONFIG_PATH"
log "🔄 Reboot your device to apply changes"
log "✨ COPG config update complete!"