## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD je spoofer zařízení: přepisuje fingerprint a build zařízení tak, aby aplikace viděly zařízení, které si zvolíš, místo toho skutečného.  
Běží na Zygisku (KernelSU, APatch nebo Magisk) a ve výchozím nastavení omezuje spoofing na stack Google Play - takže je lehčí a robustnější alternativou k PlayIntegrityFix.  

## Snímky obrazovky

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Jak se používá?
Nainstaluj modul, restartuj, a dodávaný profil (Pixel) se spoofuje cílovým aplikacím. S funkčním fingerprintem nepotřebuješ PlayIntegrityFix ani GooglePhotosUnlimited.  
Vše se konfiguruje v `/data/adb/COPG-VD.json` nebo z WebUI. Všechna pole jsou VOLITELNÁ - pole, které není uvedeno, se přeskočí.  

### Scope - kdo spoofing vidí
`scope_mode` rozhoduje, které procesy dostanou spoofovanou identitu. V omezeném režimu dodává identitu Zygisk pro každý proces zvlášť a neuniká do zbytku systému přes globální properties.  
* **Google Play** (`playstore`, výchozí) - pouze stack Play (Google Play services, jeho unstable proces a Play Store).  
* **Global** - celé zařízení; vidí ji každý proces.  
* **Whitelist** - pouze aplikace v `scope_whitelist`.  
* **Blacklist** - každá aplikace kromě těch v `scope_blacklist`.  

### Engines - jak se spoofing dodává
Každý je nezávislý a lze jej vypnout:  
* **Build fields (JNI)** - přepisuje `android.os.Build.*` v cílových procesech.  
* **Property hook** - předkládá cílovým procesům spoofované systémové properties (čisté přemapování oblasti properties pro každý proces zvlášť, bez hooku funkce).  
* **resetprop** - přepisuje systémové properties, spravované po skupinách: identita, verze, stav bootu, SELinux, adb/usb, anti-emulátor a úklidový průchod. V omezeném režimu zůstávají skupiny identity a verze mimo celozařízový resetprop (Zygisk je dodává pro každý proces); skupiny boot/lock/SELinux zůstávají globální.  
* **DRM / Widevine** (ve výchozím nastavení vypnuto) - hlásí aplikacím, které jej čtou, zvolenou úroveň zabezpečení Widevine, L1 nebo L3.  

### Fields - nastavit, vyprázdnit, smazat nebo přeskočit
Uvnitř objektu `COPG-VD` má každé pole Build čtyři stavy:  
* **Set** - `"KEY": "value"` zapíše hodnotu.  
* **Empty** - `"KEY": ""` zapíše prázdnou hodnotu.  
* **Delete** - uveď klíč v `"COPG-VD-Delete": [ ... ]` na nejvyšší úrovni, aby se odstranil (pole Build se změní na null, property se odstraní pomocí `resetprop --delete`).  
* **Skip** - klíč zcela vynech; zachová se vlastní hodnota ROM.  

Seznam `"global_fields": [ ... ]` aplikuje uvedená pole Build na celé zařízení i v omezeném režimu, aby hodnota byla všude konzistentní - pouze pro pole bezpečná z hlediska koherence (například security patch), nikdy identitu a nikdy skupinu verze Androidu.  

### Příklad konfiguračního souboru JSON
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
Dbej na to, abys používal řetězce pouze v dvojitých uvozovkách.  
Blok výše a `module/COPG-VD.json.example` jsou denně aktualizovány workflow [Update COPG-VD.json](.github/workflows/update-json.yml), přímo z nejnovějšího továrního image Google.  

### Udržování fingerprintu aktuálního
`fingerprint-update.sh` stáhne tento soubor a aktualizuje tvou konfiguraci, z WebUI (**Check Update** / **Update Now**) nebo sám od sebe **jednou za boot** (**Auto-update JSON on boot**, ve výchozím stavu zapnuto).  
* `/data/adb/COPG-VD.json` i `/data/adb/modules/COPG-VD/COPG-VD.json` se aktualizují, pokud existují oba, a předchozí obsah se uchová jako `.bak`.  
* Přepisují se pouze pole build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Vše ostatní, co sis přizpůsobil, se zachová: další klíče, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, jiné objekty, pořadí klíčů a formátování.  
* Nikdy nejde zpět: upstream build starší než nainstalovaný je odmítnut. To je
  běžné (repo může zaostávat za konfigurací, kterou jsi aktualizoval ručně) a je to také ochrana, na které
  na Androidu nejvíc záleží, kde jediný dostupný stahovač je busybox `wget`, který neumí
  ověřit TLS certifikáty - ze stejného důvodu je každá hodnota před použitím ověřena.  
* Pokud tvůj profil spoofuje **jiné zařízení** (odlišné `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), nic se neaplikuje - fingerprint Pixelu v jiném profilu je horší než starý fingerprint.  
* Při bootu běží na pozadí a zkouší to znovu po dobu ~10 minut, protože wifi obvykle ještě nenaběhla, když boot skončí. Boot nikdy nezdržuje.  
* `resetprop` se znovu aplikuje hned po aktualizaci, ale `android.os.Build` zapisuje zygisk modul při startu zygoty: **restartuj**, aby nové hodnoty dorazily k aplikacím.  
* Log v `/data/adb/COPG-VD.update.log`.  

### Verze Androidu - a proč se nespoofuje
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` a `CODENAME` popisují **tvou ROM**, nikoli spoofované zařízení. Tvrdit aplikacím, že SDK je novější, než je framework ve skutečnosti, je přiměje volat API, která neexistují: aplikace Google spadnou, telefon se restartuje a začne znovu. Samotný boot se dokončí, takže jde o **softloop** a v boot logách se nic neobjeví.  
* Nejsou v dodávané konfiguraci a aktualizátor je nikdy nezapisuje.  
* **Spoof Android version** ve WebUI rozhoduje, zda se vůbec aplikují:  
  * **Never** (výchozí) - použije se vlastní verze ROM.  
  * **Up to this ROM** - jen to, co ji nepřekročí, což v praxi znamená snížení SDK.  
  * **Force** - přesně to, co říká konfigurace. To je to, co způsobuje softloop.  
* Skutečná verze se čte z `/system/build.prop`, nikdy z `getprop` - což je právě to, co tento modul falšuje.  

### Analyze
**Analyze** ve WebUI (nebo `fingerprint-update.sh analyze`) prověří konfiguraci v aktuálním stavu: verzi proti ROM, zda se soubor vůbec ještě dá naparsovat (poškozený způsobí, že modul nespoofuje **nic**, a řekne to jen logcat), zda fingerprint souhlasí s poli kolem něj, klíče, které modul nečte, data, a zda props už nesou to, co konfigurace požaduje.  

### WebUI
WebUI je volitelné - vše lze upravovat přímo v JSON konfiguraci - ale je to snadný způsob, jak modul ovládat. Má pět záložek: **About**, **Device** (každé pole, nastavené po stavech, seskupené podle kategorie), **Spoofing** (scope a engines), **System** (skupiny resetprop) a **Tools** (Analyze, Check Update, Update Now, Backup/Restore a auto-update při bootu). Neposílá žádný síťový požadavek; vše, co potřebuje, je součástí modulu.  
Pokud jsi uživatel Magisku, použij KsuWebUI od KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Nastavení v konfiguraci
`COPG-VD.json` nese svá nastavení hned vedle profilu, takže tvá rozhodnutí cestují se zálohou a dají se upravovat ručně: `scope_mode`, přepínače engines, skupiny resetprop, `global_fields` a objekt `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). WebUI zapisuje jak konfiguraci, tak flag soubory, které čtou boot skripty. `"spoof_version": "force"` je ze souboru odmítnut a snížen: obnovení staré zálohy ho nesmí za tvými zády znovu aktivovat.  

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
