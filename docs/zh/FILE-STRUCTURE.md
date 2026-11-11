> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · 中文

---

# 文件结构

仓库（repository）中各部分的位置。

```
COPG-VD/
├── zygisk/                     # 原生源码（按 ABI 构建为 libspoof.so）
│   ├── spoof_module.cpp        # Zygisk 模块：作用范围、引擎、配置
│   ├── prop_virtualizer.cpp    # 净室的按进程属性重映射（prop hook）
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored（AOSP）
│   ├── jsmn.h                  # vendored JSON 解析器（MIT）
│   └── CMakeLists.txt
│
├── module/                     # 可刷入的模块
│   ├── module.prop             # id、name、version、versionCode、updateJson
│   ├── customize.sh            # 安装时的设置
│   ├── service.sh              # 开机：应用设备范围的 resetprop 各组
│   ├── uninstall.sh            # 移除模块及其临时状态
│   ├── fingerprint-update.sh   # 配置文件获取器 + Analyze
│   ├── sepolicy.rule           # 让被注入的进程能读取配置
│   ├── update.json             # 应用内更新程序清单
│   ├── COPG-VD.json.example     # 一份有文档说明的示例配置
│   ├── zygisk/<abi>.so         # 已构建的库（打包时由 CI 添加）
│   ├── META-INF/               # 安装器桩（stub）
│   ├── system/                 # 挂载进系统的文件
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 个 <code>.json 翻译
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # 构建 + 发布（workflow_dispatch）
│   │   ├── update-json.yml      # 每日配置文件刷新
│   │   └── wiki-sync.yml        # 将 docs/ 镜像进 GitHub wiki
│   └── scripts/
│       ├── version.sh           # 版本的唯一来源（module.prop）
│       ├── gen_wiki.sh          # 从 docs/ 渲染 wiki
│       └── update_copg_json.py  # 每日刷新辅助脚本
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # 文档（本文件夹）
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # 同样的文档，20 种语言各一份
│
├── README.md + README.<code>.md   # 21 种语言
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # README 使用的图片
```

## 运行时配置（不在仓库中）

设备上的 `/data/adb/COPG-VD/` 是模块自己的目录：`COPG-VD.json` 保存配置文件和设置（参见
[CONFIGURATION.md](CONFIGURATION.md)），还有 `update.log`、`update.state` 和 `update.status`。配置文件从不提交；`module/COPG-VD.json.example` 是模板。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出更正和改进 - 参见 [../CONTRIBUTING.md](CONTRIBUTING.md)。*
