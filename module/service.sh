#!/system/bin/sh

COPG_JSON="/data/adb/modules/COPG/COPG.json"

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 5
chmod 0644 $COPG_JSON
chcon u:object_r:system_file:s0 $COPG_JSON
