#!/system/bin/sh
if ! $BOOTMODE; then
  ui_print "*********************************************************"
  ui_print "! Install from recovery is NOT supported"
  ui_print "! Please install from Magisk, KernelSU, or APatch app"
  abort "*********************************************************"
fi
if [ "$API" -lt 26 ]; then
  abort "! This module requires Android 9.0 or higher"
fi
check_zygisk() {
  ZYGISK_MODULE="/data/adb/modules/zygisksu"
  MAGISK_DIR="/data/adb/magisk"
  ZYGISK_MSG="Zygisk is not enabled. Please either:
  - Enable Zygisk in Magisk settings and reboot
  - Install Zygisk Next module for KernelSU and reboot"
  if [ -d "/data/adb/ksu" ]; then
    if ! [ -d "$ZYGISK_MODULE" ]; then
      ui_print "*********************************************************"
      ui_print "! $ZYGISK_MSG"
      abort "*********************************************************"
    else
      ui_print "- Zygisk Next detected for KernelSU"
    fi
  elif [ -d "$MAGISK_DIR" ]; then
    ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null)
    if [ "$ZYGISK_STATUS" = "value=0" ] || [ -z "$ZYGISK_STATUS" ]; then
      ui_print "*********************************************************"
      ui_print "! $ZYGISK_MSG"
      abort "*********************************************************"
    else
      ui_print "- Zygisk enabled in Magisk"
    fi
  else
    ui_print "*********************************************************"
    ui_print "! No supported root solution detected!"
    ui_print "! This module requires Magisk with Zygisk or KernelSU with Zygisk Next"
    abort "*********************************************************"
  fi
}
check_zygisk
chmod +x "$MODPATH/action.sh"
#!/system/bin/sh

MODDIR=${MODPATH:-$MODDIR}
BIN_DIR="$MODDIR/bin"
TARGET_DIR="$MODDIR/system/bin"

# Get primary ABI (most preferred architecture)
ABI_LIST=$(getprop ro.product.cpu.abilist)
PRIMARY_ABI=$(echo "$ABI_LIST" | cut -d',' -f1)

# Create target directory
mkdir -p "$TARGET_DIR"

# Install the correct jq binary
case "$PRIMARY_ABI" in
    "arm64-v8a"|"armv9-a")
        cp "$BIN_DIR/arm64-v8a/jq" "$TARGET_DIR/jq"
        ;;
    "armeabi-v7a")
        cp "$BIN_DIR/armeabi-v7a/jq" "$TARGET_DIR/jq"
        ;;
    *)
        echo "Unsupported primary ABI: $PRIMARY_ABI (Full list: $ABI_LIST)"
        exit 1
        ;;
esac

# Set permissions
chmod 0755 "$TARGET_DIR/jq"
chmod 0755 "$MODPATH/service.sh"
ui_print "- COPG setup complete"
ui_print "- Click Action button to update your config if needed"
