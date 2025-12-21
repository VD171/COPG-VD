# ================================================
# COPG Module Installation Script
# ================================================

INSTALL_SUCCESS=true
ENABLE_GPHOTO_SPOOF=false

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

grep_prop() {
  local PROP_FILE="$1"
  local PROP_NAME="$2"
  if [ -f "$PROP_FILE" ]; then
    grep "^${PROP_NAME}=" "$PROP_FILE" | cut -d'=' -f2- | head -n 1
  else
    echo ""
  fi
}

print_module_version() {
  print_box_start
  ui_print "      ✦ COPG Module Version ✦    "
  print_empty_line
  MODULE_PROP="$MODPATH/module.prop"
  if [ -f "$MODULE_PROP" ]; then
    MODULE_VERSION=$(grep_prop "$MODULE_PROP" "version")
    MODULE_VERSION_CODE=$(grep_prop "$MODULE_PROP" "versionCode")
    if [ -n "$MODULE_VERSION" ]; then
      ui_print " ✔ Module Version: $MODULE_VERSION "
      [ -n "$MODULE_VERSION_CODE" ] && ui_print " ✔ Version Code: $MODULE_VERSION_CODE "
    else
      ui_print " ✗ Could Not Read Module Version! "
    fi
  else
    ui_print " ✗ module.prop Not Found!        "
  fi
  print_box_end
  print_empty_line
}

prompt_gphoto_spoof() {
  print_box_start
  ui_print "      ✦ Google Photos Spoof ✦    "
  print_empty_line
  ui_print " ❓ Enable Unlimited Photos?      "
  ui_print " ➤ Volume Up: Yes (Recommended)  "
  ui_print " ➤ Volume Down: No               "
  print_box_end

  TIMEOUT=10
  START_TIME=$(date +%s)

  while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [ $ELAPSED -ge $TIMEOUT ]; then
      print_empty_line
      ui_print " ⏰ Timeout (10s) - Disabled"
      ENABLE_GPHOTO_SPOOF=false
      return
    fi

    if command -v timeout >/dev/null 2>&1; then
      EVENT=$(timeout 0.1 getevent -lc1 2>/dev/null | tr -d '\r')
    else
      EVENT=$(getevent -lc1 2>/dev/null | tr -d '\r')
    fi

    if [ -n "$EVENT" ]; then
      if echo "$EVENT" | grep -q "KEY_VOLUMEUP.*DOWN"; then
        print_empty_line
        ui_print " ✅ Enabled Unlimited Photos"
        ENABLE_GPHOTO_SPOOF=true
        return
      elif echo "$EVENT" | grep -q "KEY_VOLUMEDOWN.*DOWN"; then
        print_empty_line
        ui_print " ❌ Disabled Unlimited Photos"
        ENABLE_GPHOTO_SPOOF=false
        return
      fi
    fi

    sleep 0.1
  done
}

setup_gphoto_spoof() {
  print_box_start
  ui_print "      ✦ Google Photos Spoof ✦    "
  print_empty_line
  ui_print " ⚙ Configuring Sysconfig Files   "
  mkdir -p "$MODPATH/system/product/etc/sysconfig" "$MODPATH/system/etc/sysconfig" 2>/dev/null
  if [ -d "/system/product/etc/sysconfig" ]; then
    find /system/product/etc/sysconfig -type f | while read -r file; do
      if grep -qE "PIXEL_2020_|PIXEL_2021_|PIXEL_2019_PRELOAD|PIXEL_2018_PRELOAD|PIXEL_2017_PRELOAD|PIXEL_2022_" "$file"; then
        filename=$(basename "$file")
        grep -vE "PIXEL_2020_|PIXEL_2021_|PIXEL_2022_|PIXEL_2018_PRELOAD|PIXEL_2019_PRELOAD|PIXEL_2017_PRELOAD" "$file" > \
          "$MODPATH/system/product/etc/sysconfig/$filename" 2>/dev/null
      fi
    done
  fi
  if [ -d "/system/etc/sysconfig" ]; then
    find /system/etc/sysconfig -type f | while read -r file; do
      if grep -qE "PIXEL_2020_|PIXEL_2021_|PIXEL_2019_PRELOAD|PIXEL_2018_PRELOAD|PIXEL_2017_PRELOAD|PIXEL_2022_" "$file"; then
        filename=$(basename "$file")
        grep -vE "PIXEL_2020_|PIXEL_2021_|PIXEL_2022_|PIXEL_2018_PRELOAD|PIXEL_2019_PRELOAD|PIXEL_2017_PRELOAD" "$file" > \
          "$MODPATH/system/etc/sysconfig/$filename" 2>/dev/null
      fi
    done
  fi
  find "$MODPATH/system/product/etc/sysconfig" "$MODPATH/system/etc/sysconfig" -type f 2>/dev/null | while read -r file; do
    chmod 0644 "$file" 2>/dev/null
    chcon u:object_r:system_file:s0 "$file" 2>/dev/null
  done

  ui_print " ✔ Unlimited Photos Configured   "
  print_box_end
}

cleanup_gphoto_directories() {
  rm -rf "$MODPATH/system/etc/sysconfig" 2>/dev/null
  rm -rf "$MODPATH/system/product/etc/sysconfig" 2>/dev/null
  rm -rf "$MODPATH/product/etc/sysconfig" 2>/dev/null
  
  find "$MODPATH" -type d -empty -delete 2>/dev/null
}

print_module_version

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
  print_box_start
  ui_print "      ✦ Installing Controller ✦  "
  print_empty_line
  ui_print " ⚙ Detecting Device Architecture "

  ARM64_VARIANTS="arm64-v8a|armv8-a|arm64|aarch64"
  
  ABI_LIST=$(getprop ro.product.cpu.abilist)
  ui_print " 📜 Supported ABIs: $ABI_LIST"

  if $INSTALL_SUCCESS; then
    CONTROLLER_INSTALLED=false

    for ABI in $(echo "$ABI_LIST" | tr ',' ' '); do
      if echo "$ABI" | grep -qE "$ARM64_VARIANTS"; then
        if [ -f "$MODPATH/controller_arm64" ]; then
          mv "$MODPATH/controller_arm64" "$MODPATH/controller" || {
            ui_print " ✗ Failed to Rename ARM64 Controller!  "
            print_failure_and_exit "binary"
          }
          chmod 0755 "$MODPATH/controller" || {
            ui_print " ✗ Failed to Set Permissions (controller)!  "
            print_failure_and_exit "binary"
          }
          ui_print " ✔ Installed ARM64 Controller     "
          ui_print " ➤ ($ABI)                        "
          CONTROLLER_INSTALLED=true
          
          rm -f "$MODPATH/controller_armv7" 2>/dev/null
          break
        fi
      fi
    done

    if ! $CONTROLLER_INSTALLED; then
      ui_print " ✗ No Compatible Controller Found! "
      ui_print " ➤ Supported Architectures:      "
      ui_print " ➤ • ARM64 (arm64-v8a)          "
      print_failure_and_exit "binary"
    fi
  print_box_end
  print_empty_line
fi
  if $INSTALL_SUCCESS; then
    chmod 0755 "$MODPATH/service.sh" "$MODPATH/action.sh" "$MODPATH/update_config.sh" 2>/dev/null
    chmod 0644 "$MODPATH/COPG.json" "$MODPATH/list.json" 2>/dev/null
    
    for file in "$MODPATH/COPG.json" "$MODPATH/list.json" \
                "$MODPATH/service.sh" "$MODPATH/action.sh" "$MODPATH/update_config.sh"; do
      if [ -f "$file" ]; then
        chcon u:object_r:system_file:s0 "$file" 2>/dev/null
      fi
    done
  fi

  if $INSTALL_SUCCESS; then
    prompt_gphoto_spoof
    if $ENABLE_GPHOTO_SPOOF; then
      setup_gphoto_spoof || {
        INSTALL_SUCCESS=false
      }
    else
      print_box_start
      ui_print "      ✦ Google Photos Spoof ✦    "
      print_empty_line
      ui_print " ⚙ Removing Google Photos Config "
      if [ -f "$MODPATH/COPG.json" ]; then
        sed -i '/com\.google\.android\.apps\.photos/d' "$MODPATH/COPG.json" 2>/dev/null
        chmod 0644 "$MODPATH/COPG.json" 2>/dev/null
        chcon u:object_r:system_file:s0 "$MODPATH/COPG.json" 2>/dev/null
      fi
      
      cleanup_gphoto_directories
      
      ui_print " ✔ Unlimited Photos Disabled    "
      print_box_end
    fi
  fi

  if $INSTALL_SUCCESS; then
    print_empty_line
    print_box_start
    ui_print " ✅ Module Successfully Installed "
    print_box_end
  fi
fi

if ! $INSTALL_SUCCESS; then
  exit 1
fi
