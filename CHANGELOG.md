# Changelog

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
