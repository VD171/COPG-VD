#!/system/bin/sh
# Runs when the module is removed.
#
# Your config is deliberately kept: /data/adb/COPG-VD.json and its .bak survive, so
# reinstalling does not cost you your profile. Only what the module generates by itself goes.

rm -f /data/adb/COPG-VD.update.state
rm -f /data/adb/COPG-VD.update.log
rm -f /data/adb/.COPG-VD.update.*
