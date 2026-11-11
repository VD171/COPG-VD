> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · 日本語 · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# ファイル構造

リポジトリ内のすべての場所。

```
COPG-VD/
├── zygisk/                     # ネイティブソース(ABI ごとに libspoof.so にビルド)
│   ├── spoof_module.cpp        # Zygisk モジュール: スコープ、エンジン、config
│   ├── prop_virtualizer.cpp    # クリーンルームなプロセスごとのプロパティリマップ(prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON パーサー (MIT)
│   └── CMakeLists.txt
│
├── module/                     # フラッシュ可能なモジュール
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # インストール時のセットアップ
│   ├── service.sh              # boot: デバイス全体の resetprop グループを適用
│   ├── uninstall.sh            # モジュールとその一時的な状態を削除
│   ├── fingerprint-update.sh   # プロファイル取得 + Analyze
│   ├── sepolicy.rule           # 注入されたプロセスが config を読めるようにする
│   ├── update.json             # アプリ内 updater のマニフェスト
│   ├── COPG-VD.json.example     # ドキュメント化された設定例
│   ├── zygisk/<abi>.so         # ビルド済みライブラリ(パッケージ時に CI が追加)
│   ├── META-INF/               # インストーラースタブ
│   ├── system/                 # system にマウントされるファイル
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 個の <code>.json 翻訳
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # 毎日のプロファイル更新
│   │   └── wiki-sync.yml        # docs/ を GitHub wiki にミラー
│   └── scripts/
│       ├── version.sh           # バージョンの単一ソース(module.prop)
│       ├── gen_wiki.sh          # docs/ から wiki をレンダリング
│       └── update_copg_json.py  # 毎日の更新ヘルパー
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # ドキュメント(このフォルダ)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # 20 言語それぞれでの同じドキュメント
│
├── README.md + README.<code>.md   # 21 言語
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # README が使う画像
```

## ランタイム config(リポジトリには含まれない)

デバイス上の `/data/adb/COPG-VD/` はモジュール自身のディレクトリです: `COPG-VD.json` がプロファイルと
設定を保持し([CONFIGURATION.md](CONFIGURATION.md) を参照)、`update.log`、`update.state`、`update.status`
が隣にあります。設定は決してコミットされません; `module/COPG-VD.json.example`
がテンプレートです。

*このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正と改善を歓迎します - [../CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
