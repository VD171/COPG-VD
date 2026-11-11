> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · 日本語 · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# 設定リファレンス

モジュール全体は 1 つのファイル `/data/adb/COPG-VD/COPG-VD.json` によって駆動されます。WebUI があなたの
代わりにこれを書き込みますが、手で編集することもできます。同梱の例は `module/COPG-VD.json.example` にあります。
これが唯一の信頼できる情報源です。モジュールディレクトリ下のコピーは読み取り専用のデフォルトにすぎません。
古いバージョンから `/data/adb/COPG-VD.json` に残された設定は、このディレクトリへ自動的に移動されます。
モジュール自身のログと状態 (`update.log`、`update.state`) もここに存在します。

ルール:

- **文字列は二重引用符のみを使用します**(JSON と同様)。
- **すべてのフィールドはオプションです。** 提供されないフィールドはスキップされ、ROM 自身の
  値が保持されます。
- 手で編集した後は **Analyze** を実行してください: パースされないファイルはモジュールに **何も**
  スプーフさせず、logcat だけがそれを示します。

## トップレベルのキー

| キー | 型 | 意味 |
|---|---|---|
| `scope_mode` | string | `playstore`(デフォルト)、`global`、`whitelist` または `blacklist`。[USER-GUIDE.md](USER-GUIDE.md) を参照。 |
| `scope_whitelist` | array | `scope_mode` が `whitelist` のときにスプーフを受け取るパッケージ。 |
| `scope_blacklist` | array | `scope_mode` が `blacklist` のときに除外されるパッケージ。 |
| `COPG-VD` | object | プロファイル: 提示する Build フィールド(下記参照)。 |
| `COPG-VD-Delete` | array | 設定ではなく削除するフィールド名(Build フィールドは null になります; プロパティは `resetprop --delete` で削除されます)。 |
| `COPG-VD-Settings` | object | プロファイルとともに移動するモジュール設定(下記参照)。 |
| `motor_jni` | bool | Build フィールドエンジン(`android.os.Build.*` を書き換え)。デフォルト `true`。 |
| `motor_prop_hook` | bool | プロセスごとのプロパティエンジン(クリーンルームなプロパティリマップ)。デフォルト `true`。 |
| `motor_drm` | bool | DRM / Widevine エンジン。デフォルト `false`。 |
| `drm_targets` | array | `scope_mode` に関わらず DRM スプーフを受け取るアプリ。空 = スコープに従う。 |
| `global_fields` | array | スコープ付きモードでもデバイス全体に適用される Build フィールド。一貫性に安全なフィールドのみ。 |
| `process_overrides` | object | プロセスごとのフィールドオーバーライド: `{ "process.name": { "FIELD": "value" } }`。 |
| `verbose_logs` | bool | デバッグ用の追加の logcat 詳細。デフォルト `false`。 |

## `COPG-VD` プロファイルオブジェクト

各エントリは対象プロセスに提示されるデバイスフィールドです。一般的なもの:

| グループ | フィールド |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version(特別) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

`*_FOR_ATTESTATION` バリアント(`BRAND_FOR_ATTESTATION`、`DEVICE_FOR_ATTESTATION`、
`MANUFACTURER_FOR_ATTESTATION`、`MODEL_FOR_ATTESTATION`、`PRODUCT_FOR_ATTESTATION`)は、アテステーション
パスがプレーンなものとは異なる値を報告できるようにし、keystore が一貫性を保つようにします。

> **version グループは特別です。** `ANDROID_VERSION`、`SDK_INT`、`SDK_FULL`、`CODENAME` は
> スプーフするデバイスではなく、あなたの ROM を記述します。これらを上げると電話が softloop します。これらは
> 同梱のプロファイルにはなく、`COPG-VD-Settings.spoof_version` が許可するときにのみ適用されます -
> [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap) を参照してください。

### フィールドの状態

| 状態 | 方法 | 結果 |
|---|---|---|
| Set | `"KEY": "value"` | 値を書き込みます。 |
| Empty | `"KEY": ""` | 空の値を書き込みます。 |
| Delete | `"COPG-VD-Delete": [ ... ]` 内の名前 | フィールドを削除します。 |
| Skip | キーを省略する | ROM 自身の値を保持します。 |

### DRM

`DRM_SECURITY_LEVEL`(`L1` または `L3`)は、`motor_drm` がオンのときに報告される Widevine レベルです。

## `COPG-VD-Settings`

プロファイルとともに移動する設定で、バックアップがあなたの選択を持ち運びます。

| キー | 型 / 値 | 意味 |
|---|---|---|
| `resetprop` | bool | デバイス全体の resetprop エンジンを実行するかどうか。 |
| `autoupdate` | bool | `fingerprint-update.sh` を起動ごとに一度実行するかどうか。デフォルトでオン。 |
| `spoof_manufacturer` | bool | manufacturer フィールドもスプーフするかどうか。 |
| `spoof_version` | `never` / `rom` / `force` | Android version グループの適用方法。`never` がデフォルト; `force` はバックアップの復元時に拒否されます。 |

## `global_fields`

このリスト内の Build フィールドは、スコープ付きモードでもデバイス全体に適用され、値を
どこでも一貫させます。一貫性に安全なフィールドのみに使用してください - security patch が
通常のものです。identity や Android version グループをここに **決して** 入れないでください。

```json
"global_fields": ["SECURITY_PATCH"]
```

## 例

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正と改善を歓迎します - [../CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
