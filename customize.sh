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

check_zygisk() {
  ZYGISK_MODULE="/data/adb/modules/zygisksu"
  NEED_REBOOT=false

  # Detect root solution using official binaries
  if command -v apd >/dev/null; then
    ROOT_SOLUTION="APatch"
  elif command -v ksud >/dev/null; then
    ROOT_SOLUTION="KernelSU"
  elif command -v magisk >/dev/null; then
    ROOT_SOLUTION="Magisk"
  else
    ui_print "*********************************************************"
    ui_print "! No supported root solution detected!"
    ui_print "! Requires one of:"
    ui_print "! • Magisk v26.4+ with Zygisk"
    ui_print "! • KernelSU v0.7.0+ with Zygisk Next"
    ui_print "! • APatch v1.0.7+ with Zygisk Next"
    abort "*********************************************************"
  fi

  # Check Zygisk state
  if [ -d "$ZYGISK_MODULE" ]; then
    case "$ROOT_SOLUTION" in
      "APatch")
        if apd module list | grep -q "zygisksu.*disabled"; then
          ui_print "*********************************************************"
          ui_print "! Zygisk Next is disabled in APatch!"
          ui_print "! Required steps:"
          ui_print "! 1. Open APatch Manager"
          ui_print "! 2. Enable Zygisk Next module"
          abort "*********************************************************"
        fi
        ;;
      "KernelSU")
        if ksud module list | grep -q "\"name\":\"zygisksu\".*\"enable\":false"; then
          ui_print "*********************************************************"
          ui_print "! Zygisk Next is disabled in KernelSU!"
          ui_print "! Please enable it in KernelSU Manager"
          abort "*********************************************************"
        fi
        ;;
      "Magisk")
        if magisk --sqlite "SELECT value FROM modules WHERE name='zygisksu' AND enable=0;" 2>/dev/null | grep -q "1"; then
          ui_print "*********************************************************"
          ui_print "! Zygisk Next is disabled in Magisk!"
          ui_print "! Required steps:"
          ui_print "! 1. Open Magisk app"
          ui_print "! 2. Go to Modules tab"
          ui_print "! 3. Enable Zygisk Next"
          abort "*********************************************************"
        fi
        ;;
    esac
    ui_print "- ✔ ${ROOT_SOLUTION} with Zygisk Next detected"
  elif [ "$ROOT_SOLUTION" = "Magisk" ]; then
    if magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null | grep -q "value=1"; then
      ui_print "- ✔ Magisk with native Zygisk detected"
    else
      ui_print "*********************************************************"
      ui_print "! Magisk detected but Zygisk not enabled!"
      ui_print "! Required steps:"
      ui_print "! 1. Open Magisk Settings"
      ui_print "! 2. Enable Zygisk option"
      ui_print "! 3. Reboot your device"
      abort "*********************************************************"
    fi
  else
    ui_print "*********************************************************"
    ui_print "! ${ROOT_SOLUTION} detected but Zygisk Next not installed!"
    ui_print "! Required steps:"
    ui_print "! Install Zygisk Next module"
    abort "*********************************************************"
  fi
}

check_zygisk

# ┌──────────────────────────────────────────────┐
# │            ARM Binary Installation          │
# └──────────────────────────────────────────────┘
ui_print "- 🔄 Detecting device architecture"

# Supported ARM variants
ARM64_VARIANTS="arm64-v8a|armv8-a|armv9-a|arm64"
ARM32_VARIANTS="armeabi-v7a|armeabi|armv7-a|armv7l|armhf|arm"

# Get device ABI
PRIMARY_ABI=$(getprop ro.product.cpu.abi)
ABI_LIST=$(getprop ro.product.cpu.abilist)
ui_print "- Supported ABIs: $ABI_LIST"

# Create target directory
mkdir -p "$MODPATH/system/bin" || {
  ui_print "! Failed to create system directory"
  abort
}

# Install best matching binary
BINARY_INSTALLED=false
for ABI in $(echo "$ABI_LIST" | tr ',' ' '); do
  if echo "$ABI" | grep -qE "$ARM64_VARIANTS"; then
    if [ -f "$MODPATH/bin/arm64-v8a/jq" ]; then
      cp "$MODPATH/bin/arm64-v8a/jq" "$MODPATH/system/bin/jq"
      chmod 0755 "$MODPATH/system/bin/jq"
      ui_print "- ✔ Installed ARM64 binary (detected as: $ABI)"
      BINARY_INSTALLED=true
      break
    fi
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
  ui_print "! No compatible ARM binary found!"
  ui_print "! Supported architectures:"
  ui_print "! • ARM64 (arm64-v8a)"
  ui_print "! • ARM32 (armeabi-v7a)"
  abort "*********************************************************"
fi

# Cleanup
ui_print "- 🧹 Cleaning up unused binaries"
rm -rf "$MODPATH/bin"

# ┌──────────────────────────────────────────────┐
# │            Final Setup                      │
# └──────────────────────────────────────────────┘
chmod 0755 "$MODPATH/service.sh"
chmod 0755 "$MODPATH/action.sh"

ui_print "==============================================="
ui_print "✔ Installation completed successfully"
if $NEED_REBOOT; then
  ui_print " "
  ui_print "⚠ REBOOT REQUIRED ⚠"
  ui_print "Please reboot to activate module features"
else
  ui_print " "
  ui_print "ℹ Optional: Reboot if features don't appear"
fi
ui_print "==============================================="
