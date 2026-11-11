# Changelog

## v6.11-vd

- Fixed a regression from v6.10 that could break hardware-backed integrity and WebView on some setups: a module file descriptor is now released before the app starts, instead of lingering in the target process.
- Configuration, logs and state now live in their own `/data/adb/COPG-VD/` directory; an existing `/data/adb/COPG-VD.json` is moved there automatically and keeps working.
- Settings (resetprop, auto-update, manufacturer, version policy) are kept in the config file, so they survive a module update.
- The boot-time profile auto-update now reports its result and fails visibly instead of silently when the source cannot be reached.
- A minified config file no longer trips the analyzer or the updater.
- The README tab in the WebUI renders cleanly, and the bundled fonts and library now ship their licenses.

## v6.10-vd

- New: a dedicated DRM / Widevine target list, independent of the main scope - the DRM spoof can now apply to its own set of apps (off by default).
- Keep attestation IDs and native properties coherent: fixed a native system-property crash and the `*_FOR_ATTESTATION` fields, so the keystore no longer reports `CANNOT_ATTEST_IDS`.
- Diagnostics: one button under Tools to read and export module, config, logs, device and load status for a bug report.
- Clearer errors: the profile fetch and the updater now show the real reason instead of a generic exit code.
- Fixed the updater refusing a correctly-formatted config, and restored missing English strings.

## v6.9.8-vd

- Fixed a false-positive risk flag from the KernelSU-Next module scanner: the conflict-module list is written so its wildcard no longer coincides with a risk pattern, with no change to which modules it clears.

## v6.7.0-vd .. v6.9.7-vd

Spoofing:
- Per-process field overrides: a field can take a different value in a specific process through `process_overrides` (a map of process name to field/value), layered on top of the profile. Scoped modes only, per process; the global version safeguards still apply.
- A changed profile now reaches a newly started or reopened target app without a reboot: the module re-reads the config per targeted process - while the process is still privileged, and only when the file actually changed - instead of once at boot.
- Boot-state group now also covers `ro.crypto.state` and the Samsung `fmp_config`/`dp_fw_check` properties when the device has them; cleanup normalizes build type/tags to a release build and removes custom-ROM version markers.
- The attestation security-patch file is written in the keyed per-partition format from the profile's security patch.

Profiles:
- New "Fetch Pixel profile" button: pick a Pixel device and a release channel (canary / beta / release) and apply its latest profile in one step, from [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop).
- The profile download (this fetch and the on-device JSON auto-update) uses the module's own bundled downloader, not a `curl`/`wget` from `PATH` that may belong to another app and fail to run.

Applying changes:
- A "Restart Play Services" action applies a changed profile to Play Integrity on its next attestation, with no reboot; other apps apply it when closed and reopened. Tools shows when changes are pending and still offers a full reboot.

WebUI:
- Each Tools action (Analyze, Check Update, Update Now, Backup/Restore, Logcat) has its own collapsible output panel under its button, instead of one shared log window; Logcat moved to Tools with start/stop controls. Short status messages show as a brief toast.
- Optional verbose-logging toggle for detailed module logs.
- The back button returns to the previous tab (closing an open dialog first) instead of always jumping to the About screen.
- All 21 languages brought fully up to date with every string added across v6.

_A changed profile reaches a process the next time it starts: Play Services and other apps pick it up when restarted or reopened, so a full reboot is no longer required to apply one._

## v6.0.0-vd .. v6.6.5-vd

Spoofing:
- Scope modes: the spoof can target processes instead of the whole system - global, whitelist, blacklist or Google Play (the default). In a scoped mode the device identity is delivered per process instead of through the global properties.
- Three engines, each on/off: the Build fields (JNI), a property hook for the targeted processes, and resetprop. Resetprop is managed by group - identity, version, boot state, SELinux, adb/usb, anti-emulator and cleanup - each switchable.
- Fields can be set, set empty or deleted, not only set: `"KEY": "value"` sets it, `"KEY": ""` sets it empty, a `COPG-VD-Delete` list removes it, and a missing key keeps the ROM's value. The Android version group is never deletable.
- A DRM / Widevine engine, off by default: it reports a chosen Widevine security level, L1 or L3.
- A `global_fields` list applies the named Build fields device-wide even in a scoped mode, so a value stays consistent everywhere. For coherence-safe fields only - never identity, never the Android version group.
- `first_api_level` is set, aligned to the spoofed build.
- The shipped profile is the Pixel 9a, refreshed by a daily job.
- The zygisk library is less than half the size (~205 KB), built without the bundled JSON library, iostreams or exceptions, with a stricter config parser.

WebUI (rebuilt):
- A new "device identity console" design, light and dark, machine data in a monospace font, with an active-profile plate showing model, fingerprint and scope.
- An About tab is the landing page: project, license, contacts and support, all on-device.
- Five tabs - About, Device, Spoofing, System, Tools. The Device tab groups fields into categories (Identity, Hardware, Build, Version); each field is set per state - Spoof, Skip, Empty, Null or Global - with the top bar pinned while you scroll. The version and launch-API fields offer only Spoof or Skip.
- Scope, engines and resetprop groups each have their own control, every item has an info button, and the language picker (21 languages) sits in the header.
- Tools gathers Analyze, Check Update, Update Now, Backup/Restore and the boot auto-update toggle.
- No network: the fonts and assets stay inside the module.

_The Build fields and the version group only reach `android.os.Build` after a reboot: resetprop is re-applied right away, but zygisk reads the config when zygote starts._

## v5.2.1-vd
- Updated FINGERPRINT and Build info to: ZP11.260918.007 (security patch 2026-10-05).

## v5.2.0-vd
- The WebUI and README are now available in 21 languages (English plus ar cs de es fa fr hi in it ja ko nl pl pt ru sv th tr vi zh). A language selector sits in Settings; English is embedded, so a blocked fetch falls back to English instead of showing raw keys.

## v5.1.1-vd
- Updated FINGERPRINT and Build info to: ZP11.260821.010 (security patch 2026-09-05).

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
- Fixed updates failing on the device while passing on a PC: the field list was written across two lines, and Android's awk refuses a newline inside a -v assignment. Half the fields were never refreshed, silently.

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
