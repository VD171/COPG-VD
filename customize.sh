#!/sbin/sh

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
  if [ "$section" = "binary" ] || [ "$section" = "gphoto" ]; then
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
    ui_print " ➤ • Magisk v26.4+ (ReZygisk/Zygisk Next)"
    ui_print " ➤ • KernelSU v0.7.0+ (Zygisk Next)"
    ui_print " ➤ • APatch v1.0.7+ (Zygisk Next)"
    print_failure_and_exit "zygisk"
  else
    ui_print " ➔ Root Solution: $ROOT_SOLUTION "
  fi

  if [ "$ROOT_SOLUTION" = "Magisk" ]; then
    ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null)
    if [ "$ZYGISK_STATUS" = "value=1" ]; then
      if [ -d "$ZYGISK_MODULE" ] && [ -f "$ZYGISK_MODULE/disable" ]; then
        ui_print " ✗ Zygisk Next Installed but Disabled!"
        ui_print " ➤ Enable Zygisk Next in Modules"
        print_failure_and_exit "zygisk"
      elif [ -d "$ZYGISK_MODULE" ]; then
        ui_print " ✔ Magisk: Zygisk Next Active    "
        print_box_end
      else
        ui_print " ✗ Magisk: Native Zygisk Not Supported!"
        ui_print " ➤ Install ReZygisk or Zygisk Next"
        ui_print " ➤ Disable Native Zygisk in Settings"
        print_failure_and_exit "zygisk"
      fi
    elif [ -d "$ZYGISK_MODULE" ]; then
      if [ -f "$ZYGISK_MODULE/disable" ]; then
        ui_print " ✗ Zygisk Next Disabled!         "
        ui_print " ➤ Enable in $MANAGER_NAME       "
        print_failure_and_exit "zygisk"
      fi
      ui_print " ✔ Magisk: Zygisk Next Active    "
      print_box_end
    else
      ui_print " ✗ Magisk: No Zygisk Detected!   "
      ui_print " ➤ Install ReZygisk or Zygisk Next"
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

setup_gphoto_spoof() {
  print_box_start
  ui_print "      ✦ Google Photos Spoof ✦    "
  print_empty_line
  ui_print " ⚙ Processing Sysconfig Files    "

  # Create directories for sysconfig overlays
  mkdir -p "$MODPATH/system/product/etc/sysconfig" "$MODPATH/system/etc/sysconfig" || {
    ui_print " ✗ Failed to Create Sysconfig Dirs!"
    print_failure_and_exit "gphoto"
  }

  # Process /system/product/etc/sysconfig/*
  for i in /system/product/etc/sysconfig/*; do
    if [ -f "$i" ]; then
      file=$(basename "$i")
      if grep -qE "PIXEL_2020_|PIXEL_2021_|PIXEL_2019_PRELOAD|PIXEL_2018_PRELOAD|PIXEL_2017_PRELOAD|PIXEL_2022_" "$i"; then
        if [ ! -f "$MODPATH/system/product/etc/sysconfig/$file" ]; then
          cat "$i" | grep -v PIXEL_2020_ | grep -v PIXEL_2021_ | grep -v PIXEL_2022_ | grep -v PIXEL_2018_PRELOAD | grep -v PIXEL_2019_PRELOAD | grep -v PIXEL_2017_PRELOAD >"$MODPATH/system/product/etc/sysconfig/$file" || {
            ui_print " ✗ Failed to Process $file!"
            print_failure_and_exit "gphoto"
          }
          chmod 0644 "$MODPATH/system/product/etc/sysconfig/$file" || {
            ui_print " ✗ Failed to Set Permissions ($file)!"
            print_failure_and_exit "gphoto"
          }
          ui_print " ✔ Processed $file"
        fi
      fi
    fi
  done

  # Process /system/etc/sysconfig/*
  for i in /system/etc/sysconfig/*; do
    if [ -f "$i" ]; then
      file=$(basename "$i")
      if grep -qE "PIXEL_2020_|PIXEL_2021_|PIXEL_2019_PRELOAD|PIXEL_2018_PRELOAD|PIXEL_2017_PRELOAD|PIXEL_2022_" "$i"; then
        if [ ! -f "$MODPATH/system/etc/sysconfig/$file" ]; then
          cat "$i" | grep -v PIXEL_2020_ | grep -v PIXEL_2021_ | grep -v PIXEL_2022_ | grep -v PIXEL_2018_PRELOAD | grep -v PIXEL_2019_PRELOAD | grep -v PIXEL_2017_PRELOAD >"$MODPATH/system/etc/sysconfig/$file" || {
            ui_print " ✗ Failed to Process $file!"
            print_failure_and_exit "gphoto"
          }
          chmod 0644 "$MODPATH/system/etc/sysconfig/$file" || {
            ui_print " ✗ Failed to Set Permissions ($file)!"
            print_failure_and_exit "gphoto"
          }
          ui_print " ✔ Processed $file"
        fi
      fi
    fi
  done

  # Set permissions for any pre-included sysconfig files in the module
  for i in "$MODPATH/system/product/etc/sysconfig/"* "$MODPATH/system/etc/sysconfig/"*; do
    if [ -f "$i" ]; then
      chmod 0644 "$i" || {
        ui_print " ✗ Failed to Set Permissions for $(basename "$i")!"
        print_failure_and_exit "gphoto"
      }
      chcon u:object_r:system_file:s0 "$i" || {
        ui_print " ✗ Failed to Set SELinux Context for $(basename "$i")!"
        print_failure_and_exit "gphoto"
      }
      ui_print " ✔ Configured $(basename "$i")"
    fi
  done

  ui_print " ✅ Google Photos Spoof Configured"
  print_box_end
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
  ui_print "      ✦ Installing Binaries ✦    "
  print_empty_line
  ui_print " ⚙ Detecting Device Architecture "

  ARM64_VARIANTS="arm64-v8a|armv8-a|armv9-a|arm64"
  ARM32_VARIANTS="armeabi-v7a|armeabi|armv7-a|armv7l|armhf|arm"

  ABI_LIST=$(getprop ro.product.cpu.abilist)
  ui_print " 📜 Supported ABIs: $ABI_LIST"

  mkdir -p "$MODPATH/system/bin" "$MODPATH/bin" || {
    ui_print " ✗ Failed to Create System Dir!   "
    print_failure_and_exit "binary"
  }

  if $INSTALL_SUCCESS; then
    JQ_INSTALLED=false
    CONFIG_WATCHER_INSTALLED=false

    for ABI in $(echo "$ABI_LIST" | tr ',' ' '); do
      if echo "$ABI" | grep -qE "$ARM64_VARIANTS"; then
        # Install jq for ARM64
        if [ -f "$MODPATH/bin/arm64-v8a/jq" ]; then
          cp "$MODPATH/bin/arm64-v8a/jq" "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Copy ARM64 jq Binary!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Set Permissions (jq)!  "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM64 jq Binary     "
          ui_print " ➤ ($ABI)                        "
          JQ_INSTALLED=true
        fi
        # Install config_watcher for ARM64
        if [ -f "$MODPATH/bin/arm64-v8a/config_watcher" ]; then
          cp "$MODPATH/bin/arm64-v8a/config_watcher" "$MODPATH/bin/config_watcher_arm64" || {
            ui_print " ✗ Failed to Copy ARM64 config_watcher Binary!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/bin/config_watcher_arm64" || {
            ui_print " ✗ Failed to Set Permissions (config_watcher)!  "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM64 config_watcher Binary  "
          ui_print " ➤ ($ABI)                        "
          CONFIG_WATCHER_INSTALLED=true
        fi
      elif echo "$ABI" | grep -qE "$ARM32_VARIANTS"; then
        # Install jq for ARM32
        if [ -f "$MODPATH/bin/armeabi-v7a/jq" ]; then
          cp "$MODPATH/bin/armeabi-v7a/jq" "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Copy ARM32 jq Binary!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/system/bin/jq" || {
            ui_print " ✗ Failed to Set Permissions (jq)!  "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM32 jq Binary     "
          ui_print " ➤ ($ABI)                        "
          JQ_INSTALLED=true
        fi
        # Install config_watcher for ARM32
        if [ -f "$MODPATH/bin/armeabi-v7a/config_watcher" ]; then
          cp "$MODPATH/bin/armeabi-v7a/config_watcher" "$MODPATH/bin/config_watcher_arm32" || {
            ui_print " ✗ Failed to Copy ARM32 config_watcher Binary!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/bin/config_watcher_arm32" || {
            ui_print " ✗ Failed to Set Permissions (config_watcher)!  "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM32 config_watcher Binary  "
          ui_print " ➤ ($ABI)                        "
          CONFIG_WATCHER_INSTALLED=true
        fi
      fi
      [ "$JQ_INSTALLED" = true ] && [ "$CONFIG_WATCHER_INSTALLED" = true ] && break
    done

    if ! $JQ_INSTALLED; then
      ui_print " ✗ No Compatible jq Binary Found! "
      ui_print " ➤ Supported Architectures:      "
      ui_print " ➤ • ARM64 (arm64-v8a)          "
      ui_print " ➤ • ARM32 (armeabi-v7a)        "
      print_failure_and_exit "binary"
    fi

    if ! $CONFIG_WATCHER_INSTALLED; then
      ui_print " ✗ No Compatible config_watcher Binary Found! "
      ui_print " ➤ Supported Architectures:      "
      ui_print " ➤ • ARM64 (arm64-v8a)          "
      ui_print " ➤ • ARM32 (armeabi-v7a)        "
      print_failure_and_exit "binary"
    fi
  fi

  if $INSTALL_SUCCESS; then
    ui_print " 🗑 Cleaning Up Unused Binaries   "
    rm -rf "$MODPATH/bin/arm64-v8a" "$MODPATH/bin/armeabi-v7a" || {
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
    chmod 0644 "$MODPATH/config.json" && "chmod 0644 $MODPATH/ignorelist.txt" || {
      ui_print " ✗ Failed to Set Permissions (config.json & ignorelist.txt)! "
      print_failure_and_exit "binary"
    }
    chcon u:object_r:system_file:s0 "$MODPATH/config.json" || {
      ui_print " ✗ Failed to Set SELinux Context (config.json)! "
      print_failure_and_exit "binary"
    }
  fi

  if $INSTALL_SUCCESS; then
    setup_gphoto_spoof || {
      INSTALL_SUCCESS=false
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
