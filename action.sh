#!/system/bin/sh
MODDIR="/data/adb/modules/COPG"
CONFIG_URL="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/config.json"
LIST_URL="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/list.json"
CONFIG_PATH="$MODDIR/COPG.json"
LIST_PATH="$MODDIR/list.json"
TEMP_CONFIG="/data/adb/copg_temp_config.json"
TEMP_LIST="/data/adb/copg_temp_list.json"

if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl -s -o"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget -q -O"
else
    echo "❌ Error: curl or wget not found. Please install one to download config."
    exit 1
fi

download_and_update() {
    local url="$1"
    local temp_path="$2"
    local final_path="$3"
    local file_name="$4"
    
    echo "⬇️ Downloading $file_name from GitHub..."
    $DOWNLOADER "$temp_path" "$url"
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to download $file_name. Check your internet or URL."
        rm -f "$temp_path"
        return 1
    fi
    
    if ! grep -q '{' "$temp_path" && ! grep -q '[' "$temp_path"; then
        echo "❌ Downloaded $file_name doesn't appear to be valid JSON"
        rm -f "$temp_path"
        return 1
    fi
    
    if [ -f "$final_path" ]; then
        OLD_HASH=$(md5sum "$final_path" 2>/dev/null | awk '{print $1}')
        NEW_HASH=$(md5sum "$temp_path" 2>/dev/null | awk '{print $1}')
        
        if [ "$OLD_HASH" = "$NEW_HASH" ]; then
            echo "✅ Your $file_name is already up-to-date!"
            rm -f "$temp_path"
            return 0
        fi
    fi
    
    echo "🔄 Updating $file_name..."
    mv "$temp_path" "$final_path"
    chmod 0644 "$final_path"
    chcon u:object_r:system_file:s0 "$final_path"
    echo "✅ Successfully updated $file_name at $final_path"
    return 0
}

echo "❓ Do you want to update/reset the game and device list?"
echo "➕ Volume Up: Yes"
echo "➖ Volume Down: No"

TIMEOUT=10
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "⏰ Timeout reached (10 seconds)."
        echo "❌ Update canceled."
        exit 0
    fi

    if command -v timeout >/dev/null 2>&1; then
        EVENT=$(timeout 0.1 getevent -lc1 2>/dev/null | tr -d '\r')
    else
        EVENT=$(getevent -lc1 2>/dev/null | tr -d '\r')
    fi
    
    if [ -n "$EVENT" ]; then
        if echo "$EVENT" | grep -q "KEY_VOLUMEUP.*DOWN"; then
            echo "✅ Volume Up pressed. Proceeding with update..."
            break
        elif echo "$EVENT" | grep -q "KEY_VOLUMEDOWN.*DOWN"; then
            echo "❌ Volume Down pressed. Update canceled."
            exit 0
        fi
    fi
    
    sleep 0.05
done

mkdir -p "$MODDIR"

download_and_update "$CONFIG_URL" "$TEMP_CONFIG" "$CONFIG_PATH" "config.json"

download_and_update "$LIST_URL" "$TEMP_LIST" "$LIST_PATH" "list.json"

echo "✨ COPG configs update complete!"
