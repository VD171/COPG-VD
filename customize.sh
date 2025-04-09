# ================================================
# COPG Module Installation Script
# ================================================

# ┌──────────────────────────────────────────────┐
# │            Initial Checks                            │
# └──────────────────────────────────────────────┘
if ! $BOOTMODE; then
  ui_print "*********************************************************"
  ui_print "! INSTALLATION FAILED!"
  ui_print "! Recovery installation is NOT supported"
  abort "*********************************************************"
fi

if [ "$API" -lt 26 ]; then
  ui_print "*********************************************************"
  ui_print "! UNSUPPORTED ANDROID VERSION"
  ui_print "! This module requires Android 9.0 (API 26) or higher"
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
    ui_print "! NO ROOT SOLUTION FOUND!"
    ui_print "! Requires Magisk/KernelSU/APatch with Zygisk"
    abort "*********************************************************"
  fi

  # Check Zygisk state
  if [ -d "$ZYGISK_MODULE" ]; then
    if is_module_disabled "$ZYGISK_MODULE" "$ROOT_SOLUTION"; then
      ui_print "*********************************************************"
      ui_print "! ZYGISK NEXT IS DISABLED!"
      ui_print "! Please enable it in ${ROOT_SOLUTION} Manager"
      [ "$ROOT_SOLUTION" = "APatch" ] && NEED_REBOOT=true
      abort "*********************************************************"
    fi
    ui_print "- ✔ ${ROOT_SOLUTION} with Zygisk Next detected"
  elif [ "$ROOT_SOLUTION" = "Magisk" ]; then
    if magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null | grep -q "value=1"; then
      ui_print "- ✔ Magisk with native Zygisk detected"
    else
      ui_print "*********************************************************"
      ui_print "! ZYGISK REQUIRED!"
      ui_print "! Please enable Zygisk in Magisk settings"
      abort "*********************************************************"
    fi
  else
    ui_print "*********************************************************"
    ui_print "! ZYGISK NEXT REQUIRED!"
    ui_print "! Please install Zygisk Next for ${ROOT_SOLUTION}"
    abort "*********************************************************"
  fi

  # Set reboot recommendation
  if [ "$ROOT_SOLUTION" = "APatch" ]; then
    NEED_REBOOT=true
  fi
}

check_zygisk

# ┌──────────────────────────────────────────────┐
# │            ARM Binary Installation                   │
# └──────────────────────────────────────────────┘
ui_print "- 🔄 Detecting ARM architecture"

# Get complete ABI information
ABI_LIST=$(getprop ro.product.cpu.abilist)
ui_print "- Detected CPU ABIs: $ABI_LIST"

# Create target directory
mkdir -p "$MODPATH/system/bin" || {
  ui_print "! Failed to create system directory"
  abort
}

# Supported ARM variants (expanded list)
ARM64_VARIANTS="arm64-v8a|armv8-a|armv9-a|arm64"
ARM32_VARIANTS="armeabi-v7a|armeabi|armv7-a|armv7l|armhf|arm"

# Install best matching binary
BINARY_INSTALLED=false
for ABI in $(echo "$ABI_LIST" | tr ',' ' '); do
  # ARM64 check
  if echo "$ABI" | grep -qE "$ARM64_VARIANTS"; then
    if [ -f "$MODPATH/bin/arm64-v8a/jq" ]; then
      cp "$MODPATH/bin/arm64-v8a/jq" "$MODPATH/system/bin/jq"
      chmod 0755 "$MODPATH/system/bin/jq"
      ui_print "- ✔ Installed ARM64 binary (detected as: $ABI)"
      BINARY_INSTALLED=true
      break
    fi
  # ARM32 check
  elif echo "$ABI" | grep -qE "$ARM32_VARIANTS"; then
    if [ -f "$MODPATH/bin/armeabi-v7a/jq" ]; then
      cp "$MODPATH/bin/armeabi-v7a/jq" "$MODPATH/system/bin/jq"
      chmod 0755 "$MODPATH/system/bin/jq"
      ui_print "- ✔ Installed ARM32 binary (detected as: $ABI)"
      BINARY_INSTALLED=true
      break
    fi
  fi
done

if ! $BINARY_INSTALLED; then
  ui_print "*********************************************************"
  ui_print "! NO COMPATIBLE ARM BINARY FOUND!"
  ui_print "! This module supports ARM only (32-bit or 64-bit)"
  ui_print "! Your device ABIs: $ABI_LIST"
  abort "*********************************************************"
fi

# Cleanup
ui_print "- 🧹 Cleaning up unused binaries"
rm -rf "$MODPATH/bin"

# ┌──────────────────────────────────────────────┐
# │            Final Setup                               │
# └──────────────────────────────────────────────┘
chmod 0755 "$MODPATH/service.sh"
chmod 0755 "$MODPATH/action.sh"

ui_print "==============================================="
ui_print "✔ Installation successful"
  ui_print "⚠ REBOOT REQUIRED ⚠"
  ui_print "Please reboot your device to activate module"
ui_print "==============================================="
