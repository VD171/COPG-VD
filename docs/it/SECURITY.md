> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · Italiano · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Politica di sicurezza

COPG-VD gira come root e viene iniettato nei processi delle app tramite Zygisk. Prendiamo la sicurezza
sul serio.

## Segnalare una vulnerabilità

- **Sito:** https://vd171.ru
- **Sito:** https://vd.priv8.ru
- **Issue:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Thread XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Includi una descrizione chiara e, se possibile, i passi per riprodurre. Risponderemo appena
possibile e ti accrediteremo se lo desideri.

## Note sullo scope

- La configurazione si trova in `/data/adb/COPG-VD/COPG-VD.json`, leggibile solo da root. Il modulo
  la legge dal processo iniettato tramite una regola SELinux dedicata che include esso stesso; non
  contiene credenziali o passphrase.
- Gli hook di spoofing sono attaccati alle app live e sono null-checked così da far sì che un profilo malformato
  degradi con grazia invece di far crashare l'app.
- Non c'è **alcuna telemetria e nessuna rete** eccetto il fetch opzionale del profilo, che
  scarica un profilo Pixel pubblico via HTTPS da
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  usando il downloader incluso proprio del modulo, non un `curl`/`wget` dal `PATH`.
- Ogni binario e libreria precompilati sono tracciabili a un upstream pubblico fissato ed è compilato
  in CI da sorgente che puoi ispezionare.

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [CONTRIBUTING.md](CONTRIBUTING.md).*
