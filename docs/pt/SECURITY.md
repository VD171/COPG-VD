> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · Português · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Política de Segurança

O COPG-VD roda como root e é injetado nos processos dos apps por meio do Zygisk. Levamos a segurança
a sério.

## Reportando uma vulnerabilidade

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Tópico no XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Inclua uma descrição clara e, se possível, os passos para reproduzir. Responderemos assim que
pudermos e daremos crédito a você se desejar.

## Observações sobre o escopo

- A configuração fica em `/data/adb/COPG-VD/COPG-VD.json`, legível apenas pelo root. O módulo a
  lê a partir do processo injetado por meio de uma regra SELinux dedicada que ele mesmo traz; ele
  não guarda credenciais nem senhas.
- Os hooks de spoofing são anexados a apps em execução e têm checagem de null, de modo que um perfil malformado
  degrada graciosamente em vez de travar o app.
- Não há **telemetria nem rede**, exceto o fetch opcional do perfil, que
  baixa um perfil Pixel público por HTTPS de
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  usando o próprio downloader embarcado do módulo, não um `curl`/`wget` do `PATH`.
- Todo binário e biblioteca pré-compilados são rastreáveis até um upstream público fixado e são compilados
  no CI a partir de um código-fonte que você pode inspecionar.

*Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [CONTRIBUTING.md](CONTRIBUTING.md).*
