#!/system/bin/sh

# ================================================
# COPG Module Installation Script
# ================================================

# ┌──────────────────────────────────────────────┐
# │            Initial Checks                    │
# └──────────────────────────────────────────────┘
if ! $BOOTMODE; then
  ui_print "*********************************************************"
  ui_print "! Install from recovery is NOT supported"
  ui_print "! Please install from Magisk/KernelSU/APatch app"
  abort "*********************************************************"
fi

if [ "$API" -lt 26 ]; then
  abort "! This module requires Android 9.0+"
fi

check_zygisk() {
  ZYGISK_NEXT_MODULE="/data/adb/modules/zygisksu"
  MAGISK_DIR="/data/adb/magisk"
  KSU_DIR="/data/adb/ksu"
  
  # Check for KernelSU first
  if [ -d "$KSU_DIR" ]; then
    if [ -d "$ZYGISK_NEXT_MODULE" ]; then
      ui_print "- KernelSU with Zygisk Next detected"
      return 0
    else
      ui_print "*********************************************************"
      ui_print "! KernelSU detected but Zygisk Next not installed!"
      ui_print "! Please install Zygisk Next module and reboot"
      abort "*********************************************************"
    fi
  fi
  
  # Check for Magisk
  if [ -d "$MAGISK_DIR" ]; then
    # Case 1: Using Zygisk Next with Magisk
    if [ -d "$ZYGISK_NEXT_MODULE" ]; then
      ui_print "- Magisk with Zygisk Next detected"
      return 0
    fi
    
    # Case 2: Using native Magisk Zygisk
    ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null)
    if [ "$ZYGISK_STATUS" = "value=1" ]; then
      ui_print "- Magisk with native Zygisk detected"
      return 0
    fi
    
    # No Zygisk found
    ui_print "*********************************************************"
    ui_print "! Magisk detected but Zygisk not enabled!"
    ui_print "! Please either:"
    ui_print "! 1. Enable Zygisk in Magisk settings, OR"
    ui_print "! 2. Install Zygisk Next module"
    ui_print "! Then reboot before installing this module"
    abort "*********************************************************"
  fi
  
  # No supported root found
  ui_print "*********************************************************"
  ui_print "! No supported root solution detected!"
  ui_print "! Requires Magisk/KernelSU with Zygisk support"
  abort "*********************************************************"
}
check_zygisk

# ┌──────────────────────────────────────────────┐
# │            ABI Detection                    │
# └──────────────────────────────────────────────┘
# Improved ABI detection that handles edge cases
get_abi() {
  local abi_list=$(getprop ro.product.cpu.abilist)
  local abi=$(getprop ro.product.cpu.abi)
  
  # Fallback to primary ABI if abilist is empty
  [ -z "$abi_list" ] && abi_list="$abi"
  
  # Sanitize output (remove spaces, empty entries)
  echo "$abi_list" | tr -d ' ' | tr ',' '\n' | grep -v '^$'
}

# ┌──────────────────────────────────────────────┐
# │            Binary Installation              │
# └──────────────────────────────────────────────┘
MODDIR=${MODPATH:-$MODDIR}
BIN_DIR="$MODDIR/bin"
TARGET_DIR="$MODDIR/system/bin"

ui_print "- Installing jq binary for your architecture"

# Get sanitized ABI list
ABI_LIST=$(get_abi)

# Create target directory
mkdir -p "$TARGET_DIR" || {
  ui_print "! Failed to create system directory"
  abort
}

# Try architectures in priority order
for ABI in $ABI_LIST; do
  case "$ABI" in
    "arm64-v8a"|"armv8-a"|"armv9-a")
      if [ -f "$BIN_DIR/arm64-v8a/jq" ]; then
        cp "$BIN_DIR/arm64-v8a/jq" "$TARGET_DIR/jq" && \
        chmod 0755 "$TARGET_DIR/jq" && {
          ui_print "- Installed arm64-v8a version"
          break
        }
      fi
      ;;
    "armeabi-v7a")
      if [ -f "$BIN_DIR/armeabi-v7a/jq" ]; then
        cp "$BIN_DIR/armeabi-v7a/jq" "$TARGET_DIR/jq" && \
        chmod 0755 "$TARGET_DIR/jq" && {
          ui_print "- Installed armeabi-v7a version"
          break
        }
      fi
      ;;
  esac
done

# Verify installation
if ! [ -x "$TARGET_DIR/jq" ]; then
  ui_print "! Failed to install compatible jq binary"
  ui_print "! Supported ABIs: $ABI_LIST"
  abort "! No matching binary found in module"
fi

# Clean up bin directory
ui_print "- Cleaning up unused binary files"
rm -rf "$BIN_DIR" || ui_print "- Warning: Failed to remove bin directory"

# ┌──────────────────────────────────────────────┐
# │            Final Setup                      │
# └──────────────────────────────────────────────┘
chmod 0755 "$MODPATH/service.sh"
chmod 0755 "$MODPATH/action.sh"

ui_print "- COPG setup complete"
ui_print "- Click Action button to update config if needed"
