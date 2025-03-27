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
ARCH=$(getprop ro.product.cpu.abilist)
MODDIR=${MODPATH:-$MODDIR}

# Path to our binaries in the module
BIN_DIR="$MODDIR/bin"

# Target directory in system
TARGET_DIR="$MODDIR/system/bin"

# Create target dir if missing
mkdir -p "$TARGET_DIR"

if [ "$ARCH" = "arm64-v8a" ]; then
    cp "$BIN_DIR/arm64-v8a/jq" "$TARGET_DIR/jq"
elif [ "$ARCH" = "armeabi-v7a" ]; then
    cp "$BIN_DIR/armeabi-v7a/jq" "$TARGET_DIR/jq"
else
    echo "Unsupported CPU architecture: $ARCH"
    exit 1
fi

# Set permissions
chmod 0755 "$TARGET_DIR/jq"
ui_print "- COPG setup complete"
ui_print "- Click Action button to update your config if needed"
