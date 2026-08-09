# Changelog

## v5.1.0-vd
- The Android version is no longer spoofed. ANDROID_VERSION, SDK_INT, SDK_FULL and CODENAME describe the ROM, not the build being spoofed. A device told its SDK is newer than it really is has apps calling APIs its framework does not have: Google's apps crash, the phone reboots, and it starts over. That is a softloop - the boot itself completes, so nothing shows up in the boot logs and nobody finds the cause.
 . They are gone from the config the module ships, and the daily job never writes them again.
 . A config that already carries them is cleaned when you update, keeping a .bak.
 . A three-state selector in the WebUI decides whether they are applied at all: Never (default), Up to this ROM (only what does not exceed it), Force (as written - this is what causes the softloop).
 . The real version is read from /system/build.prop. Never from getprop, which is the very thing this module falsifies.
- Fixed ro.build.version.release_or_codename being given the literal string "REL". By AOSP it holds the release number when the codename is REL, so the module was publishing a combination no real device reports.
- Added Analyze to the WebUI: checks the config against the ROM and against itself - version vs ROM, whether the file still parses (a broken one makes the module spoof nothing, and only logcat says so), whether the fingerprint agrees with the fields around it, keys the module does not read, dates, and whether the props already carry what the config asks for.
- Settings can now be declared in COPG-VD.json, in a COPG-VD-Settings object: resetprop, autoupdate, spoof_manufacturer and spoof_version. The WebUI writes both the config and the flag files.
 . "spoof_version": "force" is refused from the config and downgraded to "rom" - restoring an old backup must not re-arm the dangerous mode behind your back. Arm it in the WebUI.
- "Spoof ro.product.manufacturer" no longer edits service.sh, so it survives module updates. If you had it off, set it again after updating.
- Fixed the prop reader taking several lines at once when the config holds more than one object.

_The version group only reaches apps after a reboot. If you came from v5.0.x and the phone kept rebooting on its own, this is the update that stops it._

## v5.0.1-vd
- The WebUI content security policy is now declared in the page itself, not only in config.json. KsuWebUIStandalone, which is what Magisk users run, does not read config.json - so on Magisk there was no policy at all.
- The daily job that refreshes COPG-VD.json.example will never replace a build with an older one, the same rule the on-device updater already followed.

_No change to the spoofing itself. Coming from v5.0.0-vd is optional; coming from anything older is not._

## v5.0.0-vd
- Added COPG-VD.json auto-update, from the WebUI (Check Update / Update Now) or once per boot.
 . Only the build fields are rewritten, everything else you customized is kept: extra keys, custom BOOTLOADER/BOARD/HARDWARE, other objects, key order and formatting.
 . Nothing is applied if your config spoofs another device.
 . Never goes backwards: a build older than the one installed is refused.
 . Updates /data/adb/COPG-VD.json and the copy in the module folder when both exist, keeping the previous content as .bak.
 . At boot it runs in background and retries for ~10 minutes, because wifi is usually not up yet. It never delays the boot.
 . Can be turned off in the WebUI: "Auto-update JSON on boot".
- Added uninstall.sh: removes what the module generates and keeps your config file.
- Updated FINGERPRINT and Build info to: ZP11.260618.005.
- The module is now built for armeabi-v7a and x86_64 too, not only arm64-v8a.
- A daily workflow keeps COPG-VD.json.example on the newest Google build.
- The version now lives only in module.prop, and the build workflow derives versionCode from it.
- Fixed updateJson pointing to a branch that does not exist, so checking for updates works now.
- Fixed a crash inside zygote in the atexit shim: the index could run past the array, and the memory was used again after being freed.
- Fixed Build.TIME and Build.VERSION.SDK_INT_FULL getting garbage when the config has no TIMESTAMP, SDK_FULL or SDK_INT.
- The WebUI no longer loads anything from the internet: marked, the fonts, the readme and the license are inside the module.
- The WebUI no longer builds shell commands out of file names. A crafted file name on shared storage could run commands as root through the file picker.
- The WebUI content security policy went from default-src * to default-src 'none', declared both in config.json and in the page itself, so it also applies under KsuWebUIStandalone (Magisk), which does not read config.json.

_The new build only reaches android.os.Build after a reboot: resetprop is re-applied right away, but zygisk reads the config when zygote starts._
