> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · Polski · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architektura

COPG-VD to moduł Zygisk: mała natywna biblioteka (`libspoof.so`), którą loader Zygisk
wstrzykuje do zygote, a stamtąd do procesów aplikacji. Wszystko, co robi, to prezentowanie
wybranej tożsamości urządzenia procesom, które wskażesz. Nie ma aplikacji i, poza
opcjonalnym pobieraniem profilu, nie ma sieci.

## Cykl życia

1. **Start zygote.** Gdy zygote się uruchamia, loader wywołuje `onLoad` modułu. Odczytuje
   `/data/adb/COPG-VD.json` raz: konfigurację zakresu i profil.
2. **Fork aplikacji.** Dla każdej aplikacji, którą zygote forkuje, moduł decyduje w
   `preAppSpecialize`, czy ten proces jest w zakresie:
   - **w głównym zakresie** (`playstore` / `global` / `whitelist` / `blacklist`), lub
   - **w zakresie DRM** (wymieniony w `drm_targets`).
   Jeśli nie jest w żadnym, moduł **odłącza się** od tego procesu (`dlclose`) i nie pozostawia
   w nim śladu.
3. **Specialize.** Dla procesu, który pozostaje, silniki stosują się w `postAppSpecialize`,
   dopóki proces jest nadal uprzywilejowany.

Ponieważ forki dziedziczą kopię pamięci zygote w trybie copy-on-write, każda aplikacja startuje z konfiguracji
odczytanej przy rozruchu. Moduł ponownie odczytuje plik per docelowy proces tylko wtedy, gdy faktycznie
się zmienił, więc nowo uruchomiona lub ponownie otwarta aplikacja podchwytuje edytowany profil - ale sama
decyzja o zakresie jest podejmowana przy starcie zygote, więc **zmiana zakresu, silników lub
`drm_targets` wymaga ponownego uruchomienia**.

## Silniki

Każdy jest niezależny i przełączalny.

- **Pola Build (`motor_jni`).** Przepisuje `android.os.Build.*` (oraz `Build.VERSION.*`)
  w docelowym procesie poprzez JNI, więc kod Java odczytuje sfałszowane wartości.
- **Hak właściwości (`motor_prop_hook`).** Prezentuje sfałszowane właściwości systemowe
  procesowi poprzez czyste (clean-room), per proces remapowanie obszaru właściwości (`prop_virtualizer`).
  To remapowanie pamięci, nie hak na funkcję, więc nie ma śladu po zahaczonej funkcji.
- **resetprop (na poziomie całego urządzenia).** Zapisuje właściwości systemowe grupami - tożsamość, wersja,
  stan rozruchu, SELinux, adb/usb, anty-emulator, plus przebieg porządkujący. Uruchamiają go skrypty
  rozruchowe. W trybie z zakresem grupy tożsamości i wersji są pomijane (Zygisk dostarcza je
  per proces); grupy boot, lock i SELinux pozostają globalne, aby urządzenie było spójne.
- **DRM / Widevine (`motor_drm`).** Hakuje metody `MediaDrm`, które zgłaszają poziom bezpieczeństwa
  Widevine (`getSecurityLevel`, `getPropertyString`) i zwraca skonfigurowany
  poziom. Haki mają sprawdzanie null, więc wadliwy profil degraduje się łagodnie zamiast
  zawieszać aplikację. `drm_targets` pozwala temu silnikowi działać na własnej liście aplikacji, odłączonej od
  głównego zakresu.

## Odczytywanie konfiguracji

Wstrzyknięty proces działa w domenie SELinux zygote, która domyślnie nie może sięgnąć
`/data/adb`. Moduł dostarcza własną `sepolicy.rule`, aby na to pozwolić, oraz, jako fallback,
może odczytać konfigurację poprzez swój otwarty katalog modułu (`getModuleDir`), więc działa dalej
nawet jeśli jakiś build Zygisk przestanie przyznawać tę ścieżkę. Plik jest parsowany małym
wbudowanym parserem JSON (`jsmn`); plik, który się nie parsuje, oznacza, że moduł nie fałszuje niczego.

## Utrzymywanie profilu w świeżości

`fingerprint-update.sh` odświeża pola build z najnowszego fabrycznego obrazu Google,
z WebUI lub raz na rozruch. Używa własnego dołączonego downloadera modułu (nie `curl`/`wget`
z `PATH`), waliduje każdą wartość przed użyciem, nigdy się nie cofa i odrzuca
profil, który fałszuje inne urządzenie. `android.os.Build` jest zapisywane przy starcie zygote, więc
nowe wartości docierają do aplikacji przy następnym ponownym uruchomieniu. Zobacz [USER-GUIDE.md](USER-GUIDE.md) po stronę
użytkownika i [CONFIGURATION.md](CONFIGURATION.md) po pola.

## Dlaczego wersja Androida nie jest domyślnie fałszowana

Podniesienie `SDK_INT` / `ANDROID_VERSION` powyżej tego, czym naprawdę jest framework ROM-u, sprawia, że aplikacje
wywołują API, które nie istnieje, co zawiesza aplikacje Google i wprowadza telefon w
softloop. Grupa wersji jest zatem domyślnie wyłączona i strzeżona przez
`spoof_version`. Moduł odczytuje prawdziwą wersję z `/system/build.prop`, nigdy z
`getprop`, ponieważ `getprop` jest dokładnie tym, co fałszuje. Zobacz pułapkę w
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Ta dokumentacja została wygenerowana z Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [../CONTRIBUTING.md](CONTRIBUTING.md).*
