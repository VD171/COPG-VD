> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · Svenska · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Bidra till COPG-VD

Tack för att du hjälper till! COPG-VD är tänkt att vara lätt att bidra till. Den här guiden berättar
var saker finns och de få konventioner vi följer.

## Projektet i korthet

COPG-VD är en **Zygisk-enhetsspoofer**: ett litet nativt bibliotek som injiceras i app-
processer för att skriva om enhetens fingerprint och build, plus ett WebUI i ren JS för att styra det.
Det är en fork av COPG (av AlirezaParsi), underhållen av VD171 under Apache-2.0-licensen.
Se [ARCHITECTURE.md](ARCHITECTURE.md) och [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Som standard begränsar den spoofen till Google Play-stacken via Zygisk, så den är ett
lättare, mer robust alternativ till PlayIntegrityFix.

## AI-bidragsgivare är välkomna

AI-assistenter och agenter är förstklassiga bidragsgivare här, inte en eftertanke.

- Projektet är byggt för att vara läsbart: konfigurationen är en enda JSON-fil
  (`/data/adb/COPG-VD.json`, dokumenterad i [CONFIGURATION.md](CONFIGURATION.md)),
  motorerna är små och fristående, och layouten finns i [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- AI-assisterade patchar granskas och accepteras på samma villkor som alla andra - efter
  korrekthet, tydlighet och konventionerna nedan, inte efter vem (eller vad) som skrev dem.
- Samma ribba för alla: en riktig funktion försvagas aldrig, spoofen förblir koherent, och
  inget hemligt eller enhetsspecifikt hamnar i repot (se [.gitignore](../../.gitignore)).

## Utvecklingsuppsättning

- Du behöver en rootad enhet eller emulator med Zygisk (KernelSU, APatch eller Magisk) för att testa.
- Bygg det nativa biblioteket per ABI med NDK (r29) och CMake - se steget `Build zygisk
  libraries` i [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) för det
  exakta kommandot. CI bygger alla tre ABI:er åt dig.
- Bygg en flashbar zip: kopiera det byggda `libspoof.so` till `module/zygisk/<abi>.so`, sedan
  `cd module && zip -r9 ../COPG-VD-dev.zip .` och flasha den.
- WebUI:t är `module/webroot/` (öppna det från root-hanteraren). Spoofing-logiken är
  `zygisk/spoof_module.cpp`; profilhämtaren är `module/fingerprint-update.sh`.

## Konventioner

- **Varje källfil i modulen** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) börjar med
  projektets banner-header (kopiera den från valfri befintlig fil). Verktyg under `.github/` använder
  istället en kort kommentar.
- **Kod och kommentarer på engelska.** Håll kommentarerna minimala och endast där de behövs.
- **Ingen em-dash eller en-dash**; använd alltid ett vanligt bindestreck `-`.
- WebUI:t är **ren JS** (ett enda `scripts.js`); inga ramverk.
- **Försvaga aldrig** en riktig funktion: håll spoofen koherent och låt inte hookarna
  krascha en app de är fästa vid (de är null-kontrollerade med avsikt).

## Internationalisering (i18n)

- UI-strängar finns i `module/webroot/lang/`. Engelska är den kanoniska reservutvägen
  (`en.js` + `en.json`); de övriga 20 språken är `<code>.json`.
- För att lägga till eller ändra en sträng: redigera `en.js` **och** `en.json`, uppdatera sedan varje
  `<code>.json`. Att röra en synlig etikett innebär att uppdatera **alla** språkfiler och
  **alla** `README.<code>.md`.
- Översättningar är ren JSON - ett utmärkt första bidrag.

## Commits och PR:er

- Håll PR:er fokuserade. Beskriv vad och varför.
- Signera dina commits (DCO): `git commit -s` (lägger till `Signed-off-by:`).
- CI måste förbli grön. Var vänlig i granskningar - se [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Bra första ärenden

Leta efter etiketterna `good first issue` och `help wanted`. Översättningar, dokumentation och nya
Pixel-profiler är alla utmärkta startpunkter.

*Den här dokumentationen genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [CONTRIBUTING.md](CONTRIBUTING.md).*
