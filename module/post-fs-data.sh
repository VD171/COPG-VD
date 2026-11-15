#!/system/bin/sh
# ======================================================================
#  COPG-VD  ::  VDLU pre-zygote hook (flashless incremental updater)
#  SPDX-License-Identifier: Apache-2.0
#  Fork by VD171.  Channel: @Priv8_VD https://t.me/Priv8_VD
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

grep -q '^auto_on_reboot=1' "$VDLU_DIR/config" || exit 0

export PATH="/system/bin:/system/xbin:$PATH"
export VDLU_DIR MODULE_DIR="$MODDIR" MODID=COPG-VD

(sh "$ENGINE" boot >>"$VDLU_DIR/boot.log" 2>&1) &

exit 0
