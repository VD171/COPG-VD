> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · Svenska · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Användarguide

COPG-VD skriver om enhetens fingerprint och build så att apparna du väljer ser en Pixel
istället för din riktiga enhet. Den här guiden tar dig från installation till en fungerande
uppsättning och genom valen längs vägen. För varje fält och värde, se [CONFIGURATION.md](CONFIGURATION.md);
för hur det fungerar inuti, se [ARCHITECTURE.md](ARCHITECTURE.md).

## Installation

1. Flasha zip-filen i KernelSU, APatch eller Magisk och starta om.
2. Zygisk måste vara aktivt (inbyggt, eller ReZygisk / Zygisk Next). Magisk-användare: aktivera Zygisk.
3. Modulen levereras med en Pixel-profil, så direkt efter omstarten ser Google Play-stacken
   redan den Pixeln. Med ett fungerande fingerprint behöver du inte PlayIntegrityFix eller
   GooglePhotosUnlimited.

Öppna WebUI från din root-hanterare för att styra modulen. Magisk-användare öppnar det med
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Allt
kan också redigeras direkt i `/data/adb/COPG-VD/COPG-VD.json`.

## Vem ser spoofen (omfattning)

`scope_mode` avgör vilka processer som får den spoofade identiteten. I ett läge med omfattning levereras
identiteten per process av Zygisk och läcker **inte** ut till resten av
systemet via globala properties.

| Läge | Vem får spoofen |
|---|---|
| `playstore` (standard) | Endast Play-stacken: Google Play services, dess instabila process och Play Store. |
| `global` | Hela enheten: varje process. |
| `whitelist` | Endast apparna som listas i `scope_whitelist`. |
| `blacklist` | Varje app utom de som finns i `scope_blacklist`. |

Börja med `playstore`. Det är det lättaste alternativet och det som klarar Play Integrity
utan att exponera spoofen för orelaterade appar.

## Motorerna

Varje motor är oberoende och kan stängas av. Alla är på som standard utom DRM.

- **Build-fält (`motor_jni`)** - skriver om `android.os.Build.*` i de riktade
  processerna. Det är detta de flesta appar läser.
- **Property-hook (`motor_prop_hook`)** - presenterar de spoofade systemproperties för de
  riktade processerna, genom en clean-room-ommappning per process av property-området (ingen
  funktionshook).
- **resetprop** - skriver om systemproperties över hela enheten, per grupp (identitet,
  version, boot-tillstånd, SELinux, adb/usb, anti-emulator och ett upprensningspass). I ett läge
  med omfattning hålls identitets- och versionsgrupperna utanför passet över hela enheten (Zygisk levererar
  dem per process); grupperna boot, lock och SELinux förblir globala. Växla det i
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, av som standard)** - rapporterar en vald Widevine-säkerhetsnivå
  (L1 eller L3) till appar som läser den. Se DRM-avsnittet nedan.

## Att hålla fingerprintet färskt

Ett fingerprint åldras: Google roterar fabriksavbildningarna och ett gammalt tappar långsamt värde.
`fingerprint-update.sh` håller ditt aktuellt, från den nyaste Google-fabriksavbildningen.

- Från WebUI (fliken Tools): **Check Update** och **Update Now**.
- På egen hand, **en gång per boot**: **Auto-update JSON on boot** (på som standard). Det körs i
  bakgrunden, fortsätter försöka i ungefär tio minuter eftersom wifi oftast inte är uppe ännu
  vid boot, och fördröjer aldrig booten.
- Det skriver bara om build-fälten (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Allt du anpassat behålls, och det tidigare innehållet
  sparas som `.bak`.
- Det går aldrig bakåt (en äldre upstream-build nekas), och om din profil spoofar
  en annan enhet tillämpar det ingenting - ett Pixel-fingerprint på en annan profil är sämre
  än ett gammalt.
- `resetprop` tillämpas på nytt direkt efter en uppdatering, men `android.os.Build` skrivs när
  zygote startar, så **starta om** för att nya värden ska nå apparna. Logg:
  `/data/adb/COPG-VD/update.log`.

## Android-versionsfällan

Det svåraste att få rätt. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` och `CODENAME`
beskriver **din ROM**, inte enheten du spoofar. Att säga till appar att SDK är nyare än
ramverket verkligen är får dem att anropa API:er som inte finns: Googles appar kraschar, telefonen
startar om, och allt börjar om. Själva booten slutförs, så det är en **softloop** som
inte lämnar något i boot-loggarna.

Dessa fält finns inte i den levererade konfigurationen och uppdateraren skriver dem aldrig. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) avgör om de tillämpas alls:

- `never` (standard) - ROM:ens egen version används.
- `rom` - tillämpar endast det som inte överskrider ROM:en, vilket i praktiken innebär att sänka SDK.
- `force` - tillämpar exakt det konfigurationen säger. Det är detta som orsakar softloopen; använd det
  endast om du vet att målramverket stödjer det.

Den riktiga versionen läses från `/system/build.prop`, aldrig från `getprop` (vilket är precis
det som den här modulen förfalskar). `force` nekas också vid återställning av en säkerhetskopia, så en
gammal säkerhetskopia kan inte osedd beväpna om det bakom ryggen på dig.

## DRM / Widevine

Av som standard (`motor_drm`). När det är på rapporterar det en vald Widevine-nivå,
`DRM_SECURITY_LEVEL` (`L1` eller `L3`), till appar som läser den.

Som standard följer DRM-spoofen `scope_mode`. För att istället tillämpa den på en specifik uppsättning appar
- oberoende av huvudomfattningen - lista dem i `drm_targets`. Modulen förblir då
inläst i en listad app **enbart** för DRM-hooken, även när den appen är utanför
huvudomfattningen; en tom eller frånvarande lista betyder följ omfattningen. Detta kräver ett läge med omfattning (inte
`global`), och träder i kraft vid nästa **omstart**.

## Analyze: kontrollera din konfiguration

**Analyze** i WebUI (eller `fingerprint-update.sh analyze`) granskar konfigurationen som den
är och berättar vad som är fel innan en app gör det:

- versionen gentemot ROM:en (skulle den softloopa?),
- om filen fortfarande parsas (en trasig gör att modulen spoofar **ingenting**, och bara
  logcat skulle säga det),
- om fingerprintet stämmer överens med fälten runt det,
- nycklar som modulen inte läser, misstänkta datum och om de aktuella properties redan
  bär det konfigurationen ber om.

Kör det varje gång du redigerar konfigurationen för hand.

## WebUI

Valfritt, men det enkla sättet att styra allt. Fem flikar:

- **About** - modul- och versionsinfo.
- **Device** - varje build-fält, satt per tillstånd och grupperat per kategori.
- **Spoofing** - omfattningsläge och motoromkopplarna.
- **System** - resetprop-grupperna.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, auto-uppdateringen vid boot
  och Diagnostics-rapporten (en knapp för att läsa och exportera allt användbart för en
  buggrapport).

Det gör ingen nätverksbegäran; allt det behöver levereras inuti modulen.

## Felsökning

- **En app ser fortfarande den riktiga enheten.** Kontrollera omfattningen: i `playstore` täcks bara Play-
  stacken. Bekräfta att konfigurationen parsas (kör Analyze). Efter att ha ändrat motorer,
  `drm_targets` eller profilen, **starta om** - Zygisk läser omfattningen när zygote startar.
- **Play Integrity misslyckas fortfarande.** Se till att fingerprintet är färskt (Check Update) och
  att `SECURITY_PATCH` finns i `global_fields` så att det förblir koherent över hela enheten. Döda
  Google Play services så att det attesterar om.
- **Telefonen softloopar efter att versionsspoofing aktiverats.** Det är Android-versionsfällan
  ovan - ställ tillbaka `spoof_version` till `never`.
- **WebUI öppnas inte på Magisk.** Använd [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Den här dokumentationen genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas; se [CONTRIBUTING.md](CONTRIBUTING.md)._
