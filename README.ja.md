## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD は、グローバルなデバイススプーフィングのために設計されたモジュールです。  
つまり、システムアプリやデバイス全体までもがフックされます。  
  
## 使い方
このモジュールを使用して動作する FingerPrint をスプーフィングする場合、PlayIntegrityFix や GooglePhotosUnlimited を使用する必要はありません。  
### JSON 設定ファイルの例  
`/data/adb/COPG-VD.json`
* すべてのフィールドは任意 (OPTIONAL) です。あるフィールドが指定されていない場合は、スキップされます。  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
文字列は必ず二重引用符で囲んで使用してください。  
上記のブロックと `module/COPG-VD.json.example` は、[Update COPG-VD.json](.github/workflows/update-json.yml) ワークフローによって、最新の Google 工場出荷イメージから直接、毎日更新されます。  
### fingerprint を最新に保つ  
`fingerprint-update.sh` はそのファイルを取得して設定を更新します。WebUI から (**Check Update** / **Update Now**)、またはそれ自身で**起動ごとに一度** (**Auto-update JSON on boot**、デフォルトで有効) 実行されます。  
* `/data/adb/COPG-VD.json` と `/data/adb/modules/COPG-VD/COPG-VD.json` の両方が存在する場合は両方が更新され、以前の内容は `.bak` として保持されます。  
* 書き換えられるのはビルドフィールドのみです (fingerprint、ID、incremental、timestamp、security patch、SDK、UUID、host、user)。カスタマイズしたその他すべては保持されます: 追加のキー、`BOOTLOADER`/`BOARD`/`HARDWARE`、他のオブジェクト、キーの順序、書式。  
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
### 設定内の設定項目  
`COPG-VD.json` には `COPG-VD-Settings` オブジェクトを含めることができます - `resetprop`、`autoupdate`、`spoof_manufacturer`、`spoof_version` - これによりあなたの選択はバックアップとともに移動し、手動で編集できます。WebUI はそれと、起動スクリプトが読み取るフラグファイルの両方を書き込みます。`"spoof_version": "force"` はファイルからは拒否され、ダウングレードされます: 古いバックアップを復元しても、知らないうちに再び有効化されてはならないからです。  
### WebUI  
JSON 設定ファイルを直接編集する場合は、WebUI を使用する必要はありません。  
Magisk ユーザーの場合は、KOW による KsuWebUI を使用してください (https://github.com/KOWX712/KsuWebUIStandalone/releases)。  
#### Use resetprop:  
resetprop の使用を無効にし、Build 情報のスプーフィングのみを有効にします。  
#### Use ro.product.manufacturer:  
Disclosure root detector アプリの「Found device spoofing」検出が気になる場合は無効にしてください。  

## 連絡先

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
