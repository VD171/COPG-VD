> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · Türkçe · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Dosya yapısı

Her şeyin depoda (repository) nerede olduğu.

```
COPG-VD/
├── zygisk/                     # native kaynak (ABI başına libspoof.so olarak derlenir)
│   ├── spoof_module.cpp        # Zygisk modülü: kapsam, motorlar, yapılandırma
│   ├── prop_virtualizer.cpp    # temiz-oda süreç başına özellik yeniden eşlemesi (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON ayrıştırıcı (MIT)
│   └── CMakeLists.txt
│
├── module/                     # flash edilebilir modül
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # kurulum zamanı kurulumu
│   ├── service.sh              # önyükleme: cihaz geneli resetprop gruplarını uygular
│   ├── uninstall.sh            # modülü ve geçici durumunu kaldırır
│   ├── fingerprint-update.sh   # profil getirici + Analyze
│   ├── sepolicy.rule           # enjekte edilen sürecin yapılandırmayı okumasına izin verir
│   ├── update.json             # uygulama içi güncelleyici bildirimi
│   ├── COPG-VD.json.example     # belgelenmiş bir örnek yapılandırma
│   ├── zygisk/<abi>.so         # derlenmiş kütüphane (paketleme zamanında CI tarafından eklenir)
│   ├── META-INF/               # yükleyici saplaması
│   ├── system/                 # sisteme bağlanan dosyalar
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 <code>.json çevirisi
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # derleme + yayın (workflow_dispatch)
│   │   ├── update-json.yml      # günlük profil yenileme
│   │   └── wiki-sync.yml        # docs/ klasörünü GitHub wiki'ye yansıtır
│   └── scripts/
│       ├── version.sh           # sürümün tek kaynağı (module.prop)
│       ├── gen_wiki.sh          # wiki'yi docs/ klasöründen render eder
│       └── update_copg_json.py  # günlük yenileme yardımcısı
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # belgeler (bu klasör)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # aynı belgeler 20 dilin her birinde
│
├── README.md + README.<code>.md   # 21 dil
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # README tarafından kullanılan görseller
```

## Çalışma zamanı yapılandırması (depoda değil)

Cihazdaki `/data/adb/COPG-VD.json`, profili ve ayarları tutar (bkz.
[CONFIGURATION.md](CONFIGURATION.md)). Asla commit edilmez; `module/COPG-VD.json.example`
şablondur.

*Bu belge Claude (Anthropic) ile oluşturulmuş ve VD171 tarafından sürdürülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [../CONTRIBUTING.md](CONTRIBUTING.md).*
