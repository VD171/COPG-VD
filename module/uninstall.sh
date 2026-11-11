#!/system/bin/sh
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  VD171
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
#  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================

rm -f /data/adb/COPG-VD/update.state
rm -f /data/adb/COPG-VD/update.log
rm -f /data/adb/COPG-VD/update.status
rm -f /data/adb/COPG-VD/COPG-VD.json.bak
rm -f /data/adb/COPG-VD/.force
rm -f /data/adb/COPG-VD/.update.*
rm -f /data/adb/COPG-VD.update.state /data/adb/COPG-VD.update.log
rm -f /data/adb/COPG-VD.json.bak /data/adb/.COPG-VD.update.*
