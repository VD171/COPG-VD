> **Languages:** English · [العربية](ar/ARCHITECTURE.md) · [Čeština](cs/ARCHITECTURE.md) · [Deutsch](de/ARCHITECTURE.md) · [Español](es/ARCHITECTURE.md) · [فارسی](fa/ARCHITECTURE.md) · [Français](fr/ARCHITECTURE.md) · [हिन्दी](hi/ARCHITECTURE.md) · [Bahasa Indonesia](in/ARCHITECTURE.md) · [Italiano](it/ARCHITECTURE.md) · [日本語](ja/ARCHITECTURE.md) · [한국어](ko/ARCHITECTURE.md) · [Nederlands](nl/ARCHITECTURE.md) · [Polski](pl/ARCHITECTURE.md) · [Português](pt/ARCHITECTURE.md) · [Русский](ru/ARCHITECTURE.md) · [Svenska](sv/ARCHITECTURE.md) · [ไทย](th/ARCHITECTURE.md) · [Türkçe](tr/ARCHITECTURE.md) · [Tiếng Việt](vi/ARCHITECTURE.md) · [中文](zh/ARCHITECTURE.md)

---

# Architecture

COPG-VD is a Zygisk module: a small native library (`libspoof.so`) that the Zygisk loader
injects into the zygote and, from there, into app processes. All it does is present a
chosen device identity to the processes you target. There is no app and, apart from the
optional profile fetch, no network.

## Lifecycle

1. **Zygote start.** When the zygote boots, the loader calls the module's `onLoad`. It
   reads `/data/adb/COPG-VD/COPG-VD.json` once: the scope configuration and the profile.
2. **App fork.** For every app the zygote forks, the module decides in
   `preAppSpecialize` whether this process is in scope:
   - **in the main scope** (`playstore` / `global` / `whitelist` / `blacklist`), or
   - **in the DRM scope** (listed in `drm_targets`).
   If it is neither, the module **detaches** from that process (`dlclose`) and leaves no
   trace in it.
3. **Specialize.** For a process that stays, the engines apply in `postAppSpecialize`,
   while the process is still privileged.

Because forks inherit the zygote's memory copy-on-write, each app starts from the config
read at boot. The module re-reads the file per targeted process only when it has actually
changed, so a newly started or reopened app picks up an edited profile - but the scope
decision itself is made at zygote start, so **changing the scope, the engines or
`drm_targets` needs a reboot**.

## The engines

Each is independent and switchable.

- **Build fields (`motor_jni`).** Rewrites `android.os.Build.*` (and `Build.VERSION.*`)
  in the targeted process through JNI, so Java code reads the spoofed values.
- **Property hook (`motor_prop_hook`).** Presents the spoofed system properties to the
  process through a clean-room, per-process remap of the property area (`prop_virtualizer`).
  It is a memory remap, not a function hook, so there is no hooked-function footprint.
- **resetprop (device-wide).** Writes system properties by group - identity, version,
  boot state, SELinux, adb/usb, anti-emulator, plus a cleanup pass. The boot scripts run
  it. In a scoped mode the identity and version groups are left out (Zygisk delivers them
  per process); boot, lock and SELinux groups stay global so the device is coherent.
- **DRM / Widevine (`motor_drm`).** Hooks the `MediaDrm` methods that report the Widevine
  security level (`getSecurityLevel`, `getPropertyString`) and returns the configured
  level. The hooks are null-checked, so a malformed profile degrades gracefully instead of
  crashing the app. `drm_targets` lets this engine run on its own app list, decoupled from
  the main scope.

## Reading the config

The injected process runs in the zygote SELinux domain, which by default cannot reach
`/data/adb`. The module ships its own `sepolicy.rule` to allow it, and, as a fallback,
can read the config through its open module directory (`getModuleDir`), so it keeps
working even if a Zygisk build stops granting the path. The file is parsed with a small
embedded JSON parser (`jsmn`); a file that does not parse means the module spoofs nothing.

## Keeping the profile fresh

`fingerprint-update.sh` refreshes the build fields from the newest Google factory image,
from the WebUI or once per boot. It uses the module's own bundled downloader (not a `PATH`
`curl`/`wget`), validates every value before use, never moves backwards, and refuses a
profile that spoofs a different device. `android.os.Build` is written at zygote start, so
new values reach apps on the next reboot. See [USER-GUIDE.md](USER-GUIDE.md) for the user
side and [CONFIGURATION.md](CONFIGURATION.md) for the fields.

## Why the Android version is not spoofed by default

Raising `SDK_INT` / `ANDROID_VERSION` above what the ROM's framework really is makes apps
call APIs that do not exist, which crashes Google's apps and reboots the phone into a
softloop. The version group is therefore off by default and gated behind
`spoof_version`. The module reads the real version from `/system/build.prop`, never from
`getprop`, because `getprop` is exactly what it falsifies. See the trap in
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [../CONTRIBUTING.md](../CONTRIBUTING.md).*
