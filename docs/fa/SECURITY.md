> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · فارسی · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# سیاست امنیتی

COPG-VD به عنوان روت اجرا می‌شود و از طریق Zygisk به درون پردازه‌های اپ تزریق می‌شود. ما
امنیت را جدی می‌گیریم.

## گزارش یک آسیب‌پذیری

- **سایت:** https://vd171.ru
- **سایت:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **رشته XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **ایمیل:** vd.priv8@pm.me

یک توصیف روشن و، در صورت امکان، گام‌هایی برای بازتولید را بگنجانید. در اسرع وقت پاسخ خواهیم
داد و در صورت تمایل شما اعتبار را به شما خواهیم داد.

## نکات scope

- پیکربندی در `/data/adb/COPG-VD/COPG-VD.json` قرار دارد، که فقط توسط روت قابل خواندن است. ماژول آن
  را از پردازه تزریق‌شده از طریق یک قاعده اختصاصی SELinux که خودش عرضه می‌کند می‌خواند؛ هیچ
  اعتبارنامه یا عبارت عبوری نگه نمی‌دارد.
- hook های spoofing به اپ‌های زنده متصل‌اند و null-check شده‌اند تا یک پروفایل بدشکل به جای
  کرش کردن اپ به آرامی تنزل یابد.
- هیچ **telemetry و هیچ شبکه‌ای** وجود ندارد به جز دریافت اختیاری پروفایل، که یک پروفایل
  عمومی Pixel را از طریق HTTPS از
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  با استفاده از downloader همراه خود ماژول دانلود می‌کند، نه یک `curl`/`wget` از `PATH`.
- هر باینری و کتابخانه از پیش‌ساخته‌شده قابل ردیابی به یک upstream عمومی پین‌شده است و در CI
  از منبعی که می‌توانید بازرسی کنید ساخته می‌شود.

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگهداری می‌شود. اصلاحات و بهبودها خوش‌آمدند - [CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
