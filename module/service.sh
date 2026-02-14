#!/system/bin/sh

COPG_VD_JSON="/data/adb/COPG-VD.json"
json_content=$(cat "$COPG_VD_JSON")
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
    [ -z "$current" ] || [ "$current" = "$value" ] && return 0
    "$bin_resetprop" -n "$name" "$value" && return 0
    return 1
}

get_prop_mapping() {
    cat << 'MAPPING'
USER|ro.build.user
SDK_FINGERPRINT|ro.build.version.preview_sdk_fingerprint
PREVIEW_SDK|ro.build.version.preview_sdk
CODENAME|ro.build.version.all_codenames|ro.build.version.codename|ro.build.version.codename|ro.build.version.release_or_codename|ro.build.version.release_or_preview_display|ro.odm.build.version.release_or_codename|ro.odm_dlkm.build.version.release_or_codename|ro.product.build.version.release_or_codename|ro.system.build.version.release_or_codename|ro.system_dlkm.build.version.release_or_codename|ro.system_ext.build.version.release_or_codename|ro.vendor.build.version.release_or_codename|ro.vendor_dlkm.build.version.release_or_codename|ro.bootimage.build.version.release_or_codename
TAGS|ro.bootimage.build.tags|ro.bootimage.keys|ro.build.keys|ro.build.tags|ro.odm.build.tags|ro.odm.keys|ro.odm_dlkm.build.tags|ro.odm_dlkm.keys|ro.oem.build.tags|ro.oem.keys|ro.product.build.tags|ro.product.keys|ro.system.build.tags|ro.system.keys|ro.system_ext.build.tags|ro.system_ext.keys|ro.vendor.build.tags|ro.vendor.keys|ro.vendor_dlkm.build.tags|ro.vendor_dlkm.keys|ro.system_dlkm.build.tags
TYPE|ro.bootimage.build.type|ro.build.type|ro.odm.build.type|ro.odm_dlkm.build.type|ro.oem.build.type|ro.product.build.type|ro.system.build.type|ro.system_dlkm.build.type|ro.system_ext.build.type|ro.vendor.build.type|ro.vendor.md_apps.load_type|ro.vendor_dlkm.build.type
SECURITY_PATCH|ro.build.version.security_patch|ro.system.build.security_patch|ro.vendor.build.security_patch
TIMESTAMP|ro.build.date.utc|ro.system.build.date.utc|ro.vendor.build.date.utc|ro.system_ext.build.date.utc|ro.vendor_dlkm.build.date.utc|ro.product.build.date.utc|ro.odm.build.date.utc|ro.bootimage.build.date.utc|ro.odm_dlkm.build.date.utc|ro.system_dlkm.build.date.utc
INCREMENTAL|ro.build.version.incremental|ro.odm.build.version.incremental|ro.product.build.version.incremental|ro.system.build.version.incremental|ro.system_ext.build.version.incremental|ro.vendor.build.version.incremental|ro.vendor_dlkm.build.version.incremental|ro.odm_dlkm.build.version.incremental|ro.system_dlkm.build.version.incremental
ANDROID_VERSION|ro.build.version.release|ro.odm.build.version.release|ro.product.build.version.release|ro.system.build.version.release|ro.system_ext.build.version.release|ro.vendor.build.version.release|ro.vendor_dlkm.build.version.release|ro.odm_dlkm.build.version.release|ro.system_dlkm.build.version.release
SDK_INT|ro.build.version.sdk|ro.vendor_dlkm.build.version.sdk|ro.vendor.build.version.sdk|ro.system_ext.build.version.sdk|ro.product.build.version.sdk|ro.system.build.version.sdk|ro.odm.build.version.sdk|ro.odm_dlkm.build.version.sdk|ro.system_dlkm.build.version.sdk
SDK_FULL|ro.build.version.sdk_full|ro.odm.build.version.sdk_full|ro.product.build.version.sdk_full|ro.system.build.version.sdk_full|ro.system_ext.build.version.sdk_full|ro.vendor_dlkm.build.version.sdk_full|ro.vendor.build.version.sdk_full|ro.odm_dlkm.build.version.sdk_full|ro.system_dlkm.build.version.sdk_full
BOARD|ro.board.platform|ro.product.board
BOOTLOADER|ro.bootloader|boot.bootloader|ro.boot.bootloader
DISPLAY|ro.build.display.id
HARDWARE|ro.boot.hardware|ro.hardware|ro.soc.model|ro.kernel.androidboot.hardware|ro.boot.hardware.sku
HOST|ro.build.host
ID|ro.build.id|ro.odm.build.id|ro.product.build.id|ro.system.build.id|ro.system_ext.build.id|ro.vendor.build.id|ro.vendor_dlkm.build.id|ro.odm_dlkm.build.id|ro.system_dlkm.build.id
BRAND|Build.BRAND|ro.product.brand|ro.product.odm.brand|ro.product.product.brand|ro.product.system.brand|ro.product.system_ext.brand|ro.product.vendor.brand|ro.product.vendor_dlkm.brand|ro.product.brand_for_attestation|ro.product.odm_dlkm.brand|ro.product.system_dlkm.brand
MODEL|ro.product.model|ro.product.odm.model|ro.product.product.model|ro.product.system.model|ro.product.system_ext.model|ro.product.vendor.model|ro.product.vendor_dlkm.model|ro.product.cert|ro.mediatek.rsc_name|ro.product.model_for_attestation|ro.product.odm_dlkm.model|ro.product.system_dlkm.model
PRODUCT|ro.product.name|ro.product.odm.name|ro.product.product.name|ro.product.system.name|ro.product.system_ext.name|ro.product.vendor.name|ro.product.vendor_dlkm.name|ro.boot.rsc|ro.build.product|ro.product.mod_device|ro.boot.product.hardware.sku|ro.product.odm_dlkm.name|ro.product.system_dlkm.name
DEVICE|ro.product.device|ro.product.odm.device|ro.product.product.device|ro.product.system.device|ro.product.system_ext.device|ro.product.vendor.device|ro.product.vendor_dlkm.device|ro.miui.cust_device|ro.product.marketname|ro.product.odm.marketname|ro.product.product.marketname|ro.product.system.marketname|ro.product.system_ext.marketname|ro.product.vendor.marketname|ro.product.device_for_attestation|ro.product.name_for_attestation|ro.product.odm_dlkm.device|ro.product.system_dlkm.device|ro.quick_start.device_id
FINGERPRINT|ro.build.fingerprint|ro.odm.build.fingerprint|ro.product.build.fingerprint|ro.system.build.fingerprint|ro.system_ext.build.fingerprint|ro.vendor.build.fingerprint|ro.vendor_dlkm.build.fingerprint|ro.bootimage.build.fingerprint|ro.system_dlkm.build.fingerprint|ro.odm_dlkm.build.fingerprint
UUID|ro.build.uuid|ro.product.build.uuid
MANUFACTURER|ro.product.system_ext.manufacturer|ro.product.vendor.manufacturer|ro.product.vendor_dlkm.manufacturer|ro.product.odm.manufacturer|ro.product.product.manufacturer|ro.product.system.manufacturer|ro.fota.oem|ro.product.manufacturer_for_attestation|ro.product.odm_dlkm.manufacturer|ro.product.system_dlkm.manufacturer|ro.soc.manufacturer
MANUFACTURER|ro.product.manufacturer
MAPPING
}

if [ ! -e "/data/adb/modules/COPG-VD/.skip.resetprop" ]; then
    get_prop_mapping | while IFS='|' read -r json_key props; do
      [ -z "$json_key" ] && continue
      json_value=$(echo "$json_content" | grep -o "\"$json_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
      if [ "$json_key" = "CODENAME" ] && [ -z "$json_value" ]; then
        json_value="REL"
      fi
      if [ "$json_key" = "TAGS" ]; then
        json_value="release-keys"
      elif [ "$json_key" = "TYPE" ]; then
        json_value="user"
      fi
      if [ -n "$json_value" ]; then
          if [ "$json_key" = "SECURITY_PATCH" ]; then
              SECURITY_PATCH="/data/adb/tricky_store/security_patch.txt"
              if [ -e "$SECURITY_PATCH" ]; then
                  echo "$json_value" > "$SECURITY_PATCH"
              fi
          elif [ "$json_key" = "TIMESTAMP" ]; then
              BUILD_DATE="$(LC_ALL=C TZ=UTC date -u -d "@$json_value")"
              for prop in ro.build.date ro.odm.build.date ro.product.build.date ro.odm_dlkm.build.date ro.system.build.date ro.system_dlkm.build.date ro.system_ext.build.date ro.vendor.build.date ro.vendor_dlkm.build.date; do
                  propreset "$prop" "$BUILD_DATE"
              done
          elif [ "$json_key" = "SDK_INT" ]; then
              SDK_FULL="$json_value.0"
              for prop in ro.build.version.sdk_full ro.odm.build.version.sdk_full ro.product.build.version.sdk_full ro.system.build.version.sdk_full ro.system_ext.build.version.sdk_full ro.vendor_dlkm.build.version.sdk_full ro.vendor.build.version.sdk_full ro.odm_dlkm.build.version.sdk_full ro.system_dlkm.build.version.sdk_full; do
                  propreset "$prop" "$SDK_FULL"
              done
          elif [ "$json_key" = "FINGERPRINT" ]; then
              DESCRIPTION="$(echo "$json_value" | awk -F'[:/]' '{print $2"-"$7" "$4" "$5" "$6" "$8}')"
              FLAVOR="$(echo "$json_value" | awk -F'[:/]' '{print $2"-"$7}')"
              propreset ro.build.description "$DESCRIPTION"
              propreset ro.build.flavor "$FLAVOR"
          fi
          old_ifs="$IFS"
          IFS='|'
          for prop in $props; do
              propreset "$prop" "$json_value"
          done
          IFS="$old_ifs"
      fi
    done
fi

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 2

chmod 0644 "$COPG_VD_JSON"
chcon u:object_r:system_file:s0 "$COPG_VD_JSON"
