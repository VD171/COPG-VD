> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · Svenska · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Filstruktur

Var allt finns i repot.

```
COPG-VD/
├── zygisk/                     # nativ källkod (byggs till libspoof.so, per ABI)
│   ├── spoof_module.cpp        # Zygisk-modulen: omfattning, motorer, konfiguration
│   ├── prop_virtualizer.cpp    # clean-room property-ommappning per process (prop-hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON-parser (MIT)
│   └── CMakeLists.txt
│
├── module/                     # den flashbara modulen
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # konfiguration vid installationstillfället
│   ├── service.sh              # boot: tillämpar resetprop-grupperna över hela enheten
│   ├── uninstall.sh            # tar bort modulen och dess transienta tillstånd
│   ├── fingerprint-update.sh   # profilhämtare + Analyze
│   ├── sepolicy.rule           # låter den injicerade processen läsa konfigurationen
│   ├── update.json             # manifest för in-app-uppdateraren
│   ├── COPG-VD.json.example     # en dokumenterad exempelkonfiguration
│   ├── zygisk/<abi>.so         # byggt bibliotek (läggs till av CI vid paketering)
│   ├── META-INF/               # installer-stub
│   ├── system/                 # filer som monteras in i systemet
│   └── webroot/                # WebUI:t
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 <code>.json-översättningar
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # bygg + release (workflow_dispatch)
│   │   ├── update-json.yml      # daglig profiluppdatering
│   │   └── wiki-sync.yml        # speglar docs/ in i GitHub-wikin
│   └── scripts/
│       ├── version.sh           # enda källan till versionen (module.prop)
│       ├── gen_wiki.sh          # renderar wikin från docs/
│       └── update_copg_json.py  # hjälpredan för den dagliga uppdateringen
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # dokumentation (den här mappen)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # samma dokument på vart och ett av de 20 språken
│
├── README.md + README.<code>.md   # 21 språk
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # bilder som används av README
```

## Runtime-konfigurationen (inte i repot)

`/data/adb/COPG-VD.json` på enheten håller profilen och inställningarna (se
[CONFIGURATION.md](CONFIGURATION.md)). Den committas aldrig; `module/COPG-VD.json.example`
är mallen.

*Den här dokumentationen genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [../CONTRIBUTING.md](CONTRIBUTING.md).*
