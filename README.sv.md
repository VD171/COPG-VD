## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD är en enhetsspoofer: den skriver om enhetens fingerprint och build så att appar ser enheten du väljer i stället för den verkliga.  
Den körs på Zygisk (KernelSU, APatch eller Magisk) och begränsar som standard spoofingen till Google Play-stacken - vilket gör den till ett lättare och mer robust alternativ till PlayIntegrityFix.  

## Skärmdumpar

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Hur använder man den?
Installera modulen, starta om, så spoofas den medföljande profilen (en Pixel) till målapparna. Med ett fungerande fingerprint behöver du inte PlayIntegrityFix eller GooglePhotosUnlimited.  
Allt konfigureras i `/data/adb/COPG-VD.json`, eller från WebUI. Alla fält är VALFRIA - ett fält som inte anges hoppas över.  

### Omfattning - vem som ser spoofingen
`scope_mode` avgör vilka processer som får den spoofade identiteten. I ett läge med omfattning levereras identiteten per process av Zygisk och läcker inte ut till resten av systemet via de globala egenskaperna.  
* **Google Play** (`playstore`, standard) - endast Play-stacken (Google Play services, dess unstable-process och Play Store).  
* **Global** - hela enheten; varje process ser den.  
* **Whitelist** - endast apparna i `scope_whitelist`.  
* **Blacklist** - alla appar utom de i `scope_blacklist`.  

### Motorer - hur spoofingen levereras
Var och en är oberoende och kan stängas av:  
* **Build fields (JNI)** - skriver om `android.os.Build.*` i målprocesserna.  
* **Property hook** - presenterar de spoofade systemegenskaperna för målprocesserna (en clean-room-ommappning av egenskapsområdet per process, ingen funktionshook).  
* **resetprop** - skriver om systemegenskaperna, hanterade per grupp: identitet, version, starttillstånd, SELinux, adb/usb, anti-emulator och en rensningsomgång. I ett läge med omfattning hålls identitets- och versionsgrupperna utanför den enhetsövergripande resetprop (Zygisk levererar dem per process); grupperna för boot/lås/SELinux förblir globala.  
* **DRM / Widevine** (av som standard) - rapporterar en vald Widevine-säkerhetsnivå, L1 eller L3, till apparna som läser den.  

### Fält - ange, tomt, radera eller hoppa över
Inuti `COPG-VD`-objektet har varje Build-fält fyra tillstånd:  
* **Ange** - `"KEY": "value"` skriver värdet.  
* **Tomt** - `"KEY": ""` skriver ett tomt värde.  
* **Radera** - lista nyckeln i en `"COPG-VD-Delete": [ ... ]` på toppnivå för att ta bort den (ett Build-fält blir null, en egenskap tas bort med `resetprop --delete`).  
* **Hoppa över** - utelämna nyckeln helt; ROM:ens eget värde behålls.  

En `"global_fields": [ ... ]`-lista tillämpar de angivna Build-fälten enhetsövergripande även i ett läge med omfattning, för att hålla ett värde konsekvent överallt - endast för koherenssäkra fält (säkerhetspatchen, till exempel), aldrig identitet och aldrig gruppen för Android-versionen.  

### Exempel på JSON-konfigurationsfil
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
Se till att endast använda strängar inom dubbla citattecken.  
Blocket ovan och `module/COPG-VD.json.example` uppdateras dagligen av arbetsflödet [Update COPG-VD.json](.github/workflows/update-json.yml), direkt från den senaste Google-fabriksavbildningen.  

### Att hålla fingerprint aktuellt
`fingerprint-update.sh` hämtar den filen och uppdaterar din konfiguration, antingen från WebUI (**Check Update** / **Update Now**) eller på egen hand **en gång per start** (**Auto-update JSON on boot**, på som standard).  
* Både `/data/adb/COPG-VD.json` och `/data/adb/modules/COPG-VD/COPG-VD.json` uppdateras när båda finns, och det tidigare innehållet behålls som `.bak`.  
* Endast build-fälten skrivs om (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Allt annat som du har anpassat bevaras: extra nycklar, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, andra objekt, nyckelordning och formatering.  
* Den går aldrig bakåt: en uppströms-build som är äldre än den installerade avvisas. Detta är rutin (repot kan ligga efter en konfiguration som du uppdaterat för hand) och det är också det skydd som spelar störst roll på Android, där den enda tillgängliga nedladdaren är busybox `wget`, som inte kan validera TLS-certifikat - varje värde valideras före användning av samma skäl.  
* Om din profil spoofar **en annan enhet** (annat `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`) tillämpas ingenting - ett Pixel-fingerprint på en annan profil är värre än ett gammalt fingerprint.  
* Vid start körs den i bakgrunden och fortsätter försöka i cirka 10 minuter, eftersom wifi oftast inte är uppe ännu när starten är klar. Den fördröjer aldrig starten.  
* `resetprop` tillämpas på nytt direkt efter en uppdatering, men `android.os.Build` skrivs av zygisk-modulen när zygote startar: **starta om** för att de nya värdena ska nå apparna.  
* Logg i `/data/adb/COPG-VD.update.log`.  

### Android-versionen - och varför den inte spoofas
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` och `CODENAME` beskriver **din ROM**, inte enheten som spoofas. Att berätta för appar att SDK:n är nyare än vad ramverket faktiskt är får dem att anropa API:er som inte finns: Googles appar kraschar, telefonen startar om, och det börjar om. Själva starten slutförs, så det är en **softloop** och ingenting syns i startloggarna.  
* De finns inte i den medföljande konfigurationen och uppdateraren skriver dem aldrig.  
* **Spoof Android version** i WebUI avgör om de tillämpas överhuvudtaget:  
  * **Never** (standard) - ROM:ens egen version används.  
  * **Up to this ROM** - endast det som inte överskrider den, vilket i praktiken innebär att SDK:n sänks.  
  * **Force** - exakt vad konfigurationen säger. Det är detta som orsakar softloopen.  
* Den verkliga versionen läses från `/system/build.prop`, aldrig från `getprop` - det är just det som den här modulen förfalskar.  

### Analyze
**Analyze** i WebUI (eller `fingerprint-update.sh analyze`) granskar konfigurationen som den ser ut: versionen mot ROM:en, om filen fortfarande går att tolka alls (en trasig fil får modulen att spoofa **ingenting**, och bara logcat säger det), om fingerprint stämmer med fälten runt omkring, nycklar som modulen inte läser, datum, och om proparna redan bär det som konfigurationen begär.  

### WebUI
WebUI är valfritt - allt kan redigeras direkt i JSON-konfigurationen - men det är det enkla sättet att styra modulen. Det har fem flikar: **About**, **Device** (varje fält, satt per tillstånd, grupperat efter kategori), **Spoofing** (omfattning och motorer), **System** (resetprop-grupperna) och **Tools** (Analyze, Check Update, Update Now, Backup/Restore och auto-uppdateringen vid start). Det gör ingen nätverksbegäran; allt det behöver ingår i modulen.  
Om du är Magisk-användare, använd KsuWebUI av KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Inställningar i konfigurationen
`COPG-VD.json` bär sina inställningar bredvid profilen, så dina val följer med en säkerhetskopia och kan redigeras för hand: `scope_mode`, motor-brytarna, resetprop-grupperna, `global_fields` och ett `COPG-VD-Settings`-objekt (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). WebUI skriver både konfigurationen och de flagg-filer som startskripten läser. `"spoof_version": "force"` avvisas från filen och nedgraderas: att återställa en gammal säkerhetskopia får inte återaktivera det bakom din rygg.  

## Kontakter

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Taggar:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
