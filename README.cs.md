## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD je modul navrzeny pro globalni spoofing zarizeni.  
To znamena, ze hooknute budou i systemove aplikace a cele zarizeni.  
  
## Jak se pouziva?
Pokud pouzivas tento modul a spoofujes funkcni FingerPrint, neni treba pouzivat PlayIntegrityFix ani GooglePhotosUnlimited.  
### Priklad konfiguracniho souboru JSON  
`/data/adb/COPG-VD.json`
* Vsechna pole jsou VOLITELNA. Pokud nejake pole neni uvedeno, bude preskoceno.  
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
Dbej na to, abys retezce pouzival vyhradne v dvojitych uvozovkach.  
Blok vyse a `module/COPG-VD.json.example` jsou denne obnovovany workflow [Update COPG-VD.json](.github/workflows/update-json.yml), primo z nejnovejsiho tovarniho obrazu Google.  
### Udrzovani fingerprintu aktualniho  
`fingerprint-update.sh` stahne tento soubor a aktualizuje tvou konfiguraci, z WebUI (**Check Update** / **Update Now**) nebo sam od sebe **jednou za boot** (**Auto-update JSON on boot**, ve vychozim stavu zapnuto).  
* Pokud existuji oba, aktualizuji se `/data/adb/COPG-VD.json` i `/data/adb/modules/COPG-VD/COPG-VD.json`, a predchozi obsah se uchova jako `.bak`.  
* Prepisuji se pouze pole buildu (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Vse ostatni, co sis prizpusobil, se zachova: dalsi klice, `BOOTLOADER`/`BOARD`/`HARDWARE`, dalsi objekty, poradi klicu a formatovani.  
* Nikdy nejde zpet: upstream build starsi nez ten nainstalovany je odmitnut. To je
  bezne (repozitar muze zaostavat za konfiguraci, kterou jsi aktualizoval rucne) a je to zaroven ochrana, ktera
  je na Androidu nejdulezitejsi, kde jedinym dostupnym stahovacem je busybox `wget`, ktery neumi
  overit TLS certifikaty - ze stejneho duvodu je kazda hodnota pred pouzitim validovana.  
* Pokud tvuj profil spoofuje **jine zarizeni** (odlisne `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), neaplikuje se nic - fingerprint Pixelu na jinem profilu je horsi nez stary fingerprint.  
* Pri bootu bezi na pozadi a opakovane to zkousi asi 10 minut, protoze wifi obvykle jeste nebezi, kdyz boot skonci. Boot nikdy nezdrzuje.  
* `resetprop` se znovu aplikuje hned po aktualizaci, ale `android.os.Build` zapisuje zygisk modul pri startu zygote: **restartuj**, aby se nove hodnoty dostaly do aplikaci.  
* Log v `/data/adb/COPG-VD.update.log`.  
### Verze Androidu - a proc se nespoofuje  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` a `CODENAME` popisuji **tvou ROM**, ne spoofovane zarizeni. Rikat aplikacim, ze SDK je novejsi, nez framework ve skutecnosti je, je donuti volat API, ktera neexistuji: aplikace Googlu padaji, telefon se restartuje a zacina znovu. Samotny boot se dokonci, takze jde o **softloop** a v boot lozich se nic neobjevi.  
* Nejsou v dodavane konfiguraci a aktualizator je nikdy nezapisuje.  
* **Spoof Android version** ve WebUI rozhoduje, zda se vubec aplikuji:  
  * **Never** (vychozi) - pouzije se vlastni verze ROM.  
  * **Up to this ROM** - jen to, co ji neprekracuje, coz v praxi znamena snizeni SDK.  
  * **Force** - presne to, co rika konfigurace. Prave to zpusobuje softloop.  
* Skutecna verze se cte z `/system/build.prop`, nikdy z `getprop` - presne to je totiz to, co tento modul falsuje.  
### Analyze  
**Analyze** ve WebUI (nebo `fingerprint-update.sh analyze`) prozkouma konfiguraci v jejim aktualnim stavu: verzi proti ROM, zda se soubor vubec jeste da naparsovat (rozbity zpusobi, ze modul nespoofuje **nic**, a rekne to jen logcat), zda fingerprint souhlasi s okolnimi poli, klice, ktere modul necte, data a zda props jiz obsahuji to, co konfigurace pozaduje.  
### Nastaveni v konfiguraci  
`COPG-VD.json` muze nest objekt `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - aby tva volby cestovala se zalohou a dala se upravovat rucne. WebUI zapisuje jak tohle, tak flag soubory, ktere ctou boot skripty. `"spoof_version": "force"` je ze souboru odmitnuto a degradovano: obnoveni stare zalohy to nesmi za tvymi zady znovu nadrazit.  
### WebUI  
Pouzivani WebUI neni nutne, pokud upravujes konfiguracni soubor JSON primo.  
Pokud jsi uzivatel Magisku, pouzij KsuWebUI od KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Vypni pouzivani resetprop a zapni pouze spoofing Build info.  
#### Use ro.product.manufacturer:  
Vypni, pokud ti zalezi na detekci "Found device spoofing" v aplikaci na detekci rootu Disclosure.  

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
