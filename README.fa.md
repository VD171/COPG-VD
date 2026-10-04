## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD یک ماژول است که برای جعل سراسری دستگاه طراحی شده است.  
این یعنی حتی اپ‌های سیستمی و کل دستگاه هم hook می‌شوند.  
  
## چگونه استفاده کنیم؟
اگر از این ماژول استفاده می‌کنید و یک FingerPrint سالم را جعل می‌کنید، استفاده از PlayIntegrityFix یا GooglePhotosUnlimited لازم نیست.  
### نمونه فایل پیکربندی JSON  
`/data/adb/COPG-VD.json`
* همه فیلدها اختیاری هستند. اگر فیلدی ارائه نشود، نادیده گرفته می‌شود.  
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
مطمئن شوید که رشته‌ها را فقط داخل گیومه دوتایی قرار می‌دهید.  
بلوک بالا و `module/COPG-VD.json.example` روزانه توسط workflow با نام [Update COPG-VD.json](.github/workflows/update-json.yml)، مستقیما از جدیدترین ایمیج کارخانه‌ای Google، تازه‌سازی می‌شوند.  
### به‌روز نگه داشتن fingerprint  
`fingerprint-update.sh` آن فایل را دریافت کرده و پیکربندی شما را به‌روز می‌کند، از طریق WebUI (**Check Update** / **Update Now**) یا به‌طور خودکار **یک بار در هر بوت** (**Auto-update JSON on boot**، به‌طور پیش‌فرض روشن).  
* وقتی هر دو فایل `/data/adb/COPG-VD.json` و `/data/adb/modules/COPG-VD/COPG-VD.json` وجود داشته باشند، هر دو به‌روز می‌شوند و محتوای قبلی با پسوند `.bak` نگه داشته می‌شود.  
* فقط فیلدهای build بازنویسی می‌شوند (fingerprint، ID، incremental، timestamp، security patch، SDK، UUID، host، user). هر چیز دیگری که سفارشی کرده‌اید حفظ می‌شود: کلیدهای اضافی، `BOOTLOADER`/`BOARD`/`HARDWARE`، آبجکت‌های دیگر، ترتیب کلیدها و قالب‌بندی.  
* هرگز به عقب برنمی‌گردد: یک build از upstream که قدیمی‌تر از نسخه نصب‌شده باشد رد می‌شود. این موضوع
  عادی است (مخزن می‌تواند از پیکربندی‌ای که دستی به‌روز کرده‌اید عقب بماند) و همچنین همان محافظتی است که
  روی Android بیش از همه اهمیت دارد، جایی که تنها دانلودر موجود busybox `wget` است، که نمی‌تواند
  گواهی‌های TLS را اعتبارسنجی کند - به همین دلیل هر مقدار پیش از استفاده اعتبارسنجی می‌شود.  
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
### تنظیمات درون پیکربندی  
`COPG-VD.json` می‌تواند یک آبجکت `COPG-VD-Settings` داشته باشد - `resetprop`، `autoupdate`، `spoof_manufacturer`، `spoof_version` - تا انتخاب‌های شما همراه با یک پشتیبان جابجا شوند و بتوان آن‌ها را دستی ویرایش کرد. WebUI هم آن و هم فایل‌های flag را که اسکریپت‌های بوت می‌خوانند می‌نویسد. `"spoof_version": "force"` از درون فایل رد شده و تنزل داده می‌شود: بازگرداندن یک پشتیبان قدیمی نباید آن را از پشت سر شما دوباره مسلح کند.  
### WebUI  
اگر فایل پیکربندی JSON را مستقیما ویرایش می‌کنید، استفاده از WebUI لازم نیست.  
اگر کاربر Magisk هستید، از KsuWebUI ساخته KOW استفاده کنید (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
استفاده از resetprop را غیرفعال کنید و فقط جعل Build info را فعال کنید.  
#### Use ro.product.manufacturer:  
اگر به تشخیص "Found device spoofing" در اپ تشخیص روت Disclosure اهمیت می‌دهید، آن را غیرفعال کنید.  

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
