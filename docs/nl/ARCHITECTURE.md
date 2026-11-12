> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · Nederlands · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architectuur

COPG-VD is een Zygisk-module: een kleine native library (`libspoof.so`) die de Zygisk-loader
in de zygote injecteert en, vandaaruit, in app-processen. Het enige wat het doet is een
gekozen apparaatidentiteit presenteren aan de processen die je beoogt. Er is geen app en, afgezien van
de optionele profielophaling, geen netwerk.

## Levenscyclus

1. **Zygote-start.** Wanneer de zygote boot, roept de loader de `onLoad` van de module aan. Het
   leest `/data/adb/COPG-VD/COPG-VD.json` eenmaal: de scope-configuratie en het profiel.
2. **App-fork.** Voor elke app die de zygote forkt, beslist de module in
   `preAppSpecialize` of dit proces binnen de scope valt:
   - **in de hoofdscope** (`playstore` / `global` / `whitelist` / `blacklist`), of
   - **in de DRM-scope** (vermeld in `drm_targets`).
   Als het geen van beide is, **koppelt de module zich los** van dat proces (`dlclose`) en laat geen
   spoor erin achter.
3. **Specialize.** Voor een proces dat blijft, worden de engines toegepast in `postAppSpecialize`,
   terwijl het proces nog geprivilegieerd is.

Omdat forks de geheugenkopie van de zygote copy-on-write erven, start elke app vanaf de config die
bij het booten is gelezen. De module herleest het bestand per beoogd proces alleen wanneer het
daadwerkelijk is gewijzigd, dus een net gestarte of heropende app pikt een bewerkt profiel op - maar de
scope-beslissing zelf wordt genomen bij de zygote-start, dus **het wijzigen van de scope, de engines of
`drm_targets` vereist een herstart**.

## De engines

Elk is onafhankelijk en schakelbaar.

- **Build-velden (`motor_jni`).** Herschrijft `android.os.Build.*` (en `Build.VERSION.*`)
  in het beoogde proces via JNI, zodat Java-code de gespoofte waarden leest.
- **Property-hook (`motor_prop_hook`).** Presenteert de gespoofte systeemproperties aan het
  proces via een clean-room remap per proces van het property-gebied (`prop_virtualizer`).
  Het is een geheugen-remap, geen functie-hook, dus er is geen voetafdruk van een gehookte functie.
- **resetprop (apparaatbreed).** Schrijft systeemproperties per groep - identiteit, versie,
  boot-status, SELinux, adb/usb, anti-emulator, plus een opschoonronde. De boot-scripts draaien
  het. In een scoped modus worden de identiteit- en versiegroepen weggelaten (Zygisk levert ze
  per proces); de boot-, lock- en SELinux-groepen blijven globaal zodat het apparaat coherent is.
- **DRM / Widevine (`motor_drm`).** Hookt de `MediaDrm`-methoden die het Widevine-
  beveiligingsniveau rapporteren (`getSecurityLevel`, `getPropertyString`) en geeft het geconfigureerde
  niveau terug. De hooks zijn null-gecheckt, zodat een misvormd profiel netjes degradeert in plaats van
  de app te laten crashen. `drm_targets` laat deze engine op zijn eigen app-lijst draaien, losgekoppeld van
  de hoofdscope.

## De config lezen

Het geïnjecteerde proces draait in het zygote SELinux-domein, dat standaard `/data/adb` niet kan
bereiken. De module levert zijn eigen `sepolicy.rule` mee om het toe te staan, en kan, als fallback,
de config lezen via zijn geopende moduledirectory (`getModuleDir`), zodat het blijft
werken, zelfs als een Zygisk-build het pad niet langer verleent. Het bestand wordt geparseerd met een kleine
ingebedde JSON-parser (`jsmn`); een bestand dat niet parseert betekent dat de module niets spooft.

## Het profiel vers houden

`fingerprint-update.sh` ververst de build-velden vanaf de nieuwste Google factory image,
vanuit de WebUI of eenmaal per boot. Het gebruikt de eigen meegeleverde downloader van de module (geen `PATH`-
`curl`/`wget`), valideert elke waarde voor gebruik, gaat nooit achteruit, en weigert een
profiel dat een ander apparaat spooft. `android.os.Build` wordt geschreven bij de zygote-start, zodat
nieuwe waarden de apps bij de volgende herstart bereiken. Zie [USER-GUIDE.md](USER-GUIDE.md) voor de gebruikers-
kant en [CONFIGURATION.md](CONFIGURATION.md) voor de velden.

## Waarom de Android-versie niet standaard wordt gespooft

`SDK_INT` / `ANDROID_VERSION` verhogen boven wat het framework van de ROM werkelijk is, laat apps
API's aanroepen die niet bestaan, wat Google's apps laat crashen en de telefoon in een softloop laat
herstarten. De versiegroep is daarom standaard uit en afgeschermd achter
`spoof_version`. De module leest de echte versie uit `/system/build.prop`, nooit uit
`getprop`, omdat `getprop` precies is wat het vervalst. Zie de valkuil in
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom; zie [CONTRIBUTING.md](CONTRIBUTING.md)._
