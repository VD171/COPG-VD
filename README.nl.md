## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD is een apparaatspoofer: het herschrijft de fingerprint en build van het apparaat zodat apps het apparaat zien dat jij kiest in plaats van het echte.  
Het draait op Zygisk (KernelSU, APatch of Magisk) en beperkt de spoof standaard tot de Google Play-stack - zo is het een lichter, robuuster alternatief voor PlayIntegrityFix.  

## Schermafbeeldingen

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Hoe te gebruiken?
Installeer de module, herstart, en het meegeleverde profiel (een Pixel) wordt gespooft naar de beoogde apps. Met een werkende fingerprint heb je PlayIntegrityFix of GooglePhotosUnlimited niet nodig.  
Alles wordt geconfigureerd in `/data/adb/COPG-VD.json`, of vanuit de WebUI. Alle velden zijn OPTIONEEL - een veld dat niet wordt opgegeven, wordt overgeslagen.  

### Scope - wie de spoof ziet
`scope_mode` bepaalt welke processen de gespoofte identiteit krijgen. In een modus met beperkte scope wordt de identiteit per proces geleverd door Zygisk en lekt deze niet via de globale eigenschappen naar de rest van het systeem.  
* **Google Play** (`playstore`, de standaard) - alleen de Play-stack (Google Play services, het bijbehorende unstable-proces en de Play Store).  
* **Global** - het hele apparaat; elk proces ziet het.  
* **Whitelist** - alleen de apps in `scope_whitelist`.  
* **Blacklist** - elke app behalve die in `scope_blacklist`.  

### Engines - hoe de spoof wordt geleverd
Elk is onafhankelijk en kan worden uitgeschakeld:  
* **Build fields (JNI)** - herschrijft `android.os.Build.*` in de beoogde processen.  
* **Property hook** - presenteert de gespoofte systeemeigenschappen aan de beoogde processen (een clean-room herindeling per proces van het eigenschappengebied, zonder functiehook).  
* **resetprop** - herschrijft de systeemeigenschappen, beheerd per groep: identiteit, versie, bootstatus, SELinux, adb/usb, anti-emulator en een opschoonronde. In een modus met beperkte scope blijven de groepen identiteit en versie buiten de apparaatbrede resetprop (Zygisk levert ze per proces); de groepen boot/lock/SELinux blijven globaal.  
* **DRM / Widevine** (standaard uit) - rapporteert een gekozen Widevine-beveiligingsniveau, L1 of L3, aan de apps die het lezen.  

### Velden - instellen, leeg, verwijderen of overslaan
Binnen het `COPG-VD`-object heeft elk Build-veld vier toestanden:  
* **Set** - `"KEY": "value"` schrijft de waarde.  
* **Empty** - `"KEY": ""` schrijft een lege waarde.  
* **Delete** - noem de sleutel in een `"COPG-VD-Delete": [ ... ]` op het hoogste niveau om deze te verwijderen (een Build-veld wordt null, een eigenschap wordt verwijderd met `resetprop --delete`).  
* **Skip** - laat de sleutel volledig weg; de eigen waarde van de ROM blijft behouden.  

Een lijst `"global_fields": [ ... ]` past de genoemde Build-velden apparaatbreed toe, zelfs in een modus met beperkte scope, om een waarde overal consistent te houden - alleen voor velden die veilig zijn voor de coherentie (de security patch bijvoorbeeld), nooit de identiteit en nooit de groep van de Android-versie.  

### Voorbeeld van JSON-configuratiebestand
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
Zorg ervoor dat je strings alleen tussen dubbele aanhalingstekens gebruikt.  
Het blok hierboven en `module/COPG-VD.json.example` worden dagelijks ververst door de [Update COPG-VD.json](.github/workflows/update-json.yml) workflow, rechtstreeks uit de nieuwste factory image van Google.  

### De fingerprint actueel houden
`fingerprint-update.sh` haalt dat bestand op en werkt je configuratie bij, vanuit de WebUI (**Check Update** / **Update Now**) of vanzelf **één keer per boot** (**Auto-update JSON on boot**, standaard aan).  
* Zowel `/data/adb/COPG-VD.json` als `/data/adb/modules/COPG-VD/COPG-VD.json` worden bijgewerkt wanneer beide bestaan, en de vorige inhoud wordt bewaard als `.bak`.  
* Alleen de build-velden worden herschreven (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Al het andere dat je hebt aangepast blijft behouden: extra sleutels, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, andere objecten, sleutelvolgorde en opmaak.  
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

### WebUI
De WebUI is optioneel - alles kan rechtstreeks in de JSON-configuratie worden bewerkt - maar het is de makkelijke manier om de module aan te sturen. Hij heeft vijf tabbladen: **About**, **Device** (elk veld, ingesteld per toestand, gegroepeerd per categorie), **Spoofing** (scope en engines), **System** (de resetprop-groepen) en **Tools** (Analyze, Check Update, Update Now, Backup/Restore en de auto-update bij het booten). Hij doet geen enkel netwerkverzoek; alles wat hij nodig heeft, zit in de module.  
Als je een Magisk-gebruiker bent, gebruik dan KsuWebUI van KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Instellingen in de configuratie
`COPG-VD.json` draagt zijn instellingen naast het profiel, zodat je keuzes met een back-up meereizen en met de hand bewerkt kunnen worden: `scope_mode`, de engine-schakelaars, de resetprop-groepen, `global_fields`, en een `COPG-VD-Settings`-object (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). De WebUI schrijft zowel de configuratie als de vlagbestanden die de bootscripts lezen. `"spoof_version": "force"` wordt vanuit het bestand geweigerd en teruggeschaald: het herstellen van een oude back-up mag het niet achter je rug om opnieuw scherpstellen.  

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
