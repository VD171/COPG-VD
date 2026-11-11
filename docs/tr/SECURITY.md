> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · Türkçe · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Güvenlik Politikası

COPG-VD root olarak çalışır ve Zygisk aracılığıyla uygulama süreçlerine enjekte edilir.
Güvenliği ciddiye alıyoruz.

## Bir güvenlik açığını bildirme

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA konusu:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-posta:** vd.priv8@pm.me

Açık bir açıklama ve mümkünse yeniden üretme adımlarını ekleyin. Elimizden geldiğince
çabuk yanıt vereceğiz ve isterseniz size itibar vereceğiz.

## Kapsam notları

- Yapılandırma `/data/adb/COPG-VD/COPG-VD.json` konumunda bulunur, yalnızca root tarafından
  okunabilir. Modül onu, kendisinin getirdiği özel bir SELinux kuralı aracılığıyla enjekte
  edilen süreçten okur; hiçbir kimlik bilgisi (credential) veya parola ifadesi tutmaz.
- Sahteleme hook'ları canlı uygulamalara bağlıdır ve null kontrolünden geçer, böylece bozuk
  bir profil uygulamayı çökertmek yerine zarifçe bozulur.
- İsteğe bağlı profil getirme dışında **telemetri ve ağ yoktur**; bu da modülün kendi
  birlikte gelen indiricisini kullanarak, `PATH`'ten bir `curl`/`wget` değil,
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  adresinden HTTPS üzerinden genel bir Pixel profilini indirir.
- Önceden derlenmiş her ikili ve kütüphane, sabitlenmiş genel bir yukarı akışa (upstream)
  kadar izlenebilir ve CI'da inceleyebileceğiniz kaynaktan derlenir.

*Bu belge Claude (Anthropic) ile oluşturulmuş ve VD171 tarafından sürdürülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [CONTRIBUTING.md](CONTRIBUTING.md).*
