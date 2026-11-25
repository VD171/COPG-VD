> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · 日本語 · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AIエージェント: 制御サーフェス

COPG-VD は AI およびエージェントの貢献者を歓迎しており、モジュール全体が WebUI をスクレイプすることなく
ヘッドレスで操作されるように作られています。2 つのサーフェスがあり、root として実行されるエージェント
(WebUI がそうであるように)は両方を使用します。

1. **設定ファイル** `/data/adb/COPG-VD/COPG-VD.json` - 唯一の信頼できる情報源。すべてのプロファイルフィールド
   とすべての設定はここにあります。このファイルを読み書きすることが、モジュールが何をスプーフするかを変更する
   方法です。
2. **シェルエントリポイント** `fingerprint-update.sh` - プロファイルのチェック、適用、取得のための安定した
   動詞を備えた 1 つのスクリプト。

## 設定ファイル

`/data/adb/COPG-VD/COPG-VD.json` は単純な JSON オブジェクトです。モジュールは、自身が同梱する専用の SELinux
ルールを通じて、注入されたプロセスからこれを読み取ります。認証情報は一切含まれません。同梱の例は
`module/COPG-VD.json.example` にあり、最新の Google 工場出荷イメージから毎日更新されます。

エージェントが従うべきルール:

- **文字列は二重引用符のみを使用します**(JSON と同様)。
- **すべてのフィールドは任意です。** 提供されなかったフィールドはスキップされ、ROM 自身の値が保持されます。
- モジュールを操作するトップレベルのキーは、`scope_mode`、`scope_whitelist`、`scope_blacklist`、
  `motor_drm`、`drm_targets`、`global_fields`、`process_overrides`、`COPG-VD` オブジェクト(Build
  フィールド)、`COPG-VD-Delete` リスト、そして `COPG-VD-Settings` オブジェクト(`resetprop`、
  `autoupdate`、`spoof_version`)です。[設定リファレンス](CONFIGURATION.md) がそれぞれを説明しています。
- `"spoof_version": "force"` は、ディスク上のファイルから来た場合は拒否され、読み取り時にダウングレードされ
  ます。そのため、古いバックアップを復元しても、ひそかに再び有効化されることはありません。バージョンポリシー
  は、`force` を手書きするのではなく、設定を通じて指定してください。
- ファイルを編集した後は、**`analyze`**(下記)を実行してください。パースできないファイルはモジュールに
  **何も**スプーフさせず、logcat だけがそれを示します。

変更された設定は、次のプロセス開始時にアプリへ届きます。`resetprop` で届けられたプロパティは再起動なしで再適用
できますが(`service.sh --props-only`)、`android.os.Build.*` フィールドは zygote の起動時に Zygisk
ライブラリによって書き込まれるため、これらをアプリへ届けるには **再起動が必要** です。

## シェル契約

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

スクリプトは人間が読める行を出力します。機械が読める行は `status:` で始まります。終了コードは成功時に `0`、
失敗時に非ゼロです。

| 動詞 | 何をするか | 典型的な出力 |
|---|---|---|
| `check` | インストール済みのプロファイルを最新の上流ビルドと比較し、何も書き込みません。 | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | 最新のプロファイルを取得し、設定にマージします(Build フィールドのみ。他のキーは保持されます)。 | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | 設定を現状のまま監査します(パース、バージョン対 ROM、fingerprint の整合性、未知のキー、日付、props)。レポートを出力し、終了コードは red/warn の所見を反映します。 | テキストレポート |
| `fetch-index` | 署名済みのデバイスインデックスをダウンロードして検証し、出力します(`index.json`)。 | インデックス JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | 1 つのデバイスの `build.prop` をダウンロードし(パスはインデックスから、例: `pixel-9a/latest.prop`)、その Build フィールドを設定に書き込みます。 | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | state/config を古いフラットレイアウトから `/data/adb/COPG-VD/` へ移行します。 | - |
| `migrate` | モジュールバージョン間の一度限りの設定移行。 | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | 起動ごとに一度の自動更新。`service.sh` 向けであり、対話的な使用向けではありません。 | `update.status` を書き込みます |

すべてのダウンロードは使用前に検証されます(デバイス上の唯一のダウンローダーは TLS を検証できない busybox の
`wget` です)。また、プロファイルアップデーターは決して後退しません。インストール済みより古い上流ビルドは拒否
されます。フィードインデックスと各 `.prop` には分離された ed25519 署名が付いており、内容が読み取られる前に
検証されます。

## 典型的なエージェントフロー

- **プロファイルを最新に保つ:** `check`。`status: update-available` なら `apply`。その後、新しい
  `Build.*` をアプリへ届けるために再起動します。
- **別の Pixel プロファイルに切り替える:** `fetch-index`、インデックスからデバイスパスを選び、`fetch
  <path>`、設定が整合していることを確認するために `analyze` を実行し、その後再起動します。
- **範囲または engine を変更する:** 設定ファイルで `scope_mode`(または engine のスイッチ)を編集し、
  `analyze` を実行し、その後プロパティで届けられる変更には `service.sh --props-only`、Build フィールドには
  再起動します。

## 安全ガード

- 設定を変更したりプロファイルを適用したりすると、対象となるすべてのアプリが見る内容が変わります。WebUI が
  そうするように、書き込む前に意図を確認してください。
- 実際の整合性ガードを決して緩めないでください。SDK はどのポリシーでも実際の framework に制限され、製造元は
  プロファイルの残りの部分と足並みを揃え、別のデバイス向けのプロファイルは拒否されます。これらは意図的なもの
  であり、迂回してはなりません。
- 設定がサポートされるサーフェスです。WebUI そのものをスクレイプしたり自動化したりしないでください。

<!-- doc-footer -->

---

> _このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正や改善を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。_
