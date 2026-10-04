## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD is een module ontworpen voor globale apparaatspoofing.  
Dit betekent dat zelfs systeemapps en het hele apparaat gehookt worden.  
  
## Hoe te gebruiken?
Als je deze module gebruikt en een werkende FingerPrint spooft, is het gebruik van PlayIntegrityFix of GooglePhotosUnlimited niet nodig.  
### Voorbeeld van JSON-configuratiebestand  
`/data/adb/COPG-VD.json`
* Alle velden zijn OPTIONEEL. Als een veld niet wordt opgegeven, wordt het overgeslagen.  
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
Zorg ervoor dat je strings alleen tussen dubbele aanhalingstekens gebruikt.  
Het blok hierboven en `module/COPG-VD.json.example` worden dagelijks ververst door de [Update COPG-VD.json](.github/workflows/update-json.yml) workflow, rechtstreeks uit de nieuwste factory image van Google.  
### De fingerprint actueel houden  
`fingerprint-update.sh` haalt dat bestand op en werkt je configuratie bij, vanuit de WebUI (**Check Update** / **Update Now**) of vanzelf **één keer per boot** (**Auto-update JSON on boot**, standaard aan).  
* Zowel `/data/adb/COPG-VD.json` als `/data/adb/modules/COPG-VD/COPG-VD.json` worden bijgewerkt wanneer beide bestaan, en de vorige inhoud wordt bewaard als `.bak`.  
* Alleen de build-velden worden herschreven (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Al het andere dat je hebt aangepast blijft behouden: extra sleutels, `BOOTLOADER`/`BOARD`/`HARDWARE`, andere objecten, sleutelvolgorde en opmaak.  
* Het gaat nooit achteruit: een upstream build die ouder is dan de geïnstalleerde wordt geweigerd. Dit is
  routine (de repository kan achterlopen op een configuratie die je met de hand hebt bijgewerkt) en het is ook de bescherming die
  het meest telt op Android, waar de enige beschikbare downloader busybox `wget` is, die geen
  TLS-certificaten kan valideren - om dezelfde reden wordt elke waarde gevalideerd voor gebruik.  
* Als je profiel **een ander apparaat** spooft (andere `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), wordt er niets toegepast - een Pixel-fingerprint op een ander profiel is slechter dan een oude fingerprint.  
* Bij het booten draait het op de achtergrond en blijft het ongeveer 10 minuten opnieuw proberen, omdat wifi meestal nog niet beschikbaar is wanneer het booten klaar is. Het vertraagt het booten nooit.  
* `resetprop` wordt direct na een update opnieuw toegepast, maar `android.os.Build` wordt geschreven door de zygisk-module wanneer zygote start: **herstart** om de nieuwe waarden bij de apps te laten komen.  
* Logboek op `/data/adb/COPG-VD.update.log`.  
### Android-versie - en waarom die niet gespooft wordt  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` en `CODENAME` beschrijven **jouw ROM**, niet het apparaat dat gespooft wordt. Apps vertellen dat de SDK nieuwer is dan het framework werkelijk is, laat ze API's aanroepen die niet bestaan: de apps van Google crashen, de telefoon herstart, en het begint opnieuw. Het booten zelf voltooit, dus het is een **softloop** en er verschijnt niets in de bootlogs.  
* Ze zitten niet in de meegeleverde configuratie en de updater schrijft ze nooit.  
* **Spoof Android version** in de WebUI bepaalt of ze überhaupt worden toegepast:  
  * **Never** (standaard) - de eigen versie van de ROM wordt gebruikt.  
  * **Up to this ROM** - alleen wat die niet overschrijdt, wat in de praktijk betekent dat de SDK verlaagd wordt.  
  * **Force** - precies wat de configuratie zegt. Dit is wat de softloop veroorzaakt.  
* De echte versie wordt gelezen uit `/system/build.prop`, nooit uit `getprop` - dat is namelijk juist wat deze module vervalst.  
### Analyze  
**Analyze** in de WebUI (of `fingerprint-update.sh analyze`) controleert de configuratie zoals die is: de versie ten opzichte van de ROM, of het bestand nog überhaupt parseerbaar is (een kapot bestand zorgt ervoor dat de module **niets** spooft, en alleen logcat zegt dat), of de fingerprint overeenkomt met de velden eromheen, sleutels die de module niet leest, datums, en of de props al dragen wat de configuratie vraagt.  
### Instellingen in de configuratie  
`COPG-VD.json` kan een `COPG-VD-Settings`-object dragen - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - zodat je keuzes met een back-up meereizen en met de hand bewerkt kunnen worden. De WebUI schrijft zowel dat als de vlagbestanden die de bootscripts lezen. `"spoof_version": "force"` wordt vanuit het bestand geweigerd en teruggeschaald: het herstellen van een oude back-up mag het niet achter je rug om opnieuw scherpstellen.  
### WebUI  
Het gebruik van de WebUI is niet nodig als je het JSON-configuratiebestand rechtstreeks bewerkt.  
Als je een Magisk-gebruiker bent, gebruik dan KsuWebUI van KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Schakel het gebruik van resetprop uit en schakel alleen het spoofen van Build info in.  
#### Use ro.product.manufacturer:  
Schakel uit als je geeft om de "Found device spoofing"-detectie in de Disclosure root-detectorapp.  

## Contacten

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
