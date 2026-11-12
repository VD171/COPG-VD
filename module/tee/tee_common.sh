#!/system/bin/sh
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
# Source this file from the TOPG TEE adapter. No filesystem changes on load.

TEE_DATA_DIR=/data/adb/COPG-VD/tee
TEE_LEGACY_DIR=/data/adb/tricky_store
TEE_KEYBOX_FILE="$TEE_DATA_DIR/keybox.xml"
TEE_TARGET_FILE="$TEE_DATA_DIR/target.txt"
TEE_PERSISTENT_KEYS_DIR="$TEE_DATA_DIR/persistent_keys"
TEE_SECURITY_PATCH_FILE="$TEE_DATA_DIR/security_patch.txt"

# Print one validated target entry. Usage: tee_target_entry package mode
tee_target_entry() {
    [ "$#" -eq 2 ] || return 2
    case "$1" in
        ''|*[!a-zA-Z0-9_.]*|.*|*.|*..*) return 2 ;;
    esac
    case "$1" in *.*) ;; *) return 2 ;; esac
    case "$2" in
        auto) printf '%s\n' "$1" ;;
        generate) printf '%s!\n' "$1" ;;
        hack) printf '%s?\n' "$1" ;;
        *) return 2 ;;
    esac
}
