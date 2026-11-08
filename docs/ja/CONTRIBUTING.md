> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · 日本語 · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# COPG-VD への貢献

手伝ってくれてありがとう! COPG-VD は貢献しやすいことを目指しています。このガイドは、
物事がどこにあるか、そして私たちが従う少数の慣習を伝えます。

## 一目で分かるプロジェクト

COPG-VD は **Zygisk デバイススプーファー** です: デバイスの fingerprint と build を書き換えるために
アプリプロセスに注入される小さなネイティブライブラリと、それを操作するバニラ JS の WebUI です。
COPG(AlirezaParsi による)のフォークで、VD171 が Apache-2.0 ライセンスのもとで保守しています。
[ARCHITECTURE.md](ARCHITECTURE.md) と [FILE-STRUCTURE.md](FILE-STRUCTURE.md) を参照してください。

デフォルトでは Zygisk を通じてスプーフを Google Play スタックに限定するため、PlayIntegrityFix より
軽量でより堅牢な代替手段です。

## AI 貢献者を歓迎します

AI アシスタントとエージェントは、ここでは後付けではなく、一流の貢献者です。

- プロジェクトは読みやすいように作られています: 設定は単一の JSON ファイル
  (`/data/adb/COPG-VD.json`、[CONFIGURATION.md](CONFIGURATION.md) に文書化)、
  エンジンは小さく自己完結的で、レイアウトは [FILE-STRUCTURE.md](FILE-STRUCTURE.md) にあります。
- AI 支援によるパッチは、他のものと同じ条件でレビューされ受け入れられます - 誰が(または何が)
  書いたかではなく、正確さ、明瞭さ、そして下記の慣習によって。
- 全員に同じ基準: 本物の機能は決して弱められず、スプーフは一貫性を保ち、秘密のものや
  デバイス固有のものは何もリポジトリに入りません([.gitignore](../../.gitignore) を参照)。

## 開発セットアップ

- テストには Zygisk(KernelSU、APatch または Magisk)を備えた root 化されたデバイスまたはエミュレーターが必要です。
- NDK(r29)と CMake で ABI ごとにネイティブライブラリをビルドします - 正確なコマンドについては
  [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) の `Build zygisk
  libraries` ステップを参照してください。CI はあなたのために 3 つの ABI すべてをビルドします。
- フラッシュ可能な zip をビルドします: ビルドされた `libspoof.so` を `module/zygisk/<abi>.so` にコピーし、
  次に `cd module && zip -r9 ../COPG-VD-dev.zip .` してフラッシュします。
- WebUI は `module/webroot/` です(root マネージャーから開きます)。スプーフィングロジックは
  `zygisk/spoof_module.cpp` です; プロファイル取得は `module/fingerprint-update.sh` です。

## 慣習

- **すべてのモジュールソースファイル**(`.cpp`、`.sh`、`.js`、`.css`、`.html`)はプロジェクトの
  バナーヘッダーで始まります(既存のファイルからコピーしてください)。`.github/` 以下のツーリングは
  代わりに短いコメントを使用します。
- **コードとコメントは英語で。** コメントは最小限に、必要な場所だけにしてください。
- **em-dash や en-dash は使わない**; 常に単純なハイフン `-` を使用してください。
- WebUI は **バニラ JS**(1 つの `scripts.js`)です; フレームワークはありません。
- 本物の機能を **決して弱めない**: スプーフを一貫させ、フックが取り付けられているアプリを
  クラッシュさせないでください(意図的に null チェックされています)。

## 国際化(i18n)

- UI 文字列は `module/webroot/lang/` にあります。英語が正規のフォールバック
  (`en.js` + `en.json`)です; 他の 20 言語は `<code>.json` です。
- 文字列を追加または変更するには: `en.js` **と** `en.json` を編集し、次にすべての
  `<code>.json` を更新します。可視ラベルに触れることは、**すべての**言語ファイルと
  **すべての** `README.<code>.md` を更新することを意味します。
- 翻訳はプレーンな JSON です - 素晴らしい最初の貢献です。

## コミットと PR

- PR を集中させてください。何をなぜかを説明してください。
- コミットにサインオフしてください(DCO): `git commit -s`(`Signed-off-by:` を追加)。
- CI はグリーンのままである必要があります。レビューでは親切に - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) を参照してください。

## 良い最初の issue

`good first issue` と `help wanted` ラベルを探してください。翻訳、ドキュメント、新しい
Pixel プロファイルはすべて素晴らしい出発点です。

*このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正と改善を歓迎します - [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
