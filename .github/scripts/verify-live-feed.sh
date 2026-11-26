#!/bin/sh
# ======================================================================
#  VD-ModuleKit  ::  verify-live-feed.sh
#  Assert the LIVE, device-facing VDLU feed head advanced to the just-released
#  versionCode (STANDARDS 7).
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
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
#  Vendored from VD-ModuleKit; the host module fills the contact chain and keeps
#  its own license and product banner.
# ======================================================================
#
# verify-live-feed <feed-name> <expected_versionCode> - run at the END of a VDLU release ritual, AFTER
# publishing the feed: a 0 exit is the only proof the feed actually moved. Running the publish command is
# NOT enough: a ritual that "published" but left the GitHub Pages feed head on the previous versionCode
# makes every device DOWNGRADE on boot (the live manifest.json is older than the installed build). This
# gate catches that, in CI or in the ritual, before the release is declared done.
#
# TRAP: <feed-name> is the DIRECTORY NAME under VD-Modules (vd171.github.io/VD-Modules/<feed-name>/), which
# is the REPO name, NOT the module id. They diverge across the fleet: id=vddropbear feeds VD-dropbear,
# id=vdinstaller feeds VD-Installer, id=vdbackup feeds VD-Backup; only COPG-VD matches. Pass the feed dir.
#
# Usage: verify-live-feed.sh <feed-name> <expected_versionCode>
# Exit: 0 head == released code - 1 feed STALE (head != code) - 2 usage / feed unreachable or malformed.
set -eu
mod="${1:?usage: verify-live-feed.sh <module> <expected_versionCode>}"
want="${2:?usage: verify-live-feed.sh <module> <expected_versionCode>}"
case "$want" in ''|*[!0-9]*) echo "verify-live-feed: versionCode must be numeric: $want" >&2; exit 2 ;; esac
url="https://vd171.github.io/VD-Modules/$mod/manifest.json"
got="$(curl -fsSL -H 'Cache-Control: no-cache' "$url?cb=$(date +%s)" 2>/dev/null \
  | grep -o '"version":[0-9]\{1,\}' | head -n1 | cut -d: -f2)"
case "$got" in
  "$want")        echo "OK: live feed $mod head = $got (matches released versionCode)"; exit 0 ;;
  ''|*[!0-9]*)    echo "FAIL: could not read a numeric version from $url (feed unreachable or malformed)" >&2; exit 2 ;;
  *)              echo "FAIL: live feed $mod head = $got, expected $want - the feed is STALE; devices will downgrade. Re-publish the feed before declaring the release done." >&2; exit 1 ;;
esac
