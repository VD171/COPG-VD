<!--
  COPG-VD: global device spoofer: spoof your device fingerprint and build.
  Copyright (C) 2026  AlirezaParsi & VD171. SPDX-License-Identifier: Apache-2.0 (Fork by VD171)
-->

# COPG-VD

<p align="center">
  <img src="images/logo-wordmark.png" alt="COPG-VD" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/COPG-VD?label=release&color=2ee89d" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/COPG-VD/releases"><img src="https://img.shields.io/github/downloads/VD171/COPG-VD/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/COPG-VD/stargazers"><img src="https://img.shields.io/github/stars/VD171/COPG-VD?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>A device spoofer: it rewrites the device fingerprint and build so apps see the device you choose instead of the real one.</b><br>
  It runs on Zygisk (KernelSU, APatch or Magisk) and, by default, scopes the spoof to the Google Play stack: a lighter, more robust alternative to PlayIntegrityFix.
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases">Releases</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki">Wiki</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/USER-GUIDE">User Guide</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/CONFIGURATION">Configuration reference</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/ARCHITECTURE">Architecture</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/FILE-STRUCTURE">File structure</a> ·
  <a href="https://xdaforums.com/t/COPG-VD.4807698/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

---

## How to use?
Install the module, reboot, and the shipped profile (a Pixel) is spoofed to the targeted apps. With a working fingerprint you do not need PlayIntegrityFix or GooglePhotosUnlimited.  
Everything is configured in `/data/adb/COPG-VD/COPG-VD.json`, or from the WebUI. All fields are OPTIONAL: a field that is not provided is skipped.  

### Scope: who sees the spoof
`scope_mode` decides which processes get the spoofed identity. In a scoped mode the identity is delivered per process by Zygisk and is not leaked to the rest of the system through the global properties.  
* **Google Play** (`playstore`, the default): only the Play stack (Google Play services, its unstable process and the Play Store).  
* **Global**: the whole device; every process sees it.  
* **Whitelist**: only the apps in `scope_whitelist`.  
* **Blacklist**: every app except the ones in `scope_blacklist`.  

### Engines: how the spoof is delivered
Each one is independent and can be turned off:  
* **Build fields (JNI)**: rewrites `android.os.Build.*` in the targeted processes.  
* **Property hook**: presents the spoofed system properties to the targeted processes (a clean-room per-process remap of the property area, no function hook).  
* **resetprop**: rewrites the system properties, managed by group: identity, version, boot state, SELinux, adb/usb, anti-emulator and a cleanup pass. In a scoped mode the identity and version groups stay out of the device-wide resetprop (Zygisk delivers them per process); the boot/lock/SELinux groups stay global.  
* **DRM / Widevine** (off by default): reports a chosen Widevine security level, L1 or L3, to the apps that read it. By default it follows the scope above; set `drm_targets` (a list of apps) to apply the DRM spoof **only** to those apps, independently of `scope_mode`: the module stays loaded in a listed app just for the DRM hook, even when that app is outside the main scope. Empty or absent means follow the scope. (Requires a scoped mode, not Global.)  

### Fields: set, empty, delete or skip
Inside the `COPG-VD` object each Build field has four states:  
* **Set**: `"KEY": "value"` writes the value.  
* **Empty**: `"KEY": ""` writes an empty value.  
* **Delete**: list the key in a top-level `"COPG-VD-Delete": [ ... ]` to remove it (a Build field becomes null, a property is removed with `resetprop --delete`).  
* **Skip**: leave the key out entirely; the ROM's own value is kept.  

A `"global_fields": [ ... ]` list applies the named Build fields device-wide even in a scoped mode, to keep a value consistent everywhere: for coherence-safe fields only (the security patch, for example), never identity and never the Android version group.  

### Example JSON config file
`/data/adb/COPG-VD/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.261016.008-factory-28d56d15.zip",
  "scope_mode": "playstore",
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": [],
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.261016.008",
    "ID": "ZP11.261016.008",
    "HOST": "e4df75f83a59",
    "INCREMENTAL": "16754936",
    "TIMESTAMP": "1793211232",
    "PREVIEW_SDK": "20261104",
    "USER": "android-build",
    "SDK_FINGERPRINT": "ee82a872870173d77e68050e21a2bcbf",
    "UUID": "FjWvtSORkI0sEwekaPz2s30gqV5vWP_EZHFtBiXzboc",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  }
}
```
Be sure to use strings on double-quotes only.  
The block above and `module/COPG-VD.json.example` are refreshed daily by the [Update COPG-VD.json](.github/workflows/update-json.yml) workflow, straight from the newest Google factory image.  

### Keeping the fingerprint fresh
`fingerprint-update.sh` pulls that file and updates your config, from the WebUI (**Check Update** / **Update Now**) or by itself **once per boot** (**Auto-update JSON on boot**, on by default).  
* `/data/adb/COPG-VD/COPG-VD.json` is updated in place, and the previous content is kept next to it as `COPG-VD.json.bak`.  
* Only the build fields are rewritten (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Everything else you customized is preserved: extra keys, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, other objects, key order and formatting.  
* It never goes backwards: an upstream build older than the one installed is refused. This is
  routine (the repo can sit behind a config you updated by hand) and it is also the guard that
  matters most on Android, where the only downloader available is busybox `wget`, which cannot
  validate TLS certificates: every value is validated before use for the same reason.  
* If your profile spoofs **another device** (different `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), nothing is applied: a Pixel fingerprint on another profile is worse than an old fingerprint.  
* At boot it runs in the background and keeps retrying for ~10 minutes, because wifi is usually not up yet when the boot finishes. It never delays the boot.  
* `resetprop` is re-applied right after an update, but `android.os.Build` is written by the zygisk module when zygote starts: **reboot** for the new values to reach apps.  
* Log at `/data/adb/COPG-VD/update.log`.  

### Android version: and why it is not spoofed
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` and `CODENAME` describe **your ROM**, not the device being spoofed. Telling apps the SDK is newer than the framework really is makes them call APIs that do not exist: Google's apps crash, the phone reboots, and it starts over. The boot itself completes, so it is a **softloop** and nothing shows up in the boot logs.  
* They are not in the shipped config and the updater never writes them.  
* **Spoof Android version** in the WebUI decides whether they are applied at all:  
  * **Never** (default): the ROM's own version is used.  
  * **Up to this ROM**: only what does not exceed it, which in practice means lowering the SDK.  
  * **Force**: exactly what the config says. This is what causes the softloop.  
* The real version is read from `/system/build.prop`, never from `getprop`: that is the very thing this module falsifies.  

### Analyze
**Analyze** in the WebUI (or `fingerprint-update.sh analyze`) audits the config as it stands: version against the ROM, whether the file still parses at all (a broken one makes the module spoof **nothing**, and only logcat says so), whether the fingerprint agrees with the fields around it, keys the module does not read, dates, and whether the props already carry what the config asks for.  

### WebUI
The WebUI is optional (everything can be edited in the JSON config directly) but it is the easy way to drive the module. It has five tabs: **About**, **Device** (every field, set per state, grouped by category), **Spoofing** (scope and engines), **System** (the resetprop groups) and **Tools** (Analyze, Check Update, Update Now, Backup/Restore and the boot auto-update). It makes no network request; everything it needs ships inside the module.  
If you are a Magisk user, use KsuWebUI by KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases). You can also use WebUI-X Portable by MMRL (https://github.com/MMRLApp/WebUI-X-Portable/releases).  

### Settings in the config
`COPG-VD.json` carries its settings next to the profile, so your choices travel with a backup and can be edited by hand: `scope_mode`, the engine switches, the resetprop groups, `global_fields`, and a `COPG-VD-Settings` object (`resetprop`, `autoupdate`, `spoof_version`). Everything lives in this one file: the boot scripts and the WebUI read the settings straight from it, so your choices survive a module update. `"spoof_version": "force"` is refused from the file and downgraded: restoring an old backup must not re-arm it behind your back.  

<!-- vd-docs -->
## Documentation

- **[Wiki](https://github.com/VD171/COPG-VD/wiki)**: the full documentation, browsable online.
- **[User Guide](https://github.com/VD171/COPG-VD/wiki/USER-GUIDE)**: install it, the WebUI, and day-to-day use.
- **[Configuration reference](https://github.com/VD171/COPG-VD/wiki/CONFIGURATION)**: every setting in the config file and what it does.
- **[Architecture](https://github.com/VD171/COPG-VD/wiki/ARCHITECTURE)** and **[File structure](https://github.com/VD171/COPG-VD/wiki/FILE-STRUCTURE)**: how the spoofing works and where everything lives.

<!-- /vd-docs -->

## See also

Sibling projects by the same author:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: a device method debugger that reads each item through every method that can read it and compares them side by side.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: your Google services (RCS, Wallet, Play Integrity attestations), read on your device with no internet.
- **[VDBackup](https://github.com/VD171/VD-Backup)**: full app and data backup and restore as root, driven entirely from a WebUI.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: a standalone rooted SSH daemon (Dropbear).

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork of @T3SL4).

## Contacts

- https://vd171.ru
- https://vd.priv8.ru
- *Telegram:* @VD_Priv8 https://t.me/VD_Priv8
- *Channel:* @Priv8_VD https://t.me/Priv8_VD
- *Discord:* @VD.Priv8 https://discord.com/users/1296831918989639721
- *E-mail:* vd.priv8@pm.me
- *XDA-Developers:* @VD171 https://xdaforums.com/m/vd171.4699873/
- *XDA thread:* https://xdaforums.com/t/COPG-VD.4807698/
- *GitHub:* @VD171 https://github.com/VD171

## License

**Apache-2.0**: see [LICENSE](LICENSE). COPG-VD is a fork by VD171 of the original COPG by AlirezaParsi, continued under the same license.

## Trademarks

COPG-VD is an independent, unofficial project. It is not affiliated with, endorsed by, or sponsored by Google LLC. "Google", "Google Play", "Play Integrity", "Pixel", "Android" and related names and logos are trademarks of Google LLC. COPG-VD runs entirely on your device.

## Tags

`Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
