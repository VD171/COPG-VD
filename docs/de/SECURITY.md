> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · Deutsch · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Sicherheitsrichtlinie

COPG-VD läuft als root und wird über Zygisk in App-Prozesse injiziert. Wir nehmen Sicherheit
ernst.

## Melden einer Schwachstelle

- **Website:** https://vd171.ru
- **Website:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA-Thread:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-Mail:** vd.priv8@pm.me

Fügen Sie eine klare Beschreibung und, wenn möglich, Schritte zur Reproduktion bei. Wir antworten so bald
wir können und nennen Sie als Finder, wenn Sie das wünschen.

## Hinweise zum Geltungsbereich

- Die Konfiguration liegt unter `/data/adb/COPG-VD.json`, nur von root lesbar. Das Modul
  liest sie aus dem injizierten Prozess über eine dedizierte SELinux-Regel, die es selbst mitliefert; es
  hält keine Zugangsdaten oder Passphrasen.
- Die Spoofing-Hooks sind an laufende Apps angehängt und null-geprüft, sodass ein fehlerhaftes Profil
  anmutig degradiert, statt die App zum Absturz zu bringen.
- Es gibt **keine Telemetrie und kein Netzwerk**, außer dem optionalen Profilabruf, der
  ein öffentliches Pixel-Profil über HTTPS von
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  mit dem eigenen gebündelten Downloader des Moduls herunterlädt, nicht mit einem `curl`/`wget` aus `PATH`.
- Jede vorkompilierte Binärdatei und Bibliothek ist auf einen gepinnten öffentlichen Upstream zurückverfolgbar und wird
  in CI aus Quellcode gebaut, den Sie inspizieren können.

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [CONTRIBUTING.md](CONTRIBUTING.md).*
