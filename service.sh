#!/system/bin/sh

until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 5

exec /data/adb/modules/COPG/controller >/dev/null 2>&1 &
