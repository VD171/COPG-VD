#!/system/bin/sh

COPG_JSON = "/data/adb/modules/COPG/COPG.json"

parse_json_value() {
    local json_file="$1"
    local key="$2"
    grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$json_file" | \
        sed 's/.*:[[:space:]]*"\(.*\)"/\1/'
}

apply_build_props_from_json() {
    local json_file="$1"
    if [[ ! -f "$json_file" ]]; then
        return 1
    fi

    find_resetprop() {
        local paths=(
            "/data/adb/ksu/bin/resetprop"
            "/data/adb/magisk/resetprop"
            "/debug_ramdisk/resetprop"
            "/data/adb/ap/bin/resetprop"
            "/system/bin/resetprop"
            "/vendor/bin/resetprop"
        )
        
        for path in "${paths[@]}"; do
            [[ -x "$path" ]] && echo "$path" && return 0
        done
        
        local which_path
        which_path=$(which resetprop 2>/dev/null)
        [[ -n "$which_path" && -x "$which_path" ]] && echo "$which_path" && return 0
        
        echo "resetprop"
    }
    
    resetprop=$(find_resetprop)
    declare -A CURRENT_PROPS
    while IFS='=' read -r key value; do
        [[ -n "$key" ]] && CURRENT_PROPS["$key"]="$value"
    done < <(getprop)
    
    declare -A PROP_MAP
    while IFS='=' read -r prop json_key; do
        [[ -n "$prop" ]] && PROP_MAP["$prop"]="$json_key"
    done << 'EOF'
Build.BRAND=BRAND
ro.board.platform=BOARD
ro.boot.hardware=HARDWARE
ro.boot.product.hardware.sku=DEVICE
ro.bootloader=BOOTLOADER
ro.build.display.id=DISPLAY
ro.build.fingerprint=FINGERPRINT
ro.build.host=HOST
ro.build.id=ID
ro.build.user=HOST
ro.hardware=HARDWARE
ro.odm.build.fingerprint=FINGERPRINT
ro.odm.build.id=ID
ro.product.board=BOARD
ro.product.brand=BRAND
ro.product.build.fingerprint=FINGERPRINT
ro.product.build.id=ID
ro.product.device=DEVICE
ro.product.manufacturer=MANUFACTURER
ro.product.model=MODEL
ro.product.name=PRODUCT
ro.product.odm.brand=BRAND
ro.product.odm.device=DEVICE
ro.product.odm.manufacturer=MANUFACTURER
ro.product.odm.model=MODEL
ro.product.odm.name=PRODUCT
ro.product.product.brand=BRAND
ro.product.product.device=DEVICE
ro.product.product.manufacturer=MANUFACTURER
ro.product.product.model=MODEL
ro.product.product.name=PRODUCT
ro.product.system.brand=BRAND
ro.product.system.device=DEVICE
ro.product.system.manufacturer=MANUFACTURER
ro.product.system.model=MODEL
ro.product.system.name=PRODUCT
ro.product.system_ext.brand=BRAND
ro.product.system_ext.device=DEVICE
ro.product.system_ext.manufacturer=MANUFACTURER
ro.product.system_ext.model=MODEL
ro.product.system_ext.name=PRODUCT
ro.product.vendor.brand=BRAND
ro.product.vendor.device=DEVICE
ro.product.vendor.manufacturer=MANUFACTURER
ro.product.vendor.model=MODEL
ro.product.vendor.name=PRODUCT
ro.product.vendor_dlkm.brand=BRAND
ro.product.vendor_dlkm.device=DEVICE
ro.product.vendor_dlkm.manufacturer=MANUFACTURER
ro.product.vendor_dlkm.model=MODEL
ro.product.vendor_dlkm.name=PRODUCT
ro.system.build.fingerprint=FINGERPRINT
ro.system.build.id=ID
ro.system_ext.build.fingerprint=FINGERPRINT
ro.system_ext.build.id=ID
ro.vendor.build.fingerprint=FINGERPRINT
ro.vendor.build.id=ID
ro.vendor_dlkm.build.fingerprint=FINGERPRINT
ro.vendor_dlkm.build.id=ID
EOF

    declare -A JSON_VALUES
    for json_key in BRAND BOARD HARDWARE DEVICE BOOTLOADER DISPLAY FINGERPRINT HOST ID MANUFACTURER MODEL PRODUCT; do
        local value
        value=$(parse_json_value "$json_file" "$json_key")
        [[ -n "$value" ]] && JSON_VALUES["$json_key"]="$value"
    done
    
    for prop in "${!PROP_MAP[@]}"; do
        local json_key="${PROP_MAP[$prop]}"
        local json_value="${JSON_VALUES[$json_key]}"
        [[ -z "$json_value" ]] && continue
        local current_value="${CURRENT_PROPS[$prop]}"
        [[ -z "$current_value" ]] && continue
        if [[ "$current_value" != "$json_value" ]]; then
            "$resetprop" "$prop" "$json_value"
        fi
    done
}

apply_build_groups_from_json $COPG_JSON

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 5
chmod 0644 $COPG_JSON
chcon u:object_r:system_file:s0 $COPG_JSON
