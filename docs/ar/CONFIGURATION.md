> **Languages:** [English](../CONFIGURATION.md) · العربية · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# مرجع الإعداد

تُدار الوحدة بأكملها بملف واحد: `/data/adb/COPG-VD/COPG-VD.json`. تكتبه الـ WebUI نيابةً
عنك، لكن يمكنك تحريره يدوياً. يوجد مثال مرفق في `module/COPG-VD.json.example`.
هذا هو المصدر الوحيد للحقيقة؛ النسخة الموجودة في دليل الوحدة ليست سوى قيمة افتراضية للقراءة فقط.
أي إعداد متبقٍّ من إصدار أقدم في `/data/adb/COPG-VD.json` يُنقل إلى هذا الدليل تلقائياً.
كما يوجد هنا سجل الوحدة وحالتها (`update.log`، `update.state`).

القواعد:

- **السلاسل النصية تستخدم علامات اقتباس مزدوجة فقط**، كما في JSON.
- **كل حقل اختياري.** الحقل الذي لا يُقدَّم يُتخطّى ويُحتفظ بقيمة الـ ROM الخاصة به.
- شغّل **Analyze** بعد التحرير يدوياً: الملف الذي لا يُحلَّل يجعل الوحدة تنتحل
  **لا شيء**، ووحده logcat يقول ذلك.

## المفاتيح من المستوى الأعلى

| المفتاح | النوع | المعنى |
|---|---|---|
| `scope_mode` | string | `playstore` (الافتراضي)، `global`، `whitelist` أو `blacklist`. راجع [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | الحزم التي تحصل على الانتحال عندما يكون `scope_mode` هو `whitelist`. |
| `scope_blacklist` | array | الحزم المستثناة عندما يكون `scope_mode` هو `blacklist`. |
| `COPG-VD` | object | ملف التعريف: حقول Build التي ستُقدَّم (انظر أدناه). |
| `COPG-VD-Delete` | array | أسماء الحقول التي ستُزال بدلاً من ضبطها (يصبح حقل Build قيمته null؛ وتُزال الخاصية بـ `resetprop --delete`). |
| `COPG-VD-Settings` | object | إعدادات الوحدة التي تنتقل مع ملف التعريف (انظر أدناه). |
| `motor_jni` | bool | محرك حقول Build (يعيد كتابة `android.os.Build.*`). الافتراضي `true`. |
| `motor_prop_hook` | bool | محرك الخصائص لكل عملية (إعادة تخطيط نظيفة clean-room للخصائص). الافتراضي `true`. |
| `motor_drm` | bool | محرك DRM / Widevine. الافتراضي `false`. |
| `drm_targets` | array | التطبيقات التي تحصل على انتحال DRM بغضّ النظر عن `scope_mode`. فارغ = اتّباع النطاق. |
| `global_fields` | array | حقول Build تُطبَّق على مستوى الجهاز بأكمله حتى في وضع ذي نطاق، للحقول الآمنة من ناحية الاتساق فقط. |
| `process_overrides` | object | تجاوزات الحقول لكل عملية: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | تفاصيل إضافية في logcat لأغراض التصحيح. الافتراضي `false`. |

## كائن ملف التعريف `COPG-VD`

كل مدخل هو حقل جهاز يُقدَّم للعمليات المستهدفة. الحقول الشائعة:

| المجموعة | الحقول |
|---|---|
| الهوية | `BRAND`، `DEVICE`، `MANUFACTURER`، `MODEL`، `PRODUCT`، `FINGERPRINT`، `BOARD`، `HARDWARE` |
| معرّف Build | `DISPLAY`، `ID`، `INCREMENTAL`، `TIMESTAMP`، `TIME`، `HOST`، `USER`، `TYPE`، `TAGS`، `BOOTLOADER` |
| الإثبات (Attestation) | `SECURITY_PATCH`، `FIRST_API_LEVEL`، `DEVICE_INITIAL_SDK_INT`، `UUID`، `SDK_FINGERPRINT` |
| الإصدار (خاص) | `ANDROID_VERSION`، `RELEASE`، `SDK_INT`، `SDK`، `SDK_FULL`، `CODENAME`، `PREVIEW_SDK` |

تتيح متغيّرات `*_FOR_ATTESTATION`‏ (`BRAND_FOR_ATTESTATION`، `DEVICE_FOR_ATTESTATION`،
`MANUFACTURER_FOR_ATTESTATION`، `MODEL_FOR_ATTESTATION`، `PRODUCT_FOR_ATTESTATION`) لمسار
الإثبات أن يبلّغ عن قيمة مختلفة عن القيمة العادية، بحيث يبقى الـ keystore
متسقاً.

> **مجموعة الإصدار خاصة.** تصف `ANDROID_VERSION` و`SDK_INT` و`SDK_FULL` و`CODENAME`
> نظام الـ ROM لديك، لا الجهاز المنتحَل. رفعها يُدخل الهاتف في softloop. وهي ليست
> في ملف التعريف المرفق ولا تُطبَّق إلا عندما يسمح بها `COPG-VD-Settings.spoof_version` -
> راجع [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### حالات الحقل

| الحالة | الكيفية | النتيجة |
|---|---|---|
| Set | `"KEY": "value"` | يكتب القيمة. |
| Empty | `"KEY": ""` | يكتب قيمة فارغة. |
| Delete | الاسم في `"COPG-VD-Delete": [ ... ]` | يزيل الحقل. |
| Skip | اترك المفتاح | يُبقي قيمة الـ ROM الخاصة به. |

### DRM

`DRM_SECURITY_LEVEL`‏ (`L1` أو `L3`) هو مستوى Widevine المبلَّغ عنه عندما يكون `motor_drm` مفعّلاً.

## `COPG-VD-Settings`

إعدادات تنتقل مع ملف التعريف، بحيث تحمل النسخة الاحتياطية خياراتك.

| المفتاح | النوع / القيم | المعنى |
|---|---|---|
| `resetprop` | bool | ما إذا كان محرك resetprop على مستوى الجهاز يعمل. |
| `autoupdate` | bool | ما إذا كان `fingerprint-update.sh` يعمل مرة واحدة لكل إقلاع. مفعّل افتراضياً. |
| `spoof_manufacturer` | bool | ما إذا كان حقل الشركة المصنّعة يُنتحَل أيضاً. |
| `spoof_version` | `never` / `rom` / `force` | كيفية تطبيق مجموعة إصدار Android. `never` هو الافتراضي؛ ويُرفض `force` عند استعادة نسخة احتياطية. |

## `global_fields`

تُطبَّق حقول Build في هذه القائمة على مستوى الجهاز بأكمله حتى في وضع ذي نطاق، لإبقاء قيمة
متسقة في كل مكان. استخدمها فقط للحقول الآمنة من ناحية الاتساق - security patch هو
المعتاد. **لا تضع** الهوية أو مجموعة إصدار Android هنا أبداً.

```json
"global_fields": ["SECURITY_PATCH"]
```

## مثال

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*تم إنشاء هذه الوثائق باستخدام Claude (Anthropic) وتتم صيانتها بواسطة VD171. التصحيحات والتحسينات مرحّب بها - راجع [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _تم إنشاء هذا التوثيق باستخدام Claude (Anthropic) ويتولى صيانته VD171. التصحيحات والتحسينات مرحّب بها؛ راجع [CONTRIBUTING.md](CONTRIBUTING.md)._
