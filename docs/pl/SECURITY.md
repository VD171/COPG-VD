> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · Polski · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Polityka bezpieczeństwa

COPG-VD działa jako root i jest wstrzykiwany do procesów aplikacji poprzez Zygisk. Traktujemy bezpieczeństwo
poważnie.

## Zgłaszanie podatności

- **Strona:** https://vd171.ru
- **Strona:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Wątek XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Dołącz jasny opis oraz, jeśli to możliwe, kroki do odtworzenia. Odpowiemy tak szybko,
jak zdołamy, i podamy Ci kredyt, jeśli sobie tego życzysz.

## Uwagi o zakresie

- Konfiguracja znajduje się w `/data/adb/COPG-VD/COPG-VD.json`, czytelna tylko dla roota. Moduł
  odczytuje ją z wstrzykniętego procesu poprzez dedykowaną regułę SELinux, którą sam dostarcza; nie
  przechowuje żadnych poświadczeń ani haseł.
- Haki spoofujące są dołączane do żywych aplikacji i mają sprawdzanie null, więc wadliwy profil
  degraduje się łagodnie zamiast zawieszać aplikację.
- Nie ma **żadnej telemetrii ani sieci**, poza opcjonalnym pobieraniem profilu, które
  pobiera publiczny profil Pixela przez HTTPS z
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  za pomocą własnego dołączonego downloadera modułu, a nie `curl`/`wget` z `PATH`.
- Każdy prekompilowany binarny plik i biblioteka są śledzalne do przypiętego publicznego upstreamu i są budowane
  w CI ze źródła, które możesz sprawdzić.

*Ta dokumentacja została wygenerowana z Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [CONTRIBUTING.md](CONTRIBUTING.md).*
