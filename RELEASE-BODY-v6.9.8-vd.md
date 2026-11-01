**COPG-VD v6.9.8-vd**

COPG-VD is a device spoofer: it rewrites the device fingerprint and build so apps see the device you choose. By default it scopes the spoof to the Google Play stack - a lighter, more robust alternative to PlayIntegrityFix.

- **Scopes, not just global.** Target processes instead of the whole system - Google Play (the default), Global, Whitelist or Blacklist. In a scoped mode the identity reaches only the apps you choose, through Zygisk, and is not leaked to the rest of the system.
- **Three engines, each switchable.** The Build fields (JNI), a per-process property hook, and resetprop managed by group - identity, version, boot state, SELinux, adb/usb, anti-emulator and a cleanup pass.
- **Fetch Pixel profiles.** Pick any Pixel device and a release channel (canary / beta / release) and apply its latest profile in one step, from [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop).
- **Changes apply without a reboot.** The module re-reads the profile per targeted process, so a newly started or reopened app picks up a changed profile right away; "Restart Play Services" applies it to the Play Integrity stack on its next attestation.
- **DRM / Widevine.** Off by default; reports a chosen Widevine security level, L1 or L3, to the apps that read it.
- **Fields: set, empty, delete or skip.** Set a value, set it empty, delete it, or skip it to keep the ROM's. A `global_fields` list keeps a chosen value - the security patch - consistent device-wide even in a scoped mode, and `process_overrides` can give a field a different value in a specific process.
- **A WebUI in 21 languages.** A device identity console with five tabs - About, Device, Spoofing, System and Tools - light and dark, fully localized, and no network.
- **Lighter and current.** The zygisk library is less than half the size; the shipped profile is the Pixel 9a, refreshed daily from the newest Google factory image.

**Install:** flash the zip in KernelSU, APatch or Magisk and reboot. Magisk users: open the WebUI with [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

Full changelog: https://github.com/VD171/COPG-VD/blob/main/CHANGELOG.md
