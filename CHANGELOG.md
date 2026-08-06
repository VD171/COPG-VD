# Changelog

All notable changes to COPG-VD. Versions follow `v<major>.<minor>.<patch>-vd`; the
`versionCode` is derived from it by `.github/scripts/version.sh` and never typed by hand.

## v5.0.0-vd - 2026-08-06

### Added
- **Fingerprint auto-update** (`module/fingerprint-update.sh`). Pulls the newest Google build
  from this repo and refreshes the config, from the WebUI (**Check Update** / **Update Now**)
  or on its own **once per boot**.
  - Updates `/data/adb/COPG-VD.json` and `/data/adb/modules/COPG-VD/COPG-VD.json` when both
    exist, keeping the previous content as `.bak`.
  - Rewrites **only** the build fields. Extra keys, custom `BOOTLOADER`/`BOARD`/`HARDWARE`,
    other objects, key order and formatting are preserved.
  - Refuses to touch a profile that spoofs **another device** (different `BRAND`, `DEVICE`,
    `MANUFACTURER`, `MODEL` or `PRODUCT`).
  - At boot it runs in the background and retries for ~10 minutes, because wifi is usually
    not up yet when boot completes. It never delays boot, and a boot with no network does
    not consume that boot's turn.
  - Every value coming off the network is validated before it is written, and an upstream
    build older than the installed one is refused. Both matter more than they look: on a plain
    Android the only downloader present is busybox `wget`, which prints "TLS certificate
    validation not implemented" and means it, so the transport cannot be trusted on its own.
- **Auto-update JSON on boot** toggle in the WebUI (`.skip.autoupdate`), on by default.
- `service.sh --props-only`, so the props are re-applied right after an update and
  `resetprop` never disagrees with what the zygisk module reads.
- **`Update COPG-VD.json` workflow**: checks Google's flashstation API daily and, when a new
  canary build shows up, reads the props straight out of the factory image using HTTP range
  requests (~300 MB instead of the 4.3 GB zip, nothing written to disk) and commits the
  refreshed `module/COPG-VD.json.example` and README block.
- `CHANGELOG.md`.

### Changed
- **Multi-ABI build.** The zygisk library is now built for `arm64-v8a`, `armeabi-v7a` and
  `x86_64` (only arm64 was shipped before), against `android-28` to match the module's own
  Android 9+ requirement. The build uses `cmake` directly instead of a third-party action -
  one less thing to trust in a build that produces a library loaded into zygote.
- **Versioning is automated.** `module/module.prop` is the single source of truth; the build
  workflow bumps it (`patch`/`minor`/`major`), derives `versionCode`, rewrites
  `module/update.json`, commits, packages the zip and can publish the release. No version
  string lives in the workflow any more.
- `updateJson` now points at a branch that exists (`main`); the previous URL pointed at a
  `JSON` branch this fork never had, so in-app update checks could not work.
- The build workflow packages a real zip and attaches it to the release, instead of only
  uploading a directory as an artifact.

### Fixed
- **`atexit.cpp`: index underflow.** A cleared entry made `continue` skip the `i == 0` guard,
  so `--i` wrapped to `SIZE_MAX` and read past the array - a crash inside zygote. Entries are
  now consumed as they are popped. `g_array` is also reset after `free`, which closes a
  use-after-free if `__cxa_atexit` ran again afterwards, and allocation failures no longer
  dereference null.
- **`spoof_module.cpp`: uninitialized fields.** `DeviceInfo`'s `int`/`int64_t` members were
  indeterminate, so a config without `TIMESTAMP`/`SDK_FULL`/`SDK_INT` could write garbage into
  `Build.TIME` and `Build.VERSION.SDK_INT_FULL` - exactly the kind of inconsistency detectors
  look for.

### Security
The WebUI runs with root through `ksu.exec`. It no longer loads anything off the network, and
no longer builds shell commands out of strings it does not control.
- `marked` is vendored (15.0.12) instead of pulled unpinned from a CDN, and the fonts are
  served from inside the module. A CDN, DNS or network compromise was a root compromise; the
  unpinned URL had also silently drifted to whatever the CDN resolved that day.
- README and LICENSE are packed into the module and read locally, instead of being fetched
  from GitHub at runtime and injected as HTML. The rendered markdown is sanitized as well.
- The CSP went from `default-src * 'unsafe-inline' 'unsafe-eval'` to `default-src 'none'`
  with `'self'` sources, and the inline event handlers it forbids were converted to listeners.
- Redundant `su -c` wrappers were removed - `ksu.exec` is already root, and that extra quoting
  layer was what turned a file name into a root command. Everything interpolated into a
  command now goes through a quoting helper, and file names reaching `innerHTML` are escaped.
  A file name on shared storage - which any app can create - was enough to run code as root.
- `openLink` validates the URL and quotes it, so a link in a document cannot become a command.
