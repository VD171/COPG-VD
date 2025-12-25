#!/system/bin/sh

COPG_JSON="/data/adb/COPG.json"

find_resetprop() {
    for path in "/data/adb/ksu/bin/resetprop" "/data/adb/magisk/resetprop" "/debug_ramdisk/resetprop" "/data/adb/ap/bin/resetprop" "/system/bin/resetprop" "/vendor/bin/resetprop"; do
        [ -x "$path" ] && echo "$path" && return 0
    done
    which_path=$(which resetprop 2>/dev/null)
    [ -n "$which_path" ] && [ -x "$which_path" ] && echo "$which_path" && return 0
    return 1
}

get_prop_mapping() {
    cat << 'MAPPING'
TIMESTAMP|ro.build.date.utc|ro.system.build.date.utc|ro.vendor.build.date.utc|ro.system_ext.build.date.utc|ro.vendor_dlkm.build.date.utc|ro.product.build.date.utc|ro.odm.build.date.utc|ro.bootimage.build.date.utc
INCREMENTAL|ro.build.version.incremental|ro.odm.build.version.incremental|ro.product.build.version.incremental|ro.system.build.version.incremental|ro.system_ext.build.version.incremental|ro.vendor.build.version.incremental|ro.vendor_dlkm.build.version.incremental
ANDROID_VERSION|ro.build.version.release|ro.build.version.release_or_codename|ro.build.version.release_or_preview_display|ro.odm.build.version.release|ro.odm.build.version.release_or_codename|ro.product.build.version.release|ro.product.build.version.release_or_codename|ro.system.build.version.release|ro.system.build.version.release_or_codename|ro.system_ext.build.version.release|ro.system_ext.build.version.release_or_codename|ro.vendor.build.version.release|ro.vendor.build.version.release_or_codename|ro.vendor_dlkm.build.version.release|ro.vendor_dlkm.build.version.release_or_codenam
SDK_INT|ro.build.version.sdk|ro.vendor_dlkm.build.version.sdk|ro.vendor.build.version.sdk|ro.system_ext.build.version.sdk|ro.product.build.version.sdk|ro.system.build.version.sdk|ro.odm.build.version.sdk
BOARD|ro.board.platform|ro.product.board
BOOTLOADER|ro.bootloader|boot.bootloader|ro.boot.bootloader
DISPLAY|ro.build.display.id
HARDWARE|ro.boot.hardware|ro.hardware|ro.soc.model|ro.kernel.androidboot.hardware
HOST|ro.build.host|ro.build.user
ID|ro.build.id|ro.odm.build.id|ro.product.build.id|ro.system.build.id|ro.system_ext.build.id|ro.vendor.build.id|ro.vendor_dlkm.build.id
BRAND|Build.BRAND|ro.product.brand|ro.product.odm.brand|ro.product.product.brand|ro.product.system.brand|ro.product.system_ext.brand|ro.product.vendor.brand|ro.product.vendor_dlkm.brand
MODEL|ro.product.model|ro.product.odm.model|ro.product.product.model|ro.product.system.model|ro.product.system_ext.model|ro.product.vendor.model|ro.product.vendor_dlkm.model|ro.product.cert|ro.mediatek.rsc_name
PRODUCT|ro.product.name|ro.product.odm.name|ro.product.product.name|ro.product.system.name|ro.product.system_ext.name|ro.product.vendor.name|ro.product.vendor_dlkm.name|ro.boot.rsc|ro.build.product|ro.product.mod_device
DEVICE|ro.boot.product.hardware.sku|ro.product.device|ro.product.odm.device|ro.product.product.device|ro.product.system.device|ro.product.system_ext.device|ro.product.vendor.device|ro.product.vendor_dlkm.device|ro.miui.cust_device|ro.product.marketname|ro.product.odm.marketnamero.product.product.marketname|ro.product.system.marketname|ro.product.system_ext.marketname|ro.product.vendor.marketname|ro.boot.hardware.sku
FINGERPRINT|ro.build.fingerprint|ro.odm.build.fingerprint|ro.product.build.fingerprint|ro.system.build.fingerprint|ro.system_ext.build.fingerprint|ro.vendor.build.fingerprint|ro.vendor_dlkm.build.fingerprint|ro.bootimage.build.fingerprint|ro.system_dlkm.build.fingerprint
MANUFACTURER|ro.product.system_ext.manufacturer|ro.product.vendor.manufacturer|ro.product.vendor_dlkm.manufacturer|ro.product.odm.manufacturer|ro.product.product.manufacturer|ro.product.system.manufacturer|ro.fota.oem
MANUFACTURER|ro.product.manufacturer
MAPPING
}

resetprop=$(find_resetprop)
json_content=$(cat "$COPG_JSON")
getprop_output=$(getprop)
while IFS='|' read -r json_key props; do
    [ -z "$json_key" ] && continue
    json_value=$(echo "$json_content" | grep -o "\"$json_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
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
            [ -z "$prop" ] && continue
            current=$(echo "$getprop_output" | grep "^\[$prop\]:" | sed 's/.*: \[\(.*\)\]/\1/')
            if [ -n "$current" ] && [ "$current" != "$json_value" ]; then
                "$resetprop" "$prop" "$json_value"
            fi
        done
        IFS="$old_ifs"
    fi
done < <(get_prop_mapping)

"$resetprop" ro.build.description "$DESCRIPTION"
"$resetprop" ro.build.flavor "$FLAVOR"

if [ -n "$BUILD_DATE" ]; then
    for prop in ro.build.date|ro.odm.build.date|ro.product.build.date|ro.system.build.date|ro.system_ext.build.date|ro.vendor.build.date|ro.vendor_dlkm.build.date|ro.bootimage.build.date; then
        "$resetprop" "$prop" "$BUILD_DATE"
    done
fi

if [ -n "$SDK_FULL" ]; then
    for prop in ro.build.version.sdk_full ro.odm.build.version.sdk_full ro.product.build.version.sdk_full ro.system.build.version.sdk_full ro.system_ext.build.version.sdk_full ro.vendor_dlkm.build.version.sdk_full ro.vendor.build.version.sdk_full; then
        "$resetprop" "$prop" "$SDK_FULL"
    done
fi

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 5
chmod 0644 $COPG_JSON
chcon u:object_r:system_file:s0 $COPG_JSON
