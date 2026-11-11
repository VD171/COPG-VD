> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · فارسی · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# راهنمای کاربر

COPG-VD شناسه دستگاه (fingerprint) و build را بازنویسی می‌کند تا اپ‌هایی که انتخاب می‌کنید
به جای دستگاه واقعی شما یک Pixel ببینند. این راهنما شما را از نصب تا یک پیکربندی کارآمد و
انتخاب‌های میان راه هدایت می‌کند. برای هر فیلد و مقدار، [CONFIGURATION.md](CONFIGURATION.md) را ببینید؛
برای اینکه درون آن چطور کار می‌کند، [ARCHITECTURE.md](ARCHITECTURE.md) را ببینید.

## نصب

1. فایل zip را در KernelSU، APatch یا Magisk فلش کنید و ری‌استارت کنید.
2. Zygisk باید فعال باشد (توکار، یا ReZygisk / Zygisk Next). کاربران Magisk: Zygisk را فعال کنید.
3. ماژول یک پروفایل Pixel را همراه دارد، پس درست بعد از ری‌استارت استک Google Play
   همان Pixel را می‌بیند. با یک fingerprint کارآمد نیازی به PlayIntegrityFix یا
   GooglePhotosUnlimited ندارید.

WebUI را از مدیر روت خود باز کنید تا ماژول را هدایت کنید. کاربران Magisk آن را با
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) باز می‌کنند. همه چیز
همچنین مستقیماً در `/data/adb/COPG-VD/COPG-VD.json` قابل ویرایش است.

## چه کسی spoof را می‌بیند (scope)

`scope_mode` تعیین می‌کند که کدام پردازه‌ها هویت جعلی را دریافت کنند. در یک حالت scoped،
هویت توسط Zygisk به صورت per-process تحویل داده می‌شود و از طریق property های سراسری به
بقیه سیستم **درز نمی‌کند**.

| حالت | چه کسی spoof را می‌گیرد |
|---|---|
| `playstore` (پیش‌فرض) | فقط استک Play: Google Play services، پردازه ناپایدار آن و Play Store. |
| `global` | کل دستگاه: هر پردازه. |
| `whitelist` | فقط اپ‌های فهرست‌شده در `scope_whitelist`. |
| `blacklist` | هر اپ به جز آن‌هایی که در `scope_blacklist` هستند. |

با `playstore` شروع کنید. این سبک‌ترین گزینه است و همان گزینه‌ای که Play Integrity را
بدون آشکار کردن spoof برای اپ‌های نامرتبط پاس می‌کند.

## موتورها

هر موتور مستقل است و می‌توان آن را خاموش کرد. همه به جز DRM به صورت پیش‌فرض روشن هستند.

- **فیلدهای Build (`motor_jni`)** - `android.os.Build.*` را در پردازه‌های هدف بازنویسی
  می‌کند. این همان چیزی است که بیشتر اپ‌ها می‌خوانند.
- **Property hook (`motor_prop_hook`)** - property های سیستمی جعلی را به پردازه‌های هدف
  ارائه می‌دهد، از طریق یک remap تمیز (clean-room) و per-process از ناحیه property (بدون
  hook تابع).
- **resetprop** - property های سیستم را به صورت سراسری در دستگاه، گروه به گروه بازنویسی
  می‌کند (identity، version، boot state، SELinux، adb/usb، anti-emulator و یک پاس پاک‌سازی).
  در یک حالت scoped، گروه‌های identity و version از پاس سراسری دستگاه کنار گذاشته می‌شوند
  (Zygisk آن‌ها را per-process تحویل می‌دهد)؛ گروه‌های boot، lock و SELinux سراسری باقی
  می‌مانند. آن را در `COPG-VD-Settings.resetprop` تغییر دهید.
- **DRM / Widevine (`motor_drm`، پیش‌فرض خاموش)** - یک سطح امنیتی Widevine انتخاب‌شده
  (L1 یا L3) را به اپ‌هایی که آن را می‌خوانند گزارش می‌دهد. بخش DRM در پایین را ببینید.

## تازه نگه داشتن fingerprint

یک fingerprint کهنه می‌شود: Google تصاویر کارخانه را می‌چرخاند و یک fingerprint قدیمی
به‌تدریج ارزش خود را از دست می‌دهد. `fingerprint-update.sh` مال شما را از جدیدترین تصویر
کارخانه Google به‌روز نگه می‌دارد.

- از WebUI (تب Tools): **Check Update** و **Update Now**.
- به‌خودی‌خود، **یک بار در هر boot**: **Auto-update JSON on boot** (به صورت پیش‌فرض روشن).
  در پس‌زمینه اجرا می‌شود، حدود ده دقیقه تلاش مجدد می‌کند چون معمولاً هنگام boot وای‌فای هنوز
  بالا نیامده، و هرگز boot را به تأخیر نمی‌اندازد.
- فقط فیلدهای build را بازنویسی می‌کند (fingerprint، ID، incremental، timestamp، security
  patch، SDK، UUID، host، user). هر چیزی که سفارشی کرده‌اید حفظ می‌شود و محتوای قبلی به صورت
  `.bak` ذخیره می‌شود.
- هرگز به عقب نمی‌رود (یک build قدیمی‌تر از upstream رد می‌شود)، و اگر پروفایل شما دستگاه
  متفاوتی را spoof می‌کند هیچ چیزی اعمال نمی‌کند - یک fingerprint Pixel روی پروفایل دیگر
  بدتر از یک fingerprint قدیمی است.
- `resetprop` بلافاصله پس از یک به‌روزرسانی دوباره اعمال می‌شود، اما `android.os.Build`
  هنگام شروع zygote نوشته می‌شود، پس برای رسیدن مقادیر جدید به اپ‌ها **ری‌استارت** کنید. لاگ:
  `/data/adb/COPG-VD/update.log`.

## تله نسخه اندروید

سخت‌ترین چیزی که باید درست انجام شود. `ANDROID_VERSION`، `SDK_INT`، `SDK_FULL` و `CODENAME`
**رام شما** را توصیف می‌کنند، نه دستگاهی که spoof می‌کنید. گفتن به اپ‌ها که SDK جدیدتر از
آن چیزی است که framework واقعاً هست باعث می‌شود آن‌ها API هایی را فراخوانی کنند که وجود
ندارند: اپ‌های Google کرش می‌کنند، تلفن ری‌استارت می‌شود، و از نو شروع می‌شود. خود boot کامل
می‌شود، پس این یک **softloop** است که هیچ چیزی در لاگ‌های boot باقی نمی‌گذارد.

این فیلدها در config عرضه‌شده نیستند و به‌روزرسان هرگز آن‌ها را نمی‌نویسد. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) تعیین می‌کند که آیا اصلاً اعمال شوند:

- `never` (پیش‌فرض) - از نسخه خود رام استفاده می‌شود.
- `rom` - فقط آنچه از رام فراتر نمی‌رود اعمال می‌شود، که در عمل یعنی پایین آوردن SDK.
- `force` - دقیقاً آنچه config می‌گوید اعمال می‌شود. این همان چیزی است که softloop را
  ایجاد می‌کند؛ فقط در صورتی از آن استفاده کنید که می‌دانید framework هدف از آن پشتیبانی می‌کند.

نسخه واقعی از `/system/build.prop` خوانده می‌شود، هرگز از `getprop` (که دقیقاً همان چیزی
است که این ماژول آن را جعل می‌کند). `force` همچنین هنگام بازگردانی یک backup رد می‌شود، پس
یک backup قدیمی نمی‌تواند پشت سر شما دوباره آن را مسلح کند.

## DRM / Widevine

به صورت پیش‌فرض خاموش (`motor_drm`). وقتی روشن باشد، یک سطح Widevine انتخاب‌شده،
`DRM_SECURITY_LEVEL` (`L1` یا `L3`)، را به اپ‌هایی که آن را می‌خوانند گزارش می‌دهد.

به صورت پیش‌فرض spoof مربوط به DRM از `scope_mode` پیروی می‌کند. برای اعمال آن به مجموعه
خاصی از اپ‌ها در عوض - مستقل از scope اصلی - آن‌ها را در `drm_targets` فهرست کنید. سپس ماژول
در یک اپ فهرست‌شده **فقط** برای hook مربوط به DRM بارگذاری‌شده باقی می‌ماند، حتی وقتی آن اپ
بیرون از scope اصلی باشد؛ یک فهرست خالی یا غایب یعنی از scope پیروی کن. این به یک حالت scoped
نیاز دارد (نه `global`)، و در **ری‌استارت** بعدی اثر می‌کند.

## Analyze: config خود را بررسی کنید

**Analyze** در WebUI (یا `fingerprint-update.sh analyze`) config را به همان شکلی که هست
بازرسی می‌کند و به شما می‌گوید چه چیزی اشتباه است پیش از آنکه یک اپ بگوید:

- نسخه در برابر رام (آیا softloop می‌کند؟)،
- اینکه آیا فایل هنوز parse می‌شود (یک فایل خراب باعث می‌شود ماژول **هیچ چیزی** را spoof
  نکند، و فقط logcat این را می‌گوید)،
- اینکه آیا fingerprint با فیلدهای اطرافش همخوانی دارد،
- کلیدهایی که ماژول نمی‌خواند، تاریخ‌های مشکوک، و اینکه آیا property های زنده از پیش آنچه
  config می‌خواهد را حمل می‌کنند.

هر وقت config را با دست ویرایش کردید آن را اجرا کنید.

## WebUI

اختیاری، اما راه آسان برای هدایت همه چیز. پنج تب:

- **About** - اطلاعات ماژول و نسخه.
- **Device** - هر فیلد build، به ازای هر state تنظیم‌شده و بر اساس دسته گروه‌بندی‌شده.
- **Spoofing** - حالت scope و کلیدهای موتورها.
- **System** - گروه‌های resetprop.
- **Tools** - Analyze، Check Update، Update Now، Backup / Restore، به‌روزرسانی خودکار هنگام
  boot، و گزارش Diagnostics (یک دکمه برای خواندن و صادر کردن هر چیز مفید برای یک گزارش باگ).

هیچ درخواست شبکه‌ای نمی‌دهد؛ هر چیزی که نیاز دارد درون ماژول عرضه می‌شود.

## عیب‌یابی

- **یک اپ هنوز دستگاه واقعی را می‌بیند.** scope را بررسی کنید: در `playstore` فقط استک
  Play پوشش داده می‌شود. مطمئن شوید که config پارس می‌شود (Analyze را اجرا کنید). پس از
  تغییر موتورها، `drm_targets` یا پروفایل، **ری‌استارت** کنید - Zygisk هنگام شروع zygote
  scope را می‌خواند.
- **Play Integrity هنوز شکست می‌خورد.** مطمئن شوید که fingerprint تازه است (Check Update)
  و اینکه `SECURITY_PATCH` در `global_fields` هست تا به صورت سراسری در دستگاه همخوان بماند.
  Google Play services را kill کنید تا دوباره attest کند.
- **تلفن پس از فعال کردن version spoofing دچار softloop می‌شود.** این همان تله نسخه اندروید
  بالاست - `spoof_version` را به `never` برگردانید.
- **WebUI روی Magisk باز نمی‌شود.** از [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) استفاده کنید.

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگهداری می‌شود. اصلاحات و بهبودها خوش‌آمدند - [../CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
