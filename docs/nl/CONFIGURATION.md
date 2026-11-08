> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · Nederlands · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Configuratiereferentie

De hele module wordt aangestuurd door één bestand: `/data/adb/COPG-VD.json`. De WebUI schrijft het
voor je, maar je kunt het met de hand bewerken. Een meegeleverd voorbeeld staat in `module/COPG-VD.json.example`.

Regels:

- **Strings gebruiken alleen dubbele aanhalingstekens**, zoals in JSON.
- **Elk veld is optioneel.** Een veld dat niet wordt opgegeven, wordt overgeslagen en de eigen
  waarde van de ROM wordt behouden.
- Voer **Analyze** uit na handmatig bewerken: een bestand dat niet parseert laat de module **niets**
  spoofen, en alleen logcat zegt dat.

## Sleutels op het hoogste niveau

| Sleutel | Type | Betekenis |
|---|---|---|
| `scope_mode` | string | `playstore` (standaard), `global`, `whitelist` of `blacklist`. Zie [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Packages die de spoof krijgen wanneer `scope_mode` `whitelist` is. |
| `scope_blacklist` | array | Packages die worden uitgesloten wanneer `scope_mode` `blacklist` is. |
| `COPG-VD` | object | Het profiel: de Build-velden om te presenteren (zie hieronder). |
| `COPG-VD-Delete` | array | Veldnamen om te verwijderen in plaats van in te stellen (Build-veld wordt null; een property wordt verwijderd met `resetprop --delete`). |
| `COPG-VD-Settings` | object | Module-instellingen die met het profiel meereizen (zie hieronder). |
| `motor_jni` | bool | Build-velden-engine (herschrijft `android.os.Build.*`). Standaard `true`. |
| `motor_prop_hook` | bool | Property-engine per proces (clean-room property-remap). Standaard `true`. |
| `motor_drm` | bool | DRM / Widevine-engine. Standaard `false`. |
| `drm_targets` | array | Apps die de DRM-spoof krijgen ongeacht `scope_mode`. Leeg = volg de scope. |
| `global_fields` | array | Build-velden die apparaatbreed worden toegepast, zelfs in een scoped modus, alleen voor coherentie-veilige velden. |
| `process_overrides` | object | Veld-overrides per proces: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Extra logcat-detail voor debuggen. Standaard `false`. |

## Het `COPG-VD`-profielobject

Elke vermelding is een apparaatveld dat aan de beoogde processen wordt gepresenteerd. De gangbare:

| Groep | Velden |
|---|---|
| Identiteit | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestatie | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Versie (speciaal) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

De `*_FOR_ATTESTATION`-varianten (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) laten het
attestatiepad een andere waarde rapporteren dan de gewone, zodat de keystore coherent blijft.

> **De versiegroep is speciaal.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` en `CODENAME`
> beschrijven jouw ROM, niet het gespoofte apparaat. Ze verhogen softloopt de telefoon. Ze zitten niet
> in het meegeleverde profiel en zijn alleen van toepassing wanneer `COPG-VD-Settings.spoof_version` het
> toestaat - zie [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Veldstatussen

| Status | Hoe | Resultaat |
|---|---|---|
| Set | `"KEY": "value"` | Schrijft de waarde. |
| Empty | `"KEY": ""` | Schrijft een lege waarde. |
| Delete | naam in `"COPG-VD-Delete": [ ... ]` | Verwijdert het veld. |
| Skip | laat de sleutel weg | Behoudt de eigen waarde van de ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` of `L3`) is het Widevine-niveau dat wordt gerapporteerd wanneer `motor_drm` aan is.

## `COPG-VD-Settings`

Instellingen die met het profiel meereizen, zodat een back-up je keuzes meedraagt.

| Sleutel | Type / waarden | Betekenis |
|---|---|---|
| `resetprop` | bool | Of de apparaatbrede resetprop-engine draait. |
| `autoupdate` | bool | Of `fingerprint-update.sh` eenmaal per boot draait. Standaard aan. |
| `spoof_manufacturer` | bool | Of het manufacturer-veld ook wordt gespooft. |
| `spoof_version` | `never` / `rom` / `force` | Hoe de Android-versiegroep wordt toegepast. `never` is de standaard; `force` wordt geweigerd bij het herstellen van een back-up. |

## `global_fields`

Build-velden in deze lijst worden apparaatbreed toegepast, zelfs in een scoped modus, om een waarde
overal consistent te houden. Gebruik het alleen voor coherentie-veilige velden - de security patch is de
gebruikelijke. Zet **nooit** identiteit of de Android-versiegroep hier.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Voorbeeld

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [../CONTRIBUTING.md](CONTRIBUTING.md).*
