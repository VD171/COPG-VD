## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD はデバイススプーファーです: デバイスの fingerprint と build を書き換え、アプリが実際のデバイスではなく、あなたが選んだデバイスを見るようにします。  
Zygisk (KernelSU、APatch または Magisk) 上で動作し、デフォルトではスプーフの対象を Google Play スタックに限定します - そのため PlayIntegrityFix より軽量で堅牢な代替手段です。  

## スクリーンショット

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## 使い方
モジュールをインストールして再起動すると、同梱のプロファイル (Pixel) が対象のアプリに対してスプーフィングされます。動作する fingerprint があれば、PlayIntegrityFix や GooglePhotosUnlimited は必要ありません。  
すべては `/data/adb/COPG-VD.json` で、または WebUI から設定します。すべてのフィールドは任意 (OPTIONAL) です - 指定されていないフィールドはスキップされます。  

### Scope - 誰がスプーフを見るか
`scope_mode` は、どのプロセスがスプーフされた識別情報を受け取るかを決定します。スコープ付きモードでは、識別情報は Zygisk によってプロセスごとに配信され、グローバルプロパティを通じてシステムの他の部分に漏れることはありません。  
* **Google Play** (`playstore`、デフォルト) - Play スタックのみ (Google Play services、その unstable プロセス、および Play Store)。  
* **Global** - デバイス全体。すべてのプロセスがそれを見ます。  
* **Whitelist** - `scope_whitelist` にあるアプリのみ。  
* **Blacklist** - `scope_blacklist` にあるものを除くすべてのアプリ。  

### Engine - スプーフがどのように配信されるか
それぞれは独立しており、オフにできます:  
* **Build fields (JNI)** - 対象のプロセスで `android.os.Build.*` を書き換えます。  
* **Property hook** - スプーフされたシステムプロパティを対象のプロセスに提示します (プロパティ領域のプロセスごとのクリーンルーム再マッピングであり、関数フックは行いません)。  
* **resetprop** - システムプロパティを書き換えます。グループごとに管理されます: 識別情報、バージョン、起動状態、SELinux、adb/usb、アンチエミュレーター、およびクリーンアップのパス。スコープ付きモードでは、識別情報とバージョンのグループはデバイス全体の resetprop から除外されます (Zygisk がそれらをプロセスごとに配信します)。boot/lock/SELinux のグループはグローバルのままです。  
* **DRM / Widevine** (デフォルトでオフ) - 選択した Widevine セキュリティレベル (L1 または L3) を、それを読み取るアプリに報告します。  

### フィールド - 設定、空、削除、スキップ
`COPG-VD` オブジェクト内で、各 Build フィールドには 4 つの状態があります:  
* **Set** - `"KEY": "value"` は値を書き込みます。  
* **Empty** - `"KEY": ""` は空の値を書き込みます。  
* **Delete** - キーを削除するには、トップレベルの `"COPG-VD-Delete": [ ... ]` にそのキーを列挙します (Build フィールドは null になり、プロパティは `resetprop --delete` で削除されます)。  
* **Skip** - キーを完全に省略します。ROM 自身の値が保持されます。  

`"global_fields": [ ... ]` のリストは、スコープ付きモードであっても、指定された Build フィールドをデバイス全体に適用し、値をどこでも一貫させます - 一貫性の観点から安全なフィールド (例えば security patch) のみを対象とし、識別情報は決して対象とせず、Android バージョンのグループも決して対象としません。  

### JSON 設定ファイルの例
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.260918.007-factory-f5955275.zip",
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.260918.007/16484274:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.260918.007",
    "ID": "ZP11.260918.007",
    "HOST": "51b22e6d8afb",
    "INCREMENTAL": "16484274",
    "TIMESTAMP": "1790806751",
    "PREVIEW_SDK": "20261007",
    "USER": "android-build",
    "SDK_FINGERPRINT": "d9ad4b00fa641d6e43c42cc969f49492",
    "UUID": "_mQOcxvuFzRVZAjNEr2UUUpk2fv0mqDc8RpFyaeJjuk",
    "SECURITY_PATCH": "2026-10-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "global_fields": ["SECURITY_PATCH"]
}
```
文字列は必ず二重引用符で囲んで使用してください。  
上記のブロックと `module/COPG-VD.json.example` は、[Update COPG-VD.json](.github/workflows/update-json.yml) ワークフローによって、最新の Google 工場出荷イメージから直接、毎日更新されます。  

### fingerprint を最新に保つ
`fingerprint-update.sh` はそのファイルを取得して設定を更新します。WebUI から (**Check Update** / **Update Now**)、またはそれ自身で**起動ごとに一度** (**Auto-update JSON on boot**、デフォルトで有効) 実行されます。  
* `/data/adb/COPG-VD.json` と `/data/adb/modules/COPG-VD/COPG-VD.json` の両方が存在する場合は両方が更新され、以前の内容は `.bak` として保持されます。  
* 書き換えられるのはビルドフィールドのみです (fingerprint、ID、incremental、timestamp、security patch、SDK、UUID、host、user)。カスタマイズしたその他すべては保持されます: 追加のキー、`scope_mode`、`BOOTLOADER`/`BOARD`/`HARDWARE`、他のオブジェクト、キーの順序、書式。  
* 決して後退しません: インストール済みより古い上流ビルドは拒否されます。これは
  通常のことであり (リポジトリは手動で更新した設定より遅れることがあります)、同時に Android において
  最も重要な保護でもあります。Android で利用できる唯一のダウンローダーは busybox の `wget` で、TLS 証明書を
  検証できないためです - 同じ理由で、すべての値は使用前に検証されます。  
* プロファイルが**別のデバイス**をスプーフィングしている場合 (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` が異なる)、何も適用されません - 別のプロファイルに Pixel の fingerprint を使うのは、古い fingerprint よりも悪いからです。  
* 起動時にはバックグラウンドで実行され、約 10 分間リトライを続けます。起動完了時には通常まだ wifi が立ち上がっていないためです。起動を遅らせることは決してありません。  
* 更新直後に `resetprop` が再適用されますが、`android.os.Build` は zygote の開始時に zygisk モジュールによって書き込まれます: 新しい値をアプリに届けるには**再起動**してください。  
* ログは `/data/adb/COPG-VD.update.log` にあります。  

### Android バージョン - そしてなぜスプーフィングされないのか
`ANDROID_VERSION`、`SDK_INT`、`SDK_FULL`、`CODENAME` は、スプーフィングされるデバイスではなく、**あなたの ROM** を表します。SDK が実際のフレームワークより新しいとアプリに伝えると、存在しない API を呼び出すようになります: Google のアプリがクラッシュし、端末が再起動し、それを繰り返します。起動自体は完了するため、これは **softloop** であり、起動ログには何も表示されません。  
* これらは配布される設定には含まれておらず、アップデーターが書き込むこともありません。  
* WebUI の **Spoof Android version** が、これらを適用するかどうかを決定します:  
  * **Never** (デフォルト) - ROM 自身のバージョンが使用されます。  
  * **Up to this ROM** - それを超えないものだけ、つまり実際には SDK を下げることを意味します。  
  * **Force** - 設定どおり正確に。これが softloop を引き起こすものです。  
* 実際のバージョンは `/system/build.prop` から読み取られ、`getprop` からは決して読み取られません - それこそがこのモジュールが偽装するものだからです。  

### Analyze
WebUI の **Analyze** (または `fingerprint-update.sh analyze`) は、現状の設定を監査します: ROM に対するバージョン、ファイルがそもそもまだパースできるか (壊れていると、モジュールは**何も**スプーフィングせず、logcat だけがそれを伝えます)、fingerprint が周囲のフィールドと一致するか、モジュールが読まないキー、日付、そして props がすでに設定の要求する内容を保持しているか。  

### WebUI
WebUI は任意です - すべては JSON 設定で直接編集できます - が、モジュールを操作する簡単な方法です。5 つのタブがあります: **About**、**Device** (すべてのフィールドを状態ごとに設定し、カテゴリごとにグループ化)、**Spoofing** (スコープとエンジン)、**System** (resetprop グループ)、**Tools** (Analyze、Check Update、Update Now、Backup/Restore、および起動時の自動更新)。ネットワークリクエストは一切行いません。必要なものはすべてモジュール内に同梱されています。  
Magisk ユーザーの場合は、KOW による KsuWebUI を使用してください (https://github.com/KOWX712/KsuWebUIStandalone/releases)。  

### 設定内の設定項目
`COPG-VD.json` は設定をプロファイルの隣に保持するため、あなたの選択はバックアップとともに移動し、手動で編集できます: `scope_mode`、エンジンのスイッチ、resetprop グループ、`global_fields`、そして `COPG-VD-Settings` オブジェクト (`resetprop`、`autoupdate`、`spoof_manufacturer`、`spoof_version`)。WebUI は設定と、起動スクリプトが読み取るフラグファイルの両方を書き込みます。`"spoof_version": "force"` はファイルからは拒否され、ダウングレードされます: 古いバックアップを復元しても、知らないうちに再び有効化されてはならないからです。  

## 連絡先

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**タグ:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
