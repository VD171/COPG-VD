> **Languages:** [English](../../SECURITY.md) · العربية · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# سياسة الأمان

يعمل COPG-VD بصلاحيات root ويُحقن في عمليات التطبيقات عبر Zygisk. نأخذ الأمان
على محمل الجد.

## الإبلاغ عن ثغرة

- **الموقع:** https://vd171.ru
- **الموقع:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **موضوع XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **البريد الإلكتروني:** vd.priv8@pm.me

أرفِق وصفاً واضحاً، وإن أمكن، خطوات إعادة الإنتاج. سنردّ بأسرع ما
نستطيع وننسب إليك الفضل إن رغبت.

## ملاحظات حول النطاق

- يوجد الإعداد في `/data/adb/COPG-VD.json`، وهو قابل للقراءة من قبل root فقط. تقرأه الوحدة
  من العملية المحقونة عبر قاعدة SELinux مخصّصة تأتي بها هي نفسها؛ وهي
  لا تحتفظ بأي بيانات اعتماد أو عبارات مرور.
- خطّافات الانتحال مرتبطة بتطبيقات حيّة ومُتحقَّق فيها من القيمة null بحيث يتدهور ملف تعريف مشوَّه
  بسلاسة بدلاً من تعطيل التطبيق.
- **لا توجد قياسات عن بُعد (telemetry) ولا شبكة** باستثناء جلب ملف التعريف الاختياري، الذي
  ينزّل ملف تعريف Pixel عاماً عبر HTTPS من
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  باستخدام أداة التنزيل المرفقة الخاصة بالوحدة، لا `curl`/`wget` من `PATH`.
- كل ملف ثنائي ومكتبة مُسبقة البناء قابلة للتتبّع إلى مصدر upstream عام مثبَّت (pinned) وتُبنى
  في الـ CI من مصدر يمكنك فحصه.

*تم إنشاء هذه الوثائق باستخدام Claude (Anthropic) وتتم صيانتها بواسطة VD171. التصحيحات والتحسينات مرحّب بها - راجع [CONTRIBUTING.md](CONTRIBUTING.md).*
