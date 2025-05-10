#!/system/bin/sh
MODDIR="/data/adb/modules/COPG"
CONFIG_URL="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/config.json"
LIST_URL="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/list.json"
CONFIG_PATH="$MODDIR/config.json"
LIST_PATH="$MODDIR/list.json"
TEMP_CONFIG="/data/adb/copg_temp_config.json"
TEMP_LIST="/data/adb/copg_temp_list.json"

# Determine downloader
if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl -s -o"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget -q -O"
else
    echo "❌ Error: curl or wget not found. Please install one to download config."
    exit 1
fi

# Function to download and update files
update_file() {
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
    
    # Compare with existing file (if it exists)
    if [ -f "$final_path" ]; then
        OLD_HASH=$(md5sum "$final_path" 2>/dev/null | awk '{print $1}')
        NEW_HASH=$(md5sum "$temp_path" 2>/dev/null | awk '{print $1}')
        
        if [ "$OLD_HASH" = "$NEW_HASH" ]; then
            echo "✅ Your $file_name is already up-to-date!"
            rm -f "$temp_path"
            return 0
        fi
    fi
    
    # If different or no local file exists, update it
    echo "✅ $file_name downloaded successfully!"
    mv "$temp_path" "$final_path"
    echo "📍 Saved to: $final_path"
    chmod 0644 "$final_path"
    chcon u:object_r:system_file:s0 "$final_path"
    chmod 0644 "$temp_path"
    chcon u:object_r:system_file:s0 "$temp_path"
    return 0
}

# Update config.json
update_file "$CONFIG_URL" "$TEMP_CONFIG" "$CONFIG_PATH" "config.json"

# Update list.json
update_file "$LIST_URL" "$TEMP_LIST" "$LIST_PATH" "list.json"

echo "✨ COPG config update complete!"
