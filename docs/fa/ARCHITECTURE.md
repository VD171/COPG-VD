> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · فارسی · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# معماری

COPG-VD یک ماژول Zygisk است: یک کتابخانه native کوچک (`libspoof.so`) که loader مربوط به
Zygisk آن را به درون zygote و، از آنجا، به درون پردازه‌های اپ تزریق می‌کند. تنها کاری که
می‌کند ارائه یک هویت دستگاه انتخاب‌شده به پردازه‌هایی است که هدف می‌گیرید. هیچ اپی وجود
ندارد و، جدا از دریافت اختیاری پروفایل، هیچ شبکه‌ای نیست.

## چرخه حیات

1. **شروع Zygote.** وقتی zygote boot می‌شود، loader تابع `onLoad` ماژول را فراخوانی می‌کند.
   یک بار `/data/adb/COPG-VD.json` را می‌خواند: پیکربندی scope و پروفایل.
2. **Fork اپ.** برای هر اپی که zygote آن را fork می‌کند، ماژول در `preAppSpecialize`
   تصمیم می‌گیرد که آیا این پردازه در scope است:
   - **در scope اصلی** (`playstore` / `global` / `whitelist` / `blacklist`)، یا
   - **در scope مربوط به DRM** (فهرست‌شده در `drm_targets`).
   اگر هیچ‌کدام نباشد، ماژول از آن پردازه **جدا می‌شود** (`dlclose`) و هیچ ردی در آن باقی
   نمی‌گذارد.
3. **Specialize.** برای پردازه‌ای که باقی می‌ماند، موتورها در `postAppSpecialize` اعمال
   می‌شوند، در حالی که پردازه هنوز privileged است.

چون fork ها کپی copy-on-write حافظه zygote را به ارث می‌برند، هر اپ از config خوانده‌شده
هنگام boot شروع می‌شود. ماژول فایل را به ازای هر پردازه هدف فقط وقتی دوباره می‌خواند که
واقعاً تغییر کرده باشد، پس یک اپ تازه راه‌اندازی‌شده یا دوباره بازشده یک پروفایل ویرایش‌شده
را برمی‌دارد - اما خود تصمیم scope هنگام شروع zygote گرفته می‌شود، پس **تغییر scope، موتورها
یا `drm_targets` به یک ری‌استارت نیاز دارد**.

## موتورها

هر کدام مستقل و قابل تعویض است.

- **فیلدهای Build (`motor_jni`).** `android.os.Build.*` (و `Build.VERSION.*`) را در پردازه
  هدف از طریق JNI بازنویسی می‌کند، پس کد Java مقادیر جعلی را می‌خواند.
- **Property hook (`motor_prop_hook`).** property های سیستمی جعلی را به پردازه از طریق یک
  remap تمیز (clean-room) و per-process از ناحیه property (`prop_virtualizer`) ارائه می‌دهد.
  این یک remap حافظه است، نه hook تابع، پس هیچ ردپای تابع hook‌شده‌ای وجود ندارد.
- **resetprop (سراسری در دستگاه).** property های سیستم را گروه به گروه می‌نویسد - identity،
  version، boot state، SELinux، adb/usb، anti-emulator، به علاوه یک پاس پاک‌سازی. اسکریپت‌های
  boot آن را اجرا می‌کنند. در یک حالت scoped، گروه‌های identity و version کنار گذاشته می‌شوند
  (Zygisk آن‌ها را per-process تحویل می‌دهد)؛ گروه‌های boot، lock و SELinux سراسری می‌مانند
  تا دستگاه همخوان باشد.
- **DRM / Widevine (`motor_drm`).** متدهای `MediaDrm` را که سطح امنیتی Widevine را گزارش
  می‌دهند (`getSecurityLevel`، `getPropertyString`) hook می‌کند و سطح پیکربندی‌شده را
  برمی‌گرداند. hook ها null-check شده‌اند، پس یک پروفایل بدشکل به جای کرش کردن اپ به آرامی
  تنزل می‌یابد. `drm_targets` به این موتور اجازه می‌دهد روی فهرست اپ خودش اجرا شود، جدا از
  scope اصلی.

## خواندن config

پردازه تزریق‌شده در دامنه SELinux مربوط به zygote اجرا می‌شود، که به صورت پیش‌فرض نمی‌تواند
به `/data/adb` دست یابد. ماژول `sepolicy.rule` خودش را عرضه می‌کند تا آن را مجاز کند، و، به
عنوان یک fallback، می‌تواند config را از طریق دایرکتوری باز ماژول خود (`getModuleDir`)
بخواند، پس حتی اگر یک build از Zygisk اعطای این مسیر را متوقف کند همچنان کار می‌کند. فایل با
یک parser کوچک JSON تعبیه‌شده (`jsmn`) parse می‌شود؛ فایلی که parse نمی‌شود یعنی ماژول هیچ
چیزی را spoof نمی‌کند.

## تازه نگه داشتن پروفایل

`fingerprint-update.sh` فیلدهای build را از جدیدترین تصویر کارخانه Google تازه می‌کند، از
WebUI یا یک بار در هر boot. از downloader همراه خود ماژول استفاده می‌کند (نه یک `curl`/`wget`
از `PATH`)، هر مقدار را پیش از استفاده اعتبارسنجی می‌کند، هرگز به عقب نمی‌رود، و یک پروفایلی
که دستگاه متفاوتی را spoof می‌کند رد می‌کند. `android.os.Build` هنگام شروع zygote نوشته
می‌شود، پس مقادیر جدید در ری‌استارت بعدی به اپ‌ها می‌رسند. برای سمت کاربر [USER-GUIDE.md](USER-GUIDE.md)
و برای فیلدها [CONFIGURATION.md](CONFIGURATION.md) را ببینید.

## چرا نسخه اندروید به صورت پیش‌فرض spoof نمی‌شود

بالا بردن `SDK_INT` / `ANDROID_VERSION` فراتر از آنچه framework رام واقعاً هست باعث می‌شود
اپ‌ها API هایی را فراخوانی کنند که وجود ندارند، که اپ‌های Google را کرش می‌کند و تلفن را به
یک softloop ری‌استارت می‌کند. بنابراین گروه version به صورت پیش‌فرض خاموش است و پشت
`spoof_version` محصور شده. ماژول نسخه واقعی را از `/system/build.prop` می‌خواند، هرگز از
`getprop`، چون `getprop` دقیقاً همان چیزی است که آن را جعل می‌کند. تله را در
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap) ببینید.

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگهداری می‌شود. اصلاحات و بهبودها خوش‌آمدند - [../CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
