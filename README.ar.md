## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD هو موديول مصمم لانتحال هوية الجهاز بشكل شامل.  
هذا يعني انه حتى تطبيقات النظام والجهاز بالكامل سيتم عمل hook لها.  
  
## كيفية الاستخدام؟
اذا كنت تستخدم هذا الموديول وتنتحل FingerPrint يعمل بشكل صحيح، فلا داعي لاستخدام PlayIntegrityFix او GooglePhotosUnlimited.  
### مثال على ملف اعدادات JSON  
`/data/adb/COPG-VD.json`
* جميع الحقول اختيارية. اذا لم يتم توفير حقل ما، فسيتم تخطيه.  
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
احرص على استخدام النصوص بين علامات اقتباس مزدوجة فقط.  
يتم تحديث الكتلة اعلاه و `module/COPG-VD.json.example` يوميا عبر workflow الموسوم [Update COPG-VD.json](.github/workflows/update-json.yml)، مباشرة من احدث صورة مصنع من Google.  
### الحفاظ على تحديث الـ fingerprint  
يقوم `fingerprint-update.sh` بسحب ذلك الملف وتحديث اعداداتك، من الـ WebUI (**Check Update** / **Update Now**) او من تلقاء نفسه **مرة واحدة في كل اقلاع** (**Auto-update JSON on boot**، مفعل افتراضيا).  
* يتم تحديث كل من `/data/adb/COPG-VD.json` و `/data/adb/modules/COPG-VD/COPG-VD.json` عند وجود كليهما، ويتم الاحتفاظ بالمحتوى السابق باسم `.bak`.  
* يعاد كتابة حقول الـ build فقط (fingerprint، ID، incremental، timestamp، security patch، SDK، UUID، host، user). ويتم الحفاظ على كل ما خصصته انت: المفاتيح الاضافية، و `BOOTLOADER`/`BOARD`/`HARDWARE`، والكائنات الاخرى، وترتيب المفاتيح والتنسيق.  
* لا يتراجع ابدا للوراء: اي build من upstream اقدم من المثبت يتم رفضه. هذا
  امر روتيني (قد يتخلف المستودع عن اعدادات حدثتها يدويا) وهو ايضا الحماية التي
  تهم اكثر على Android، حيث ان اداة التنزيل الوحيدة المتاحة هي busybox `wget`، والتي لا يمكنها
  التحقق من شهادات TLS - لنفس السبب يتم التحقق من كل قيمة قبل استخدامها.  
* اذا كان ملفك التعريفي ينتحل **جهازا اخر** (قيم `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` مختلفة)، فلا يتم تطبيق اي شيء - فينتحال fingerprint خاص بـ Pixel على ملف تعريفي اخر اسوا من fingerprint قديم.  
* عند الاقلاع يعمل في الخلفية ويستمر في اعادة المحاولة لمدة ~10 دقائق، لان الـ wifi عادة لا يكون متاحا بعد عند انتهاء الاقلاع. وهو لا يؤخر الاقلاع ابدا.  
* يعاد تطبيق `resetprop` مباشرة بعد التحديث، لكن `android.os.Build` يكتبه موديول zygisk عند بدء zygote: **اعد التشغيل** لكي تصل القيم الجديدة الى التطبيقات.  
* السجل في `/data/adb/COPG-VD.update.log`.  
### اصدار Android - ولماذا لا يتم انتحاله  
`ANDROID_VERSION` و `SDK_INT` و `SDK_FULL` و `CODENAME` تصف **الـ ROM الخاص بك**، وليس الجهاز الذي يتم انتحاله. اخبار التطبيقات بان الـ SDK احدث مما هو عليه الـ framework فعليا يجعلها تستدعي APIs غير موجودة: تطبيقات Google تنهار، والهاتف يعيد التشغيل، ثم يبدا من جديد. الاقلاع نفسه يكتمل، لذا فهو **softloop** ولا يظهر اي شيء في سجلات الاقلاع.  
* هي ليست في الاعدادات المرفقة ولا يكتبها المحدث ابدا.  
* **Spoof Android version** في الـ WebUI يقرر ما اذا كانت ستطبق من الاساس:  
  * **Never** (افتراضي) - يتم استخدام اصدار الـ ROM نفسه.  
  * **Up to this ROM** - فقط ما لا يتجاوزه، وهو ما يعني عمليا خفض الـ SDK.  
  * **Force** - تماما كما تقول الاعدادات. هذا ما يسبب الـ softloop.  
* يقرا الاصدار الحقيقي من `/system/build.prop`، وليس ابدا من `getprop` - فذلك بالذات هو ما يزوره هذا الموديول.  
### Analyze  
يقوم **Analyze** في الـ WebUI (او `fingerprint-update.sh analyze`) بتدقيق الاعدادات كما هي: الاصدار مقابل الـ ROM، وما اذا كان الملف لا يزال قابلا للتحليل اصلا (الملف المعطوب يجعل الموديول لا ينتحل **اي شيء**، ولا يخبرك بذلك سوى logcat)، وما اذا كان الـ fingerprint متوافقا مع الحقول المحيطة به، والمفاتيح التي لا يقرؤها الموديول، والتواريخ، وما اذا كانت الـ props تحمل بالفعل ما تطلبه الاعدادات.  
### الاعدادات داخل ملف الاعدادات  
يمكن ان يحمل `COPG-VD.json` كائن `COPG-VD-Settings` - `resetprop`، `autoupdate`، `spoof_manufacturer`، `spoof_version` - بحيث تنتقل خياراتك مع النسخة الاحتياطية ويمكن تحريرها يدويا. يكتب الـ WebUI كلا من ذلك وملفات الـ flag التي تقراها سكربتات الاقلاع. يتم رفض `"spoof_version": "force"` من الملف وتخفيضه: استعادة نسخة احتياطية قديمة يجب الا تعيد تفعيله من وراء ظهرك.  
### WebUI  
استخدام الـ WebUI غير ضروري اذا كنت تحرر ملف اعدادات JSON مباشرة.  
اذا كنت مستخدم Magisk، فاستخدم KsuWebUI من KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
عطل استخدام resetprop وفعل انتحال معلومات Build فقط.  
#### Use ro.product.manufacturer:  
عطله اذا كنت تهتم بكشف "Found device spoofing" في تطبيق كاشف الروت Disclosure.  

## جهات الاتصال

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
