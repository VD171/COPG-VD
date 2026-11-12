> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · हिन्दी · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# आर्किटेक्चर

COPG-VD एक Zygisk मॉड्यूल है: एक छोटी native लाइब्रेरी (`libspoof.so`) जिसे Zygisk loader zygote
में, और वहाँ से ऐप प्रोसेस में इंजेक्ट करता है। यह बस इतना करता है कि आपके द्वारा लक्षित प्रोसेस को
एक चुनी गई डिवाइस पहचान प्रस्तुत करे। कोई ऐप नहीं है और, वैकल्पिक प्रोफ़ाइल fetch को छोड़कर, कोई
नेटवर्क नहीं है।

## जीवनचक्र

1. **Zygote शुरू।** जब zygote boot होता है, loader मॉड्यूल के `onLoad` को कॉल करता है। यह
   `/data/adb/COPG-VD/COPG-VD.json` को एक बार पढ़ता है: scope कॉन्फ़िगरेशन और प्रोफ़ाइल।
2. **ऐप fork।** zygote जिस भी ऐप को fork करता है, मॉड्यूल `preAppSpecialize` में तय करता है कि
   यह प्रोसेस scope में है या नहीं:
   - **मुख्य scope में** (`playstore` / `global` / `whitelist` / `blacklist`), या
   - **DRM scope में** (`drm_targets` में सूचीबद्ध)।
   यदि यह दोनों में से कोई नहीं है, तो मॉड्यूल उस प्रोसेस से **अलग हो जाता है** (`dlclose`) और उसमें
   कोई निशान नहीं छोड़ता।
3. **Specialize।** जो प्रोसेस बनी रहती है, उसके लिए इंजन `postAppSpecialize` में लागू होते हैं, जब
   प्रोसेस अभी भी privileged होती है।

चूँकि fork zygote की copy-on-write मेमोरी प्रति को विरासत में लेते हैं, हर ऐप boot पर पढ़ी गई config
से शुरू होता है। मॉड्यूल फ़ाइल को प्रति लक्षित प्रोसेस केवल तभी फिर से पढ़ता है जब वह वास्तव में बदल
गई हो, इसलिए एक नई शुरू या फिर से खोली गई ऐप एक संपादित प्रोफ़ाइल उठा लेती है - लेकिन scope का निर्णय
स्वयं zygote शुरू होने पर किया जाता है, इसलिए **scope, इंजन या `drm_targets` बदलने के लिए एक रीबूट की
आवश्यकता होती है**।

## इंजन

प्रत्येक स्वतंत्र और स्विच करने योग्य है।

- **Build फ़ील्ड (`motor_jni`)।** लक्षित प्रोसेस में JNI के माध्यम से `android.os.Build.*` (और
  `Build.VERSION.*`) को फिर से लिखता है, ताकि Java कोड जाली मान पढ़े।
- **Property hook (`motor_prop_hook`)।** property क्षेत्र (`prop_virtualizer`) के एक clean-room,
  प्रति-प्रोसेस remap के माध्यम से प्रोसेस को जाली सिस्टम properties प्रस्तुत करता है। यह एक मेमोरी
  remap है, फ़ंक्शन hook नहीं, इसलिए कोई hooked-function फ़ुटप्रिंट नहीं है।
- **resetprop (डिवाइस-भर)।** सिस्टम properties को समूह के अनुसार लिखता है - identity, version,
  boot state, SELinux, adb/usb, anti-emulator, साथ ही एक सफ़ाई पास। boot स्क्रिप्ट इसे चलाती हैं।
  एक scoped मोड में identity और version समूह छोड़ दिए जाते हैं (Zygisk उन्हें प्रति-प्रोसेस वितरित
  करता है); boot, lock और SELinux समूह वैश्विक रहते हैं ताकि डिवाइस सुसंगत रहे।
- **DRM / Widevine (`motor_drm`)।** उन `MediaDrm` मेथड को hook करता है जो Widevine सुरक्षा स्तर
  रिपोर्ट करते हैं (`getSecurityLevel`, `getPropertyString`) और कॉन्फ़िगर किया गया स्तर लौटाता है।
  hooks null-checked हैं, इसलिए एक विकृत प्रोफ़ाइल ऐप को क्रैश करने के बजाय शालीनता से गिरावट करती
  है। `drm_targets` इस इंजन को इसकी अपनी ऐप सूची पर चलने देता है, मुख्य scope से अलग।

## config पढ़ना

इंजेक्ट की गई प्रोसेस zygote SELinux डोमेन में चलती है, जो डिफ़ॉल्ट रूप से `/data/adb` तक नहीं पहुँच
सकती। मॉड्यूल इसकी अनुमति देने के लिए अपना स्वयं का `sepolicy.rule` भेजता है, और, एक fallback के रूप
में, अपने खुले मॉड्यूल निर्देशिका (`getModuleDir`) के माध्यम से config पढ़ सकता है, ताकि यह तब भी काम
करता रहे जब एक Zygisk build उस पथ को देना बंद कर दे। फ़ाइल को एक छोटे एम्बेडेड JSON parser (`jsmn`) से
parse किया जाता है; एक फ़ाइल जो parse नहीं होती उसका अर्थ है कि मॉड्यूल कुछ भी spoof नहीं करता।

## प्रोफ़ाइल को ताज़ा रखना

`fingerprint-update.sh` build फ़ील्ड को नवीनतम Google फ़ैक्टरी इमेज से ताज़ा करता है, WebUI से या
प्रति boot एक बार। यह मॉड्यूल के अपने बंडल किए गए downloader का उपयोग करता है (`PATH` के `curl`/`wget`
का नहीं), उपयोग से पहले हर मान को मान्य करता है, कभी पीछे नहीं जाता, और एक ऐसी प्रोफ़ाइल को अस्वीकार
करता है जो किसी भिन्न डिवाइस को spoof करती है। `android.os.Build` zygote शुरू होने पर लिखा जाता है,
इसलिए नए मान अगले रीबूट पर ऐप्स तक पहुँचते हैं। उपयोगकर्ता पक्ष के लिए [USER-GUIDE.md](USER-GUIDE.md)
और फ़ील्ड के लिए [CONFIGURATION.md](CONFIGURATION.md) देखें।

## Android संस्करण को डिफ़ॉल्ट रूप से spoof क्यों नहीं किया जाता

`SDK_INT` / `ANDROID_VERSION` को ROM के framework की वास्तविकता से ऊपर बढ़ाने से ऐप्स ऐसे API कॉल
करते हैं जो मौजूद नहीं हैं, जो Google के ऐप्स को क्रैश करता है और फ़ोन को एक softloop में रीबूट करता
है। इसलिए version समूह डिफ़ॉल्ट रूप से बंद है और `spoof_version` के पीछे गेट किया गया है। मॉड्यूल
असली संस्करण `/system/build.prop` से पढ़ता है, कभी `getprop` से नहीं, क्योंकि `getprop` ठीक वही है
जिसे यह झुठलाता है। जाल को [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap) में देखें।

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसका रखरखाव VD171 द्वारा किया जाता है। सुधार और बेहतरी का स्वागत है - [../CONTRIBUTING.md](CONTRIBUTING.md) देखें।*

<!-- doc-footer -->

---

> _यह दस्तावेज़ Claude (Anthropic) से तैयार किया गया है और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और संशोधन का स्वागत है; देखें [CONTRIBUTING.md](CONTRIBUTING.md)।_
