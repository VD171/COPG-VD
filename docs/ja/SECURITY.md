> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · 日本語 · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# セキュリティポリシー

COPG-VD は root として実行され、Zygisk を通じてアプリプロセスに注入されます。私たちはセキュリティを
真剣に受け止めています。

## 脆弱性の報告

- **サイト:** https://vd171.ru
- **サイト:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA スレッド:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

明確な説明と、可能であれば再現手順を含めてください。できるだけ早く対応し、ご希望であれば
あなたをクレジットします。

## スコープに関する注記

- 設定は `/data/adb/COPG-VD/COPG-VD.json` にあり、root のみが読めます。モジュールは、それ自身が
  同梱する専用の SELinux ルールを通じて、注入されたプロセスからそれを読みます; 認証情報や
  パスフレーズは保持しません。
- スプーフィングフックはライブアプリに取り付けられ、null チェックされているため、不正なプロファイルは
  アプリをクラッシュさせる代わりに優雅に劣化します。
- オプションのプロファイル取得を除いて、**テレメトリもネットワークもありません**。その取得は
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  から HTTPS 経由で公開 Pixel プロファイルをダウンロードします。モジュール自身の同梱ダウンローダーを
  使用し、`PATH` の `curl`/`wget` ではありません。
- すべてのビルド済みバイナリとライブラリは、固定された公開 upstream まで追跡可能で、あなたが
  検査できるソースから CI でビルドされます。

*このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正と改善を歓迎します - [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
