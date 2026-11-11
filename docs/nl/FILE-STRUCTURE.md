> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · Nederlands · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Bestandsstructuur

Waar alles zich bevindt in de repository.

```
COPG-VD/
├── zygisk/                     # native bron (gebouwd tot libspoof.so, per ABI)
│   ├── spoof_module.cpp        # de Zygisk-module: scope, engines, config
│   ├── prop_virtualizer.cpp    # clean-room property-remap per proces (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON-parser (MIT)
│   └── CMakeLists.txt
│
├── module/                     # de flashbare module
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # setup tijdens installatie
│   ├── service.sh              # boot: past de apparaatbrede resetprop-groepen toe
│   ├── uninstall.sh            # verwijdert de module en zijn tijdelijke status
│   ├── fingerprint-update.sh   # profiel-fetcher + Analyze
│   ├── sepolicy.rule           # laat het geïnjecteerde proces de config lezen
│   ├── update.json             # manifest van de in-app updater
│   ├── COPG-VD.json.example     # een gedocumenteerde voorbeeldconfig
│   ├── zygisk/<abi>.so         # gebouwde library (toegevoegd door CI bij het packagen)
│   ├── META-INF/               # installer-stub
│   ├── system/                 # bestanden gemount in het system
│   └── webroot/                # de WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 <code>.json-vertalingen
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # dagelijkse profielverversing
│   │   └── wiki-sync.yml        # spiegelt docs/ naar de GitHub-wiki
│   └── scripts/
│       ├── version.sh           # enkele bron van de versie (module.prop)
│       ├── gen_wiki.sh          # rendert de wiki vanuit docs/
│       └── update_copg_json.py  # de helper voor de dagelijkse verversing
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # documentatie (deze map)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # dezelfde docs in elk van de 20 talen
│
├── README.md + README.<code>.md   # 21 talen
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # afbeeldingen die de README gebruikt
```

## De runtime-config (niet in de repo)

`/data/adb/COPG-VD/` op het apparaat is de eigen map van de module: `COPG-VD.json` bevat het profiel
en de instellingen (zie [CONFIGURATION.md](CONFIGURATION.md)), naast `update.log`, `update.state` en
`update.status`. De config wordt nooit gecommit; `module/COPG-VD.json.example`
is het sjabloon.

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [../CONTRIBUTING.md](CONTRIBUTING.md).*
