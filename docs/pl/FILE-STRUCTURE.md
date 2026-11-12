> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · Polski · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Struktura plików

Gdzie wszystko znajduje się w repozytorium.

```
COPG-VD/
├── zygisk/                     # natywne źródło (budowane do libspoof.so, per ABI)
│   ├── spoof_module.cpp        # moduł Zygisk: zakres, silniki, konfiguracja
│   ├── prop_virtualizer.cpp    # clean-room remapowanie właściwości per proces (hak prop)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored parser JSON (MIT)
│   └── CMakeLists.txt
│
├── module/                     # moduł do flashowania
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # konfiguracja w czasie instalacji
│   ├── service.sh              # rozruch: stosuje grupy resetprop obejmujące całe urządzenie
│   ├── uninstall.sh            # usuwa moduł i jego stan przejściowy
│   ├── fingerprint-update.sh   # pobieranie profilu + Analyze
│   ├── sepolicy.rule           # pozwala wstrzykniętemu procesowi odczytać konfigurację
│   ├── update.json             # manifest aktualizatora w aplikacji
│   ├── COPG-VD.json.example     # udokumentowana przykładowa konfiguracja
│   ├── zygisk/<abi>.so         # zbudowana biblioteka (dodawana przez CI przy pakowaniu)
│   ├── META-INF/               # stub instalatora
│   ├── system/                 # pliki montowane do systemu
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 tłumaczeń <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # codzienne odświeżanie profilu
│   │   └── wiki-sync.yml        # lustrzanie docs/ do wiki GitHub
│   └── scripts/
│       ├── version.sh           # jedyne źródło wersji (module.prop)
│       ├── gen_wiki.sh          # renderowanie wiki z docs/
│       └── update_copg_json.py  # pomocnik codziennego odświeżania
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # dokumentacja (ten folder)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # te same dokumenty w każdym z 20 języków
│
├── README.md + README.<code>.md   # 21 języków
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # obrazy używane przez README
```

## Konfiguracja runtime (nie w repozytorium)

`/data/adb/COPG-VD/` na urządzeniu to własny katalog modułu: `COPG-VD.json` przechowuje profil
i ustawienia (zobacz [CONFIGURATION.md](CONFIGURATION.md)), obok `update.log`, `update.state` i
`update.status`. Konfiguracja nigdy nie jest commitowana; `module/COPG-VD.json.example` to szablon.

*Ta dokumentacja została wygenerowana z Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
