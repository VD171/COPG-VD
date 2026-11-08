> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · فارسی · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# مرجع پیکربندی

کل ماژول توسط یک فایل هدایت می‌شود: `/data/adb/COPG-VD.json`. WebUI آن را برای شما
می‌نویسد، اما می‌توانید آن را با دست ویرایش کنید. یک نمونه عرضه‌شده در
`module/COPG-VD.json.example` قرار دارد.

قواعد:

- **رشته‌ها فقط از دابل‌کوت استفاده می‌کنند**، مانند JSON.
- **هر فیلد اختیاری است.** فیلدی که ارائه نشده باشد نادیده گرفته می‌شود و مقدار خود رام
  حفظ می‌شود.
- پس از ویرایش با دست **Analyze** را اجرا کنید: فایلی که parse نمی‌شود باعث می‌شود ماژول
  **هیچ چیزی** را spoof نکند، و فقط logcat این را می‌گوید.

## کلیدهای سطح-بالا

| کلید | نوع | معنا |
|---|---|---|
| `scope_mode` | string | `playstore` (پیش‌فرض)، `global`، `whitelist` یا `blacklist`. [USER-GUIDE.md](USER-GUIDE.md) را ببینید. |
| `scope_whitelist` | array | پکیج‌هایی که وقتی `scope_mode` برابر `whitelist` است spoof می‌گیرند. |
| `scope_blacklist` | array | پکیج‌هایی که وقتی `scope_mode` برابر `blacklist` است مستثنا می‌شوند. |
| `COPG-VD` | object | پروفایل: فیلدهای Build که باید ارائه شوند (پایین را ببینید). |
| `COPG-VD-Delete` | array | نام فیلدهایی که باید حذف شوند به جای تنظیم (فیلد Build برابر null می‌شود؛ یک property با `resetprop --delete` حذف می‌شود). |
| `COPG-VD-Settings` | object | تنظیمات ماژول که همراه پروفایل سفر می‌کنند (پایین را ببینید). |
| `motor_jni` | bool | موتور فیلدهای Build (`android.os.Build.*` را بازنویسی می‌کند). پیش‌فرض `true`. |
| `motor_prop_hook` | bool | موتور property به ازای هر پردازه (remap تمیز property). پیش‌فرض `true`. |
| `motor_drm` | bool | موتور DRM / Widevine. پیش‌فرض `false`. |
| `drm_targets` | array | اپ‌هایی که spoof مربوط به DRM را صرف‌نظر از `scope_mode` می‌گیرند. خالی = از scope پیروی کن. |
| `global_fields` | array | فیلدهای Build که حتی در یک حالت scoped به صورت سراسری در دستگاه اعمال می‌شوند، فقط برای فیلدهای ایمن از نظر همخوانی. |
| `process_overrides` | object | override فیلد به ازای هر پردازه: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | جزئیات اضافی logcat برای دیباگ. پیش‌فرض `false`. |

## شیء پروفایل `COPG-VD`

هر ورودی یک فیلد دستگاه است که به پردازه‌های هدف ارائه می‌شود. رایج‌ترین‌ها:

| گروه | فیلدها |
|---|---|
| Identity | `BRAND`، `DEVICE`، `MANUFACTURER`، `MODEL`، `PRODUCT`، `FINGERPRINT`، `BOARD`، `HARDWARE` |
| Build id | `DISPLAY`، `ID`، `INCREMENTAL`، `TIMESTAMP`، `TIME`، `HOST`، `USER`، `TYPE`، `TAGS`، `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`، `FIRST_API_LEVEL`، `DEVICE_INITIAL_SDK_INT`، `UUID`، `SDK_FINGERPRINT` |
| Version (خاص) | `ANDROID_VERSION`، `RELEASE`، `SDK_INT`، `SDK`، `SDK_FULL`، `CODENAME`، `PREVIEW_SDK` |

گونه‌های `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`، `DEVICE_FOR_ATTESTATION`،
`MANUFACTURER_FOR_ATTESTATION`، `MODEL_FOR_ATTESTATION`، `PRODUCT_FOR_ATTESTATION`) به مسیر
attestation اجازه می‌دهند مقداری متفاوت از مقدار ساده گزارش دهد، تا keystore همخوان بماند.

> **گروه version خاص است.** `ANDROID_VERSION`، `SDK_INT`، `SDK_FULL` و `CODENAME`
> رام شما را توصیف می‌کنند، نه دستگاه spoof‌شده را. بالا بردن آن‌ها تلفن را softloop می‌کند.
> آن‌ها در پروفایل عرضه‌شده نیستند و فقط وقتی `COPG-VD-Settings.spoof_version` اجازه دهد
> اعمال می‌شوند - [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap) را ببینید.

### state های فیلد

| State | چگونه | نتیجه |
|---|---|---|
| Set | `"KEY": "value"` | مقدار را می‌نویسد. |
| Empty | `"KEY": ""` | یک مقدار خالی می‌نویسد. |
| Delete | نام در `"COPG-VD-Delete": [ ... ]` | فیلد را حذف می‌کند. |
| Skip | کلید را کنار بگذارید | مقدار خود رام را حفظ می‌کند. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` یا `L3`) سطح Widevine است که وقتی `motor_drm` روشن باشد گزارش می‌شود.

## `COPG-VD-Settings`

تنظیماتی که همراه پروفایل سفر می‌کنند، پس یک backup انتخاب‌های شما را حمل می‌کند.

| کلید | نوع / مقادیر | معنا |
|---|---|---|
| `resetprop` | bool | اینکه آیا موتور سراسری resetprop اجرا شود. |
| `autoupdate` | bool | اینکه آیا `fingerprint-update.sh` یک بار در هر boot اجرا شود. پیش‌فرض روشن. |
| `spoof_manufacturer` | bool | اینکه آیا فیلد manufacturer نیز spoof شود. |
| `spoof_version` | `never` / `rom` / `force` | چگونه گروه version اندروید اعمال شود. `never` پیش‌فرض است؛ `force` هنگام بازگردانی یک backup رد می‌شود. |

## `global_fields`

فیلدهای Build در این فهرست حتی در یک حالت scoped به صورت سراسری در دستگاه اعمال می‌شوند، تا
یک مقدار همه‌جا سازگار بماند. فقط برای فیلدهای ایمن از نظر همخوانی از آن استفاده کنید -
security patch مورد معمول است. **هرگز** identity یا گروه version اندروید را اینجا نگذارید.

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

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگهداری می‌شود. اصلاحات و بهبودها خوش‌آمدند - [../CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
