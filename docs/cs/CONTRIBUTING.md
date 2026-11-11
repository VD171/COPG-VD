> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · Čeština · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Přispívání do COPG-VD

Díky za pomoc! COPG-VD má být snadný k přispívání. Tato příručka vám řekne, kde co leží,
a těch pár konvencí, které dodržujeme.

## Projekt v kostce

COPG-VD je **Zygisk spoofer zařízení**: malá nativní knihovna, která je injektována do
procesů aplikací, aby přepsala otisk zařízení a build, plus vanilla-JS WebUI pro jeho
ovládání. Je to fork COPG (od AlirezaParsi), udržovaný VD171 pod licencí Apache-2.0. Viz
[ARCHITECTURE.md](ARCHITECTURE.md) a [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Ve výchozím stavu omezuje spoof na stack Google Play přes Zygisk, takže je to lehčí,
robustnější alternativa k PlayIntegrityFix.

## AI přispěvatelé vítáni

AI asistenti a agenti jsou zde prvotřídní přispěvatelé, ne dodatečný nápad.

- Projekt je postaven tak, aby byl čitelný: konfigurace je jediný JSON soubor
  (`/data/adb/COPG-VD/COPG-VD.json`, dokumentovaný v [CONFIGURATION.md](CONFIGURATION.md)),
  enginy jsou malé a soběstačné a rozvržení je v [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Patche s pomocí AI jsou posuzovány a přijímány za stejných podmínek jako jakékoli jiné -
  podle správnosti, srozumitelnosti a konvencí níže, ne podle toho, kdo (nebo co) je napsal.
- Stejná laťka pro všechny: skutečná funkce se nikdy neoslabuje, spoof zůstává koherentní a
  nic tajného nebo specifického pro zařízení nepřistane v repozitáři (viz [.gitignore](../../.gitignore)).

## Nastavení pro vývoj

- Pro testování potřebujete rootnuté zařízení nebo emulátor se Zygiskem (KernelSU, APatch
  nebo Magisk).
- Sestavte nativní knihovnu per ABI pomocí NDK (r29) a CMake - přesný příkaz viz krok
  `Build zygisk libraries` v [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml).
  CI sestaví všechny tři ABI za vás.
- Sestavte flashovatelný zip: zkopírujte sestavené `libspoof.so` do `module/zygisk/<abi>.so`,
  pak `cd module && zip -r9 ../COPG-VD-dev.zip .` a nahrajte jej.
- WebUI je `module/webroot/` (otevřete jej z root manageru). Logika spoofingu je
  `zygisk/spoof_module.cpp`; stahovač profilu je `module/fingerprint-update.sh`.

## Konvence

- **Každý zdrojový soubor modulu** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) začíná hlavičkou
  s bannerem projektu (zkopírujte ji z libovolného existujícího souboru). Nástroje pod
  `.github/` používají místo toho krátký komentář.
- **Kód a komentáře anglicky.** Udržujte komentáře minimální a jen tam, kde je potřeba.
- **Žádný em-dash ani en-dash**; vždy používejte prostou pomlčku `-`.
- WebUI je **vanilla JS** (jeden `scripts.js`); žádné frameworky.
- **Nikdy neoslabujte** skutečnou funkci: udržujte spoof koherentní a nenechte hooky shodit
  aplikaci, ke které jsou připojeny (mají záměrně kontrolu na null).

## Internacionalizace (i18n)

- Řetězce UI leží v `module/webroot/lang/`. Angličtina je kanonický fallback
  (`en.js` + `en.json`); ostatních 20 jazyků je `<code>.json`.
- Pro přidání nebo změnu řetězce: upravte `en.js` **a** `en.json`, pak aktualizujte každý
  `<code>.json`. Dotknout se viditelného popisku znamená aktualizovat **všechny** jazykové
  soubory a **všechny** `README.<code>.md`.
- Překlady jsou prostý JSON - skvělý první příspěvek.

## Commity a PR

- Udržujte PR zaměřené. Popište co a proč.
- Podepište své commity (DCO): `git commit -s` (přidá `Signed-off-by:`).
- CI musí zůstat zelené. Buďte laskaví v recenzích - viz [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Dobré první úkoly

Hledejte štítky `good first issue` a `help wanted`. Překlady, dokumentace a nové profily
Pixelů jsou skvělé výchozí body.

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je udržována VD171. Opravy a vylepšení jsou vítány - viz [CONTRIBUTING.md](CONTRIBUTING.md).*
