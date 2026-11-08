> **Languages:** English · [العربية](docs/ar/CONTRIBUTING.md) · [Čeština](docs/cs/CONTRIBUTING.md) · [Deutsch](docs/de/CONTRIBUTING.md) · [Español](docs/es/CONTRIBUTING.md) · [فارسی](docs/fa/CONTRIBUTING.md) · [Français](docs/fr/CONTRIBUTING.md) · [हिन्दी](docs/hi/CONTRIBUTING.md) · [Bahasa Indonesia](docs/in/CONTRIBUTING.md) · [Italiano](docs/it/CONTRIBUTING.md) · [日本語](docs/ja/CONTRIBUTING.md) · [한국어](docs/ko/CONTRIBUTING.md) · [Nederlands](docs/nl/CONTRIBUTING.md) · [Polski](docs/pl/CONTRIBUTING.md) · [Português](docs/pt/CONTRIBUTING.md) · [Русский](docs/ru/CONTRIBUTING.md) · [Svenska](docs/sv/CONTRIBUTING.md) · [ไทย](docs/th/CONTRIBUTING.md) · [Türkçe](docs/tr/CONTRIBUTING.md) · [Tiếng Việt](docs/vi/CONTRIBUTING.md) · [中文](docs/zh/CONTRIBUTING.md)

---

# Contributing to COPG-VD

Thanks for helping! COPG-VD is meant to be easy to contribute to. This guide tells you
where things live and the few conventions we follow.

## Project at a glance

COPG-VD is a **Zygisk device spoofer**: a small native library that is injected into app
processes to rewrite the device fingerprint and build, plus a vanilla-JS WebUI to drive
it. It is a fork of COPG (by AlirezaParsi), maintained by VD171 under the Apache-2.0
license. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

By default it scopes the spoof to the Google Play stack through Zygisk, so it is a
lighter, more robust alternative to PlayIntegrityFix.

## AI contributors welcome

AI assistants and agents are first-class contributors here, not an afterthought.

- The project is built to be readable: the configuration is a single JSON file
  (`/data/adb/COPG-VD.json`, documented in [CONFIGURATION.md](docs/CONFIGURATION.md)),
  the engines are small and self-contained, and the layout is in [FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).
- AI-assisted patches are reviewed and accepted on the same terms as any other - by
  correctness, clarity and the conventions below, not by who (or what) wrote them.
- Same bar for everyone: a real feature is never weakened, the spoof stays coherent, and
  nothing secret or device-specific lands in the repo (see the [.gitignore](.gitignore)).

## Dev setup

- You need a rooted device or emulator with Zygisk (KernelSU, APatch or Magisk) to test.
- Build the native library per ABI with the NDK (r29) and CMake - see the `Build zygisk
  libraries` step in [`.github/workflows/COPG-VD.yml`](.github/workflows/COPG-VD.yml) for
  the exact command. CI builds all three ABIs for you.
- Build a flashable zip: copy the built `libspoof.so` into `module/zygisk/<abi>.so`, then
  `cd module && zip -r9 ../COPG-VD-dev.zip .` and flash it.
- The WebUI is `module/webroot/` (open it from the root manager). The spoofing logic is
  `zygisk/spoof_module.cpp`; the profile fetcher is `module/fingerprint-update.sh`.

## Conventions

- **Every module source file** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) starts with the
  project banner header (copy it from any existing file). Tooling under `.github/` uses a
  short comment instead.
- **Code and comments in English.** Keep comments minimal and only where needed.
- **No em-dash or en-dash**; always use a plain hyphen `-`.
- The WebUI is **vanilla JS** (one `scripts.js`); no frameworks.
- **Never weaken** a real feature: keep the spoof coherent, and do not make the hooks
  crash an app they are attached to (they are null-checked on purpose).

## Internationalization (i18n)

- UI strings live in `module/webroot/lang/`. English is the canonical fallback
  (`en.js` + `en.json`); the other 20 languages are `<code>.json`.
- To add or change a string: edit `en.js` **and** `en.json`, then update every
  `<code>.json`. Touching a visible label means updating **all** language files and
  **all** `README.<code>.md`.
- Translations are plain JSON - a great first contribution.

## Commits & PRs

- Keep PRs focused. Describe what and why.
- Sign off your commits (DCO): `git commit -s` (adds `Signed-off-by:`).
- CI must stay green. Be kind in reviews - see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Good first issues

Look for the `good first issue` and `help wanted` labels. Translations, docs, and new
Pixel profiles are all great starting points.

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](CONTRIBUTING.md).*
