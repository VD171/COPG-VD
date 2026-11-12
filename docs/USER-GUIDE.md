> **Languages:** English · [العربية](ar/USER-GUIDE.md) · [Čeština](cs/USER-GUIDE.md) · [Deutsch](de/USER-GUIDE.md) · [Español](es/USER-GUIDE.md) · [فارسی](fa/USER-GUIDE.md) · [Français](fr/USER-GUIDE.md) · [हिन्दी](hi/USER-GUIDE.md) · [Bahasa Indonesia](in/USER-GUIDE.md) · [Italiano](it/USER-GUIDE.md) · [日本語](ja/USER-GUIDE.md) · [한국어](ko/USER-GUIDE.md) · [Nederlands](nl/USER-GUIDE.md) · [Polski](pl/USER-GUIDE.md) · [Português](pt/USER-GUIDE.md) · [Русский](ru/USER-GUIDE.md) · [Svenska](sv/USER-GUIDE.md) · [ไทย](th/USER-GUIDE.md) · [Türkçe](tr/USER-GUIDE.md) · [Tiếng Việt](vi/USER-GUIDE.md) · [中文](zh/USER-GUIDE.md)

---

# User Guide

COPG-VD rewrites the device fingerprint and build so the apps you choose see a Pixel
instead of your real device. This guide takes you from install to a working setup and
through the choices along the way. For every field and value, see [CONFIGURATION.md](CONFIGURATION.md);
for how it works inside, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Install

1. Flash the zip in KernelSU, APatch or Magisk and reboot.
2. Zygisk must be active (built in, or ReZygisk / Zygisk Next). Magisk users: enable Zygisk.
3. The module ships a Pixel profile, so right after the reboot the Google Play stack
   already sees that Pixel. With a working fingerprint you do not need PlayIntegrityFix or
   GooglePhotosUnlimited.

Open the WebUI from your root manager to drive the module. Magisk users open it with
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Everything
can also be edited directly in `/data/adb/COPG-VD/COPG-VD.json`.

## Who sees the spoof (scope)

`scope_mode` decides which processes receive the spoofed identity. In a scoped mode the
identity is delivered per process by Zygisk and is **not** leaked to the rest of the
system through global properties.

| Mode | Who gets the spoof |
|---|---|
| `playstore` (default) | Only the Play stack: Google Play services, its unstable process and the Play Store. |
| `global` | The whole device: every process. |
| `whitelist` | Only the apps listed in `scope_whitelist`. |
| `blacklist` | Every app except the ones in `scope_blacklist`. |

Start with `playstore`. It is the lightest option and the one that passes Play Integrity
without exposing the spoof to unrelated apps.

## The engines

Each engine is independent and can be turned off. All are on by default except DRM.

- **Build fields (`motor_jni`)** - rewrites `android.os.Build.*` in the targeted
  processes. This is what most apps read.
- **Property hook (`motor_prop_hook`)** - presents the spoofed system properties to the
  targeted processes, through a clean-room per-process remap of the property area (no
  function hook).
- **resetprop** - rewrites the system properties device-wide, by group (identity,
  version, boot state, SELinux, adb/usb, anti-emulator, and a cleanup pass). In a scoped
  mode the identity and version groups stay out of the device-wide pass (Zygisk delivers
  them per process); boot, lock and SELinux groups stay global. Toggle it in
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, off by default)** - reports a chosen Widevine security
  level (L1 or L3) to apps that read it. See the DRM section below.

## Keeping the fingerprint fresh

A fingerprint ages: Google rotates the factory images, and an old one slowly loses value.
`fingerprint-update.sh` keeps yours current, from the newest Google factory image.

- From the WebUI (Tools tab): **Check Update** and **Update Now**.
- By itself, **once per boot**: **Auto-update JSON on boot** (on by default). It runs in
  the background, keeps retrying for about ten minutes because wifi is usually not up yet
  at boot, and never delays the boot.
- It rewrites only the build fields (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Everything you customized is kept, and the previous
  content is saved as `.bak`.
- It never goes backwards (an older upstream build is refused), and if your profile spoofs
  a different device it applies nothing - a Pixel fingerprint on another profile is worse
  than an old one.
- `resetprop` is re-applied right after an update, but `android.os.Build` is written when
  zygote starts, so **reboot** for new values to reach apps. Log:
  `/data/adb/COPG-VD/update.log`.

## The Android version trap

The hardest thing to get right. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` and `CODENAME`
describe **your ROM**, not the device you spoof. Telling apps the SDK is newer than the
framework really is makes them call APIs that do not exist: Google's apps crash, the phone
reboots, and it starts over. The boot itself completes, so it is a **softloop** that
leaves nothing in the boot logs.

These fields are not in the shipped config and the updater never writes them. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) decides whether they apply at all:

- `never` (default) - the ROM's own version is used.
- `rom` - apply only what does not exceed the ROM, which in practice means lowering the SDK.
- `force` - apply exactly what the config says. This is what causes the softloop; use it
  only if you know the target framework supports it.

The real version is read from `/system/build.prop`, never from `getprop` (which is the
very thing this module falsifies). `force` is also refused when restoring a backup, so an
old backup cannot re-arm it behind your back.

## DRM / Widevine

Off by default (`motor_drm`). When on, it reports a chosen Widevine level,
`DRM_SECURITY_LEVEL` (`L1` or `L3`), to apps that read it.

By default the DRM spoof follows `scope_mode`. To apply it to a specific set of apps
instead - independently of the main scope - list them in `drm_targets`. The module then
stays loaded in a listed app **just** for the DRM hook, even when that app is outside the
main scope; an empty or absent list means follow the scope. This needs a scoped mode (not
`global`), and takes effect on the next **reboot**.

## Analyze: check your config

**Analyze** in the WebUI (or `fingerprint-update.sh analyze`) audits the config as it
stands and tells you what is wrong before an app does:

- the version against the ROM (would it softloop?),
- whether the file still parses (a broken one makes the module spoof **nothing**, and only
  logcat would say so),
- whether the fingerprint agrees with the fields around it,
- keys the module does not read, suspicious dates, and whether the live properties already
  carry what the config asks for.

Run it whenever you edit the config by hand.

## The WebUI

Optional, but the easy way to drive everything. Five tabs:

- **About** - module and version info.
- **Device** - every build field, set per state and grouped by category.
- **Spoofing** - scope mode and the engine switches.
- **System** - the resetprop groups.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, the boot auto-update,
  and the Diagnostics report (one button to read and export everything useful for a bug
  report).

It makes no network request; everything it needs ships inside the module.

## Troubleshooting

- **An app still sees the real device.** Check the scope: in `playstore` only the Play
  stack is covered. Confirm the config parses (run Analyze). After changing engines,
  `drm_targets` or the profile, **reboot** - Zygisk reads the scope when zygote starts.
- **Play Integrity still fails.** Make sure the fingerprint is fresh (Check Update) and
  that the `SECURITY_PATCH` is in `global_fields` so it stays coherent device-wide. Kill
  Google Play services so it re-attests.
- **The phone softloops after enabling version spoofing.** That is the Android version
  trap above - set `spoof_version` back to `never`.
- **The WebUI will not open on Magisk.** Use [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [../CONTRIBUTING.md](../CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome; see [CONTRIBUTING.md](../CONTRIBUTING.md)._
