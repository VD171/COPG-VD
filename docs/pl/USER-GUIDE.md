> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · Polski · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Przewodnik użytkownika

COPG-VD przepisuje odcisk urządzenia (fingerprint) oraz build tak, aby wybrane przez Ciebie
aplikacje widziały Pixela zamiast Twojego prawdziwego urządzenia. Ten przewodnik prowadzi Cię
od instalacji do działającej konfiguracji i przez decyzje po drodze. Opis każdego pola i wartości
znajdziesz w [CONFIGURATION.md](CONFIGURATION.md); jak to działa od środka - zobacz [ARCHITECTURE.md](ARCHITECTURE.md).

## Instalacja

1. Zainstaluj (flash) zip w KernelSU, APatch lub Magisk i uruchom ponownie urządzenie.
2. Zygisk musi być aktywny (wbudowany lub ReZygisk / Zygisk Next). Użytkownicy Magisk: włączcie Zygisk.
3. Moduł dostarcza profil Pixela, więc zaraz po ponownym uruchomieniu stos Google Play
   już widzi tego Pixela. Z działającym odciskiem nie potrzebujesz PlayIntegrityFix ani
   GooglePhotosUnlimited.

Otwórz WebUI z poziomu menedżera roota, aby sterować modułem. Użytkownicy Magisk otwierają je za pomocą
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Wszystko
można też edytować bezpośrednio w `/data/adb/COPG-VD/COPG-VD.json`.

## Kto widzi spoof (zakres)

`scope_mode` decyduje, które procesy otrzymują sfałszowaną tożsamość. W trybie z zakresem
tożsamość jest dostarczana per proces przez Zygisk i **nie** wycieka do reszty
systemu poprzez globalne właściwości.

| Tryb | Kto dostaje spoof |
|---|---|
| `playstore` (domyślny) | Tylko stos Play: usługi Google Play, ich niestabilny proces oraz Sklep Play. |
| `global` | Całe urządzenie: każdy proces. |
| `whitelist` | Tylko aplikacje wymienione w `scope_whitelist`. |
| `blacklist` | Każda aplikacja oprócz tych z `scope_blacklist`. |

Zacznij od `playstore`. To najlżejsza opcja i ta, która przechodzi Play Integrity
bez wystawiania spoofu na niepowiązane aplikacje.

## Silniki

Każdy silnik jest niezależny i można go wyłączyć. Wszystkie są domyślnie włączone z wyjątkiem DRM.

- **Pola Build (`motor_jni`)** - przepisuje `android.os.Build.*` w docelowych
  procesach. To właśnie czyta większość aplikacji.
- **Hak właściwości (`motor_prop_hook`)** - prezentuje sfałszowane właściwości systemowe
  docelowym procesom, poprzez czyste (clean-room) remapowanie obszaru właściwości per proces (bez
  haka na funkcję).
- **resetprop** - przepisuje właściwości systemowe na poziomie całego urządzenia, grupami (tożsamość,
  wersja, stan rozruchu, SELinux, adb/usb, anty-emulator oraz przebieg porządkujący). W trybie z
  zakresem grupy tożsamości i wersji pozostają poza przebiegiem obejmującym całe urządzenie (Zygisk
  dostarcza je per proces); grupy boot, lock i SELinux pozostają globalne. Przełącz w
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, domyślnie wyłączony)** - zgłasza wybrany poziom bezpieczeństwa
  Widevine (L1 lub L3) aplikacjom, które go odczytują. Zobacz sekcję DRM poniżej.

## Utrzymywanie odcisku w świeżości

Odcisk się starzeje: Google rotuje obrazy fabryczne, a stary powoli traci wartość.
`fingerprint-update.sh` utrzymuje Twój aktualny, na podstawie najnowszego fabrycznego obrazu Google.

- Z WebUI (zakładka Tools): **Check Update** i **Update Now**.
- Samodzielnie, **raz na rozruch**: **Auto-update JSON on boot** (domyślnie włączone). Działa w
  tle, ponawia próby przez około dziesięć minut, ponieważ wifi zazwyczaj nie jest jeszcze gotowe
  przy rozruchu, i nigdy nie opóźnia rozruchu.
- Przepisuje tylko pola build (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Wszystko, co dostosowałeś, zostaje zachowane, a poprzednia
  zawartość jest zapisywana jako `.bak`.
- Nigdy nie cofa się (starszy build z upstream jest odrzucany), a jeśli Twój profil fałszuje
  inne urządzenie, nie stosuje niczego - odcisk Pixela na innym profilu jest gorszy
  niż stary.
- `resetprop` jest ponownie stosowane zaraz po aktualizacji, ale `android.os.Build` jest zapisywane,
  gdy startuje zygote, więc **uruchom ponownie**, aby nowe wartości dotarły do aplikacji. Log:
  `/data/adb/COPG-VD/update.log`.

## Pułapka wersji Androida

Najtrudniejsza rzecz do poprawnego ustawienia. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` i `CODENAME`
opisują **Twój ROM**, a nie urządzenie, które fałszujesz. Mówienie aplikacjom, że SDK jest nowsze niż
framework w rzeczywistości, sprawia, że wywołują API, które nie istnieje: aplikacje Google się zawieszają, telefon
uruchamia się ponownie i zaczyna od nowa. Sam rozruch dochodzi do końca, więc to **softloop**, który
nie pozostawia niczego w logach rozruchu.

Te pola nie znajdują się w dostarczanej konfiguracji, a aktualizator nigdy ich nie zapisuje. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) decyduje, czy w ogóle są stosowane:

- `never` (domyślnie) - używana jest własna wersja ROM-u.
- `rom` - stosuje tylko to, co nie przekracza ROM-u, co w praktyce oznacza obniżenie SDK.
- `force` - stosuje dokładnie to, co mówi konfiguracja. To właśnie powoduje softloop; używaj go
  tylko jeśli wiesz, że docelowy framework to obsługuje.

Prawdziwa wersja jest odczytywana z `/system/build.prop`, nigdy z `getprop` (który jest tym
samym, co ten moduł fałszuje). `force` jest również odrzucane podczas przywracania kopii zapasowej, więc
stara kopia zapasowa nie może go ponownie uzbroić za Twoimi plecami.

## DRM / Widevine

Domyślnie wyłączony (`motor_drm`). Gdy włączony, zgłasza wybrany poziom Widevine,
`DRM_SECURITY_LEVEL` (`L1` lub `L3`), aplikacjom, które go odczytują.

Domyślnie spoof DRM podąża za `scope_mode`. Aby zastosować go do konkretnego zestawu aplikacji
zamiast tego - niezależnie od głównego zakresu - wymień je w `drm_targets`. Moduł wówczas
pozostaje załadowany w wymienionej aplikacji **wyłącznie** dla haka DRM, nawet gdy ta aplikacja jest poza
głównym zakresem; pusta lub nieobecna lista oznacza podążanie za zakresem. Wymaga to trybu z zakresem (nie
`global`) i zaczyna obowiązywać po następnym **ponownym uruchomieniu**.

## Analyze: sprawdź swoją konfigurację

**Analyze** w WebUI (lub `fingerprint-update.sh analyze`) audytuje konfigurację w obecnym
stanie i mówi, co jest nie tak, zanim zrobi to aplikacja:

- wersję względem ROM-u (czy spowoduje softloop?),
- czy plik nadal się parsuje (uszkodzony sprawia, że moduł nie fałszuje **niczego**, a powie o tym
  tylko logcat),
- czy fingerprint zgadza się z polami wokół niego,
- klucze, których moduł nie odczytuje, podejrzane daty oraz czy aktualne właściwości już
  zawierają to, o co prosi konfiguracja.

Uruchamiaj to za każdym razem, gdy edytujesz konfigurację ręcznie.

## WebUI

Opcjonalne, ale łatwy sposób sterowania wszystkim. Pięć zakładek:

- **About** - informacje o module i wersji.
- **Device** - każde pole build, ustawiane per stan i pogrupowane według kategorii.
- **Spoofing** - tryb zakresu i przełączniki silników.
- **System** - grupy resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, auto-aktualizacja przy rozruchu
  oraz raport Diagnostics (jeden przycisk do odczytania i wyeksportowania wszystkiego przydatnego do zgłoszenia
  błędu).

Nie wykonuje żadnego żądania sieciowego; wszystko, czego potrzebuje, jest dostarczane wewnątrz modułu.

## Rozwiązywanie problemów

- **Aplikacja nadal widzi prawdziwe urządzenie.** Sprawdź zakres: w `playstore` objęty jest tylko stos
  Play. Potwierdź, że konfiguracja się parsuje (uruchom Analyze). Po zmianie silników,
  `drm_targets` lub profilu **uruchom ponownie** - Zygisk odczytuje zakres, gdy startuje zygote.
- **Play Integrity nadal zawodzi.** Upewnij się, że fingerprint jest świeży (Check Update) i
  że `SECURITY_PATCH` jest w `global_fields`, aby pozostawał spójny na poziomie całego urządzenia. Zabij
  usługi Google Play, aby ponownie przeprowadziły atestację.
- **Telefon wpada w softloop po włączeniu spoofowania wersji.** To pułapka wersji Androida
  powyżej - ustaw `spoof_version` z powrotem na `never`.
- **WebUI nie otwiera się na Magisk.** Użyj [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Ta dokumentacja została wygenerowana z Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
