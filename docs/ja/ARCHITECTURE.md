> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · 日本語 · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# アーキテクチャ

COPG-VD は Zygisk モジュールです: Zygisk ローダーが zygote に注入し、そこからアプリプロセスに
注入する小さなネイティブライブラリ(`libspoof.so`)です。その役割は、対象とするプロセスに
選択したデバイス identity を提示することだけです。アプリは存在せず、オプションのプロファイル取得を
除けば、ネットワークもありません。

## ライフサイクル

1. **zygote の起動。** zygote が起動すると、ローダーがモジュールの `onLoad` を呼び出します。それは
   `/data/adb/COPG-VD.json` を一度読みます: スコープ設定とプロファイルです。
2. **アプリの fork。** zygote が fork するすべてのアプリについて、モジュールは `preAppSpecialize`
   でこのプロセスがスコープ内かを決定します:
   - **メインスコープ内**(`playstore` / `global` / `whitelist` / `blacklist`)、または
   - **DRM スコープ内**(`drm_targets` に列挙)。
   どちらでもない場合、モジュールはそのプロセスから**切り離し**(`dlclose`)、そこに痕跡を
   残しません。
3. **Specialize。** 残るプロセスについては、プロセスがまだ特権を持っている間に、エンジンが
   `postAppSpecialize` で適用されます。

fork は zygote のメモリを copy-on-write で継承するため、各アプリは起動時に読まれた config から
始まります。モジュールは実際に変更があったときにのみ対象プロセスごとにファイルを再読み込みするため、
新しく起動または再び開かれたアプリは編集されたプロファイルを拾います - しかしスコープの決定自体は
zygote の起動時に行われるため、**スコープ、エンジン、`drm_targets` の変更には再起動が必要です**。

## エンジン

それぞれが独立しており、切り替え可能です。

- **Build フィールド(`motor_jni`)。** 対象プロセスで JNI を通じて `android.os.Build.*`(と
  `Build.VERSION.*`)を書き換えるため、Java コードはスプーフされた値を読みます。
- **プロパティフック(`motor_prop_hook`)。** プロパティ領域(`prop_virtualizer`)のクリーンルームな
  プロセスごとのリマップを通じて、スプーフされたシステムプロパティをプロセスに提示します。
  これは関数フックではなくメモリリマップなので、フックされた関数のフットプリントはありません。
- **resetprop(デバイス全体)。** システムプロパティをグループごとに書き込みます - identity、version、
  boot 状態、SELinux、adb/usb、anti-emulator、加えてクリーンアップのパス。boot スクリプトがそれを
  実行します。スコープ付きモードでは identity と version グループは除外されます(Zygisk が
  プロセスごとに配信します);boot、lock、SELinux グループはグローバルのままで、デバイスが一貫します。
- **DRM / Widevine(`motor_drm`)。** Widevine セキュリティレベルを報告する `MediaDrm` メソッド
  (`getSecurityLevel`、`getPropertyString`)をフックし、設定されたレベルを返します。
  フックは null チェックされているため、不正なプロファイルはアプリをクラッシュさせる代わりに
  優雅に劣化します。`drm_targets` はこのエンジンを独自のアプリリストで実行させ、メインスコープから
  切り離します。

## config の読み取り

注入されたプロセスは zygote の SELinux ドメインで実行され、デフォルトでは `/data/adb` に
到達できません。モジュールはそれを許可する独自の `sepolicy.rule` を同梱し、フォールバックとして、
開いているモジュールディレクトリ(`getModuleDir`)を通じて config を読めるため、Zygisk ビルドが
そのパスの許可をやめても動作し続けます。ファイルは小さな組み込み JSON パーサー(`jsmn`)で
パースされます; パースされないファイルはモジュールが何もスプーフしないことを意味します。

## プロファイルを新鮮に保つ

`fingerprint-update.sh` は、WebUI からまたは起動ごとに一度、最新の Google ファクトリーイメージから
Build フィールドを更新します。モジュール自身の同梱ダウンローダー(`PATH` の `curl`/`wget` ではない)を
使用し、使用前にすべての値を検証し、決して後退せず、別のデバイスをスプーフするプロファイルを
拒否します。`android.os.Build` は zygote の起動時に書き込まれるため、新しい値は次の再起動で
アプリに届きます。ユーザー側については [USER-GUIDE.md](USER-GUIDE.md) を、フィールドについては
[CONFIGURATION.md](CONFIGURATION.md) を参照してください。

## なぜ Android バージョンはデフォルトでスプーフされないのか

`SDK_INT` / `ANDROID_VERSION` を ROM の framework の実際より上に上げると、アプリに存在しない
API を呼ばせ、Google のアプリをクラッシュさせ、電話を softloop に再起動させます。したがって version
グループはデフォルトでオフで、`spoof_version` の背後でゲートされています。モジュールは実際の
バージョンを `/system/build.prop` から読み、決して `getprop` からは読みません。`getprop` こそが
それが偽装するものだからです。[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap) の罠を参照してください。

*このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正と改善を歓迎します - [../CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
