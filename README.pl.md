## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD to moduł zaprojektowany do globalnego spoofingu urządzenia.  
Oznacza to, że przechwycone zostaną nawet aplikacje systemowe i całe urządzenie.  
  
## Jak używać?
Podczas korzystania z tego modułu i spoofowania działającego FingerPrint, używanie PlayIntegrityFix lub GooglePhotosUnlimited jest zbędne.  
### Przykładowy plik konfiguracyjny JSON  
`/data/adb/COPG-VD.json`
* Wszystkie pola są OPCJONALNE. Jeśli jakieś pole nie zostanie podane, zostanie pominięte.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
Pamiętaj, aby używać ciągów znaków tylko w podwójnych cudzysłowach.  
Blok powyżej oraz `module/COPG-VD.json.example` są codziennie odświeżane przez workflow [Update COPG-VD.json](.github/workflows/update-json.yml), prosto z najnowszego fabrycznego obrazu Google.  
### Utrzymywanie fingerprint w aktualności  
`fingerprint-update.sh` pobiera ten plik i aktualizuje twoją konfigurację, z poziomu WebUI (**Check Update** / **Update Now**) lub samodzielnie **raz na rozruch** (**Auto-update JSON on boot**, domyślnie włączone).  
* Zarówno `/data/adb/COPG-VD.json`, jak i `/data/adb/modules/COPG-VD/COPG-VD.json` są aktualizowane, gdy oba istnieją, a poprzednia zawartość jest zachowywana jako `.bak`.  
* Przepisywane są tylko pola build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Wszystko inne, co dostosowałeś, jest zachowywane: dodatkowe klucze, `BOOTLOADER`/`BOARD`/`HARDWARE`, inne obiekty, kolejność kluczy i formatowanie.  
* Nigdy nie cofa się: build upstream starszy niż zainstalowany jest odrzucany. Jest to
  rutyna (repozytorium może być w tyle za konfiguracją, którą zaktualizowałeś ręcznie) i jest to także zabezpieczenie, które
  ma największe znaczenie na Androidzie, gdzie jedynym dostępnym downloaderem jest busybox `wget`, który nie potrafi
  weryfikować certyfikatów TLS - z tego samego powodu każda wartość jest weryfikowana przed użyciem.  
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
### Ustawienia w konfiguracji  
`COPG-VD.json` może nieść obiekt `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - aby twoje wybory podróżowały wraz z kopią zapasową i mogły być edytowane ręcznie. WebUI zapisuje zarówno to, jak i pliki flag, które czytają skrypty rozruchowe. `"spoof_version": "force"` jest odrzucany z pliku i degradowany: przywrócenie starej kopii zapasowej nie może go ponownie uzbroić za twoimi plecami.  
### WebUI  
Korzystanie z WebUI jest zbędne, jeśli edytujesz plik konfiguracyjny JSON bezpośrednio.  
Jeśli jesteś użytkownikiem Magisk, użyj KsuWebUI autorstwa KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Wyłącz użycie resetprop i włącz tylko spoofing Build info.  
#### Use ro.product.manufacturer:  
Wyłącz, jeśli zależy ci na detekcji "Found device spoofing" w aplikacji wykrywającej root Disclosure.  

## Kontakty

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
