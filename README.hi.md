## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD एक मॉड्यूल है जिसे ग्लोबल डिवाइस स्पूफिंग के लिए डिज़ाइन किया गया है।  
इसका मतलब है कि सिस्टम ऐप्स और पूरा डिवाइस भी हुक हो जाएगा।  
  
## इसका उपयोग कैसे करें?
यदि आप इस मॉड्यूल का उपयोग कर रहे हैं और एक काम करने वाला FingerPrint स्पूफ कर रहे हैं, तो PlayIntegrityFix या GooglePhotosUnlimited का उपयोग करना अनावश्यक है।  
### उदाहरण JSON कॉन्फ़िग फ़ाइल  
`/data/adb/COPG-VD.json`
* सभी फ़ील्ड वैकल्पिक (OPTIONAL) हैं। यदि कोई फ़ील्ड प्रदान नहीं की जाती है, तो उसे छोड़ दिया जाएगा।  
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
सुनिश्चित करें कि स्ट्रिंग्स केवल डबल-कोट्स में ही उपयोग करें।  
ऊपर दिया गया ब्लॉक और `module/COPG-VD.json.example` प्रतिदिन [Update COPG-VD.json](.github/workflows/update-json.yml) वर्कफ़्लो द्वारा, सीधे नवीनतम Google फ़ैक्टरी इमेज से रिफ्रेश किए जाते हैं।  
### फिंगरप्रिंट को ताज़ा रखना  
`fingerprint-update.sh` उस फ़ाइल को खींचता है और आपकी कॉन्फ़िग को अपडेट करता है, WebUI से (**Check Update** / **Update Now**) या स्वयं **प्रति बूट एक बार** (**Auto-update JSON on boot**, डिफ़ॉल्ट रूप से चालू)।  
* `/data/adb/COPG-VD.json` और `/data/adb/modules/COPG-VD/COPG-VD.json` दोनों तब अपडेट होते हैं जब दोनों मौजूद हों, और पिछली सामग्री `.bak` के रूप में रखी जाती है।  
* केवल बिल्ड फ़ील्ड ही फिर से लिखी जाती हैं (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user)। आपके द्वारा कस्टमाइज़ किया गया बाकी सब कुछ सुरक्षित रहता है: अतिरिक्त कुंजियाँ, `BOOTLOADER`/`BOARD`/`HARDWARE`, अन्य ऑब्जेक्ट, कुंजी क्रम और फ़ॉर्मेटिंग।  
* यह कभी पीछे नहीं जाता: इंस्टॉल किए गए से पुराना अपस्ट्रीम बिल्ड अस्वीकार कर दिया जाता है। यह
  सामान्य है (रिपॉजिटरी उस कॉन्फ़िग से पीछे रह सकती है जिसे आपने हाथ से अपडेट किया है) और यह वह सुरक्षा भी है जो
  Android पर सबसे अधिक मायने रखती है, जहाँ उपलब्ध एकमात्र डाउनलोडर busybox `wget` है, जो TLS प्रमाणपत्रों को
  सत्यापित नहीं कर सकता - इसी कारण से हर मान उपयोग से पहले सत्यापित किया जाता है।  
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
### कॉन्फ़िग में सेटिंग्स  
`COPG-VD.json` एक `COPG-VD-Settings` ऑब्जेक्ट धारण कर सकता है - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - ताकि आपकी पसंद बैकअप के साथ यात्रा करें और हाथ से संपादित की जा सकें। WebUI उसे और बूट स्क्रिप्ट द्वारा पढ़ी जाने वाली फ़्लैग फ़ाइलों, दोनों को लिखता है। `"spoof_version": "force"` फ़ाइल से अस्वीकार किया जाता है और डाउनग्रेड किया जाता है: एक पुराना बैकअप रीस्टोर करने से इसे आपकी जानकारी के बिना फिर से चालू नहीं किया जाना चाहिए।  
### WebUI  
यदि आप JSON कॉन्फ़िग फ़ाइल को सीधे संपादित करते हैं तो WebUI का उपयोग करना अनावश्यक है।  
यदि आप Magisk उपयोगकर्ता हैं, तो KOW द्वारा KsuWebUI का उपयोग करें (https://github.com/KOWX712/KsuWebUIStandalone/releases)।  
#### Use resetprop:  
resetprop के उपयोग को अक्षम करें और केवल Build जानकारी स्पूफ करना सक्षम करें।  
#### Use ro.product.manufacturer:  
यदि आप Disclosure root detector ऐप में "Found device spoofing" डिटेक्शन की परवाह करते हैं तो इसे अक्षम करें।  

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
