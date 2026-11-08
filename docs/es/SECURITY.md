> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · Español · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Política de seguridad

COPG-VD se ejecuta como root y se inyecta en los procesos de las apps mediante Zygisk. Nos
tomamos la seguridad en serio.

## Reportar una vulnerabilidad

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

Incluye una descripción clara y, si es posible, pasos para reproducir. Responderemos en
cuanto podamos y te daremos crédito si lo deseas.

## Notas de alcance

- La configuración vive en `/data/adb/COPG-VD.json`, legible solo por root. El módulo la lee
  desde el proceso inyectado mediante una regla SELinux dedicada que él mismo incluye; no
  contiene credenciales ni frases de contraseña.
- Los hooks de spoofing están adjuntos a apps vivas y tienen comprobación de null, de modo
  que un perfil malformado se degrada con elegancia en lugar de hacer caer la app.
- No hay **telemetría ni red** salvo la obtención opcional del perfil, que descarga un perfil
  público de Pixel por HTTPS desde
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  usando el propio descargador incluido del módulo, no un `curl`/`wget` del `PATH`.
- Cada binario y biblioteca precompilados son rastreables hasta un upstream público fijado
  (pinned) y se compilan en CI a partir de código fuente que puedes inspeccionar.

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Las correcciones y mejoras son bienvenidas - consulta [CONTRIBUTING.md](CONTRIBUTING.md).*
