## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD هو spoofer للجهاز: يعيد كتابة بصمة الجهاز (fingerprint) والـ build بحيث ترى التطبيقات الجهاز الذي تختاره بدلاً من الجهاز الحقيقي.  
يعمل على Zygisk (KernelSU أو APatch أو Magisk) وبشكل افتراضي يقصر الانتحال على حزمة Google Play - لذا فهو بديل أخف وأكثر متانة لـ PlayIntegrityFix.  

## لقطات الشاشة

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## كيفية الاستخدام؟
ثبّت الموديول، أعد التشغيل، ويتم انتحال الملف الشخصي المرفق (جهاز Pixel) للتطبيقات المستهدفة. مع بصمة تعمل بشكل صحيح لا تحتاج إلى PlayIntegrityFix أو GooglePhotosUnlimited.  
يتم ضبط كل شيء في `/data/adb/COPG-VD.json`، أو من WebUI. جميع الحقول اختيارية - أي حقل لا يتم توفيره يتم تخطيه.  

### Scope - من يرى الانتحال
`scope_mode` يحدد العمليات التي تحصل على الهوية المنتحلة. في الوضع المحدود، يسلّم Zygisk الهوية لكل عملية على حدة ولا تتسرب إلى بقية النظام عبر الـ properties العامة.  
* **Google Play** (`playstore`، الافتراضي) - حزمة Play فقط (Google Play services، وعمليتها unstable، ومتجر Play).  
* **Global** - الجهاز بالكامل؛ كل عملية تراها.  
* **Whitelist** - فقط التطبيقات الموجودة في `scope_whitelist`.  
* **Blacklist** - كل التطبيقات ما عدا الموجودة في `scope_blacklist`.  

### Engines - كيف يتم تسليم الانتحال
كل واحد مستقل ويمكن إيقافه:  
* **Build fields (JNI)** - يعيد كتابة `android.os.Build.*` في العمليات المستهدفة.  
* **Property hook** - يعرض properties النظام المنتحلة للعمليات المستهدفة (إعادة تعيين نظيفة لمنطقة الـ properties لكل عملية على حدة، دون hook للدالة).  
* **resetprop** - يعيد كتابة properties النظام، مُدارة حسب المجموعة: الهوية، والإصدار، وحالة الإقلاع، وSELinux، وadb/usb، ومضاد المحاكي، ومرحلة تنظيف. في الوضع المحدود تبقى مجموعتا الهوية والإصدار خارج resetprop على مستوى الجهاز (يسلّمها Zygisk لكل عملية)؛ وتبقى مجموعات boot/lock/SELinux عامة.  
* **DRM / Widevine** (معطّل افتراضياً) - يبلّغ عن مستوى أمان Widevine المختار، L1 أو L3، للتطبيقات التي تقرأه.  

### Fields - التعيين، أو التفريغ، أو الحذف، أو التخطي
داخل كائن `COPG-VD` لكل حقل Build أربع حالات:  
* **Set** - `"KEY": "value"` يكتب القيمة.  
* **Empty** - `"KEY": ""` يكتب قيمة فارغة.  
* **Delete** - أدرج المفتاح في `"COPG-VD-Delete": [ ... ]` على المستوى الأعلى لإزالته (يصبح حقل Build قيمته null، وتُزال الـ property عبر `resetprop --delete`).  
* **Skip** - اترك المفتاح خارجاً تماماً؛ يتم الإبقاء على قيمة الـ ROM نفسها.  

تطبّق قائمة `"global_fields": [ ... ]` حقول Build المذكورة على مستوى الجهاز حتى في الوضع المحدود، للحفاظ على قيمة متسقة في كل مكان - فقط للحقول الآمنة من ناحية الاتساق (الـ security patch مثلاً)، وليس الهوية أبداً وليس مجموعة إصدار Android أبداً.  

### مثال على ملف إعدادات JSON
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
تأكد من استخدام الـ strings بين علامات اقتباس مزدوجة فقط.  
يتم تحديث الكتلة أعلاه و`module/COPG-VD.json.example` يومياً عبر الـ workflow [Update COPG-VD.json](.github/workflows/update-json.yml)، مباشرة من أحدث صورة مصنع (factory image) من Google.  

### إبقاء البصمة محدّثة
`fingerprint-update.sh` يسحب ذلك الملف ويحدّث إعداداتك، من WebUI (**Check Update** / **Update Now**) أو من تلقاء نفسه **مرة واحدة لكل إقلاع** (**Auto-update JSON on boot**، مفعّل افتراضياً).  
* يتم تحديث كل من `/data/adb/COPG-VD.json` و`/data/adb/modules/COPG-VD/COPG-VD.json` عند وجود كليهما، ويُحتفظ بالمحتوى السابق كـ `.bak`.  
* تُعاد كتابة حقول build فقط (fingerprint، ID، incremental، timestamp، security patch، SDK، UUID، host، user). كل ما خصّصته غير ذلك يُحتفظ به: المفاتيح الإضافية، و`scope_mode`، و`BOOTLOADER`/`BOARD`/`HARDWARE`، والكائنات الأخرى، وترتيب المفاتيح والتنسيق.  
* لا يرجع إلى الوراء أبداً: يُرفض أي build upstream أقدم من المثبّت. هذا
  أمر روتيني (قد يتأخر الـ repo خلف إعداد حدّثته يدوياً) وهو أيضاً الحماية
  الأهم على Android، حيث أداة التنزيل الوحيدة المتاحة هي busybox `wget`، التي لا تستطيع
  التحقق من شهادات TLS - للسبب نفسه يتم التحقق من كل قيمة قبل استخدامها.  
* إذا كان ملفك الشخصي ينتحل **جهازاً آخر** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` مختلفة)، فلا يُطبَّق شيء - بصمة Pixel على ملف شخصي آخر أسوأ من بصمة قديمة.  
* عند الإقلاع يعمل في الخلفية ويستمر في إعادة المحاولة لمدة ~10 دقائق، لأن الواي فاي عادة لا يكون جاهزاً بعد عند انتهاء الإقلاع. وهو لا يؤخر الإقلاع أبداً.  
* يُعاد تطبيق `resetprop` مباشرة بعد التحديث، لكن `android.os.Build` يكتبه موديول zygisk عند بدء zygote: **أعد التشغيل** لكي تصل القيم الجديدة إلى التطبيقات.  
* السجل في `/data/adb/COPG-VD.update.log`.  

### إصدار Android - ولماذا لا يتم انتحاله
`ANDROID_VERSION` و`SDK_INT` و`SDK_FULL` و`CODENAME` تصف **الـ ROM الخاصة بك**، لا الجهاز الذي يُنتحل. إخبار التطبيقات بأن الـ SDK أحدث مما هو عليه الـ framework فعلاً يجعلها تستدعي APIs غير موجودة: تنهار تطبيقات Google، ويعيد الهاتف التشغيل، ثم يبدأ من جديد. الإقلاع نفسه يكتمل، لذا فهي **softloop** ولا يظهر أي شيء في سجلات الإقلاع.  
* ليست موجودة في الإعداد المرفق والمحدّث لا يكتبها أبداً.  
* **Spoof Android version** في WebUI يقرر ما إذا كانت ستُطبَّق أصلاً:  
  * **Never** (الافتراضي) - يُستخدم إصدار الـ ROM نفسه.  
  * **Up to this ROM** - فقط ما لا يتجاوزه، وهو ما يعني عملياً خفض الـ SDK.  
  * **Force** - بالضبط ما تقوله الإعدادات. هذا هو ما يسبب الـ softloop.  
* يُقرأ الإصدار الحقيقي من `/system/build.prop`، وليس أبداً من `getprop` - فهو بالضبط ما يزوّره هذا الموديول.  

### Analyze
**Analyze** في WebUI (أو `fingerprint-update.sh analyze`) يدقّق الإعداد كما هو: الإصدار مقابل الـ ROM، وما إذا كان الملف لا يزال قابلاً للتحليل أصلاً (الملف التالف يجعل الموديول ينتحل **لا شيء**، ولا يخبر بذلك سوى logcat)، وما إذا كانت البصمة متوافقة مع الحقول المحيطة بها، والمفاتيح التي لا يقرؤها الموديول، والتواريخ، وما إذا كانت الـ props تحمل بالفعل ما يطلبه الإعداد.  

### WebUI
WebUI اختياري - يمكن تعديل كل شيء في إعداد JSON مباشرة - لكنه الطريقة السهلة لإدارة الموديول. له خمس علامات تبويب: **About**، و**Device** (كل حقل، مضبوط حسب الحالة، مجمّع حسب الفئة)، و**Spoofing** (الـ scope والـ engines)، و**System** (مجموعات resetprop)، و**Tools** (Analyze، وCheck Update، وUpdate Now، وBackup/Restore، والتحديث التلقائي عند الإقلاع). لا يرسل أي طلب شبكي؛ كل ما يحتاجه مُضمَّن داخل الموديول.  
إذا كنت مستخدم Magisk، فاستخدم KsuWebUI من KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### الإعدادات في ملف الإعداد
يحمل `COPG-VD.json` إعداداته بجوار الملف الشخصي، بحيث تسافر اختياراتك مع النسخة الاحتياطية ويمكن تعديلها يدوياً: `scope_mode`، ومفاتيح الـ engines، ومجموعات resetprop، و`global_fields`، وكائن `COPG-VD-Settings` (`resetprop`، و`autoupdate`، و`spoof_manufacturer`، و`spoof_version`). يكتب WebUI كلاً من الإعداد وملفات الـ flag التي تقرؤها سكربتات الإقلاع. `"spoof_version": "force"` يُرفض من الملف ويُخفَّض: استعادة نسخة احتياطية قديمة يجب ألا تعيد تفعيله من وراء ظهرك.  

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
