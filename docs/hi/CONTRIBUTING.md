> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · हिन्दी · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# COPG-VD में योगदान

मदद करने के लिए धन्यवाद! COPG-VD को योगदान में आसान बनाने के इरादे से बनाया गया है। यह गाइड आपको
बताती है कि चीज़ें कहाँ रहती हैं और हम जिन कुछ परंपराओं का पालन करते हैं।

## एक नज़र में प्रोजेक्ट

COPG-VD एक **Zygisk डिवाइस spoofer** है: एक छोटी native लाइब्रेरी जो ऐप प्रोसेस में इंजेक्ट की जाती
है ताकि डिवाइस fingerprint और build को फिर से लिखा जा सके, साथ ही इसे चलाने के लिए एक vanilla-JS
WebUI। यह COPG (AlirezaParsi द्वारा) का एक fork है, जिसका रखरखाव VD171 द्वारा Apache-2.0 लाइसेंस के
तहत किया जाता है। [ARCHITECTURE.md](ARCHITECTURE.md) और [FILE-STRUCTURE.md](FILE-STRUCTURE.md)
देखें।

डिफ़ॉल्ट रूप से यह Zygisk के माध्यम से spoof को Google Play स्टैक तक सीमित करता है, इसलिए यह
PlayIntegrityFix का एक हल्का, अधिक मज़बूत विकल्प है।

## AI योगदानकर्ताओं का स्वागत है

AI सहायक और एजेंट यहाँ प्रथम-श्रेणी योगदानकर्ता हैं, कोई बाद का विचार नहीं।

- प्रोजेक्ट को पठनीय बनाने के लिए बनाया गया है: कॉन्फ़िगरेशन एक एकल JSON फ़ाइल है
  (`/data/adb/COPG-VD.json`, [CONFIGURATION.md](CONFIGURATION.md) में प्रलेखित), इंजन छोटे
  और आत्मनिर्भर हैं, और लेआउट [FILE-STRUCTURE.md](FILE-STRUCTURE.md) में है।
- AI-सहायता प्राप्त पैच की समीक्षा और स्वीकृति किसी भी अन्य के समान शर्तों पर होती है - शुद्धता,
  स्पष्टता और नीचे दी गई परंपराओं से, न कि इससे कि किसने (या किसने) उन्हें लिखा।
- सबके लिए समान मानदंड: एक वास्तविक फ़ीचर कभी कमज़ोर नहीं किया जाता, spoof सुसंगत रहता है, और कुछ भी
  गुप्त या डिवाइस-विशिष्ट रिपॉज़िटरी में नहीं उतरता (देखें [.gitignore](../../.gitignore))।

## Dev सेटअप

- परीक्षण के लिए आपको Zygisk (KernelSU, APatch या Magisk) के साथ एक rooted डिवाइस या एमुलेटर चाहिए।
- native लाइब्रेरी को प्रति ABI NDK (r29) और CMake के साथ बनाएँ - सटीक कमांड के लिए
  [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) में `Build zygisk libraries`
  चरण देखें। CI आपके लिए तीनों ABI बनाती है।
- एक flashable zip बनाएँ: बने हुए `libspoof.so` को `module/zygisk/<abi>.so` में कॉपी करें, फिर
  `cd module && zip -r9 ../COPG-VD-dev.zip .` और इसे फ़्लैश करें।
- WebUI `module/webroot/` है (इसे root मैनेजर से खोलें)। spoofing तर्क `zygisk/spoof_module.cpp`
  है; प्रोफ़ाइल fetcher `module/fingerprint-update.sh` है।

## परंपराएँ

- **हर मॉड्यूल सोर्स फ़ाइल** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) प्रोजेक्ट banner हेडर से शुरू
  होती है (इसे किसी मौजूदा फ़ाइल से कॉपी करें)। `.github/` के अंतर्गत टूलिंग इसके बजाय एक छोटी टिप्पणी
  का उपयोग करती है।
- **कोड और टिप्पणियाँ अंग्रेज़ी में।** टिप्पणियों को न्यूनतम और केवल जहाँ आवश्यक हो वहीं रखें।
- **कोई em-dash या en-dash नहीं**; हमेशा एक सादा hyphen `-` उपयोग करें।
- WebUI **vanilla JS** है (एक `scripts.js`); कोई framework नहीं।
- एक वास्तविक फ़ीचर को **कभी कमज़ोर न करें**: spoof को सुसंगत रखें, और hooks को ऐसी ऐप को क्रैश न
  करने दें जिससे वे जुड़े हैं (वे जानबूझकर null-checked हैं)।

## अंतर्राष्ट्रीयकरण (i18n)

- UI स्ट्रिंग `module/webroot/lang/` में रहती हैं। अंग्रेज़ी विहित fallback है (`en.js` + `en.json`);
  बाकी 20 भाषाएँ `<code>.json` हैं।
- एक स्ट्रिंग जोड़ने या बदलने के लिए: `en.js` **और** `en.json` को संपादित करें, फिर हर `<code>.json`
  को अपडेट करें। एक दृश्यमान लेबल को छूने का अर्थ है **सभी** भाषा फ़ाइलों और **सभी** `README.<code>.md`
  को अपडेट करना।
- अनुवाद सादे JSON हैं - एक बेहतरीन पहला योगदान।

## Commits और PR

- PR को केंद्रित रखें। बताएँ क्या और क्यों।
- अपने commits को sign off करें (DCO): `git commit -s` (`Signed-off-by:` जोड़ता है)।
- CI हरी रहनी चाहिए। समीक्षाओं में दयालु रहें - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) देखें।

## अच्छे पहले issues

`good first issue` और `help wanted` लेबल देखें। अनुवाद, दस्तावेज़ीकरण, और नई Pixel प्रोफ़ाइलें सभी
बेहतरीन शुरुआती बिंदु हैं।

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसका रखरखाव VD171 द्वारा किया जाता है। सुधार और बेहतरी का स्वागत है - [CONTRIBUTING.md](CONTRIBUTING.md) देखें।*
