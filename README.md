## COPG-VD
COPG-VD is a module designed for global device spoofing.  
This means even system apps and the whole device will be hooked.  
  
## How to use?
If using this module and spoofing a working FingerPrint, using PlayIntegrityFix or GooglePhotosUnlimited are unnecessary.  
### Example JSON config file  
`/data/adb/COPG-VD.json`
* All fields are OPTIONAL. If some field is not provided, it will be skipped.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260717.006-factory-1458a2a5.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260717.006/16004061:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260717.006",
    "ID": "ZP11.260717.006",
    "HOST": "e6a08b72aae6",
    "INCREMENTAL": "16004061",
    "TIMESTAMP": "1785780531",
    "PREVIEW_SDK": "20260805",
    "USER": "android-build",
    "SDK_FINGERPRINT": "88d3b71bccd150fc3f60ac4d1026e1db",
    "UUID": "62diQFW6nD4Hahmxok7HCfvYo9s1e42GqP9SatyVrVQ",
    "SECURITY_PATCH": "2026-08-05"
  }
}
```
Be sure to use strings on double-quotes only.  
The block above and `module/COPG-VD.json.example` are refreshed daily by the [Update COPG-VD.json](.github/workflows/update-json.yml) workflow, straight from the newest Google factory image.  
### Keeping the fingerprint fresh  
`fingerprint-update.sh` pulls that file and updates your config, from the WebUI (**Check Update** / **Update Now**) or by itself **once per boot** (**Auto-update JSON on boot**, on by default).  
* Both `/data/adb/COPG-VD.json` and `/data/adb/modules/COPG-VD/COPG-VD.json` are updated when both exist, and the previous content is kept as `.bak`.  
* Only the build fields are rewritten (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Everything else you customized is preserved: extra keys, `BOOTLOADER`/`BOARD`/`HARDWARE`, other objects, key order and formatting.  
* It never goes backwards: an upstream build older than the one installed is refused. This is
  routine (the repo can sit behind a config you updated by hand) and it is also the guard that
  matters most on Android, where the only downloader available is busybox `wget`, which cannot
  validate TLS certificates - every value is validated before use for the same reason.  
* If your profile spoofs **another device** (different `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), nothing is applied - a Pixel fingerprint on another profile is worse than an old fingerprint.  
* At boot it runs in the background and keeps retrying for ~10 minutes, because wifi is usually not up yet when the boot finishes. It never delays the boot.  
* `resetprop` is re-applied right after an update, but `android.os.Build` is written by the zygisk module when zygote starts: **reboot** for the new values to reach apps.  
* Log at `/data/adb/COPG-VD.update.log`.  
### Android version - and why it is not spoofed  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` and `CODENAME` describe **your ROM**, not the device being spoofed. Telling apps the SDK is newer than the framework really is makes them call APIs that do not exist: Google's apps crash, the phone reboots, and it starts over. The boot itself completes, so it is a **softloop** and nothing shows up in the boot logs.  
* They are not in the shipped config and the updater never writes them.  
* **Spoof Android version** in the WebUI decides whether they are applied at all:  
  * **Never** (default) - the ROM's own version is used.  
  * **Up to this ROM** - only what does not exceed it, which in practice means lowering the SDK.  
  * **Force** - exactly what the config says. This is what causes the softloop.  
* The real version is read from `/system/build.prop`, never from `getprop` - that is the very thing this module falsifies.  
### Analyze  
**Analyze** in the WebUI (or `fingerprint-update.sh analyze`) audits the config as it stands: version against the ROM, whether the file still parses at all (a broken one makes the module spoof **nothing**, and only logcat says so), whether the fingerprint agrees with the fields around it, keys the module does not read, dates, and whether the props already carry what the config asks for.  
### Settings in the config  
`COPG-VD.json` can carry a `COPG-VD-Settings` object - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - so your choices travel with a backup and can be edited by hand. The WebUI writes both that and the flag files the boot scripts read. `"spoof_version": "force"` is refused from the file and downgraded: restoring an old backup must not re-arm it behind your back.  
### WebUI  
Using the WebUI is unnecessary if you edit the JSON config file directly.  
If you are a Magisk user, use KsuWebUI by KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Disable resetprop usage and enable spoof Build info only.  
#### Use ro.product.manufacturer:  
Disable if you care for "Found device spoofing" detection in Disclosure root detector app.  
