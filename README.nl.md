<!--
  COPG-VD - global device spoofer: spoof your device fingerprint and build.
  Copyright (C) 2026  AlirezaParsi & VD171 - SPDX-License-Identifier: Apache-2.0 (Fork by VD171)
-->

# COPG-VD

<p align="center">
  <img src="images/logo-wordmark.png" alt="COPG-VD" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/COPG-VD?label=release&color=2ee89d" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/COPG-VD/releases"><img src="https://img.shields.io/github/downloads/VD171/COPG-VD/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/COPG-VD/stargazers"><img src="https://img.shields.io/github/stars/VD171/COPG-VD?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>COPG-VD is een apparaatspoofer: het herschrijft de fingerprint en build van het apparaat zodat apps het apparaat zien dat jij kiest in plaats van het echte.</b><br>
  Het draait op Zygisk (KernelSU, APatch of Magisk) en beperkt de spoof standaard tot de Google Play-stack - zo is het een lichter, robuuster alternatief voor PlayIntegrityFix.
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases">Releases</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki">Wiki</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/USER-GUIDE">User guide</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/CONFIGURATION">Configuration</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/ARCHITECTURE">Architecture</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/FILE-STRUCTURE">File structure</a> ·
  <a href="https://xdaforums.com/t/COPG-VD.4807698/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

---

## Hoe te gebruiken?
Installeer de module, herstart, en het meegeleverde profiel (een Pixel) wordt gespooft naar de beoogde apps. Met een werkende fingerprint heb je PlayIntegrityFix of GooglePhotosUnlimited niet nodig.  
Alles wordt geconfigureerd in `/data/adb/COPG-VD/COPG-VD.json`, of vanuit de WebUI. Alle velden zijn OPTIONEEL - een veld dat niet wordt opgegeven, wordt overgeslagen.  

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
* **DRM / Widevine** (standaard uit) - rapporteert een gekozen Widevine-beveiligingsniveau, L1 of L3, aan de apps die het lezen. Standaard volgt het het bereik hierboven; stel `drm_targets` (een lijst met apps) in om de DRM-spoof **alleen** op die apps toe te passen, onafhankelijk van `scope_mode` - de module blijft in een vermelde app geladen, alleen voor de DRM-hook, zelfs wanneer die app buiten het hoofdbereik valt. Leeg of afwezig betekent het bereik volgen. (Vereist een bereikmodus, niet Global.)  

### Velden - instellen, leeg, verwijderen of overslaan
Binnen het `COPG-VD`-object heeft elk Build-veld vier toestanden:  
* **Set** - `"KEY": "value"` schrijft de waarde.  
* **Empty** - `"KEY": ""` schrijft een lege waarde.  
* **Delete** - noem de sleutel in een `"COPG-VD-Delete": [ ... ]` op het hoogste niveau om deze te verwijderen (een Build-veld wordt null, een eigenschap wordt verwijderd met `resetprop --delete`).  
* **Skip** - laat de sleutel volledig weg; de eigen waarde van de ROM blijft behouden.  

Een lijst `"global_fields": [ ... ]` past de genoemde Build-velden apparaatbreed toe, zelfs in een modus met beperkte scope, om een waarde overal consistent te houden - alleen voor velden die veilig zijn voor de coherentie (de security patch bijvoorbeeld), nooit de identiteit en nooit de groep van de Android-versie.  

### Voorbeeld van JSON-configuratiebestand
`/data/adb/COPG-VD/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.261016.008-factory-28d56d15.zip",
  "scope_mode": "playstore",
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": [],
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.261016.008",
    "ID": "ZP11.261016.008",
    "HOST": "e4df75f83a59",
    "INCREMENTAL": "16754936",
    "TIMESTAMP": "1793211232",
    "PREVIEW_SDK": "20261104",
    "USER": "android-build",
    "SDK_FINGERPRINT": "ee82a872870173d77e68050e21a2bcbf",
    "UUID": "FjWvtSORkI0sEwekaPz2s30gqV5vWP_EZHFtBiXzboc",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  }
}
```
Zorg ervoor dat je strings alleen tussen dubbele aanhalingstekens gebruikt.  
Het blok hierboven en `module/COPG-VD.json.example` worden dagelijks ververst door de [Update COPG-VD.json](.github/workflows/update-json.yml) workflow, rechtstreeks uit de nieuwste factory image van Google.  

### De fingerprint actueel houden
`fingerprint-update.sh` haalt dat bestand op en werkt je configuratie bij, vanuit de WebUI (**Check Update** / **Update Now**) of vanzelf **één keer per boot** (**Auto-update JSON on boot**, standaard aan).  
* `/data/adb/COPG-VD/COPG-VD.json` wordt ter plekke bijgewerkt, en de vorige inhoud wordt ernaast bewaard als `COPG-VD.json.bak`.  
* Alleen de build-velden worden herschreven (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Al het andere dat je hebt aangepast blijft behouden: extra sleutels, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, andere objecten, sleutelvolgorde en opmaak.  
* Het gaat nooit achteruit: een upstream build die ouder is dan de geïnstalleerde wordt geweigerd. Dit is
  routine (de repository kan achterlopen op een configuratie die je met de hand hebt bijgewerkt) en het is ook de bescherming die
  het meest telt op Android, waar de enige beschikbare downloader busybox `wget` is, die geen
  TLS-certificaten kan valideren - om dezelfde reden wordt elke waarde gevalideerd voor gebruik.  
* Als je profiel **een ander apparaat** spooft (andere `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), wordt er niets toegepast - een Pixel-fingerprint op een ander profiel is slechter dan een oude fingerprint.  
* Bij het booten draait het op de achtergrond en blijft het ongeveer 10 minuten opnieuw proberen, omdat wifi meestal nog niet beschikbaar is wanneer het booten klaar is. Het vertraagt het booten nooit.  
* `resetprop` wordt direct na een update opnieuw toegepast, maar `android.os.Build` wordt geschreven door de zygisk-module wanneer zygote start: **herstart** om de nieuwe waarden bij de apps te laten komen.  
* Logboek op `/data/adb/COPG-VD/update.log`.  

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
`COPG-VD.json` draagt zijn instellingen naast het profiel, zodat je keuzes met een back-up meereizen en met de hand bewerkt kunnen worden: `scope_mode`, de engine-schakelaars, de resetprop-groepen, `global_fields`, en een `COPG-VD-Settings`-object (`resetprop`, `autoupdate`, `spoof_version`). Alles zit in dit ene bestand - de bootscripts en de WebUI lezen de instellingen er rechtstreeks uit, zodat je keuzes een module-update overleven. `"spoof_version": "force"` wordt vanuit het bestand geweigerd en teruggeschaald: het herstellen van een oude back-up mag het niet achter je rug om opnieuw scherpstellen.  

<!-- vd-docs -->
## Documentatie

[Gebruikershandleiding](docs/nl/USER-GUIDE.md) · [Configuratiereferentie](docs/nl/CONFIGURATION.md) · [Architectuur](docs/nl/ARCHITECTURE.md) · [Bestandsstructuur](docs/nl/FILE-STRUCTURE.md) · [Wiki](https://github.com/VD171/COPG-VD/wiki/nl-Home)

<!-- /vd-docs -->

## Zie ook

Zusterprojecten van dezelfde auteur:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: een apparaat-methodedebugger die elk item leest via elke methode die het kan lezen en ze naast elkaar vergelijkt.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: je Google-diensten (RCS, Wallet, Play Integrity-attestaties), gelezen op je toestel zonder internet.
- **[VDBackup](https://github.com/VD171/VD-Backup)**: volledige back-up en herstel van apps en gegevens als root, volledig aangestuurd vanuit een WebUI.

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork of @T3SL4).

## Contacten

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
* **GitHub:** @VD171 https://github.com/VD171

## Licentie

**Apache-2.0** - zie [LICENSE](LICENSE). COPG-VD is een fork door VD171 van de originele COPG van AlirezaParsi, voortgezet onder dezelfde licentie.

## Handelsmerken

COPG-VD is een onafhankelijk, niet-officieel project. Het is niet geassocieerd met, onderschreven door of gesponsord door Google LLC. "Google", "Google Play", "Play Integrity", "Pixel", "Android" en gerelateerde namen en logo's zijn handelsmerken van Google LLC. COPG-VD draait volledig op je toestel.

## Tags

`Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
