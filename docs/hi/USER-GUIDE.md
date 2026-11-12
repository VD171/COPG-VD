> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · हिन्दी · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# उपयोगकर्ता गाइड

COPG-VD डिवाइस fingerprint और build को फिर से लिखता है ताकि आपके द्वारा चुने गए ऐप्स आपके असली
डिवाइस के बजाय एक Pixel देखें। यह गाइड आपको इंस्टॉल से लेकर एक काम करने वाले सेटअप तक, और रास्ते
में आने वाले विकल्पों के साथ ले जाती है। हर फ़ील्ड और मान के लिए, [CONFIGURATION.md](CONFIGURATION.md)
देखें; यह अंदर कैसे काम करता है, इसके लिए [ARCHITECTURE.md](ARCHITECTURE.md) देखें।

## इंस्टॉल

1. KernelSU, APatch या Magisk में zip को फ़्लैश करें और रीबूट करें।
2. Zygisk सक्रिय होना चाहिए (बिल्ट-इन, या ReZygisk / Zygisk Next)। Magisk उपयोगकर्ता: Zygisk
   सक्षम करें।
3. मॉड्यूल एक Pixel प्रोफ़ाइल के साथ आता है, इसलिए रीबूट के ठीक बाद Google Play स्टैक पहले से ही
   उस Pixel को देखता है। एक काम करने वाले fingerprint के साथ आपको PlayIntegrityFix या
   GooglePhotosUnlimited की आवश्यकता नहीं है।

मॉड्यूल को चलाने के लिए अपने root मैनेजर से WebUI खोलें। Magisk उपयोगकर्ता इसे
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) के साथ खोलते हैं।
सब कुछ `/data/adb/COPG-VD/COPG-VD.json` में सीधे भी संपादित किया जा सकता है।

## spoof को कौन देखता है (scope)

`scope_mode` तय करता है कि कौन सी प्रोसेस जाली पहचान प्राप्त करती हैं। एक scoped मोड में पहचान
Zygisk द्वारा प्रति-प्रोसेस वितरित की जाती है और वैश्विक properties के माध्यम से बाकी सिस्टम तक
**लीक नहीं** होती।

| मोड | spoof किसे मिलता है |
|---|---|
| `playstore` (डिफ़ॉल्ट) | केवल Play स्टैक: Google Play services, इसकी unstable प्रोसेस और Play Store। |
| `global` | पूरा डिवाइस: हर प्रोसेस। |
| `whitelist` | केवल वे ऐप्स जो `scope_whitelist` में सूचीबद्ध हैं। |
| `blacklist` | `scope_blacklist` में सूचीबद्ध ऐप्स को छोड़कर हर ऐप। |

`playstore` से शुरू करें। यह सबसे हल्का विकल्प है और वही है जो असंबंधित ऐप्स के सामने spoof को
उजागर किए बिना Play Integrity पास करता है।

## इंजन

हर इंजन स्वतंत्र है और इसे बंद किया जा सकता है। DRM को छोड़कर सभी डिफ़ॉल्ट रूप से चालू हैं।

- **Build फ़ील्ड (`motor_jni`)** - लक्षित प्रोसेस में `android.os.Build.*` को फिर से लिखता है।
  यही वह है जो अधिकांश ऐप्स पढ़ते हैं।
- **Property hook (`motor_prop_hook`)** - property क्षेत्र के एक clean-room प्रति-प्रोसेस remap के
  माध्यम से, लक्षित प्रोसेस को जाली सिस्टम properties प्रस्तुत करता है (कोई फ़ंक्शन hook नहीं)।
- **resetprop** - सिस्टम properties को डिवाइस-भर में, समूह के अनुसार फिर से लिखता है (identity,
  version, boot state, SELinux, adb/usb, anti-emulator, और एक सफ़ाई पास)। एक scoped मोड में
  identity और version समूह डिवाइस-भर के पास से बाहर रहते हैं (Zygisk उन्हें प्रति-प्रोसेस वितरित
  करता है); boot, lock और SELinux समूह वैश्विक रहते हैं। इसे `COPG-VD-Settings.resetprop` में
  टॉगल करें।
- **DRM / Widevine (`motor_drm`, डिफ़ॉल्ट रूप से बंद)** - इसे पढ़ने वाले ऐप्स को एक चुना गया
  Widevine सुरक्षा स्तर (L1 या L3) रिपोर्ट करता है। नीचे DRM अनुभाग देखें।

## fingerprint को ताज़ा रखना

एक fingerprint पुराना हो जाता है: Google फ़ैक्टरी इमेज को घुमाता रहता है, और एक पुराना fingerprint
धीरे-धीरे अपना मूल्य खो देता है। `fingerprint-update.sh` आपके fingerprint को नवीनतम Google फ़ैक्टरी
इमेज से वर्तमान रखता है।

- WebUI से (Tools टैब): **Check Update** और **Update Now**।
- अपने आप, **प्रति boot एक बार**: **Auto-update JSON on boot** (डिफ़ॉल्ट रूप से चालू)। यह
  पृष्ठभूमि में चलता है, लगभग दस मिनट तक पुनः प्रयास करता रहता है क्योंकि boot के समय आमतौर पर
  wifi अभी तक चालू नहीं होता, और कभी boot में देरी नहीं करता।
- यह केवल build फ़ील्ड को फिर से लिखता है (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user)। आपके द्वारा अनुकूलित सब कुछ रखा जाता है, और पिछली सामग्री
  `.bak` के रूप में सहेजी जाती है।
- यह कभी पीछे नहीं जाता (एक पुराना upstream build अस्वीकार कर दिया जाता है), और यदि आपकी प्रोफ़ाइल
  किसी भिन्न डिवाइस को spoof करती है तो यह कुछ भी लागू नहीं करता - किसी अन्य प्रोफ़ाइल पर एक Pixel
  fingerprint एक पुराने से भी बदतर है।
- एक अपडेट के ठीक बाद `resetprop` फिर से लागू किया जाता है, लेकिन `android.os.Build` तब लिखा जाता
  है जब zygote शुरू होता है, इसलिए नए मान ऐप्स तक पहुँचने के लिए **रीबूट** करें। लॉग:
  `/data/adb/COPG-VD/update.log`।

## Android संस्करण का जाल

सही करने में सबसे कठिन चीज़। `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` और `CODENAME` **आपके ROM**
का वर्णन करते हैं, उस डिवाइस का नहीं जिसे आप spoof करते हैं। ऐप्स को यह बताना कि SDK framework की
वास्तविकता से नया है, उन्हें ऐसे API कॉल करने पर मजबूर करता है जो मौजूद नहीं हैं: Google के ऐप्स
क्रैश हो जाते हैं, फ़ोन रीबूट होता है, और यह फिर से शुरू हो जाता है। boot स्वयं पूरा हो जाता है,
इसलिए यह एक **softloop** है जो boot लॉग में कुछ नहीं छोड़ता।

ये फ़ील्ड भेजी गई config में नहीं हैं और updater इन्हें कभी नहीं लिखता। **Spoof Android version**
(`COPG-VD-Settings.spoof_version`) तय करता है कि ये बिल्कुल लागू होंगे या नहीं:

- `never` (डिफ़ॉल्ट) - ROM के अपने संस्करण का उपयोग होता है।
- `rom` - केवल वही लागू करता है जो ROM से अधिक नहीं होता, जिसका व्यवहार में अर्थ है SDK को कम करना।
- `force` - ठीक वही लागू करता है जो config कहती है। यही softloop का कारण बनता है; इसका उपयोग तभी
  करें जब आप जानते हों कि लक्ष्य framework इसका समर्थन करता है।

असली संस्करण `/system/build.prop` से पढ़ा जाता है, कभी `getprop` से नहीं (जो ठीक वही चीज़ है
जिसे यह मॉड्यूल झुठलाता है)। `force` को backup बहाल करते समय भी अस्वीकार कर दिया जाता है, ताकि एक
पुराना backup इसे आपकी पीठ पीछे फिर से सक्रिय न कर सके।

## DRM / Widevine

डिफ़ॉल्ट रूप से बंद (`motor_drm`)। जब चालू हो, यह इसे पढ़ने वाले ऐप्स को एक चुना गया Widevine स्तर,
`DRM_SECURITY_LEVEL` (`L1` या `L3`), रिपोर्ट करता है।

डिफ़ॉल्ट रूप से DRM spoof `scope_mode` का अनुसरण करता है। इसे इसके बजाय ऐप्स के एक विशिष्ट समूह पर
लागू करने के लिए - मुख्य scope से स्वतंत्र रूप से - उन्हें `drm_targets` में सूचीबद्ध करें। तब
मॉड्यूल किसी सूचीबद्ध ऐप में **केवल** DRM hook के लिए लोडेड रहता है, भले ही वह ऐप मुख्य scope से
बाहर हो; एक खाली या अनुपस्थित सूची का अर्थ है scope का अनुसरण करना। इसके लिए एक scoped मोड की
आवश्यकता होती है (`global` नहीं), और यह अगले **रीबूट** पर प्रभावी होता है।

## Analyze: अपनी config जाँचें

WebUI में **Analyze** (या `fingerprint-update.sh analyze`) config की उसके वर्तमान रूप में
जाँच करता है और आपको बताता है कि किसी ऐप के बताने से पहले क्या गलत है:

- ROM के विरुद्ध संस्करण (क्या यह softloop करेगा?),
- क्या फ़ाइल अभी भी parse होती है (एक टूटी हुई फ़ाइल मॉड्यूल को **कुछ भी** spoof नहीं करने देती,
  और केवल logcat ही यह बताएगा),
- क्या fingerprint अपने आसपास के फ़ील्ड से सहमत है,
- वे keys जिन्हें मॉड्यूल नहीं पढ़ता, संदिग्ध तिथियाँ, और क्या लाइव properties पहले से ही वह ढोती हैं
  जो config माँगती है।

जब भी आप config को हाथ से संपादित करें, इसे चलाएँ।

## WebUI

वैकल्पिक, लेकिन सब कुछ चलाने का आसान तरीका। पाँच टैब:

- **About** - मॉड्यूल और संस्करण जानकारी।
- **Device** - हर build फ़ील्ड, प्रति state सेट और श्रेणी के अनुसार समूहीकृत।
- **Spoofing** - scope मोड और इंजन स्विच।
- **System** - resetprop समूह।
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, boot पर स्वतः-अपडेट, और
  Diagnostics रिपोर्ट (एक बग रिपोर्ट के लिए उपयोगी हर चीज़ को पढ़ने और निर्यात करने के लिए एक बटन)।

यह कोई नेटवर्क अनुरोध नहीं करता; इसे जो भी चाहिए वह मॉड्यूल के भीतर ही आता है।

## समस्या निवारण

- **एक ऐप अभी भी असली डिवाइस देखता है।** scope जाँचें: `playstore` में केवल Play स्टैक कवर होता
  है। पुष्टि करें कि config parse होती है (Analyze चलाएँ)। इंजन, `drm_targets` या प्रोफ़ाइल बदलने
  के बाद, **रीबूट** करें - zygote शुरू होने पर Zygisk scope पढ़ता है।
- **Play Integrity अभी भी विफल होता है।** सुनिश्चित करें कि fingerprint ताज़ा है (Check Update)
  और कि `SECURITY_PATCH` `global_fields` में है ताकि यह डिवाइस-भर में सुसंगत रहे। Google Play
  services को kill करें ताकि यह फिर से attest करे।
- **संस्करण spoofing सक्षम करने के बाद फ़ोन softloop करता है।** यह ऊपर वाला Android संस्करण जाल
  है - `spoof_version` को वापस `never` पर सेट करें।
- **Magisk पर WebUI नहीं खुलती।** [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) का उपयोग करें।

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसका रखरखाव VD171 द्वारा किया जाता है। सुधार और बेहतरी का स्वागत है - [../CONTRIBUTING.md](CONTRIBUTING.md) देखें।*

<!-- doc-footer -->

---

> _यह दस्तावेज़ Claude (Anthropic) से तैयार किया गया है और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और संशोधन का स्वागत है; देखें [CONTRIBUTING.md](CONTRIBUTING.md)।_
