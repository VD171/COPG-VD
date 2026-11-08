> **Languages:** English · [العربية](docs/ar/SECURITY.md) · [Čeština](docs/cs/SECURITY.md) · [Deutsch](docs/de/SECURITY.md) · [Español](docs/es/SECURITY.md) · [فارسی](docs/fa/SECURITY.md) · [Français](docs/fr/SECURITY.md) · [हिन्दी](docs/hi/SECURITY.md) · [Bahasa Indonesia](docs/in/SECURITY.md) · [Italiano](docs/it/SECURITY.md) · [日本語](docs/ja/SECURITY.md) · [한국어](docs/ko/SECURITY.md) · [Nederlands](docs/nl/SECURITY.md) · [Polski](docs/pl/SECURITY.md) · [Português](docs/pt/SECURITY.md) · [Русский](docs/ru/SECURITY.md) · [Svenska](docs/sv/SECURITY.md) · [ไทย](docs/th/SECURITY.md) · [Türkçe](docs/tr/SECURITY.md) · [Tiếng Việt](docs/vi/SECURITY.md) · [中文](docs/zh/SECURITY.md)

---

# Security Policy

COPG-VD runs as root and is injected into app processes through Zygisk. We take security
seriously.

## Reporting a vulnerability

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

Include a clear description and, if possible, steps to reproduce. We will respond as soon
as we can and credit you if you wish.

## Scope notes

- The configuration lives at `/data/adb/COPG-VD.json`, readable only by root. The module
  reads it from the injected process through a dedicated SELinux rule it ships itself; it
  holds no credentials or passphrases.
- The spoofing hooks are attached to live apps and are null-checked so a malformed profile
  degrades gracefully instead of crashing the app.
- There is **no telemetry and no network** except the optional profile fetch, which
  downloads a public Pixel profile over HTTPS from
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  using the module's own bundled downloader, not a `curl`/`wget` from `PATH`.
- Every prebuilt binary and library is traceable to a pinned public upstream and is built
  in CI from source you can inspect.

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](CONTRIBUTING.md).*
