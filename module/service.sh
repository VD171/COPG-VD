#!/system/bin/sh
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  AlirezaParsi & VD171
#  SPDX-License-Identifier: Apache-2.0
#  Fork by VD171.
#
#  Licensed under the Apache License, Version 2.0; you may obtain a copy at
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/COPG-VD
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================

MODDIR=${0%/*}
COPG_VD_JSON="/data/adb/COPG-VD.json"

ROM_PROP="/system/build.prop"
VERSION_KEYS="ANDROID_VERSION SDK_INT SDK_FULL CODENAME"
VERSION_GROUP_KEYS="ANDROID_VERSION SDK_INT SDK_FULL CODENAME INCREMENTAL SECURITY_PATCH PREVIEW_SDK SDK_FINGERPRINT FIRST_API_LEVEL"
DERIVED_RELCOD="ro.build.version.release_or_codename ro.build.version.release_or_preview_display ro.odm.build.version.release_or_codename ro.odm_dlkm.build.version.release_or_codename ro.product.build.version.release_or_codename ro.system.build.version.release_or_codename ro.system_dlkm.build.version.release_or_codename ro.system_ext.build.version.release_or_codename ro.vendor.build.version.release_or_codename ro.vendor_dlkm.build.version.release_or_codename ro.bootimage.build.version.release_or_codename"

rom_prop() {
    grep -m 1 "^$1=" "$ROM_PROP" 2>/dev/null | cut -d= -f2-
}

spoof_version_policy() {
    case "$(cat "$MODDIR/.spoof.version" 2>/dev/null)" in
        rom) echo rom ;; force) echo force ;; *) echo never ;;
    esac
}

version_allowed() {
    case "$POLICY_VERSION" in
        force) return 0 ;;
        never) return 1 ;;
    esac
    case "$1" in
        SDK_INT)
            rom=$(rom_prop ro.build.version.sdk)
            case "$2$rom" in *[!0-9]*) return 1 ;; esac
            [ "$2" -le "$rom" ] ;;
        ANDROID_VERSION) [ "$2" = "$(rom_prop ro.build.version.release)" ] ;;
        CODENAME)        [ "$2" = "$(rom_prop ro.build.version.codename)" ] ;;
        SDK_FULL)
            rom=$(rom_prop ro.build.version.sdk)
            case "$2" in "$rom"|"$rom".*) return 0 ;; *) return 1 ;; esac ;;
        *) return 1 ;;
    esac
}

aplicar_derivados() {
    codename="$1"; release="$2"
    [ -n "$codename" ] || codename=$(rom_prop ro.build.version.codename)
    [ -n "$release" ] || release=$(rom_prop ro.build.version.release)
    if [ "$codename" = "REL" ] || [ -z "$codename" ]; then valor="$release"; else valor="$codename"; fi
    [ -n "$valor" ] || return 0
    for prop in $DERIVED_RELCOD; do
        propreset "$prop" "$valor"
    done
}

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

read_delete_list() {
    printf '%s' "$json_content" | tr -d '\n' \
      | grep -o '"COPG-VD-Delete"[[:space:]]*:[[:space:]]*\[[^]]*\]' \
      | grep -o '"[^"]*"' | sed 's/"//g' | grep -v '^COPG-VD-Delete$'
}

set_empty() {
    current=$(echo "$getprop_output" | grep "^\[$1\]:" | sed 's/.*: \[\(.*\)\]/\1/')
    [ -z "$current" ] && return 0
    "$bin_resetprop" -n "$1" "" 2>/dev/null
}

get_prop_mapping() {
    cat << 'MAPPING'
USER|ro.build.user
SDK_FINGERPRINT|ro.build.version.preview_sdk_fingerprint
PREVIEW_SDK|ro.build.version.preview_sdk
CODENAME|ro.build.version.all_codenames|ro.build.version.codename
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

rp_enabled() {
    [ -e "$MODDIR/.skip.resetprop" ] && return 1
    printf '%s' "$json_flat" | grep -qE '"enabled"[[:space:]]*:[[:space:]]*false' && return 1
    return 0
}
group_on() {
    printf '%s' "$GRUPOS" | grep -qE "\"$1\"[[:space:]]*:[[:space:]]*false" && return 1
    return 0
}
propforce() {
    [ -z "$1" ] && return 0
    "$bin_resetprop" -n "$1" "$2" 2>/dev/null
}
delprop_re() {
    echo "$getprop_output" | sed -n 's/^\[\([^]]*\)\]:.*/\1/p' | grep -iE "$1" | while read -r p; do
        [ -n "$p" ] && "$bin_resetprop" --delete "$p" 2>/dev/null
    done
}

apply_boot_state() {
    for p in ro.boot.verifiedbootstate ro.kernel.androidboot.verifiedbootstate ro.boot.realmebootstate; do
        propreset "$p" green
    done
    propreset ro.boot.vbmeta.device_state locked
    propreset ro.secureboot.lockstate locked
    propreset ro.boot.flash.locked 1
    propreset ro.boot.realme.lockstate 1
    propreset ro.boot.veritymode enforcing
    propreset ro.boot.veritymode.managed yes
    propreset sys.oem_unlock_allowed 0
    propreset ro.oem_unlock_supported 0
    propreset ro.boot.warranty_bit 0
    propreset ro.warranty_bit 0
    propreset ro.is_ever_orange 0
    propforce vendor.boot.vbmeta.device_state locked
    propforce vendor.boot.verifiedbootstate green
}
apply_selinux_bootmode() {
    propreset ro.boot.selinux enforcing
    propreset ro.build.selinux 1
    propreset persist.selinux.enforcing 1
    for p in ro.boot.mode ro.bootmode ro.boot.bootmode vendor.bootmode; do
        propreset "$p" normal
    done
}
apply_adb_usb() {
    propreset init.svc.adbd stopped
    propreset ro.adb.secure 1
    propreset persist.service.adb.enable 0
    for p in sys.usb.state sys.usb.config persist.sys.usb.config; do
        propreset "$p" mtp
    done
    propreset sys.usb.ffs.ready 0
}
apply_anti_emulator() {
    propreset ro.debuggable 0
    propreset ro.force.debuggable 0
    propreset ro.secure 1
    propreset ro.allow.mock.location 0
    propreset persist.sys.root_access 0
    propreset ro.dalvik.vm.native.bridge 0
    delprop_re '^(qemu\.|ro\.kernel\.qemu)'
}
apply_cleanup() {
    delprop_re 'pihook|pixelprop|lineage|XLua|LSPosed|spoof\.gms'
    "$bin_resetprop" --compact 2>/dev/null
}

apply_global_fields() {
  [ -n "$GLOBAL_FIELDS" ] || return 0
  GF_DELETE=$(read_delete_list)
  get_prop_mapping | while IFS='|' read -r json_key props; do
    [ -z "$json_key" ] && continue
    case " $GLOBAL_FIELDS " in *" $json_key "*) ;; *) continue ;; esac
    case " $VERSION_KEYS " in *" $json_key "*) continue ;; esac
    case " $GF_DELETE " in *" $json_key "*) continue ;; esac
    echo "$json_content" | grep -q "\"$json_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" || continue
    json_value=$(echo "$json_content" | grep -o "\"$json_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n 1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    [ -n "$json_value" ] || continue
    old_ifs="$IFS"; IFS='|'
    for prop in $props; do propreset "$prop" "$json_value"; done
    IFS="$old_ifs"
  done
}

apply_props() {
  json_content=$(cat "$COPG_VD_JSON")
  getprop_output=$(getprop)
  POLICY_VERSION=$(spoof_version_policy)
  json_flat=$(echo "$json_content" | tr -d '\n')
  GRUPOS=$(printf '%s' "$json_flat" | grep -o '"grupos"[[:space:]]*:[[:space:]]*{[^}]*}')
  SCOPE_MODE=$(printf '%s' "$json_flat" | grep -o '"scope_mode"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
  [ -n "$SCOPE_MODE" ] || SCOPE_MODE=playstore
  GLOBAL_FIELDS=$(printf '%s' "$json_flat" | grep -o '"global_fields"[[:space:]]*:[[:space:]]*\[[^]]*\]' | sed 's/.*\[//' | grep -o '"[A-Za-z0-9_]*"' | tr -d '"' | tr '\n' ' ')
  apply_global_fields

  if rp_enabled; then
    DELETE_LIST=$(read_delete_list)
    get_prop_mapping | while IFS='|' read -r json_key props; do
      [ -z "$json_key" ] && continue
      case " $DELETE_LIST " in *" $json_key "*) continue ;; esac
      case " $VERSION_GROUP_KEYS " in
        *" $json_key "*) { [ "$SCOPE_MODE" = global ] && group_on version;  } || continue ;;
        *)               { [ "$SCOPE_MODE" = global ] && group_on identity; } || continue ;;
      esac
      present=0; echo "$json_content" | grep -q "\"$json_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" && present=1
      json_value=$(echo "$json_content" | grep -o "\"$json_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n 1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
      case " $VERSION_KEYS " in
        *" $json_key "*)
            { [ "$present" = 1 ] && version_allowed "$json_key" "$json_value"; } || continue ;;
      esac
      if [ "$json_key" = "MANUFACTURER" ] && [ "$props" = "ro.product.manufacturer" ] &&
         [ -e "$MODDIR/.skip.manufacturer" ]; then
        continue
      fi
      if [ "$json_key" = "TAGS" ]; then
        json_value="release-keys"; present=1
      elif [ "$json_key" = "TYPE" ]; then
        json_value="user"; present=1
      fi
      [ "$present" = 1 ] || continue
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
      fi
      old_ifs="$IFS"
      IFS='|'
      for prop in $props; do
          if [ -n "$json_value" ]; then propreset "$prop" "$json_value"
          else set_empty "$prop"; fi
      done
      IFS="$old_ifs"
    done

    if [ "$SCOPE_MODE" = global ] && group_on version; then
      fal=$(printf '%s' "$json_flat" | grep -o '"FIRST_API_LEVEL"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
      case " $DELETE_LIST " in *" FIRST_API_LEVEL "*) fal="" ;; esac
      if [ -n "$fal" ]; then
        propforce ro.product.first_api_level "$fal"
        propforce ro.board.first_api_level "$fal"
      fi
    fi

    for d in $DELETE_LIST; do
      case " $VERSION_KEYS " in *" $d "*) continue ;; esac
      case "$d" in
        ro.*|persist.*|sys.*|vendor.*|debug.*) "$bin_resetprop" --delete "$d" 2>/dev/null ;;
        *) dprops=$(get_prop_mapping | awk -F'|' -v k="$d" '$1==k{for(i=2;i<=NF;i++) print $i}')
           for p in $dprops; do "$bin_resetprop" --delete "$p" 2>/dev/null; done ;;
      esac
    done

    cod=$(echo "$json_content" | grep -o "\"CODENAME\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n 1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    rel=$(echo "$json_content" | grep -o "\"ANDROID_VERSION\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n 1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    version_allowed CODENAME "$cod" || cod=""
    version_allowed ANDROID_VERSION "$rel" || rel=""
    { [ "$SCOPE_MODE" = global ] && group_on version; } && aplicar_derivados "$cod" "$rel"

    group_on boot_state       && apply_boot_state
    group_on selinux_bootmode && apply_selinux_bootmode
    group_on adb_usb          && apply_adb_usb
    group_on anti_emulator    && apply_anti_emulator
    group_on cleanup          && apply_cleanup
  fi
}

if [ "$1" = "--props-only" ]; then
    apply_props
    exit 0
fi

[ -f "$MODDIR/fingerprint-update.sh" ] && sh "$MODDIR/fingerprint-update.sh" sync-settings >/dev/null 2>&1

apply_props

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 2

chmod 0644 "$COPG_VD_JSON"
chcon u:object_r:system_file:s0 "$COPG_VD_JSON"

if [ ! -e "$MODDIR/.skip.autoupdate" ] && [ -f "$MODDIR/fingerprint-update.sh" ]; then
    sh "$MODDIR/fingerprint-update.sh" boot >/dev/null 2>&1 &
fi
