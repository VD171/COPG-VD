## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD är en modul utformad för global enhetsspoofing.  
Det betyder att även systemappar och hela enheten blir hookade.  
  
## Hur använder man den?
Om du använder den här modulen och spoofar ett fungerande FingerPrint behöver du inte PlayIntegrityFix eller GooglePhotosUnlimited.  
### Exempel på JSON-konfigurationsfil  
`/data/adb/COPG-VD.json`
* Alla fält är VALFRIA. Om något fält inte anges hoppas det över.  
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
Se till att endast använda strängar inom dubbla citattecken.  
Blocket ovan och `module/COPG-VD.json.example` uppdateras dagligen av arbetsflödet [Update COPG-VD.json](.github/workflows/update-json.yml), direkt från den senaste Google-fabriksavbildningen.  
### Att hålla fingeravtrycket aktuellt  
`fingerprint-update.sh` hämtar den filen och uppdaterar din konfiguration, antingen från WebUI (**Check Update** / **Update Now**) eller på egen hand **en gång per start** (**Auto-update JSON on boot**, på som standard).  
* Både `/data/adb/COPG-VD.json` och `/data/adb/modules/COPG-VD/COPG-VD.json` uppdateras när båda finns, och det tidigare innehållet behålls som `.bak`.  
* Endast build-fälten skrivs om (fingerprint, ID, incremental, timestamp, säkerhetspatch, SDK, UUID, host, user). Allt annat som du har anpassat bevaras: extra nycklar, `BOOTLOADER`/`BOARD`/`HARDWARE`, andra objekt, nyckelordning och formatering.  
* Det går aldrig bakåt: en uppströms-build som är äldre än den installerade avvisas. Detta är
  rutin (repot kan ligga efter en konfiguration som du uppdaterat för hand) och det är också det skydd som
  spelar störst roll på Android, där den enda tillgängliga nedladdaren är busybox `wget`, som inte kan
  validera TLS-certifikat - varje värde valideras före användning av samma skäl.  
* Om din profil spoofar **en annan enhet** (annat `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`) tillämpas ingenting - ett Pixel-fingeravtryck på en annan profil är värre än ett gammalt fingeravtryck.  
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
**Analyze** i WebUI (eller `fingerprint-update.sh analyze`) granskar konfigurationen som den ser ut: versionen mot ROM:en, om filen fortfarande går att tolka alls (en trasig fil får modulen att spoofa **ingenting**, och bara logcat säger det), om fingeravtrycket stämmer med fälten runt omkring, nycklar som modulen inte läser, datum, och om proparna redan bär det som konfigurationen begär.  
### Inställningar i konfigurationen  
`COPG-VD.json` kan bära ett `COPG-VD-Settings`-objekt - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - så att dina val följer med en säkerhetskopia och kan redigeras för hand. WebUI skriver både det och de flagg-filer som startskripten läser. `"spoof_version": "force"` avvisas från filen och nedgraderas: att återställa en gammal säkerhetskopia får inte återaktivera det bakom din rygg.  
### WebUI  
Att använda WebUI är onödigt om du redigerar JSON-konfigurationsfilen direkt.  
Om du är Magisk-användare, använd KsuWebUI av KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Använd resetprop:  
Inaktivera användning av resetprop och aktivera endast spoofing av Build-info.  
#### Använd ro.product.manufacturer:  
Inaktivera om du bryr dig om detektionen "Found device spoofing" i root-detektorappen Disclosure.  

## Kontakter

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
