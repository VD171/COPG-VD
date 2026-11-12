> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · Tiếng Việt · [中文](../zh/FILE-STRUCTURE.md)

---

# Cấu trúc tệp

Mọi thứ nằm ở đâu trong kho lưu trữ (repository).

```
COPG-VD/
├── zygisk/                     # mã nguồn native (build thành libspoof.so, theo từng ABI)
│   ├── spoof_module.cpp        # mô-đun Zygisk: phạm vi, động cơ, cấu hình
│   ├── prop_virtualizer.cpp    # ánh xạ lại thuộc tính theo từng tiến trình kiểu clean-room (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # trình phân tích JSON vendored (MIT)
│   └── CMakeLists.txt
│
├── module/                     # mô-đun có thể flash
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # thiết lập lúc cài đặt
│   ├── service.sh              # khởi động: áp dụng các nhóm resetprop toàn thiết bị
│   ├── uninstall.sh            # gỡ bỏ mô-đun và trạng thái tạm thời của nó
│   ├── fingerprint-update.sh   # trình tải hồ sơ + Analyze
│   ├── sepolicy.rule           # cho phép tiến trình được tiêm đọc cấu hình
│   ├── update.json             # tệp kê khai trình cập nhật trong ứng dụng
│   ├── COPG-VD.json.example     # một cấu hình ví dụ có tài liệu
│   ├── zygisk/<abi>.so         # thư viện đã build (được CI thêm vào lúc đóng gói)
│   ├── META-INF/               # mã sơ khai của trình cài đặt
│   ├── system/                 # các tệp được mount vào hệ thống
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 bản dịch <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # làm mới hồ sơ hằng ngày
│   │   └── wiki-sync.yml        # phản chiếu docs/ vào GitHub wiki
│   └── scripts/
│       ├── version.sh           # nguồn duy nhất của phiên bản (module.prop)
│       ├── gen_wiki.sh          # render wiki từ docs/
│       └── update_copg_json.py  # trình trợ giúp làm mới hằng ngày
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # tài liệu (thư mục này)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # cùng tài liệu đó trong mỗi ngôn ngữ trong 20 ngôn ngữ
│
├── README.md + README.<code>.md   # 21 ngôn ngữ
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # các hình ảnh được README sử dụng
```

## Cấu hình thời gian chạy (không có trong repo)

`/data/adb/COPG-VD/` trên thiết bị là thư mục riêng của module: `COPG-VD.json` giữ hồ sơ và các thiết lập
(xem [CONFIGURATION.md](CONFIGURATION.md)), cùng với `update.log`, `update.state` và `update.status`.
Cấu hình không bao giờ được commit; `module/COPG-VD.json.example` là mẫu.

*Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Các chỉnh sửa và cải tiến đều được hoan nghênh - xem [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến; xem [CONTRIBUTING.md](CONTRIBUTING.md)._
