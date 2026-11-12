> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · Svenska · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arkitektur

COPG-VD är en Zygisk-modul: ett litet nativt bibliotek (`libspoof.so`) som Zygisk-laddaren
injicerar i zygote och, därifrån, in i app-processer. Allt den gör är att presentera en
vald enhetsidentitet för de processer du riktar in dig på. Det finns ingen app och, bortsett från
den valfria profilhämtningen, inget nätverk.

## Livscykel

1. **Zygote-start.** När zygote bootar anropar laddaren modulens `onLoad`. Den
   läser `/data/adb/COPG-VD/COPG-VD.json` en gång: omfattningskonfigurationen och profilen.
2. **App-fork.** För varje app som zygote forkar avgör modulen i
   `preAppSpecialize` om den här processen är inom omfattningen:
   - **inom huvudomfattningen** (`playstore` / `global` / `whitelist` / `blacklist`), eller
   - **inom DRM-omfattningen** (listad i `drm_targets`).
   Om den är ingetdera **kopplar modulen bort** sig från den processen (`dlclose`) och lämnar inget
   spår i den.
3. **Specialize.** För en process som stannar tillämpas motorerna i `postAppSpecialize`,
   medan processen fortfarande är privilegierad.

Eftersom forkar ärver zygotes copy-on-write-minneskopia startar varje app från konfigurationen som
lästes vid boot. Modulen läser om filen per riktad process endast när den faktiskt har
ändrats, så en nystartad eller återöppnad app plockar upp en redigerad profil - men själva
omfattningsbeslutet fattas vid zygote-start, så **att ändra omfattningen, motorerna eller
`drm_targets` kräver en omstart**.

## Motorerna

Var och en är oberoende och omkopplingsbar.

- **Build-fält (`motor_jni`).** Skriver om `android.os.Build.*` (och `Build.VERSION.*`)
  i den riktade processen via JNI, så att Java-kod läser de spoofade värdena.
- **Property-hook (`motor_prop_hook`).** Presenterar de spoofade systemproperties för
  processen genom en clean-room-ommappning, per process, av property-området (`prop_virtualizer`).
  Det är en minnesommappning, inte en funktionshook, så det finns inget avtryck av en hookad funktion.
- **resetprop (över hela enheten).** Skriver systemproperties per grupp - identitet, version,
  boot-tillstånd, SELinux, adb/usb, anti-emulator, plus ett upprensningspass. Boot-skripten kör
  det. I ett läge med omfattning lämnas identitets- och versionsgrupperna utanför (Zygisk levererar dem
  per process); grupperna boot, lock och SELinux förblir globala så att enheten är koherent.
- **DRM / Widevine (`motor_drm`).** Hookar `MediaDrm`-metoderna som rapporterar Widevine-
  säkerhetsnivån (`getSecurityLevel`, `getPropertyString`) och returnerar den konfigurerade
  nivån. Hookarna är null-kontrollerade, så en felaktig profil degraderar graciöst istället för att
  krascha appen. `drm_targets` låter den här motorn köra på sin egen app-lista, frikopplad från
  huvudomfattningen.

## Att läsa konfigurationen

Den injicerade processen körs i zygotes SELinux-domän, som som standard inte kan nå
`/data/adb`. Modulen levererar sin egen `sepolicy.rule` för att tillåta det, och, som reserv,
kan läsa konfigurationen genom sin öppna modulkatalog (`getModuleDir`), så att den fortsätter
fungera även om en Zygisk-build slutar bevilja sökvägen. Filen parsas med en liten
inbäddad JSON-parser (`jsmn`); en fil som inte parsas betyder att modulen spoofar ingenting.

## Att hålla profilen färsk

`fingerprint-update.sh` uppdaterar build-fälten från den nyaste Google-fabriksavbildningen,
från WebUI eller en gång per boot. Den använder modulens egen medföljande nedladdare (inte en `curl`/`wget`
från `PATH`), validerar varje värde före användning, går aldrig bakåt och nekar en
profil som spoofar en annan enhet. `android.os.Build` skrivs vid zygote-start, så
nya värden når apparna vid nästa omstart. Se [USER-GUIDE.md](USER-GUIDE.md) för användarsidan
och [CONFIGURATION.md](CONFIGURATION.md) för fälten.

## Varför Android-versionen inte spoofas som standard

Att höja `SDK_INT` / `ANDROID_VERSION` över vad ROM:ens ramverk verkligen är får appar att
anropa API:er som inte finns, vilket kraschar Googles appar och startar om telefonen i en
softloop. Versionsgruppen är därför av som standard och grindad bakom
`spoof_version`. Modulen läser den riktiga versionen från `/system/build.prop`, aldrig från
`getprop`, eftersom `getprop` är precis det som den förfalskar. Se fällan i
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Den här dokumentationen genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas; se [CONTRIBUTING.md](CONTRIBUTING.md)._
