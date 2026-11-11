> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · हिन्दी · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# सुरक्षा नीति

COPG-VD root के रूप में चलता है और Zygisk के माध्यम से ऐप प्रोसेस में इंजेक्ट किया जाता है। हम
सुरक्षा को गंभीरता से लेते हैं।

## किसी भेद्यता की रिपोर्ट करना

- **साइट:** https://vd171.ru
- **साइट:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA थ्रेड:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **ई-मेल:** vd.priv8@pm.me

एक स्पष्ट विवरण और, यदि संभव हो, पुन: उत्पन्न करने के चरण शामिल करें। हम जितनी जल्दी हो सके जवाब देंगे
और यदि आप चाहें तो आपको श्रेय देंगे।

## Scope टिप्पणियाँ

- कॉन्फ़िगरेशन `/data/adb/COPG-VD/COPG-VD.json` पर रहती है, जो केवल root द्वारा पठनीय है। मॉड्यूल इसे
  इंजेक्ट की गई प्रोसेस से एक समर्पित SELinux नियम के माध्यम से पढ़ता है जिसे यह स्वयं भेजता है; इसमें
  कोई क्रेडेंशियल या पासफ़्रेज़ नहीं है।
- spoofing hooks लाइव ऐप्स से जुड़े होते हैं और null-checked होते हैं ताकि एक विकृत प्रोफ़ाइल ऐप को
  क्रैश करने के बजाय शालीनता से गिरावट करे।
- वैकल्पिक प्रोफ़ाइल fetch को छोड़कर कोई **telemetry और कोई नेटवर्क नहीं** है, जो मॉड्यूल के अपने
  बंडल किए गए downloader का उपयोग करके
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop) से
  HTTPS के माध्यम से एक सार्वजनिक Pixel प्रोफ़ाइल डाउनलोड करता है, न कि `PATH` के `curl`/`wget` से।
- हर पूर्व-निर्मित बाइनरी और लाइब्रेरी एक पिन किए गए सार्वजनिक upstream तक ट्रेस करने योग्य है और CI
  में उस सोर्स से बनाई जाती है जिसकी आप जाँच कर सकते हैं।

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसका रखरखाव VD171 द्वारा किया जाता है। सुधार और बेहतरी का स्वागत है - [CONTRIBUTING.md](CONTRIBUTING.md) देखें।*
