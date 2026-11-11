> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · Français · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Politique de sécurité

COPG-VD s'exécute en tant que root et est injecté dans les processus des applications via
Zygisk. Nous prenons la sécurité au sérieux.

## Signaler une vulnérabilité

- **Site :** https://vd171.ru
- **Site :** https://vd.priv8.ru
- **Issues :** https://github.com/VD171/COPG-VD/issues
- **GitHub :** [@VD171](https://github.com/VD171)
- **XDA-Developers :** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Fil XDA :** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram :** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram :** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord :** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail :** vd.priv8@pm.me

Incluez une description claire et, si possible, les étapes pour reproduire. Nous répondrons
dès que possible et vous créditerons si vous le souhaitez.

## Notes sur le scope

- La configuration vit à `/data/adb/COPG-VD/COPG-VD.json`, lisible uniquement par root. Le module la
  lit depuis le processus injecté via une règle SELinux dédiée qu'il livre lui-même ; il ne
  contient aucun identifiant ni phrase de passe.
- Les hooks de spoofing sont attachés à des applications actives et sont null-checked afin
  qu'un profil malformé se dégrade en douceur au lieu de planter l'application.
- Il n'y a **aucune télémétrie ni aucun réseau** hormis la récupération optionnelle du
  profil, qui télécharge un profil Pixel public via HTTPS depuis
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  à l'aide du downloader intégré du module, pas un `curl`/`wget` du `PATH`.
- Chaque binaire et bibliothèque pré-compilé est traçable jusqu'à un upstream public épinglé
  et est compilé en CI depuis des sources que vous pouvez inspecter.

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [CONTRIBUTING.md](CONTRIBUTING.md).*
