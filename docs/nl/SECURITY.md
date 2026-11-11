> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · Nederlands · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Beveiligingsbeleid

COPG-VD draait als root en wordt via Zygisk in app-processen geïnjecteerd. We nemen beveiliging
serieus.

## Een kwetsbaarheid melden

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA-thread:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Voeg een duidelijke beschrijving toe en, indien mogelijk, stappen om te reproduceren. We reageren zo snel
als we kunnen en vermelden je als je dat wilt.

## Scope-opmerkingen

- De configuratie bevindt zich op `/data/adb/COPG-VD/COPG-VD.json`, alleen leesbaar door root. De module
  leest die vanuit het geïnjecteerde proces via een toegewijde SELinux-regel die het zelf meelevert; het
  bevat geen credentials of wachtwoordzinnen.
- De spoofing-hooks zijn gekoppeld aan live apps en zijn null-gecheckt zodat een misvormd profiel
  netjes degradeert in plaats van de app te laten crashen.
- Er is **geen telemetrie en geen netwerk** behalve de optionele profielophaling, die
  een publiek Pixel-profiel over HTTPS downloadt van
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  met de eigen meegeleverde downloader van de module, niet een `curl`/`wget` uit `PATH`.
- Elk voorgebouwd binary en elke library is traceerbaar naar een vastgepinde publieke upstream en wordt
  in CI gebouwd vanuit bron die je kunt inspecteren.

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [CONTRIBUTING.md](CONTRIBUTING.md).*
