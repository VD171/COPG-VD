#!/system/bin/sh
# ======================================================================
#  COPG-VD  ::  VDLU pre-zygote hook (flashless incremental updater)
#
#  Copyright (C) 2026  AlirezaParsi & VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#  Fork by VD171.
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
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
# post-fs-data runs BEFORE zygote maps zygisk/<abi>.so: the only window to
# swap the .so without a second reboot. service.sh is late_start (too late).
# Fail-safe: any missing piece exits 0. The engine never fetches over the
# network here (none pre-zygote); with an https source a `boot` only resumes
# an already-staged transaction offline and swaps the staged .so.

MODDIR=${0%/*}
VDLU_DIR=/data/adb/COPG-VD/vdlu
ENGINE="$MODDIR/vdlu/update.sh"

[ -f "$ENGINE" ] || exit 0

if [ ! -f "$VDLU_DIR/config" ] && [ -f "$MODDIR/vdlu/config.default" ]; then
	mkdir -p "$VDLU_DIR"
	cp -f "$MODDIR/vdlu/config.default" "$VDLU_DIR/config"
fi
[ -f "$VDLU_DIR/config" ] || exit 0

# ENGINE_VERSION 4 pins the module-update key to key_id (the keyring holds vd-2026 + the
# fp-feed key vd-fp-2026); an older config without it makes the engine fail-closed. Migrate
# before the engine runs. The upgraded engine is reboot-class, so this always precedes it.
grep -q '^key_id=' "$VDLU_DIR/config" || echo 'key_id=vd-2026' >> "$VDLU_DIR/config"

grep -q '^auto_on_reboot=1' "$VDLU_DIR/config" || exit 0

export PATH="/system/bin:/system/xbin:$PATH"
export VDLU_DIR MODULE_DIR="$MODDIR" MODID=COPG-VD

(sh "$ENGINE" boot >>"$VDLU_DIR/boot.log" 2>&1) &

exit 0
