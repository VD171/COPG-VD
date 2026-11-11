> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · हिन्दी · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# कॉन्फ़िगरेशन संदर्भ

पूरा मॉड्यूल एक फ़ाइल द्वारा चलाया जाता है: `/data/adb/COPG-VD/COPG-VD.json`। WebUI इसे आपके लिए लिखती है,
लेकिन आप इसे हाथ से संपादित कर सकते हैं। एक भेजा गया उदाहरण `module/COPG-VD.json.example` पर रहता है।
यही एकमात्र सत्य-स्रोत है; मॉड्यूल डायरेक्टरी के नीचे की प्रति केवल एक केवल-पढ़ने योग्य डिफ़ॉल्ट है। किसी पुराने संस्करण से `/data/adb/COPG-VD.json` पर बची हुई कॉन्फ़िग स्वचालित रूप से इस डायरेक्टरी में स्थानांतरित कर दी जाती है। मॉड्यूल का अपना लॉग और स्थिति (`update.log`, `update.state`) भी यहीं रहते हैं।

नियम:

- **स्ट्रिंग केवल दोहरे उद्धरण चिह्नों का उपयोग करती हैं**, जैसा कि JSON में।
- **हर फ़ील्ड वैकल्पिक है।** जो फ़ील्ड प्रदान नहीं की जाती उसे छोड़ दिया जाता है और ROM का अपना
  मान रखा जाता है।
- हाथ से संपादित करने के बाद **Analyze** चलाएँ: एक फ़ाइल जो parse नहीं होती वह मॉड्यूल को **कुछ भी**
  spoof नहीं करने देती, और केवल logcat ही यह बताता है।

## शीर्ष-स्तरीय keys

| Key | प्रकार | अर्थ |
|---|---|---|
| `scope_mode` | string | `playstore` (डिफ़ॉल्ट), `global`, `whitelist` या `blacklist`। [USER-GUIDE.md](USER-GUIDE.md) देखें। |
| `scope_whitelist` | array | वे पैकेज जिन्हें `scope_mode` के `whitelist` होने पर spoof मिलता है। |
| `scope_blacklist` | array | वे पैकेज जो `scope_mode` के `blacklist` होने पर बाहर रखे जाते हैं। |
| `COPG-VD` | object | प्रोफ़ाइल: प्रस्तुत करने के लिए Build फ़ील्ड (नीचे देखें)। |
| `COPG-VD-Delete` | array | सेट करने के बजाय हटाने के लिए फ़ील्ड नाम (Build फ़ील्ड null हो जाता है; एक property को `resetprop --delete` से हटाया जाता है)। |
| `COPG-VD-Settings` | object | मॉड्यूल सेटिंग्स जो प्रोफ़ाइल के साथ यात्रा करती हैं (नीचे देखें)। |
| `motor_jni` | bool | Build-फ़ील्ड इंजन (`android.os.Build.*` को फिर से लिखता है)। डिफ़ॉल्ट `true`। |
| `motor_prop_hook` | bool | प्रति-प्रोसेस property इंजन (clean-room property remap)। डिफ़ॉल्ट `true`। |
| `motor_drm` | bool | DRM / Widevine इंजन। डिफ़ॉल्ट `false`। |
| `drm_targets` | array | वे ऐप्स जिन्हें `scope_mode` की परवाह किए बिना DRM spoof मिलता है। खाली = scope का अनुसरण करें। |
| `global_fields` | array | Build फ़ील्ड जो scoped मोड में भी डिवाइस-भर में लागू होते हैं, केवल सुसंगतता-सुरक्षित फ़ील्ड के लिए। |
| `process_overrides` | object | प्रति-प्रोसेस फ़ील्ड ओवरराइड: `{ "process.name": { "FIELD": "value" } }`। |
| `verbose_logs` | bool | डिबगिंग के लिए अतिरिक्त logcat विवरण। डिफ़ॉल्ट `false`। |

## `COPG-VD` प्रोफ़ाइल object

प्रत्येक प्रविष्टि एक डिवाइस फ़ील्ड है जो लक्षित प्रोसेस को प्रस्तुत की जाती है। सामान्य वाली:

| समूह | फ़ील्ड |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (विशेष) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

`*_FOR_ATTESTATION` वेरिएंट (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) attestation
पथ को सादे मान से एक भिन्न मान रिपोर्ट करने देते हैं, ताकि keystore सुसंगत रहे।

> **version समूह विशेष है।** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` और `CODENAME` आपके ROM का
> वर्णन करते हैं, spoof किए गए डिवाइस का नहीं। इन्हें बढ़ाने से फ़ोन softloop करता है। ये भेजी गई
> प्रोफ़ाइल में नहीं हैं और केवल तभी लागू होते हैं जब `COPG-VD-Settings.spoof_version` इसकी अनुमति
> देता है - [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap) देखें।

### फ़ील्ड states

| State | कैसे | परिणाम |
|---|---|---|
| Set | `"KEY": "value"` | मान लिखता है। |
| Empty | `"KEY": ""` | एक खाली मान लिखता है। |
| Delete | `"COPG-VD-Delete": [ ... ]` में नाम | फ़ील्ड हटाता है। |
| Skip | key को छोड़ दें | ROM का अपना मान रखता है। |

### DRM

`DRM_SECURITY_LEVEL` (`L1` या `L3`) वह Widevine स्तर है जो `motor_drm` के चालू होने पर रिपोर्ट किया
जाता है।

## `COPG-VD-Settings`

सेटिंग्स जो प्रोफ़ाइल के साथ यात्रा करती हैं, ताकि एक backup आपके चयन ढोए।

| Key | प्रकार / मान | अर्थ |
|---|---|---|
| `resetprop` | bool | क्या डिवाइस-भर resetprop इंजन चलता है। |
| `autoupdate` | bool | क्या `fingerprint-update.sh` प्रति boot एक बार चलता है। डिफ़ॉल्ट चालू। |
| `spoof_manufacturer` | bool | क्या manufacturer फ़ील्ड को भी spoof किया जाता है। |
| `spoof_version` | `never` / `rom` / `force` | Android version समूह कैसे लागू होता है। `never` डिफ़ॉल्ट है; `force` को backup बहाल करते समय अस्वीकार किया जाता है। |

## `global_fields`

इस सूची में Build फ़ील्ड scoped मोड में भी डिवाइस-भर में लागू होते हैं, ताकि एक मान हर जगह सुसंगत
रहे। इसका उपयोग केवल सुसंगतता-सुरक्षित फ़ील्ड के लिए करें - security patch सामान्य वाला है।
identity या Android version समूह को यहाँ **कभी** न रखें।

```json
"global_fields": ["SECURITY_PATCH"]
```

## उदाहरण

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

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसका रखरखाव VD171 द्वारा किया जाता है। सुधार और बेहतरी का स्वागत है - [../CONTRIBUTING.md](CONTRIBUTING.md) देखें।*
