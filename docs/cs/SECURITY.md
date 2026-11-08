> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · Čeština · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Bezpečnostní zásady

COPG-VD běží jako root a je injektován do procesů aplikací přes Zygisk. Bezpečnost bereme
vážně.

## Nahlášení zranitelnosti

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Přiložte jasný popis a, pokud možno, kroky k reprodukci. Odpovíme co nejdříve a uvedeme vás
jako autora, pokud si to přejete.

## Poznámky k rozsahu

- Konfigurace leží v `/data/adb/COPG-VD.json`, čitelná pouze rootem. Modul ji čte z
  injektovaného procesu přes dedikované SELinux pravidlo, které si sám přináší; nedrží
  žádné přihlašovací údaje ani přístupové fráze.
- Spoofing hooky jsou připojeny k živým aplikacím a mají kontrolu na null, takže poškozený
  profil elegantně degraduje místo pádu aplikace.
- Neexistuje **žádná telemetrie a žádná síť** kromě volitelného stažení profilu, které
  stáhne veřejný profil Pixelu přes HTTPS z
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  pomocí vlastního přibaleného downloaderu modulu, ne `curl`/`wget` z `PATH`.
- Každý předkompilovaný binární soubor a knihovna je dohledatelný k připnutému veřejnému
  upstreamu a je sestaven v CI ze zdrojového kódu, který si můžete prohlédnout.

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je udržována VD171. Opravy a vylepšení jsou vítány - viz [CONTRIBUTING.md](CONTRIBUTING.md).*
