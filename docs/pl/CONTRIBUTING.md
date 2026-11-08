> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · Polski · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Wkład w COPG-VD

Dziękujemy za pomoc! COPG-VD ma być łatwy do współtworzenia. Ten przewodnik mówi, gdzie
wszystko się znajduje i jakich kilku konwencji przestrzegamy.

## Projekt w skrócie

COPG-VD to **spoofer urządzenia Zygisk**: mała natywna biblioteka wstrzykiwana do procesów
aplikacji w celu przepisania odcisku urządzenia i buildu, plus WebUI w czystym JS do sterowania
nim. To fork COPG (autorstwa AlirezaParsi), utrzymywany przez VD171 na licencji Apache-2.0.
Zobacz [ARCHITECTURE.md](ARCHITECTURE.md) i [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Domyślnie ogranicza spoof do stosu Google Play poprzez Zygisk, więc jest lżejszą,
bardziej odporną alternatywą dla PlayIntegrityFix.

## Współtwórcy AI mile widziani

Asystenci i agenci AI są tu pełnoprawnymi współtwórcami, a nie dodatkiem.

- Projekt jest zbudowany tak, aby był czytelny: konfiguracja to jeden plik JSON
  (`/data/adb/COPG-VD.json`, udokumentowany w [CONFIGURATION.md](CONFIGURATION.md)),
  silniki są małe i samodzielne, a układ znajduje się w [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Łatki wspierane przez AI są recenzowane i akceptowane na tych samych warunkach co każde inne - według
  poprawności, przejrzystości i poniższych konwencji, a nie według tego, kto (lub co) je napisał.
- Ta sama poprzeczka dla wszystkich: prawdziwa funkcja nigdy nie jest osłabiana, spoof pozostaje spójny, a
  nic tajnego ani specyficznego dla urządzenia nie trafia do repozytorium (zobacz [.gitignore](../../.gitignore)).

## Konfiguracja deweloperska

- Potrzebujesz zrootowanego urządzenia lub emulatora z Zygisk (KernelSU, APatch lub Magisk) do testów.
- Zbuduj natywną bibliotekę per ABI za pomocą NDK (r29) i CMake - zobacz krok `Build zygisk
  libraries` w [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) po
  dokładne polecenie. CI buduje wszystkie trzy ABI za Ciebie.
- Zbuduj zip do flashowania: skopiuj zbudowany `libspoof.so` do `module/zygisk/<abi>.so`, następnie
  `cd module && zip -r9 ../COPG-VD-dev.zip .` i zainstaluj go (flash).
- WebUI to `module/webroot/` (otwórz je z menedżera roota). Logika spoofowania to
  `zygisk/spoof_module.cpp`; pobieranie profilu to `module/fingerprint-update.sh`.

## Konwencje

- **Każdy plik źródłowy modułu** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) zaczyna się od
  nagłówka bannera projektu (skopiuj go z dowolnego istniejącego pliku). Narzędzia w `.github/` używają
  zamiast tego krótkiego komentarza.
- **Kod i komentarze po angielsku.** Utrzymuj komentarze minimalne i tylko tam, gdzie potrzebne.
- **Bez em-dash ani en-dash**; zawsze używaj zwykłego myślnika `-`.
- WebUI to **czysty JS** (jeden `scripts.js`); bez frameworków.
- **Nigdy nie osłabiaj** prawdziwej funkcji: utrzymuj spoof spójnym i nie doprowadzaj do tego, aby haki
  zawieszały aplikację, do której są dołączone (mają celowe sprawdzanie null).

## Internacjonalizacja (i18n)

- Ciągi interfejsu znajdują się w `module/webroot/lang/`. Angielski jest kanonicznym fallbackiem
  (`en.js` + `en.json`); pozostałe 20 języków to `<code>.json`.
- Aby dodać lub zmienić ciąg: edytuj `en.js` **oraz** `en.json`, następnie zaktualizuj każdy
  `<code>.json`. Dotknięcie widocznej etykiety oznacza aktualizację **wszystkich** plików językowych oraz
  **wszystkich** `README.<code>.md`.
- Tłumaczenia to zwykły JSON - świetny pierwszy wkład.

## Commity i PR-y

- Utrzymuj PR-y skupione. Opisz co i dlaczego.
- Podpisuj swoje commity (DCO): `git commit -s` (dodaje `Signed-off-by:`).
- CI musi pozostać zielone. Bądź życzliwy w recenzjach - zobacz [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Dobre pierwsze zadania

Szukaj etykiet `good first issue` i `help wanted`. Tłumaczenia, dokumentacja i nowe
profile Pixela to świetne punkty startowe.

*Ta dokumentacja została wygenerowana z Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [CONTRIBUTING.md](CONTRIBUTING.md).*
