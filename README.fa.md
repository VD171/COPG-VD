## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD یک جعل‌کننده دستگاه است: fingerprint و build دستگاه را بازنویسی می‌کند تا اپ‌ها به‌جای دستگاه واقعی، دستگاهی را که شما انتخاب می‌کنید ببینند.  
روی Zygisk (KernelSU، APatch یا Magisk) اجرا می‌شود و به‌طور پیش‌فرض دامنه جعل را به استک Google Play محدود می‌کند - پس جایگزینی سبک‌تر و مقاوم‌تر برای PlayIntegrityFix است.  

## اسکرین‌شات‌ها

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## چگونه استفاده کنیم؟
ماژول را نصب کنید، ریبوت کنید، و پروفایل ارائه‌شده (یک Pixel) برای اپ‌های هدف جعل می‌شود. با یک fingerprint سالم نیازی به PlayIntegrityFix یا GooglePhotosUnlimited ندارید.  
همه چیز در `/data/adb/COPG-VD.json` یا از طریق WebUI پیکربندی می‌شود. همه فیلدها اختیاری هستند - فیلدی که ارائه نشود نادیده گرفته می‌شود.  

### Scope - چه کسی جعل را می‌بیند
`scope_mode` تصمیم می‌گیرد کدام پروسه‌ها هویت جعلی را دریافت کنند. در یک حالت با دامنه محدود، هویت توسط Zygisk به‌صورت پر-پروسه تحویل داده می‌شود و از طریق propertyهای سراسری به بقیه سیستم نشت نمی‌کند.  
* **Google Play** (`playstore`، پیش‌فرض) - فقط استک Play (Google Play services، پروسه unstable آن و Play Store).  
* **Global** - کل دستگاه؛ هر پروسه آن را می‌بیند.  
* **Whitelist** - فقط اپ‌های موجود در `scope_whitelist`.  
* **Blacklist** - هر اپ به‌جز آن‌هایی که در `scope_blacklist` هستند.  

### Engines - جعل چگونه تحویل داده می‌شود
هر کدام مستقل است و می‌توان آن را خاموش کرد:  
* **Build fields (JNI)** - `android.os.Build.*` را در پروسه‌های هدف بازنویسی می‌کند.  
* **Property hook** - propertyهای سیستمی جعلی را به پروسه‌های هدف ارائه می‌دهد (یک remap پر-پروسه از ناحیه property به‌شیوه clean-room، بدون هیچ hook تابعی).  
* **resetprop** - propertyهای سیستم را بازنویسی می‌کند، مدیریت‌شده بر اساس گروه: identity، version، boot state، SELinux، adb/usb، anti-emulator و یک پاس پاکسازی. در یک حالت با دامنه محدود، گروه‌های identity و version خارج از resetprop سراسری دستگاه می‌مانند (Zygisk آن‌ها را پر-پروسه تحویل می‌دهد)؛ گروه‌های boot/lock/SELinux سراسری می‌مانند.  
* **DRM / Widevine** (به‌طور پیش‌فرض خاموش) - یک سطح امنیتی Widevine انتخاب‌شده، L1 یا L3، را به اپ‌هایی که آن را می‌خوانند گزارش می‌دهد.  

### Fields - تنظیم، خالی، حذف یا رد کردن
درون آبجکت `COPG-VD` هر فیلد Build چهار حالت دارد:  
* **Set** - `"KEY": "value"` مقدار را می‌نویسد.  
* **Empty** - `"KEY": ""` یک مقدار خالی می‌نویسد.  
* **Delete** - برای حذف آن، کلید را در یک `"COPG-VD-Delete": [ ... ]` در سطح بالا فهرست کنید (یک فیلد Build به null تبدیل می‌شود، یک property با `resetprop --delete` حذف می‌شود).  
* **Skip** - کلید را کاملا کنار بگذارید؛ مقدار خودِ رام حفظ می‌شود.  

یک فهرست `"global_fields": [ ... ]` فیلدهای Build نام‌برده را حتی در یک حالت با دامنه محدود به‌صورت سراسری روی کل دستگاه اعمال می‌کند، تا یک مقدار همه‌جا یکدست بماند - فقط برای فیلدهای امن از نظر انسجام (مثلا security patch)، هرگز identity و هرگز گروه نسخه Android.  

### نمونه فایل پیکربندی JSON
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
مطمئن شوید که رشته‌ها را فقط داخل گیومه دوتایی قرار می‌دهید.  
بلوک بالا و `module/COPG-VD.json.example` روزانه توسط workflow با نام [Update COPG-VD.json](.github/workflows/update-json.yml)، مستقیما از جدیدترین ایمیج کارخانه‌ای Google، تازه‌سازی می‌شوند.  

### به‌روز نگه داشتن fingerprint
`fingerprint-update.sh` آن فایل را دریافت کرده و پیکربندی شما را به‌روز می‌کند، از طریق WebUI (**Check Update** / **Update Now**) یا به‌طور خودکار **یک بار در هر بوت** (**Auto-update JSON on boot**، به‌طور پیش‌فرض روشن).  
* وقتی هر دو فایل `/data/adb/COPG-VD.json` و `/data/adb/modules/COPG-VD/COPG-VD.json` وجود داشته باشند، هر دو به‌روز می‌شوند و محتوای قبلی با پسوند `.bak` نگه داشته می‌شود.  
* فقط فیلدهای build بازنویسی می‌شوند (fingerprint، ID، incremental، timestamp، security patch، SDK، UUID، host، user). هر چیز دیگری که سفارشی کرده‌اید حفظ می‌شود: کلیدهای اضافی، `scope_mode`، `BOOTLOADER`/`BOARD`/`HARDWARE`، آبجکت‌های دیگر، ترتیب کلیدها و قالب‌بندی.  
* هرگز به عقب برنمی‌گردد: یک build از upstream که قدیمی‌تر از نسخه نصب‌شده باشد رد می‌شود. این موضوع عادی است (مخزن می‌تواند از پیکربندی‌ای که دستی به‌روز کرده‌اید عقب بماند) و همچنین همان محافظتی است که روی Android بیش از همه اهمیت دارد، جایی که تنها دانلودر موجود busybox `wget` است، که نمی‌تواند گواهی‌های TLS را اعتبارسنجی کند - به همین دلیل هر مقدار پیش از استفاده اعتبارسنجی می‌شود.  
* اگر پروفایل شما **دستگاه دیگری** را جعل کند (مقادیر `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` متفاوت)، هیچ چیزی اعمال نمی‌شود - یک fingerprint مربوط به Pixel روی پروفایلی دیگر بدتر از یک fingerprint قدیمی است.  
* هنگام بوت در پس‌زمینه اجرا می‌شود و حدود ۱۰ دقیقه مدام تلاش را تکرار می‌کند، چون معمولا هنگام پایان بوت هنوز wifi بالا نیامده است. هرگز بوت را به تاخیر نمی‌اندازد.  
* `resetprop` بلافاصله پس از یک به‌روزرسانی دوباره اعمال می‌شود، اما `android.os.Build` را ماژول zygisk هنگام شروع zygote می‌نویسد: برای رسیدن مقادیر جدید به اپ‌ها **ریبوت** کنید.  
* لاگ در `/data/adb/COPG-VD.update.log`.  

### نسخه Android - و چرا جعل نمی‌شود
`ANDROID_VERSION`، `SDK_INT`، `SDK_FULL` و `CODENAME` توصیف‌کننده **رام شما** هستند، نه دستگاهی که جعل می‌شود. گفتن به اپ‌ها که SDK جدیدتر از آن چیزی است که framework واقعا هست، باعث می‌شود APIهایی را فراخوانی کنند که وجود ندارند: اپ‌های Google کرش می‌کنند، گوشی ریبوت می‌شود و از نو شروع می‌شود. خود بوت کامل می‌شود، پس این یک **softloop** است و چیزی در لاگ‌های بوت نمایان نمی‌شود.  
* آن‌ها در پیکربندی ارائه‌شده نیستند و به‌روزرسان هرگز آن‌ها را نمی‌نویسد.  
* **Spoof Android version** در WebUI تصمیم می‌گیرد که آیا اصلا اعمال شوند یا نه:  
  * **Never** (پیش‌فرض) - از نسخه خودِ رام استفاده می‌شود.  
  * **Up to this ROM** - فقط آنچه از آن فراتر نمی‌رود، که در عمل یعنی پایین آوردن SDK.  
  * **Force** - دقیقا همان چیزی که پیکربندی می‌گوید. همین است که باعث softloop می‌شود.  
* نسخه واقعی از `/system/build.prop` خوانده می‌شود، هرگز از `getprop` - چون این دقیقا همان چیزی است که این ماژول جعل می‌کند.  

### Analyze
**Analyze** در WebUI (یا `fingerprint-update.sh analyze`) پیکربندی را در وضعیت فعلی‌اش بررسی می‌کند: نسخه در برابر رام، اینکه آیا فایل هنوز اصلا قابل parse شدن است (یک فایل خراب باعث می‌شود ماژول **هیچ چیزی** را جعل نکند، و فقط logcat این را می‌گوید)، اینکه آیا fingerprint با فیلدهای اطرافش هماهنگ است، کلیدهایی که ماژول نمی‌خواند، تاریخ‌ها، و اینکه آیا propها از پیش همان چیزی را دارند که پیکربندی می‌خواهد.  

### WebUI
WebUI اختیاری است - همه چیز را می‌توان مستقیما در پیکربندی JSON ویرایش کرد - اما راه آسان راندن ماژول است. پنج تب دارد: **About**، **Device** (هر فیلد، بر اساس حالت تنظیم‌شده، گروه‌بندی‌شده بر اساس دسته)، **Spoofing** (scope و engines)، **System** (گروه‌های resetprop) و **Tools** (Analyze، Check Update، Update Now، Backup/Restore و به‌روزرسانی خودکار هنگام بوت). هیچ درخواست شبکه‌ای نمی‌فرستد؛ هر چه نیاز دارد درون خود ماژول ارائه می‌شود.  
اگر کاربر Magisk هستید، از KsuWebUI ساخته KOW استفاده کنید (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### تنظیمات درون پیکربندی
`COPG-VD.json` تنظیماتش را در کنار پروفایل نگه می‌دارد، تا انتخاب‌های شما همراه با یک پشتیبان جابجا شوند و بتوان آن‌ها را دستی ویرایش کرد: `scope_mode`، کلیدهای engineها، گروه‌های resetprop، `global_fields`، و یک آبجکت `COPG-VD-Settings` (`resetprop`، `autoupdate`، `spoof_manufacturer`، `spoof_version`). WebUI هم پیکربندی و هم فایل‌های flag را که اسکریپت‌های بوت می‌خوانند می‌نویسد. `"spoof_version": "force"` از درون فایل رد شده و تنزل داده می‌شود: بازگرداندن یک پشتیبان قدیمی نباید آن را از پشت سر شما دوباره مسلح کند.  

## تماس

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
