> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · Русский · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Структура файлов

Где всё находится в репозитории.

```
COPG-VD/
├── zygisk/                     # нативный исходник (собирается в libspoof.so, по ABI)
│   ├── spoof_module.cpp        # модуль Zygisk: область действия, движки, конфигурация
│   ├── prop_virtualizer.cpp    # clean-room переотображение свойств для каждого процесса (хук prop)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON-парсер (MIT)
│   └── CMakeLists.txt
│
├── module/                     # прошиваемый модуль
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # настройка на этапе установки
│   ├── service.sh              # загрузка: применяет группы resetprop на уровне всего устройства
│   ├── uninstall.sh            # удаляет модуль и его временное состояние
│   ├── fingerprint-update.sh   # загрузчик профиля + Analyze
│   ├── sepolicy.rule           # позволяет внедрённому процессу читать конфигурацию
│   ├── update.json             # манифест встроенного апдейтера
│   ├── COPG-VD.json.example     # документированная конфигурация-пример
│   ├── zygisk/<abi>.so         # собранная библиотека (добавляется CI при упаковке)
│   ├── META-INF/               # заглушка установщика
│   ├── system/                 # файлы, монтируемые в систему
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 переводов <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # сборка + релиз (workflow_dispatch)
│   │   ├── update-json.yml      # ежедневное обновление профиля
│   │   └── wiki-sync.yml        # зеркалирование docs/ в вики GitHub
│   └── scripts/
│       ├── version.sh           # единственный источник версии (module.prop)
│       ├── gen_wiki.sh          # рендеринг вики из docs/
│       └── update_copg_json.py  # помощник ежедневного обновления
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # документация (эта папка)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # те же документы на каждом из 20 языков
│
├── README.md + README.<code>.md   # 21 язык
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # изображения, используемые README
```

## Конфигурация времени выполнения (не в репозитории)

`/data/adb/COPG-VD/` на устройстве - это собственный каталог модуля: `COPG-VD.json` хранит профиль
и настройки (смотрите [CONFIGURATION.md](CONFIGURATION.md)), рядом с `update.log`, `update.state` и
`update.status`. Конфигурация никогда не коммитится; `module/COPG-VD.json.example` - это шаблон.

*Эта документация была сгенерирована с Claude (Anthropic) и поддерживается VD171. Исправления и улучшения приветствуются - смотрите [../CONTRIBUTING.md](CONTRIBUTING.md).*
