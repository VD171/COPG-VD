#!/system/bin/sh

# ================================================
# COPG Module Installation Script
# ================================================

# ┌──────────────────────────────────────────────┐
# │            Initial Checks                   │
# └──────────────────────────────────────────────┘
if ! $BOOTMODE; then
  ui_print "*********************************************************"
  ui_print "! Install from recovery is NOT supported"
  ui_print "! Please install from Magisk/KernelSU/APatch app"
  abort "*********************************************************"
fi

if [ "$API" -lt 26 ]; then
  ui_print "*********************************************************"
  ui_print "! This module requires Android 9.0+"
  abort "*********************************************************"
fi

# Function to check module state
is_module_disabled() {
  local module_path="$1"
  local root_solution="$2"
  
  [ -f "$module_path/disable" ] && return 0
  
  case "$root_solution" in
    "KernelSU")
      command -v ksud >/dev/null && ksud module list | grep -q "\"name\":\"zygisksu\".*\"enable\":false" && return 0
      ;;
    "Magisk")
      command -v magisk >/dev/null && magisk --sqlite "SELECT value FROM modules WHERE name='zygisksu' AND enable=0;" 2>/dev/null | grep -q "1" && return 0
      ;;
    "APatch")
      command -v apd >/dev/null && apd module list | grep -q "zygisksu.*disabled" && return 0
      ;;
  esac
  return 1
}

check_zygisk() {
  ZYGISK_MODULE="/data/adb/modules/zygisksu"
  NEED_REBOOT=false
  
  # Detect root solutions
  if [ -d "/data/adb/ap" ]; then
    ROOT_SOLUTION="APatch"
  elif [ -d "/data/adb/ksu" ]; then
    ROOT_SOLUTION="KernelSU"
  elif [ -d "/data/adb/magisk" ]; then
    ROOT_SOLUTION="Magisk"
  else
    ui_print "*********************************************************"
    ui_print "! No supported root solution detected!"
    ui_print "! Requires Magisk/KernelSU/APatch with Zygisk support"
    abort "*********************************************************"
  fi

  # Check Zygisk state
  if [ -d "$ZYGISK_MODULE" ]; then
    if is_module_disabled "$ZYGISK_MODULE" "$ROOT_SOLUTION"; then
      ui_print "*********************************************************"
      ui_print "! Zygisk Next is disabled!"
      if [ "$ROOT_SOLUTION" = "Magisk" ]; then
        ui_print "! Please enable it in Magisk Manager:"
        ui_print "! 1. Open Magisk app"
        ui_print "! 2. Go to Modules tab"
        ui_print "! 3. Enable Zygisk Next"
      else
        ui_print "! Please enable it in ${ROOT_SOLUTION} Manager"
      fi
      [ "$ROOT_SOLUTION" = "APatch" ] && ui_print "! Then reboot your device"
      abort "*********************************************************"
    fi
    ui_print "- ${ROOT_SOLUTION} with Zygisk Next detected"
  elif [ "$ROOT_SOLUTION" = "Magisk" ]; then
    ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null)
    if [ "$ZYGISK_STATUS" = "value=1" ]; then
      ui_print "- Magisk with native Zygisk detected"
    else
      ui_print "*********************************************************"
      ui_print "! Magisk detected but Zygisk not enabled!"
      ui_print "! Please enable Zygisk in Magisk Settings:"
      ui_print "! 1. Open Magisk app"
      ui_print "! 2. Go to Settings"
      ui_print "! 3. Enable 'Zygisk' option"
      ui_print "! 4. Reboot and reinstall this module"
      abort "*********************************************************"
    fi
  else
    ui_print "*********************************************************"
    ui_print "! ${ROOT_SOLUTION} detected but Zygisk Next not installed!"
    ui_print "! Please install Zygisk Next module"
    abort "*********************************************************"
  fi

  if [ "$ROOT_SOLUTION" = "APatch" ]; then
    NEED_REBOOT=true
  fi
}

check_zygisk

# ┌──────────────────────────────────────────────┐
# │            Binary Installation              │
# └──────────────────────────────────────────────┘
MODDIR=${MODPATH:-$MODDIR}
BIN_DIR="$MODDIR/bin"
TARGET_DIR="$MODPATH/system/bin"

ui_print "- Installing jq binary for your architecture"

# Get ALL supported ABIs in priority order
ABI_LIST=$(getprop ro.product.cpu.abilist)

# Create target directory
mkdir -p "$TARGET_DIR" || {
  ui_print "! Failed to create system directory"
  abort
}

# Try architectures in priority order
BINARY_INSTALLED=false
for ABI in $(echo "$ABI_LIST" | tr ',' ' '); do
  case "$ABI" in
    "arm64-v8a"|"armv8-a"|"armv9-a")
      if [ -f "$BIN_DIR/arm64-v8a/jq" ]; then
        cp "$BIN_DIR/arm64-v8a/jq" "$TARGET_DIR/jq" && \
        chmod 0755 "$TARGET_DIR/jq" && {
          ui_print "- Installed arm64-v8a version"
          BINARY_INSTALLED=true
          break
        }
      fi
      ;;
    "armeabi-v7a"|"armeabi"|"armv7-a"|"armhf")
      if [ -f "$BIN_DIR/armeabi-v7a/jq" ]; then
        cp "$BIN_DIR/armeabi-v7a/jq" "$TARGET_DIR/jq" && \
        chmod 0755 "$TARGET_DIR/jq" && {
          ui_print "- Installed armeabi-v7a version"
          BINARY_INSTALLED=true
          break
        }
      fi
      ;;
  esac
done

if ! $BINARY_INSTALLED; then
  ui_print "*********************************************************"
  ui_print "! Failed to install compatible jq binary"
  ui_print "! Supported ARM ABIs: arm64-v8a, armeabi-v7a"
  ui_print "! Your device supports: $ABI_LIST"
  abort "*********************************************************"
fi

# Clean up unused binary subdirectories
ui_print "- Cleaning up unused binary files"
rm -rf "$BIN_DIR"

# ┌──────────────────────────────────────────────┐
# │            Final Setup                      │
# └──────────────────────────────────────────────┘
chmod 0755 "$MODPATH/service.sh"
chmod 0755 "$MODPATH/action.sh"

ui_print "- COPG setup complete"
if $NEED_REBOOT; then
  ui_print "- Please reboot your device"
else
  ui_print "- Click Action button to update config if needed"
fi
