> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · Italiano · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Struttura dei file

Dove si trova tutto nel repository.

```
COPG-VD/
├── zygisk/                     # sorgente nativo (compilato in libspoof.so, per ABI)
│   ├── spoof_module.cpp        # il modulo Zygisk: scope, motori, config
│   ├── prop_virtualizer.cpp    # remap clean-room delle proprietà per processo (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # parser JSON vendored (MIT)
│   └── CMakeLists.txt
│
├── module/                     # il modulo flashabile
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # setup al momento dell'installazione
│   ├── service.sh              # boot: applica i gruppi resetprop device-wide
│   ├── uninstall.sh            # rimuove il modulo e il suo stato transitorio
│   ├── fingerprint-update.sh   # fetcher del profilo + Analyze
│   ├── sepolicy.rule           # permette al processo iniettato di leggere la config
│   ├── update.json             # manifest dell'updater in-app
│   ├── COPG-VD.json.example     # una config di esempio documentata
│   ├── zygisk/<abi>.so         # libreria compilata (aggiunta dalla CI al momento del packaging)
│   ├── META-INF/               # stub dell'installer
│   ├── system/                 # file montati nel system
│   └── webroot/                # la WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 traduzioni <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # aggiornamento giornaliero del profilo
│   │   └── wiki-sync.yml        # specchia docs/ nella wiki di GitHub
│   └── scripts/
│       ├── version.sh           # sorgente unica della versione (module.prop)
│       ├── gen_wiki.sh          # genera la wiki da docs/
│       └── update_copg_json.py  # l'helper per l'aggiornamento giornaliero
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # documentazione (questa cartella)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # gli stessi documenti in ciascuna delle 20 lingue
│
├── README.md + README.<code>.md   # 21 lingue
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # immagini usate dal README
```

## La config di runtime (non nel repo)

`/data/adb/COPG-VD.json` sul dispositivo contiene il profilo e le impostazioni (vedi
[CONFIGURATION.md](CONFIGURATION.md)). Non viene mai committato; `module/COPG-VD.json.example`
è il template.

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [../CONTRIBUTING.md](CONTRIBUTING.md).*
