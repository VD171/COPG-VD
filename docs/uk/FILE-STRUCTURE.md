> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../id/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · Українська · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Структура файлів

Де все живе в репозиторії.

```
COPG-VD/
├── zygisk/                     # нативний вихідний код (збирається в libspoof.so, за ABI)
│   ├── spoof_module.cpp        # модуль Zygisk: область, рушії, конфігурація
│   ├── prop_virtualizer.cpp    # clean-room попроцесний ремап властивостей (хук prop)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON-парсер (MIT)
│   └── CMakeLists.txt
│
├── module/                     # прошиваний модуль
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # налаштування на етапі встановлення
│   ├── service.sh              # завантаження: застосовує загальнопристроєві групи resetprop
│   ├── uninstall.sh            # видаляє модуль і його тимчасовий стан
│   ├── fingerprint-update.sh   # завантажувач профілю + Analyze
│   ├── sepolicy.rule           # дозволяє впровадженому процесу читати конфігурацію
│   ├── update.json             # маніфест вбудованого оновлювача
│   ├── COPG-VD.json.example     # документована конфігурація-приклад
│   ├── zygisk/<abi>.so         # зібрана бібліотека (додається CI під час пакування)
│   ├── META-INF/               # заглушка інсталятора
│   ├── system/                 # файли, монтовані в систему
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 перекладів <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # збірка + реліз (workflow_dispatch)
│   │   ├── update-json.yml      # щоденне оновлення профілю
│   │   └── wiki-sync.yml        # дзеркалить docs/ у вікі GitHub
│   └── scripts/
│       ├── version.sh           # єдине джерело версії (module.prop)
│       ├── gen_wiki.sh          # рендерить вікі з docs/
│       └── update_copg_json.py  # помічник щоденного оновлення
│
├── tools/                      # скрипти підтримки документації та i18n
│   ├── fix-switchers.py        # встановлює перемикач мов на кожному документі
│   ├── fix-links.py            # нормалізує міждокументні посилання за розташуванням
│   ├── readme-docs.py          # оновлює розділ документації у README
│   └── sync-docs-example.py    # тримає приклад у docs на постаченому профілі
│
├── docs/                       # документація (ця тека)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # ті самі документи кожною з 20 мов
│
├── README.md + README.<code>.md   # 21 мова
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # зображення, що використовуються у README
```

## Конфігурація виконання (не в репозиторії)

`/data/adb/COPG-VD/` на пристрої є власним каталогом модуля: `COPG-VD.json` містить профіль
і налаштування (див. [CONFIGURATION.md](CONFIGURATION.md)), поряд з `update.log`, `update.state` і
`update.status`. Конфігурація ніколи не комітиться; `module/COPG-VD.json.example`: шаблон.

<!-- doc-footer -->

---

> _Ця документація створена за допомогою Claude (Anthropic) і підтримується VD171. Виправлення та покращення вітаються; див. [CONTRIBUTING.md](CONTRIBUTING.md)._
