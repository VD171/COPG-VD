> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · 日本語 · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# ユーザーガイド

COPG-VD はデバイスの fingerprint と build を書き換え、選択したアプリに実際のデバイスではなく
Pixel を見せます。このガイドはインストールから動作する設定まで、その過程での選択肢とともに
案内します。各フィールドと値については [CONFIGURATION.md](CONFIGURATION.md) を、
内部での動作については [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。

## インストール

1. KernelSU、APatch または Magisk で zip をフラッシュして再起動します。
2. Zygisk が有効である必要があります(組み込み、または ReZygisk / Zygisk Next)。Magisk ユーザー: Zygisk を有効にしてください。
3. モジュールは Pixel プロファイルを同梱しているため、再起動直後に Google Play スタックは
   すでにその Pixel を見ています。動作する fingerprint があれば、PlayIntegrityFix や
   GooglePhotosUnlimited は不要です。

モジュールを操作するには、root マネージャーから WebUI を開きます。Magisk ユーザーは
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) で開きます。すべては
`/data/adb/COPG-VD/COPG-VD.json` で直接編集することもできます。

## 誰がスプーフを見るか(スコープ)

`scope_mode` は、どのプロセスがスプーフされた identity を受け取るかを決めます。スコープ付きモードでは
identity は Zygisk によってプロセスごとに配信され、グローバルプロパティを通じてシステムの残りに
**漏れることはありません**。

| モード | 誰がスプーフを受け取るか |
|---|---|
| `playstore`(デフォルト) | Play スタックのみ: Google Play services、その unstable プロセス、Play Store。 |
| `global` | デバイス全体: すべてのプロセス。 |
| `whitelist` | `scope_whitelist` に列挙されたアプリのみ。 |
| `blacklist` | `scope_blacklist` にあるものを除くすべてのアプリ。 |

`playstore` から始めてください。最も軽量なオプションであり、無関係なアプリにスプーフを
露出させずに Play Integrity を通過するものです。

## エンジン

各エンジンは独立しており、オフにできます。DRM を除き、すべてデフォルトでオンです。

- **Build フィールド(`motor_jni`)** - 対象プロセスで `android.os.Build.*` を書き換えます。
  これはほとんどのアプリが読むものです。
- **プロパティフック(`motor_prop_hook`)** - プロパティ領域のクリーンルームなプロセスごとの
  リマップを通じて、対象プロセスにスプーフされたシステムプロパティを提示します(関数フックなし)。
- **resetprop** - システムプロパティをデバイス全体で、グループごと(identity、
  version、boot 状態、SELinux、adb/usb、anti-emulator、そしてクリーンアップのパス)に書き換えます。
  スコープ付きモードでは identity と version グループはデバイス全体のパスから外れます(Zygisk が
  プロセスごとに配信します);boot、lock、SELinux グループはグローバルのままです。
  `COPG-VD-Settings.resetprop` で切り替えます。
- **DRM / Widevine(`motor_drm`、デフォルトでオフ)** - 選択した Widevine セキュリティレベル
  (L1 または L3)をそれを読むアプリに報告します。下の DRM セクションを参照してください。

## fingerprint を新鮮に保つ

fingerprint は古くなります: Google はファクトリーイメージをローテーションし、古いものは徐々に価値を失います。
`fingerprint-update.sh` は、最新の Google ファクトリーイメージからあなたのものを最新に保ちます。

- WebUI から(Tools タブ): **Check Update** と **Update Now**。
- 単独で、**起動ごとに一度**: **Auto-update JSON on boot**(デフォルトでオン)。バックグラウンドで
  実行され、起動時は通常 wifi がまだ立ち上がっていないため約 10 分間リトライを続け、起動を
  遅らせることは決してありません。
- Build フィールド(fingerprint、ID、incremental、timestamp、security
  patch、SDK、UUID、host、user)のみを書き換えます。カスタマイズしたものはすべて保持され、以前の
  内容は `.bak` として保存されます。
- 決して後退しません(より古い upstream build は拒否されます)。プロファイルが
  別のデバイスをスプーフしている場合は何も適用しません - 別のプロファイル上の Pixel fingerprint は
  古いものより悪いからです。
- `resetprop` は更新直後に再適用されますが、`android.os.Build` は zygote の起動時に
  書き込まれるため、新しい値がアプリに届くには **再起動** してください。ログ:
  `/data/adb/COPG-VD/update.log`。

## Android バージョンの罠

最も正しく設定するのが難しいもの。`ANDROID_VERSION`、`SDK_INT`、`SDK_FULL`、`CODENAME` は
スプーフするデバイスではなく、**あなたの ROM** を記述します。SDK が実際の framework より新しいと
アプリに伝えると、存在しない API を呼ばせます: Google のアプリがクラッシュし、電話が
再起動し、最初からやり直します。起動自体は完了するため、これは boot ログに何も残さない
**softloop** です。

これらのフィールドは同梱の config にはなく、updater は決して書き込みません。**Spoof
Android version**(`COPG-VD-Settings.spoof_version`)が、これらがそもそも適用されるかを決めます:

- `never`(デフォルト) - ROM 自身のバージョンが使われます。
- `rom` - ROM を超えないものだけを適用します。実際には SDK を下げることを意味します。
- `force` - config が言う通り正確に適用します。これが softloop を引き起こすものです; 対象の
  framework がそれをサポートしていると分かっている場合にのみ使用してください。

実際のバージョンは `/system/build.prop` から読まれ、決して `getprop` からは読まれません
(それこそがこのモジュールが偽装するものです)。`force` はバックアップの復元時にも拒否されるため、
古いバックアップがあなたの知らないうちにそれを再武装することはできません。

## DRM / Widevine

デフォルトでオフ(`motor_drm`)。オンの場合、選択した Widevine レベル
`DRM_SECURITY_LEVEL`(`L1` または `L3`)をそれを読むアプリに報告します。

デフォルトでは DRM スプーフは `scope_mode` に従います。代わりに特定のアプリのセットに
適用するには - メインスコープとは独立して - それらを `drm_targets` に列挙します。するとモジュールは
列挙されたアプリがメインスコープの外にあっても、DRM フックの**ためだけに**そのアプリ内に
ロードされたままになります; 空または存在しないリストはスコープに従うことを意味します。これはスコープ付きモード
(`global` ではない)が必要で、次の **再起動** で有効になります。

## Analyze: config をチェックする

WebUI の **Analyze**(または `fingerprint-update.sh analyze`)は、現状の config を監査し、
アプリがそうする前に何が間違っているかを教えてくれます:

- ROM に対するバージョン(softloop するか?)、
- ファイルがまだパースされるか(壊れたものはモジュールに**何も**スプーフさせず、logcat だけが
  それを示します)、
- fingerprint がその周りのフィールドと一致するか、
- モジュールが読まないキー、疑わしい日付、そしてライブプロパティがすでに config が
  求めるものを持っているか。

config を手で編集するたびに実行してください。

## WebUI

オプションですが、すべてを操作する簡単な方法です。5 つのタブ:

- **About** - モジュールとバージョンの情報。
- **Device** - すべての Build フィールド、状態ごとに設定されカテゴリごとにグループ化。
- **Spoofing** - スコープモードとエンジンのスイッチ。
- **System** - resetprop グループ。
- **Tools** - Analyze、Check Update、Update Now、Backup / Restore、起動時自動更新、
  そして Diagnostics レポート(バグレポートに有用なすべてを読み取ってエクスポートする 1 つのボタン)。

ネットワークリクエストは行いません; 必要なものはすべてモジュール内に同梱されています。

## トラブルシューティング

- **アプリがまだ実際のデバイスを見ている。** スコープを確認してください: `playstore` では Play
  スタックのみがカバーされます。config がパースされることを確認してください(Analyze を実行)。エンジン、
  `drm_targets`、プロファイルを変更した後は **再起動** してください - Zygisk は zygote の起動時にスコープを読みます。
- **Play Integrity がまだ失敗する。** fingerprint が新鮮であること(Check Update)、そして
  `SECURITY_PATCH` が `global_fields` にあってデバイス全体で一貫性を保つことを確認してください。
  Google Play services を kill して再アテステーションさせてください。
- **バージョンスプーフを有効にした後、電話が softloop する。** それは上の Android バージョン
  の罠です - `spoof_version` を `never` に戻してください。
- **Magisk で WebUI が開かない。** [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) を使ってください。

*このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正と改善を歓迎します - [../CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*

<!-- doc-footer -->

---

> _このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正や改善を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。_
