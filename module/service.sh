#!/system/bin/sh

COPG_JSON="/data/adb/COPG.json"
COPG_ORIGINAL="/data/adb/modules/COPG/original_device.txt"
COPG_UTILS="/data/adb/modules/COPG/utils.sh"

sh "$COPG_UTILS"
sh "$COPG_UTILS" spoofed

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 2
for FILE in "$COPG_JSON" "$COPG_ORIGINAL"; do
    chmod 0644 "$FILE"
    chcon u:object_r:system_file:s0 "$FILE"
done
