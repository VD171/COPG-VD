# ================================================
# COPG Module Installation Script
# ================================================

INSTALL_SUCCESS=true

print_box_start() {
  ui_print "╔═════════════════════════════════╗"
  ui_print "                                 "
}

print_box_end() {
  ui_print "                                 "
  ui_print "╚═════════════════════════════════╝"
}

print_empty_line() {
  ui_print "                                 "
}

print_failure_and_exit() {
  local section="$1"
  print_empty_line
  ui_print " ✗ Installation Failed!          "
  if [ "$section" = "binary" ]; then
    print_empty_line
    print_empty_line
    print_empty_line
  fi
  print_box_end
  exit 1
}

check_zygisk() {
  ZYGISK_MODULE="/data/adb/modules/zygisksu"

  print_box_start
  ui_print "      ✦ Zygisk Detection ✦      "
  print_empty_line

  DETECTED_ROOT_SOLUTIONS=""
  ROOT_SOLUTION_COUNT=0

  if command -v apd >/dev/null; then
    DETECTED_ROOT_SOLUTIONS="$DETECTED_ROOT_SOLUTIONS APatch"
    ROOT_SOLUTION_COUNT=$((ROOT_SOLUTION_COUNT + 1))
    ROOT_SOLUTION="APatch"
    MANAGER_NAME="APatch Manager"
  fi

  if command -v ksud >/dev/null; then
    DETECTED_ROOT_SOLUTIONS="$DETECTED_ROOT_SOLUTIONS KernelSU"
    ROOT_SOLUTION_COUNT=$((ROOT_SOLUTION_COUNT + 1))
    if [ $ROOT_SOLUTION_COUNT -eq 1 ]; then
      ROOT_SOLUTION="KernelSU"
      MANAGER_NAME="KernelSU Manager"
    fi
  fi

  if command -v magisk >/dev/null; then
    DETECTED_ROOT_SOLUTIONS="$DETECTED_ROOT_SOLUTIONS Magisk"
    ROOT_SOLUTION_COUNT=$((ROOT_SOLUTION_COUNT + 1))
    if [ $ROOT_SOLUTION_COUNT -eq 1 ]; then
      ROOT_SOLUTION="Magisk"
      MANAGER_NAME="Magisk Manager"
    fi
  fi

  if [ $ROOT_SOLUTION_COUNT -gt 1 ]; then
    ui_print " ✗ Multiple Root Solutions Found!"
    ui_print " ➤ Detected:$DETECTED_ROOT_SOLUTIONS"
    ui_print " ➤ Only One Root Solution Allowed"
    print_failure_and_exit "zygisk"
  elif [ $ROOT_SOLUTION_COUNT -eq 0 ]; then
    ui_print " ✗ No Supported Root Solution!   "
    ui_print " ➤ Supported Solutions:          "
    ui_print " ➤ • Magisk v26.4+ (Zygisk/Next) "
    ui_print " ➤ • KernelSU v0.7.0+ (Next)    "
    ui_print " ➤ • APatch v1.0.7+ (Next)      "
    print_failure_and_exit "zygisk"
  else
    ui_print " ➔ Root Solution: $ROOT_SOLUTION "
  fi

  if [ "$ROOT_SOLUTION" = "Magisk" ]; then
    ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null)
    if [ "$ZYGISK_STATUS" = "value=1" ]; then
      if [ -d "$ZYGISK_MODULE" ] && [ -f "$ZYGISK_MODULE/disable" ]; then
        ui_print " ⚠ Zygisk Next Installed but Disabled!  "
        ui_print " ➤ Using Native Zygisk Instead ... "
        print_empty_line
      fi
      ui_print " ✔ Magisk: Native Zygisk Active  "
      print_box_end
    elif [ -d "$ZYGISK_MODULE" ]; then
      if [ -f "$ZYGISK_MODULE/disable" ]; then
        ui_print " ✗ Zygisk Next Disabled!         "
        ui_print " ✗ No Native Zygisk Active       "
        ui_print " ➤ Enable One Of:                "
        ui_print " ➤ 1. Settings → Zygisk         "
        ui_print " ➤ 2. Modules → Zygisk Next     "
        print_failure_and_exit "zygisk"
      fi
      ui_print " ✔ Magisk: Zygisk Next Active    "
      print_box_end
    else
      ui_print " ✗ Magisk: No Zygisk Detected!   "
      ui_print " ➤ Enable One Of:                "
      ui_print " ➤ 1. Settings → Zygisk         "
      ui_print " ➤ 2. Install Zygisk Next       "
      print_failure_and_exit "zygisk"
    fi
  else
    if [ -f "$ZYGISK_MODULE/disable" ]; then
      ui_print " ✗ $ROOT_SOLUTION: Zygisk Next Disabled! "
      ui_print " ➤ Enable in $MANAGER_NAME    "
      print_failure_and_exit "zygisk"
    elif [ -d "$ZYGISK_MODULE" ]; then
      ui_print " ✔ $ROOT_SOLUTION: Zygisk Next Active    "
      print_box_end
    else
      ui_print " ✗ $ROOT_SOLUTION: Zygisk Next Not Found! "
      ui_print " ➤ Install Zygisk Next Module    "
      print_failure_and_exit "zygisk"
    fi
  fi
}

if ! $BOOTMODE; then
  print_box_start
  ui_print "      ✦ Installation Error ✦     "
  print_empty_line
  ui_print " ✗ Recovery Mode Not Supported!  "
  ui_print " ➤ Install via Magisk/KSU/APatch "
  print_failure_and_exit "initial"
fi

if [ "$API" -lt 26 ]; then
  print_box_start
  ui_print "      ✦ Installation Error ✦     "
  print_empty_line
  ui_print " ✗ Android Version Too Old!      "
  ui_print " ➤ Requires Android 9.0+         "
  print_failure_and_exit "initial"
fi

if $INSTALL_SUCCESS; then
  check_zygisk || {
    INSTALL_SUCCESS=false
  }
fi

if $INSTALL_SUCCESS; then
  print_box_start
  ui_print "      ✦ Installing Binary ✦     "
  print_empty_line
  ui_print " ⚙ Detecting Device Architecture "

  ARM64_VARIANTS="arm64-v8a|armv8-a|armv9-a|arm64"
  ARM32_VARIANTS="armeabi-v7a|armeabi|armv7-a|armv7l|armhf|arm"

  ABI_LIST=$(getprop ro.product.cpu.abilist)
  ui_print " 📜 Supported ABIs: $ABI_LIST"

  mkdir -p "$MODPATH/system/bin" || {
    ui_print " ✗ Failed to Create System Dir!   "
    print_failure_and_exit "binary"
  }

  if $INSTALL_SUCCESS; then
    BINARY_INSTALLED=false
    for ABI in $(echo "$ABI_LIST" | tr ',' ' '); do
      if echo "$ABI" | grep -qE "$ARM64_VARIANTS"; then
        if [ -f "$MODPATH/bin/arm64-v8a/jq" ]; then
          cp "$MODPATH/bin/arm64-v8a/jq" "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Copy ARM64 Binary!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Set Permissions!    "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM64 Binary        "
          ui_print " ➤ ($ABI)                        "
          BINARY_INSTALLED=true
          break
        fi
      elif echo "$ABI" | grep -qE "$ARM32_VARIANTS"; then
        if [ -f "$MODPATH/bin/armeabi-v7a/jq" ]; then
          cp "$MODPATH/bin/armeabi-v7a/jq" "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Copy ARM32 Binary!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Set Permissions!    "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM32 Binary        "
          ui_print " ➤ ($ABI)                        "
          BINARY_INSTALLED=true
          break
        fi
      fi
    done

    if ! $BINARY_INSTALLED; then
      ui_print " ✗ No Compatible Binary Found!   "
      ui_print " ➤ Supported Architectures:      "
      ui_print " ➤ • ARM64 (arm64-v8a)          "
      ui_print " ➤ • ARM32 (armeabi-v7a)        "
      print_failure_and_exit "binary"
    fi
  fi

  if $INSTALL_SUCCESS; then
    ui_print " 🗑 Cleaning Up Unused Binaries   "
    rm -rf "$MODPATH/bin" || {
      ui_print " ✗ Failed to Clean Up Binaries!  "
      print_failure_and_exit "binary"
    }
  fi

  if $INSTALL_SUCCESS; then
    chmod 0755 "$MODPATH/service.sh" || {
      ui_print " ✗ Failed to Set Permissions (service.sh)! "
      print_failure_and_exit "binary"
    }
    chmod 0755 "$MODPATH/action.sh" || {
      ui_print " ✗ Failed to Set Permissions (action.sh)! "
      print_failure_and_exit "binary"
    }
    chmod 0755 "$MODPATH/update_config.sh" || {
      ui_print " ✗ Failed to Set Permissions (update_config.sh)! "
      print_failure_and_exit "binary"
    }
    chmod 0644 "$MODPATH/config.json" || {
      ui_print " ✗ Failed to Set Permissions (config.json)! "
      print_failure_and_exit "binary"
    }
  fi

  if $INSTALL_SUCCESS; then
    print_empty_line
    ui_print " ✅ Module Successfully Installed "
    print_box_end
  fi
fi

if ! $INSTALL_SUCCESS; then
  exit 1
fi
