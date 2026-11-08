> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · ไทย · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# โครงสร้างไฟล์

ทุกอย่างอยู่ที่ไหนในที่เก็บโค้ด (repository)

```
COPG-VD/
├── zygisk/                     # ซอร์ส native (build เป็น libspoof.so, ต่อ ABI)
│   ├── spoof_module.cpp        # โมดูล Zygisk: ขอบเขต, เครื่องยนต์, คอนฟิก
│   ├── prop_virtualizer.cpp    # รีแมปพร็อพเพอร์ตีรายโปรเซสแบบ clean-room (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # parser JSON แบบ vendored (MIT)
│   └── CMakeLists.txt
│
├── module/                     # โมดูลที่แฟลชได้
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # การตั้งค่าตอนติดตั้ง
│   ├── service.sh              # บูต: ใช้กลุ่ม resetprop ที่ทำทั้งอุปกรณ์
│   ├── uninstall.sh            # ลบโมดูลและสถานะชั่วคราวของมัน
│   ├── fingerprint-update.sh   # ตัวดึงโปรไฟล์ + Analyze
│   ├── sepolicy.rule           # ให้โปรเซสที่ถูกฉีดอ่านคอนฟิกได้
│   ├── update.json             # ไฟล์ manifest ตัวอัปเดตในแอป
│   ├── COPG-VD.json.example     # คอนฟิกตัวอย่างที่มีเอกสารประกอบ
│   ├── zygisk/<abi>.so         # ไลบรารีที่ build แล้ว (เพิ่มโดย CI ตอนแพ็กเกจ)
│   ├── META-INF/               # สตับตัวติดตั้ง
│   ├── system/                 # ไฟล์ที่ mount เข้าไปในระบบ
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + การแปล 20 <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # รีเฟรชโปรไฟล์รายวัน
│   │   └── wiki-sync.yml        # มิเรอร์ docs/ เข้าไปใน GitHub wiki
│   └── scripts/
│       ├── version.sh           # แหล่งเดียวของเวอร์ชัน (module.prop)
│       ├── gen_wiki.sh          # เรนเดอร์ wiki จาก docs/
│       └── update_copg_json.py  # ตัวช่วยรีเฟรชรายวัน
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # เอกสาร (โฟลเดอร์นี้)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # เอกสารเดียวกันในแต่ละภาษาจาก 20 ภาษา
│
├── README.md + README.<code>.md   # 21 ภาษา
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # รูปภาพที่ใช้โดย README
```

## คอนฟิก runtime (ไม่อยู่ใน repo)

`/data/adb/COPG-VD.json` บนอุปกรณ์เก็บโปรไฟล์และการตั้งค่า (ดู
[CONFIGURATION.md](CONFIGURATION.md)) มันไม่เคยถูก commit; `module/COPG-VD.json.example`
คือแม่แบบ

*เอกสารนี้สร้างด้วย Claude (Anthropic) และดูแลรักษาโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง - ดู [../CONTRIBUTING.md](CONTRIBUTING.md)*
