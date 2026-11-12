> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · Deutsch · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Dateistruktur

Wo alles im Repository liegt.

```
COPG-VD/
├── zygisk/                     # native source (built into libspoof.so, per ABI)
│   ├── spoof_module.cpp        # the Zygisk module: scope, engines, config
│   ├── prop_virtualizer.cpp    # clean-room per-process property remap (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON parser (MIT)
│   └── CMakeLists.txt
│
├── module/                     # the flashable module
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # install-time setup
│   ├── service.sh              # boot: applies the device-wide resetprop groups
│   ├── uninstall.sh            # removes the module and its transient state
│   ├── fingerprint-update.sh   # profile fetcher + Analyze
│   ├── sepolicy.rule           # lets the injected process read the config
│   ├── update.json             # in-app updater manifest
│   ├── COPG-VD.json.example     # a documented example config
│   ├── zygisk/<abi>.so         # built library (added by CI at package time)
│   ├── META-INF/               # installer stub
│   ├── system/                 # files mounted into the system
│   └── webroot/                # the WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 <code>.json translations
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # daily profile refresh
│   │   └── wiki-sync.yml        # mirror docs/ into the GitHub wiki
│   └── scripts/
│       ├── version.sh           # single source of the version (module.prop)
│       ├── gen_wiki.sh          # render the wiki from docs/
│       └── update_copg_json.py  # the daily refresh helper
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # documentation (this folder)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # the same docs in each of the 20 languages
│
├── README.md + README.<code>.md   # 21 languages
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # images used by the README
```

## Die Runtime-Konfiguration (nicht im Repo)

`/data/adb/COPG-VD/` auf dem Gerät ist das eigene Verzeichnis des Moduls: `COPG-VD.json` hält das
Profil und die Einstellungen (siehe [CONFIGURATION.md](CONFIGURATION.md)), neben `update.log`,
`update.state` und `update.status`. Die Konfiguration wird nie committet;
`module/COPG-VD.json.example` ist die Vorlage.

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen; siehe [CONTRIBUTING.md](CONTRIBUTING.md)._
