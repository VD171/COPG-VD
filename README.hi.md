## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD एक डिवाइस स्पूफर है: यह डिवाइस के fingerprint और build को फिर से लिखता है ताकि ऐप्स असली डिवाइस के बजाय वह डिवाइस देखें जिसे आप चुनते हैं।  
यह Zygisk (KernelSU, APatch या Magisk) पर चलता है और, डिफ़ॉल्ट रूप से, स्पूफ के दायरे को Google Play स्टैक तक सीमित रखता है - इसलिए यह PlayIntegrityFix का एक हल्का, अधिक मज़बूत विकल्प है।  

## स्क्रीनशॉट

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## इसका उपयोग कैसे करें?
मॉड्यूल इंस्टॉल करें, रिबूट करें, और शामिल किया गया प्रोफ़ाइल (एक Pixel) लक्षित ऐप्स के लिए स्पूफ हो जाता है। एक काम करने वाले fingerprint के साथ आपको PlayIntegrityFix या GooglePhotosUnlimited की ज़रूरत नहीं है।  
सब कुछ `/data/adb/COPG-VD.json` में, या WebUI से कॉन्फ़िगर किया जाता है। सभी फ़ील्ड वैकल्पिक (OPTIONAL) हैं - जो फ़ील्ड प्रदान नहीं की जाती उसे छोड़ दिया जाता है।  

### Scope - स्पूफ कौन देखता है
`scope_mode` तय करता है कि किन प्रक्रियाओं को स्पूफ की गई पहचान मिलती है। सीमित दायरे वाले मोड में पहचान Zygisk द्वारा प्रति प्रक्रिया पहुँचाई जाती है और ग्लोबल प्रॉपर्टीज़ के माध्यम से बाकी सिस्टम को लीक नहीं होती।  
* **Google Play** (`playstore`, डिफ़ॉल्ट) - केवल Play स्टैक (Google Play services, इसकी unstable प्रक्रिया और Play Store)।  
* **Global** - पूरा डिवाइस; हर प्रक्रिया इसे देखती है।  
* **Whitelist** - केवल `scope_whitelist` में मौजूद ऐप्स।  
* **Blacklist** - `scope_blacklist` में मौजूद ऐप्स को छोड़कर हर ऐप।  

### Engines - स्पूफ कैसे पहुँचाया जाता है
हर एक स्वतंत्र है और इसे बंद किया जा सकता है:  
* **Build fields (JNI)** - लक्षित प्रक्रियाओं में `android.os.Build.*` को फिर से लिखता है।  
* **Property hook** - लक्षित प्रक्रियाओं को स्पूफ की गई सिस्टम प्रॉपर्टीज़ प्रस्तुत करता है (प्रॉपर्टी क्षेत्र का प्रति-प्रक्रिया clean-room रीमैप, बिना किसी फ़ंक्शन hook के)।  
* **resetprop** - सिस्टम प्रॉपर्टीज़ को फिर से लिखता है, समूह के अनुसार प्रबंधित: identity, version, boot state, SELinux, adb/usb, anti-emulator और एक cleanup पास। सीमित दायरे वाले मोड में identity और version समूह पूरे-डिवाइस वाले resetprop से बाहर रहते हैं (Zygisk उन्हें प्रति प्रक्रिया पहुँचाता है); boot/lock/SELinux समूह ग्लोबल रहते हैं।  
* **DRM / Widevine** (डिफ़ॉल्ट रूप से बंद) - इसे पढ़ने वाले ऐप्स को एक चुना हुआ Widevine सुरक्षा स्तर, L1 या L3, रिपोर्ट करता है।  

### Fields - सेट, खाली, डिलीट या छोड़ना
`COPG-VD` ऑब्जेक्ट के भीतर हर Build फ़ील्ड की चार अवस्थाएँ होती हैं:  
* **Set** - `"KEY": "value"` मान लिखता है।  
* **Empty** - `"KEY": ""` एक खाली मान लिखता है।  
* **Delete** - इसे हटाने के लिए कुंजी को एक टॉप-लेवल `"COPG-VD-Delete": [ ... ]` में सूचीबद्ध करें (एक Build फ़ील्ड null हो जाती है, एक प्रॉपर्टी `resetprop --delete` से हटा दी जाती है)।  
* **Skip** - कुंजी को पूरी तरह छोड़ दें; ROM का अपना मान बनाए रखा जाता है।  

एक `"global_fields": [ ... ]` सूची नामित Build फ़ील्ड को सीमित दायरे वाले मोड में भी पूरे-डिवाइस पर लागू करती है, ताकि एक मान हर जगह सुसंगत रहे - केवल सुसंगतता-सुरक्षित फ़ील्ड के लिए (उदाहरण के लिए security patch), कभी identity नहीं और कभी Android version समूह नहीं।  

### उदाहरण JSON कॉन्फ़िग फ़ाइल
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
सुनिश्चित करें कि स्ट्रिंग्स केवल डबल-कोट्स में ही उपयोग करें।  
ऊपर दिया गया ब्लॉक और `module/COPG-VD.json.example` प्रतिदिन [Update COPG-VD.json](.github/workflows/update-json.yml) वर्कफ़्लो द्वारा, सीधे नवीनतम Google फ़ैक्टरी इमेज से रिफ्रेश किए जाते हैं।  

### फिंगरप्रिंट को ताज़ा रखना
`fingerprint-update.sh` उस फ़ाइल को खींचता है और आपकी कॉन्फ़िग को अपडेट करता है, WebUI से (**Check Update** / **Update Now**) या स्वयं **प्रति बूट एक बार** (**Auto-update JSON on boot**, डिफ़ॉल्ट रूप से चालू)।  
* `/data/adb/COPG-VD.json` और `/data/adb/modules/COPG-VD/COPG-VD.json` दोनों तब अपडेट होते हैं जब दोनों मौजूद हों, और पिछली सामग्री `.bak` के रूप में रखी जाती है।  
* केवल बिल्ड फ़ील्ड ही फिर से लिखी जाती हैं (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user)। आपके द्वारा कस्टमाइज़ किया गया बाकी सब कुछ सुरक्षित रहता है: अतिरिक्त कुंजियाँ, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, अन्य ऑब्जेक्ट, कुंजी क्रम और फ़ॉर्मेटिंग।  
* यह कभी पीछे नहीं जाता: इंस्टॉल किए गए से पुराना अपस्ट्रीम बिल्ड अस्वीकार कर दिया जाता है। यह सामान्य है (रिपॉजिटरी उस कॉन्फ़िग से पीछे रह सकती है जिसे आपने हाथ से अपडेट किया है) और यह वह सुरक्षा भी है जो Android पर सबसे अधिक मायने रखती है, जहाँ उपलब्ध एकमात्र डाउनलोडर busybox `wget` है, जो TLS प्रमाणपत्रों को सत्यापित नहीं कर सकता - इसी कारण से हर मान उपयोग से पहले सत्यापित किया जाता है।  
* यदि आपका प्रोफ़ाइल **किसी अन्य डिवाइस** को स्पूफ करता है (अलग `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), तो कुछ भी लागू नहीं होता - किसी अन्य प्रोफ़ाइल पर एक Pixel fingerprint पुराने fingerprint से भी बदतर है।  
* बूट पर यह पृष्ठभूमि में चलता है और लगभग 10 मिनट तक पुनः प्रयास करता रहता है, क्योंकि बूट समाप्त होने पर आमतौर पर wifi अभी चालू नहीं होता। यह कभी बूट में देरी नहीं करता।  
* अपडेट के ठीक बाद `resetprop` फिर से लागू किया जाता है, लेकिन `android.os.Build` को zygote के शुरू होने पर zygisk मॉड्यूल द्वारा लिखा जाता है: नए मानों को ऐप्स तक पहुँचाने के लिए **रिबूट करें**।  
* लॉग `/data/adb/COPG-VD.update.log` पर।  

### Android संस्करण - और इसे स्पूफ क्यों नहीं किया जाता
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` और `CODENAME` **आपकी ROM** का वर्णन करते हैं, स्पूफ किए जा रहे डिवाइस का नहीं। ऐप्स को यह बताना कि SDK वास्तव में फ्रेमवर्क से नया है, उन्हें ऐसी API कॉल करने पर मजबूर करता है जो मौजूद ही नहीं हैं: Google के ऐप्स क्रैश होते हैं, फ़ोन रिबूट होता है, और यह फिर से शुरू हो जाता है। बूट स्वयं पूरा हो जाता है, इसलिए यह एक **softloop** है और बूट लॉग में कुछ नहीं दिखता।  
* वे भेजी गई कॉन्फ़िग में नहीं हैं और अपडेटर उन्हें कभी नहीं लिखता।  
* WebUI में **Spoof Android version** तय करता है कि उन्हें बिल्कुल लागू किया जाए या नहीं:  
  * **Never** (डिफ़ॉल्ट) - ROM का अपना संस्करण उपयोग किया जाता है।  
  * **Up to this ROM** - केवल वही जो इससे अधिक न हो, जिसका व्यवहार में अर्थ है SDK को कम करना।  
  * **Force** - ठीक वही जो कॉन्फ़िग कहती है। यही वह चीज़ है जो softloop का कारण बनती है।  
* वास्तविक संस्करण `/system/build.prop` से पढ़ा जाता है, कभी `getprop` से नहीं - यही तो वह चीज़ है जिसे यह मॉड्यूल गलत बनाता है।  

### Analyze
WebUI में **Analyze** (या `fingerprint-update.sh analyze`) कॉन्फ़िग को उसकी मौजूदा स्थिति में ऑडिट करता है: ROM के मुकाबले संस्करण, क्या फ़ाइल अभी भी पार्स होती है (एक टूटी हुई फ़ाइल मॉड्यूल को **कुछ भी** स्पूफ न करने पर मजबूर करती है, और केवल logcat ही यह बताता है), क्या fingerprint अपने आस-पास के फ़ील्ड से मेल खाता है, वे कुंजियाँ जिन्हें मॉड्यूल नहीं पढ़ता, तारीखें, और क्या props पहले से ही वही धारण करते हैं जो कॉन्फ़िग माँगती है।  

### WebUI
WebUI वैकल्पिक है - सब कुछ सीधे JSON कॉन्फ़िग में संपादित किया जा सकता है - लेकिन यह मॉड्यूल को चलाने का आसान तरीका है। इसमें पाँच टैब हैं: **About**, **Device** (हर फ़ील्ड, प्रति अवस्था सेट, श्रेणी के अनुसार समूहीकृत), **Spoofing** (scope और engines), **System** (resetprop समूह) और **Tools** (Analyze, Check Update, Update Now, Backup/Restore और बूट ऑटो-अपडेट)। यह कोई नेटवर्क अनुरोध नहीं करता; इसे जो कुछ चाहिए वह सब मॉड्यूल के भीतर शामिल है।  
यदि आप Magisk उपयोगकर्ता हैं, तो KOW द्वारा KsuWebUI का उपयोग करें (https://github.com/KOWX712/KsuWebUIStandalone/releases)।  

### कॉन्फ़िग में सेटिंग्स
`COPG-VD.json` अपनी सेटिंग्स को प्रोफ़ाइल के साथ ही रखता है, ताकि आपकी पसंद बैकअप के साथ यात्रा करें और हाथ से संपादित की जा सकें: `scope_mode`, engine स्विच, resetprop समूह, `global_fields`, और एक `COPG-VD-Settings` ऑब्जेक्ट (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`)। WebUI कॉन्फ़िग और बूट स्क्रिप्ट द्वारा पढ़ी जाने वाली फ़्लैग फ़ाइलें, दोनों को लिखता है। `"spoof_version": "force"` फ़ाइल से अस्वीकार किया जाता है और डाउनग्रेड किया जाता है: एक पुराना बैकअप रीस्टोर करने से इसे आपकी जानकारी के बिना फिर से चालू नहीं किया जाना चाहिए।  

## संपर्क

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
