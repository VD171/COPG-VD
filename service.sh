#!/system/bin/sh

MODDIR=${0%/*}
BINARY="$MODDIR/bin/controller"

# Wait for boot
until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

sleep 5

# Run completely silent
[ -x "$BINARY" ] && exec "$BINARY" >/dev/null 2>&1 &
