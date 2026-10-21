- **Scopes, not just global.** COPG-VD can target processes instead of the whole system - Google Play (the new default), Global, Whitelist or Blacklist. In a scoped mode the device identity reaches only the apps you choose, through Zygisk, and is not leaked to the rest of the system - a lighter, more robust alternative to PlayIntegrityFix.
- **Three engines, each switchable.** The Build fields (JNI), a per-process property hook, and resetprop managed by group - identity, version, boot state, SELinux, adb/usb, anti-emulator and a cleanup pass.
- **DRM / Widevine.** Off by default; reports a chosen Widevine security level, L1 or L3, to the apps that read it.
- **Fields: set, empty, delete or skip.** Set a value, set it empty, delete it (a Build field becomes null, a property is removed), or skip it to keep the ROM's. A `global_fields` list keeps a chosen value - the security patch - consistent device-wide even in a scoped mode.
- **A rebuilt WebUI.** A device identity console with five tabs - About, Device, Spoofing, System and Tools - light and dark, 21 languages, and no network: everything ships inside the module.
- **Lighter and current.** The zygisk library is less than half the size; the shipped profile is the Pixel 9a, refreshed daily from the newest Google factory image.

Full changelog: https://github.com/VD171/COPG-VD/blob/main/CHANGELOG.md
