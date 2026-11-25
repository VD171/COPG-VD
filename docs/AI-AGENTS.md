> **Languages:** English · [العربية](ar/AI-AGENTS.md) · [Čeština](cs/AI-AGENTS.md) · [Deutsch](de/AI-AGENTS.md) · [Español](es/AI-AGENTS.md) · [فارسی](fa/AI-AGENTS.md) · [Français](fr/AI-AGENTS.md) · [हिन्दी](hi/AI-AGENTS.md) · [Bahasa Indonesia](id/AI-AGENTS.md) · [Italiano](it/AI-AGENTS.md) · [日本語](ja/AI-AGENTS.md) · [한국어](ko/AI-AGENTS.md) · [Nederlands](nl/AI-AGENTS.md) · [Polski](pl/AI-AGENTS.md) · [Português](pt/AI-AGENTS.md) · [Русский](ru/AI-AGENTS.md) · [Svenska](sv/AI-AGENTS.md) · [ไทย](th/AI-AGENTS.md) · [Türkçe](tr/AI-AGENTS.md) · [Українська](uk/AI-AGENTS.md) · [Tiếng Việt](vi/AI-AGENTS.md) · [中文](zh/AI-AGENTS.md)

---

# AI agents: the control surface

COPG-VD welcomes AI and agent contributors, and the whole module is built to be driven headlessly,
without scraping the WebUI. There are two surfaces, and an agent running as root (as the WebUI does)
uses both:

1. **The config file** `/data/adb/COPG-VD/COPG-VD.json` - the single source of truth. Every profile
   field and every setting lives here; reading and writing this file is how you change what the module
   spoofs.
2. **The shell entry point** `fingerprint-update.sh` - one script with stable verbs for checking,
   applying and fetching profiles.

## The config file

`/data/adb/COPG-VD/COPG-VD.json` is a plain JSON object. The module reads it from the injected
processes through a dedicated SELinux rule it ships itself; it holds no credentials. A shipped example
lives at `module/COPG-VD.json.example`, refreshed daily from the newest Google factory image.

Rules an agent must follow:

- **Strings use double quotes only**, as in JSON.
- **Every field is optional.** A field that is not provided is skipped and the ROM's own value is kept.
- The top-level keys that steer the module are `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, the `COPG-VD` object (the Build
  fields), a `COPG-VD-Delete` list and a `COPG-VD-Settings` object (`resetprop`, `autoupdate`,
  `spoof_version`). The [Configuration reference](CONFIGURATION.md) documents each one.
- `"spoof_version": "force"` is refused when it comes from the file on disk and is downgraded on read,
  so restoring an old backup cannot silently re-arm it. Set the version policy through the settings, not
  by hand-writing `force`.
- After editing the file, run **`analyze`** (below): a file that does not parse makes the module spoof
  **nothing**, and only logcat says so.

A changed config reaches apps on the next process start. `resetprop`-delivered properties can be
re-applied without a reboot (`service.sh --props-only`), but the `android.os.Build.*` fields are written
by the Zygisk library when zygote starts, so **a reboot is required** for those to reach apps.

## The shell contract

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

The script prints human-readable lines; machine-readable ones start with `status:`. Its exit code is
`0` on success and non-zero on failure.

| Verb | What it does | Typical output |
|---|---|---|
| `check` | Compares the installed profile against the newest upstream build, writes nothing. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Fetches the newest profile and merges it into the config (build fields only; your other keys are preserved). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Audits the config as it stands (parse, version vs ROM, fingerprint coherence, unknown keys, dates, props). Prints a report; exit code reflects red/warn findings. | a text report |
| `fetch-index` | Downloads and verifies the signed device index and prints it (`index.json`). | the index JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Downloads one device's `build.prop` (path from the index, e.g. `pixel-9a/latest.prop`) and writes its build fields into the config. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migrates state/config from the old flat layout to `/data/adb/COPG-VD/`. | - |
| `migrate` | One-shot config migration between module versions. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | The once-per-boot auto-update; intended for `service.sh`, not interactive use. | writes `update.status` |

Every download is validated before use (the only on-device downloader is busybox `wget`, which cannot
validate TLS), and the profile updater never goes backwards: an upstream build older than the one
installed is refused. The feed index and every `.prop` carry a detached ed25519 signature that is
verified before the content is read.

## Typical agent flows

- **Keep the profile fresh:** `check`; if `status: update-available`, `apply`; then reboot for the new
  `Build.*` to reach apps.
- **Switch to another Pixel profile:** `fetch-index`, pick a device path from the index, `fetch
  <path>`, run `analyze` to confirm the config is coherent, then reboot.
- **Change scope or an engine:** edit `scope_mode` (or an engine switch) in the config file, run
  `analyze`, then `service.sh --props-only` for property-delivered changes, or reboot for Build fields.

## Safety rails

- Changing the config or applying a profile changes what every targeted app sees; confirm intent before
  writing, as the WebUI does.
- Never loosen a real coherence guard: the SDK is capped at the real framework under every policy, the
  manufacturer stays in step with the rest of the profile, and a profile for a different device is
  refused. These are deliberate and must not be bypassed.
- The config is the supported surface. Do not scrape or automate the WebUI itself.

<!-- doc-footer -->

---

> _This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome; see [CONTRIBUTING.md](../CONTRIBUTING.md)._
