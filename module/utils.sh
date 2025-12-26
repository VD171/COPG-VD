#!/system/bin/sh

COPG_JSON="/data/adb/COPG.json"
COPG_ORIGINAL="/data/adb/modules/COPG/original_device.txt"
DEVICE="$1"
json_content=$(cat "$COPG_JSON")
getprop_output=$(getprop)

find_resetprop() {
    for path in "/data/adb/ksu/bin/resetprop" "/data/adb/magisk/resetprop" "/debug_ramdisk/resetprop" "/data/adb/ap/bin/resetprop" "/system/bin/resetprop" "/vendor/bin/resetprop"; do
        [ -x "$path" ] && echo "$path" && return 0
    done
    which_path=$(which resetprop 2>/dev/null)
    [ -n "$which_path" ] && [ -x "$which_path" ] && echo "$which_path" && return 0
    return 1
}
bin_resetprop=$(find_resetprop)

propreset() {
    name="$1"
    value="$2"
    [ -z "$name" ] || [ -z "$value" ] && return 0
    current=$(echo "$getprop_output" | grep "^\[$name\]:" | sed 's/.*: \[\(.*\)\]/\1/')
    [ -z "$current" ] || [ "$current" == "$value" ] && return 0
    "$bin_resetprop" -n "$name" "$value" && return 0
    return 1
}

get_prop_mapping() {
    cat << 'MAPPING'
SECURITY_PATCH|ro.build.version.security_patch|ro.system.build.security_patch|ro.vendor.build.security_patch
TIMESTAMP|ro.build.date.utc|ro.system.build.date.utc|ro.vendor.build.date.utc|ro.system_ext.build.date.utc|ro.vendor_dlkm.build.date.utc|ro.product.build.date.utc|ro.odm.build.date.utc|ro.bootimage.build.date.utc
INCREMENTAL|ro.build.version.incremental|ro.odm.build.version.incremental|ro.product.build.version.incremental|ro.system.build.version.incremental|ro.system_ext.build.version.incremental|ro.vendor.build.version.incremental|ro.vendor_dlkm.build.version.incremental
ANDROID_VERSION|ro.build.version.release|ro.build.version.release_or_codename|ro.build.version.release_or_preview_display|ro.odm.build.version.release|ro.odm.build.version.release_or_codename|ro.product.build.version.release|ro.product.build.version.release_or_codename|ro.system.build.version.release|ro.system.build.version.release_or_codename|ro.system_ext.build.version.release|ro.system_ext.build.version.release_or_codename|ro.vendor.build.version.release|ro.vendor.build.version.release_or_codename|ro.vendor_dlkm.build.version.release|ro.vendor_dlkm.build.version.release_or_codename|ro.vendor_dlkm.build.version.release_or_codename|ro.bootimage.build.version.release_or_codename
SDK_INT|ro.build.version.sdk|ro.vendor_dlkm.build.version.sdk|ro.vendor.build.version.sdk|ro.system_ext.build.version.sdk|ro.product.build.version.sdk|ro.system.build.version.sdk|ro.odm.build.version.sdk
BOARD|ro.board.platform|ro.product.board
BOOTLOADER|ro.bootloader|boot.bootloader|ro.boot.bootloader
DISPLAY|ro.build.display.id
HARDWARE|ro.boot.hardware|ro.hardware|ro.soc.model|ro.kernel.androidboot.hardware|ro.boot.hardware.sku
HOST|ro.build.host
ID|ro.build.id|ro.odm.build.id|ro.product.build.id|ro.system.build.id|ro.system_ext.build.id|ro.vendor.build.id|ro.vendor_dlkm.build.id
BRAND|Build.BRAND|ro.product.brand|ro.product.odm.brand|ro.product.product.brand|ro.product.system.brand|ro.product.system_ext.brand|ro.product.vendor.brand|ro.product.vendor_dlkm.brand
MODEL|ro.product.model|ro.product.odm.model|ro.product.product.model|ro.product.system.model|ro.product.system_ext.model|ro.product.vendor.model|ro.product.vendor_dlkm.model|ro.product.cert|ro.mediatek.rsc_name
PRODUCT|ro.product.name|ro.product.odm.name|ro.product.product.name|ro.product.system.name|ro.product.system_ext.name|ro.product.vendor.name|ro.product.vendor_dlkm.name|ro.boot.rsc|ro.build.product|ro.product.mod_device|ro.boot.product.hardware.sku
DEVICE|ro.product.device|ro.product.odm.device|ro.product.product.device|ro.product.system.device|ro.product.system_ext.device|ro.product.vendor.device|ro.product.vendor_dlkm.device|ro.miui.cust_device|ro.product.marketname|ro.product.odm.marketname|ro.product.product.marketname|ro.product.system.marketname|ro.product.system_ext.marketname|ro.product.vendor.marketname
FINGERPRINT|ro.build.fingerprint|ro.odm.build.fingerprint|ro.product.build.fingerprint|ro.system.build.fingerprint|ro.system_ext.build.fingerprint|ro.vendor.build.fingerprint|ro.vendor_dlkm.build.fingerprint|ro.bootimage.build.fingerprint|ro.system_dlkm.build.fingerprint
MANUFACTURER|ro.product.system_ext.manufacturer|ro.product.vendor.manufacturer|ro.product.vendor_dlkm.manufacturer|ro.product.odm.manufacturer|ro.product.product.manufacturer|ro.product.system.manufacturer|ro.fota.oem
MANUFACTURER|ro.product.manufacturer
MAPPING
}

if [ "$DEVICE" = "spoofed" ]; then
  get_prop_mapping | while IFS='|' read -r json_key props; do
      [ -z "$json_key" ] && continue
      json_value=$(echo "$json_content" | grep -o "\"$json_key\"[[:space:]]*:[[:space:]]*\(\"[^\"]*\"\|[0-9][0-9]*\)" | sed 's/.*:[[:space:]]*"\?\(.*\)"\?/\1/' | sed 's/"$//')
      if [ -n "$json_value" ]; then
          if [ "$json_key" = "TIMESTAMP" ]; then
              BUILD_DATE="$(LC_ALL=C TZ=UTC date -u -d "@$json_value")"
          elif [ "$json_key" = "SDK_INT" ]; then
              SDK_FULL="$json_value.0"
          elif [ "$json_key" = "FINGERPRINT" ]; then
              DESCRIPTION="$(echo "$json_value" | awk -F'[:/]' '{print $3"-"$7" "$4" "$5" "$6" "$8}')"
              FLAVOR="$(echo "$json_value" | awk -F'[:/]' '{print $3"-"$7}')"
          fi
          old_ifs="$IFS"
          IFS='|'
          for prop in $props; do
              propreset "$prop" "$json_value"
          done
          IFS="$old_ifs"
      fi
  done
  propreset ro.build.description "$DESCRIPTION"
  propreset ro.build.flavor "$FLAVOR"
  if [ -n "$BUILD_DATE" ]; then
      for prop in ro.build.date ro.odm.build.date ro.product.build.date; do
          propreset "$prop" "$BUILD_DATE"
      done
  fi
  if [ -n "$SDK_FULL" ]; then
      for prop in ro.build.version.sdk_full ro.odm.build.version.sdk_full ro.product.build.version.sdk_full ro.system.build.version.sdk_full ro.system_ext.build.version.sdk_full ro.vendor_dlkm.build.version.sdk_full ro.vendor.build.version.sdk_full; do
          propreset "$prop" "$SDK_FULL"
      done
  fi
elif [ "$DEVICE" = "original" ]; then
  while read -r prop value rest; do
    propreset "$prop" "$value"
  done < "$COPG_ORIGINAL"
else
  echo > "$COPG_ORIGINAL"
  get_prop_mapping | while IFS='|' read -r json_key props; do
      [ -z "$json_key" ] && continue
      old_ifs="$IFS"
      IFS='|'
      for prop in $props; do
          current=$(echo "$getprop_output" | grep "^\[$prop\]:" | sed 's/.*: \[\(.*\)\]/\1/')
          [ -z "$current" ] && continue
          echo "$prop $current" >> "$COPG_ORIGINAL"
      done
      IFS="$old_ifs"
  done
fi
