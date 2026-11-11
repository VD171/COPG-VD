> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · Nederlands · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Gebruikershandleiding

COPG-VD herschrijft de fingerprint en build van het apparaat zodat de apps die je kiest een Pixel
zien in plaats van je echte apparaat. Deze handleiding neemt je mee van installatie tot een werkende
opstelling en door de keuzes onderweg. Voor elk veld en elke waarde, zie [CONFIGURATION.md](CONFIGURATION.md);
voor hoe het van binnen werkt, zie [ARCHITECTURE.md](ARCHITECTURE.md).

## Installatie

1. Flash de zip in KernelSU, APatch of Magisk en start opnieuw op.
2. Zygisk moet actief zijn (ingebouwd, of ReZygisk / Zygisk Next). Magisk-gebruikers: schakel Zygisk in.
3. De module levert een Pixel-profiel mee, dus direct na de herstart ziet de Google Play-stack
   al die Pixel. Met een werkende fingerprint heb je PlayIntegrityFix of
   GooglePhotosUnlimited niet nodig.

Open de WebUI vanuit je root-manager om de module aan te sturen. Magisk-gebruikers openen die met
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Alles
kan ook rechtstreeks worden bewerkt in `/data/adb/COPG-VD/COPG-VD.json`.

## Wie de spoof ziet (scope)

`scope_mode` bepaalt welke processen de gespoofte identiteit ontvangen. In een scoped modus wordt de
identiteit per proces geleverd door Zygisk en **niet** gelekt naar de rest van het
systeem via globale properties.

| Modus | Wie de spoof krijgt |
|---|---|
| `playstore` (standaard) | Alleen de Play-stack: Google Play services, het unstable proces en de Play Store. |
| `global` | Het hele apparaat: elk proces. |
| `whitelist` | Alleen de apps die in `scope_whitelist` staan. |
| `blacklist` | Elke app behalve die in `scope_blacklist`. |

Begin met `playstore`. Het is de lichtste optie en degene die Play Integrity doorstaat
zonder de spoof bloot te stellen aan niet-gerelateerde apps.

## De engines

Elke engine is onafhankelijk en kan worden uitgeschakeld. Alle staan standaard aan behalve DRM.

- **Build-velden (`motor_jni`)** - herschrijft `android.os.Build.*` in de beoogde
  processen. Dit is wat de meeste apps lezen.
- **Property-hook (`motor_prop_hook`)** - presenteert de gespoofte systeemproperties aan de
  beoogde processen, via een clean-room remap per proces van het property-gebied (geen
  functie-hook).
- **resetprop** - herschrijft de systeemproperties apparaatbreed, per groep (identiteit,
  versie, boot-status, SELinux, adb/usb, anti-emulator, en een opschoonronde). In een scoped
  modus blijven de identiteit- en versiegroepen buiten de apparaatbrede ronde (Zygisk levert
  ze per proces); de boot-, lock- en SELinux-groepen blijven globaal. Schakel het in via
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, standaard uit)** - rapporteert een gekozen Widevine-
  beveiligingsniveau (L1 of L3) aan apps die het lezen. Zie de DRM-sectie hieronder.

## De fingerprint vers houden

Een fingerprint veroudert: Google roteert de factory images, en een oude verliest langzaam waarde.
`fingerprint-update.sh` houdt die van jou actueel, vanaf de nieuwste Google factory image.

- Vanuit de WebUI (tabblad Tools): **Check Update** en **Update Now**.
- Vanzelf, **eenmaal per boot**: **Auto-update JSON on boot** (standaard aan). Het draait op de
  achtergrond, blijft ongeveer tien minuten opnieuw proberen omdat wifi bij het booten meestal nog
  niet actief is, en vertraagt het booten nooit.
- Het herschrijft alleen de build-velden (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Alles wat je hebt aangepast blijft behouden, en de vorige
  inhoud wordt opgeslagen als `.bak`.
- Het gaat nooit achteruit (een oudere upstream build wordt geweigerd), en als je profiel een
  ander apparaat spooft, past het niets toe - een Pixel-fingerprint op een ander profiel is erger
  dan een oude.
- `resetprop` wordt direct na een update opnieuw toegepast, maar `android.os.Build` wordt geschreven
  wanneer zygote start, dus **herstart** zodat nieuwe waarden de apps bereiken. Log:
  `/data/adb/COPG-VD/update.log`.

## De Android-versievalkuil

Het moeilijkste om goed te krijgen. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` en `CODENAME`
beschrijven **jouw ROM**, niet het apparaat dat je spooft. Apps vertellen dat de SDK nieuwer is dan het
framework werkelijk is, laat ze API's aanroepen die niet bestaan: Google's apps crashen, de telefoon
start opnieuw op, en het begint opnieuw. De boot zelf voltooit, dus het is een **softloop** die
niets in de boot-logs achterlaat.

Deze velden zitten niet in de meegeleverde config en de updater schrijft ze nooit. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) bepaalt of ze überhaupt van toepassing zijn:

- `never` (standaard) - de eigen versie van de ROM wordt gebruikt.
- `rom` - past alleen toe wat de ROM niet overschrijdt, wat in de praktijk betekent de SDK verlagen.
- `force` - past precies toe wat de config zegt. Dit is wat de softloop veroorzaakt; gebruik het
  alleen als je weet dat het doelframework het ondersteunt.

De echte versie wordt gelezen uit `/system/build.prop`, nooit uit `getprop` (wat precies het ding
is dat deze module vervalst). `force` wordt ook geweigerd bij het herstellen van een back-up, zodat een
oude back-up het niet achter je rug om opnieuw kan scherpstellen.

## DRM / Widevine

Standaard uit (`motor_drm`). Indien aan rapporteert het een gekozen Widevine-niveau,
`DRM_SECURITY_LEVEL` (`L1` of `L3`), aan apps die het lezen.

Standaard volgt de DRM-spoof `scope_mode`. Om het in plaats daarvan toe te passen op een specifieke set
apps - onafhankelijk van de hoofdscope - vermeld je ze in `drm_targets`. De module blijft dan
geladen in een vermelde app **alleen** voor de DRM-hook, zelfs wanneer die app buiten de
hoofdscope valt; een lege of ontbrekende lijst betekent de scope volgen. Dit vereist een scoped modus (niet
`global`), en wordt van kracht bij de volgende **herstart**.

## Analyze: controleer je config

**Analyze** in de WebUI (of `fingerprint-update.sh analyze`) controleert de config zoals die er
staat en vertelt je wat er mis is voordat een app dat doet:

- de versie tegen de ROM (zou het softloopen?),
- of het bestand nog parseert (een kapot bestand laat de module **niets** spoofen, en alleen
  logcat zou dat zeggen),
- of de fingerprint overeenkomt met de velden eromheen,
- sleutels die de module niet leest, verdachte datums, en of de live properties al
  dragen wat de config vraagt.

Voer het uit telkens wanneer je de config met de hand bewerkt.

## De WebUI

Optioneel, maar de makkelijke manier om alles aan te sturen. Vijf tabbladen:

- **About** - module- en versie-informatie.
- **Device** - elk build-veld, ingesteld per status en gegroepeerd per categorie.
- **Spoofing** - scope-modus en de engine-schakelaars.
- **System** - de resetprop-groepen.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, de boot-auto-update,
  en het Diagnostics-rapport (één knop om alles te lezen en exporteren dat nuttig is voor een bug-
  rapport).

Het doet geen enkel netwerkverzoek; alles wat het nodig heeft wordt in de module meegeleverd.

## Probleemoplossing

- **Een app ziet nog steeds het echte apparaat.** Controleer de scope: in `playstore` is alleen de Play-
  stack gedekt. Bevestig dat de config parseert (voer Analyze uit). Na het wijzigen van engines,
  `drm_targets` of het profiel, **herstart** - Zygisk leest de scope wanneer zygote start.
- **Play Integrity faalt nog steeds.** Zorg dat de fingerprint vers is (Check Update) en
  dat de `SECURITY_PATCH` in `global_fields` staat zodat die apparaatbreed coherent blijft. Beëindig
  Google Play services zodat het opnieuw attesteert.
- **De telefoon softloopt na het inschakelen van versie-spoofing.** Dat is de Android-versie-
  valkuil hierboven - zet `spoof_version` terug op `never`.
- **De WebUI wil niet openen op Magisk.** Gebruik [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [../CONTRIBUTING.md](CONTRIBUTING.md).*
