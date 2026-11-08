> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · Nederlands · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Bijdragen aan COPG-VD

Bedankt voor je hulp! COPG-VD is bedoeld om er gemakkelijk aan bij te dragen. Deze handleiding vertelt je
waar dingen zich bevinden en de paar conventies die we volgen.

## Het project in een oogopslag

COPG-VD is een **Zygisk-apparaatspoofer**: een kleine native library die in app-processen wordt
geïnjecteerd om de fingerprint en build van het apparaat te herschrijven, plus een vanilla-JS WebUI om het aan te
sturen. Het is een fork van COPG (door AlirezaParsi), onderhouden door VD171 onder de Apache-2.0-
licentie. Zie [ARCHITECTURE.md](ARCHITECTURE.md) en [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Standaard beperkt het de spoof tot de Google Play-stack via Zygisk, dus het is een
lichter, robuuster alternatief voor PlayIntegrityFix.

## AI-bijdragers welkom

AI-assistenten en -agents zijn hier eersteklas bijdragers, geen bijzaak.

- Het project is gebouwd om leesbaar te zijn: de configuratie is een enkel JSON-bestand
  (`/data/adb/COPG-VD.json`, gedocumenteerd in [CONFIGURATION.md](CONFIGURATION.md)),
  de engines zijn klein en op zichzelf staand, en de indeling staat in [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- AI-ondersteunde patches worden beoordeeld en geaccepteerd op dezelfde voorwaarden als elke andere - op
  correctheid, duidelijkheid en de conventies hieronder, niet op wie (of wat) ze heeft geschreven.
- Dezelfde lat voor iedereen: een echte functie wordt nooit verzwakt, de spoof blijft coherent, en
  niets geheims of apparaatspecifieks belandt in de repo (zie de [.gitignore](../../.gitignore)).

## Ontwikkelopstelling

- Je hebt een geroot apparaat of emulator met Zygisk (KernelSU, APatch of Magisk) nodig om te testen.
- Bouw de native library per ABI met de NDK (r29) en CMake - zie de stap `Build zygisk
  libraries` in [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) voor
  het exacte commando. CI bouwt alle drie de ABI's voor je.
- Bouw een flashbare zip: kopieer de gebouwde `libspoof.so` naar `module/zygisk/<abi>.so`, dan
  `cd module && zip -r9 ../COPG-VD-dev.zip .` en flash die.
- De WebUI is `module/webroot/` (open die vanuit de root-manager). De spoofing-logica is
  `zygisk/spoof_module.cpp`; de profiel-fetcher is `module/fingerprint-update.sh`.

## Conventies

- **Elk modulebronbestand** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) begint met de projectbanner-
  header (kopieer die uit een bestaand bestand). Tooling onder `.github/` gebruikt in plaats daarvan een
  korte opmerking.
- **Code en opmerkingen in het Engels.** Houd opmerkingen minimaal en alleen waar nodig.
- **Geen em-dash of en-dash**; gebruik altijd een gewoon koppelteken `-`.
- De WebUI is **vanilla JS** (één `scripts.js`); geen frameworks.
- **Verzwak nooit** een echte functie: houd de spoof coherent, en laat de hooks geen app
  crashen waaraan ze zijn gekoppeld (ze zijn met opzet null-gecheckt).

## Internationalisatie (i18n)

- UI-strings staan in `module/webroot/lang/`. Engels is de canonieke fallback
  (`en.js` + `en.json`); de andere 20 talen zijn `<code>.json`.
- Om een string toe te voegen of te wijzigen: bewerk `en.js` **en** `en.json`, update dan elke
  `<code>.json`. Een zichtbaar label aanraken betekent **alle** taalbestanden en
  **alle** `README.<code>.md` updaten.
- Vertalingen zijn gewone JSON - een geweldige eerste bijdrage.

## Commits & PR's

- Houd PR's gericht. Beschrijf wat en waarom.
- Sign off je commits (DCO): `git commit -s` (voegt `Signed-off-by:` toe).
- CI moet groen blijven. Wees vriendelijk in reviews - zie [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Goede eerste issues

Zoek naar de labels `good first issue` en `help wanted`. Vertalingen, docs en nieuwe
Pixel-profielen zijn allemaal geweldige startpunten.

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [CONTRIBUTING.md](CONTRIBUTING.md).*
