## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD to spoofer urządzenia: przepisuje fingerprint i build urządzenia, aby aplikacje widziały urządzenie, które wybierzesz, zamiast prawdziwego.  
Działa na Zygisk (KernelSU, APatch lub Magisk) i domyślnie ogranicza spoofing do stosu Google Play - przez co jest lżejszą i bardziej niezawodną alternatywą dla PlayIntegrityFix.  

## Zrzuty ekranu

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Jak używać?
Zainstaluj moduł, zrestartuj, a dostarczony profil (Pixel) jest spoofowany dla docelowych aplikacji. Z działającym fingerprint nie potrzebujesz PlayIntegrityFix ani GooglePhotosUnlimited.  
Wszystko konfiguruje się w `/data/adb/COPG-VD.json` lub z poziomu WebUI. Wszystkie pola są OPCJONALNE - pole, które nie zostanie podane, jest pomijane.  

### Zakres - kto widzi spoofing
`scope_mode` decyduje, które procesy otrzymują spoofowaną tożsamość. W trybie z zakresem tożsamość jest dostarczana per proces przez Zygisk i nie wycieka do reszty systemu przez właściwości globalne.  
* **Google Play** (`playstore`, domyślnie) - tylko stos Play (Google Play services, jego proces unstable i Play Store).  
* **Global** - całe urządzenie; widzi ją każdy proces.  
* **Whitelist** - tylko aplikacje w `scope_whitelist`.  
* **Blacklist** - wszystkie aplikacje oprócz tych w `scope_blacklist`.  

### Silniki - jak dostarczany jest spoofing
Każdy z nich jest niezależny i można go wyłączyć:  
* **Build fields (JNI)** - przepisuje `android.os.Build.*` w docelowych procesach.  
* **Property hook** - przedstawia spoofowane właściwości systemowe docelowym procesom (czyste, przeprowadzane per proces remapowanie obszaru właściwości, bez hooka funkcji).  
* **resetprop** - przepisuje właściwości systemowe, zarządzane grupami: tożsamość, wersja, stan rozruchu, SELinux, adb/usb, anty-emulator i przebieg czyszczący. W trybie z zakresem grupy tożsamości i wersji pozostają poza obejmującym całe urządzenie resetprop (Zygisk dostarcza je per proces); grupy rozruchu/blokady/SELinux pozostają globalne.  
* **DRM / Widevine** (domyślnie wyłączone) - zgłasza wybrany poziom bezpieczeństwa Widevine, L1 lub L3, aplikacjom, które go odczytują.  

### Pola - ustaw, puste, usuń lub pomiń
Wewnątrz obiektu `COPG-VD` każde pole Build ma cztery stany:  
* **Ustaw** - `"KEY": "value"` zapisuje wartość.  
* **Puste** - `"KEY": ""` zapisuje pustą wartość.  
* **Usuń** - wypisz klucz w `"COPG-VD-Delete": [ ... ]` najwyższego poziomu, aby go usunąć (pole Build staje się null, właściwość jest usuwana przez `resetprop --delete`).  
* **Pomiń** - całkowicie pomiń klucz; zachowywana jest własna wartość ROM.  

Lista `"global_fields": [ ... ]` stosuje wymienione pola Build dla całego urządzenia nawet w trybie z zakresem, aby zachować spójną wartość wszędzie - tylko dla pól bezpiecznych pod względem spójności (na przykład security patch), nigdy dla tożsamości i nigdy dla grupy wersji Androida.  

### Przykładowy plik konfiguracyjny JSON
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.260918.007-factory-f5955275.zip",
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.260918.007/16484274:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.260918.007",
    "ID": "ZP11.260918.007",
    "HOST": "51b22e6d8afb",
    "INCREMENTAL": "16484274",
    "TIMESTAMP": "1790806751",
    "PREVIEW_SDK": "20261007",
    "USER": "android-build",
    "SDK_FINGERPRINT": "d9ad4b00fa641d6e43c42cc969f49492",
    "UUID": "_mQOcxvuFzRVZAjNEr2UUUpk2fv0mqDc8RpFyaeJjuk",
    "SECURITY_PATCH": "2026-10-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "global_fields": ["SECURITY_PATCH"]
}
```
Pamiętaj, aby używać ciągów znaków tylko w podwójnych cudzysłowach.  
Blok powyżej oraz `module/COPG-VD.json.example` są codziennie odświeżane przez workflow [Update COPG-VD.json](.github/workflows/update-json.yml), prosto z najnowszego fabrycznego obrazu Google.  

### Utrzymywanie fingerprint w aktualności
`fingerprint-update.sh` pobiera ten plik i aktualizuje twoją konfigurację, z poziomu WebUI (**Check Update** / **Update Now**) lub samodzielnie **raz na rozruch** (**Auto-update JSON on boot**, domyślnie włączone).  
* Zarówno `/data/adb/COPG-VD.json`, jak i `/data/adb/modules/COPG-VD/COPG-VD.json` są aktualizowane, gdy oba istnieją, a poprzednia zawartość jest zachowywana jako `.bak`.  
* Przepisywane są tylko pola build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Wszystko inne, co dostosowałeś, jest zachowywane: dodatkowe klucze, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, inne obiekty, kolejność kluczy i formatowanie.  
* Nigdy nie cofa się: build upstream starszy niż zainstalowany jest odrzucany. Jest to rutyna (repozytorium może być w tyle za konfiguracją, którą zaktualizowałeś ręcznie) i jest to także zabezpieczenie, które ma największe znaczenie na Androidzie, gdzie jedynym dostępnym downloaderem jest busybox `wget`, który nie potrafi weryfikować certyfikatów TLS - z tego samego powodu każda wartość jest weryfikowana przed użyciem.  
* Jeśli twój profil spoofuje **inne urządzenie** (inne `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), nic nie jest stosowane - fingerprint Pixela na innym profilu jest gorszy niż stary fingerprint.  
* Przy rozruchu działa w tle i ponawia próby przez około 10 minut, ponieważ wifi zwykle nie jest jeszcze podniesione, gdy rozruch się kończy. Nigdy nie opóźnia rozruchu.  
* `resetprop` jest ponownie stosowany zaraz po aktualizacji, ale `android.os.Build` jest zapisywany przez moduł zygisk, gdy startuje zygote: **zrestartuj**, aby nowe wartości dotarły do aplikacji.  
* Log w `/data/adb/COPG-VD.update.log`.  

### Wersja Androida - i dlaczego nie jest spoofowana
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` i `CODENAME` opisują **twoją ROM**, a nie spoofowane urządzenie. Mówienie aplikacjom, że SDK jest nowsze niż framework w rzeczywistości, sprawia, że wywołują API, które nie istnieją: aplikacje Google się wywalają, telefon się restartuje i zaczyna od nowa. Sam rozruch się kończy, więc jest to **softloop** i nic nie pojawia się w logach rozruchu.  
* Nie ma ich w dostarczonej konfiguracji, a aktualizator nigdy ich nie zapisuje.  
* **Spoof Android version** w WebUI decyduje, czy są one w ogóle stosowane:  
  * **Never** (domyślnie) - używana jest własna wersja ROM.  
  * **Up to this ROM** - tylko to, co jej nie przekracza, co w praktyce oznacza obniżenie SDK.  
  * **Force** - dokładnie to, co mówi konfiguracja. To właśnie powoduje softloop.  
* Prawdziwa wersja jest odczytywana z `/system/build.prop`, nigdy z `getprop` - bo to właśnie jego ten moduł fałszuje.  

### Analyze
**Analyze** w WebUI (lub `fingerprint-update.sh analyze`) audytuje konfigurację w jej obecnej postaci: wersję względem ROM, czy plik w ogóle się jeszcze parsuje (uszkodzony sprawia, że moduł nie spoofuje **niczego**, i mówi o tym tylko logcat), czy fingerprint zgadza się z otaczającymi go polami, klucze, których moduł nie czyta, daty oraz czy props już niosą to, o co prosi konfiguracja.  

### WebUI
WebUI jest opcjonalne - wszystko można edytować bezpośrednio w konfiguracji JSON - ale to łatwy sposób na obsługę modułu. Ma pięć zakładek: **About**, **Device** (każde pole, ustawiane per stan, pogrupowane według kategorii), **Spoofing** (zakres i silniki), **System** (grupy resetprop) i **Tools** (Analyze, Check Update, Update Now, Backup/Restore oraz auto-aktualizacja przy rozruchu). Nie wykonuje żadnego żądania sieciowego; wszystko, czego potrzebuje, jest dostarczane wewnątrz modułu.  
Jeśli jesteś użytkownikiem Magisk, użyj KsuWebUI autorstwa KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Ustawienia w konfiguracji
`COPG-VD.json` przechowuje swoje ustawienia obok profilu, więc twoje wybory podróżują wraz z kopią zapasową i mogą być edytowane ręcznie: `scope_mode`, przełączniki silników, grupy resetprop, `global_fields` oraz obiekt `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). WebUI zapisuje zarówno konfigurację, jak i pliki flag, które czytają skrypty rozruchowe. `"spoof_version": "force"` jest odrzucany z pliku i degradowany: przywrócenie starej kopii zapasowej nie może go ponownie uzbroić za twoimi plecami.  

## Kontakty

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tagi:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
