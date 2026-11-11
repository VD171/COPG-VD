> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · Svenska · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Säkerhetspolicy

COPG-VD körs som root och injiceras i app-processer via Zygisk. Vi tar säkerhet
på allvar.

## Rapportera en sårbarhet

- **Webbplats:** https://vd171.ru
- **Webbplats:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA-tråd:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-post:** vd.priv8@pm.me

Inkludera en tydlig beskrivning och, om möjligt, steg för att återskapa. Vi svarar så snart
vi kan och ger dig erkännande om du önskar.

## Anmärkningar om omfattning

- Konfigurationen finns i `/data/adb/COPG-VD/COPG-VD.json`, läsbar endast av root. Modulen
  läser den från den injicerade processen via en dedikerad SELinux-regel som den levererar själv; den
  håller inga autentiseringsuppgifter eller lösenfraser.
- Spoofing-hookarna fästs vid körande appar och är null-kontrollerade så att en felaktig profil
  degraderar graciöst istället för att krascha appen.
- Det finns **ingen telemetri och inget nätverk** utom den valfria profilhämtningen, som
  laddar ner en offentlig Pixel-profil över HTTPS från
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  med modulens egen medföljande nedladdare, inte en `curl`/`wget` från `PATH`.
- Varje förbyggd binär och bibliotek är spårbar till en pinnad offentlig upstream och byggs
  i CI från källkod du kan inspektera.

*Den här dokumentationen genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [CONTRIBUTING.md](CONTRIBUTING.md).*
