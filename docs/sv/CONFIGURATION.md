> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · Svenska · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Konfigurationsreferens

Hela modulen styrs av en enda fil: `/data/adb/COPG-VD.json`. WebUI skriver den åt
dig, men du kan redigera den för hand. Ett levererat exempel finns i `module/COPG-VD.json.example`.

Regler:

- **Strängar använder endast dubbla citationstecken**, som i JSON.
- **Varje fält är valfritt.** Ett fält som inte anges hoppas över och ROM:ens eget
  värde behålls.
- Kör **Analyze** efter redigering för hand: en fil som inte parsas gör att modulen spoofar
  **ingenting**, och bara logcat säger det.

## Nycklar på toppnivå

| Nyckel | Typ | Betydelse |
|---|---|---|
| `scope_mode` | string | `playstore` (standard), `global`, `whitelist` eller `blacklist`. Se [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Paket som får spoofen när `scope_mode` är `whitelist`. |
| `scope_blacklist` | array | Paket som exkluderas när `scope_mode` är `blacklist`. |
| `COPG-VD` | object | Profilen: Build-fälten som ska presenteras (se nedan). |
| `COPG-VD-Delete` | array | Fältnamn att ta bort istället för att sätta (Build-fält blir null; en property tas bort med `resetprop --delete`). |
| `COPG-VD-Settings` | object | Modulinställningar som följer med profilen (se nedan). |
| `motor_jni` | bool | Build-fältmotor (skriver om `android.os.Build.*`). Standard `true`. |
| `motor_prop_hook` | bool | Property-motor per process (clean-room property-ommappning). Standard `true`. |
| `motor_drm` | bool | DRM / Widevine-motor. Standard `false`. |
| `drm_targets` | array | Appar som får DRM-spoofen oavsett `scope_mode`. Tom = följ omfattningen. |
| `global_fields` | array | Build-fält som tillämpas över hela enheten även i ett läge med omfattning, endast för koherens-säkra fält. |
| `process_overrides` | object | Fältöverskrivningar per process: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Extra logcat-detaljer för felsökning. Standard `false`. |

## Profilobjektet `COPG-VD`

Varje post är ett enhetsfält som presenteras för de riktade processerna. De vanliga:

| Grupp | Fält |
|---|---|
| Identitet | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestering | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (särskild) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Varianterna `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) låter
attesteringsvägen rapportera ett annat värde än det vanliga, så att keystore förblir
koherent.

> **Versionsgruppen är särskild.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` och `CODENAME`
> beskriver din ROM, inte den spoofade enheten. Att höja dem softloopar telefonen. De finns inte
> i den levererade profilen och tillämpas endast när `COPG-VD-Settings.spoof_version` tillåter det -
> se [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Fälttillstånd

| Tillstånd | Hur | Resultat |
|---|---|---|
| Sätt | `"KEY": "value"` | Skriver värdet. |
| Tom | `"KEY": ""` | Skriver ett tomt värde. |
| Ta bort | namn i `"COPG-VD-Delete": [ ... ]` | Tar bort fältet. |
| Hoppa över | lämna nyckeln utanför | Behåller ROM:ens eget värde. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` eller `L3`) är Widevine-nivån som rapporteras när `motor_drm` är på.

## `COPG-VD-Settings`

Inställningar som följer med profilen, så att en säkerhetskopia bär dina val.

| Nyckel | Typ / värden | Betydelse |
|---|---|---|
| `resetprop` | bool | Om resetprop-motorn över hela enheten körs. |
| `autoupdate` | bool | Om `fingerprint-update.sh` körs en gång per boot. Standard på. |
| `spoof_manufacturer` | bool | Om tillverkarfältet också spoofas. |
| `spoof_version` | `never` / `rom` / `force` | Hur Android-versionsgruppen tillämpas. `never` är standard; `force` nekas vid återställning av en säkerhetskopia. |

## `global_fields`

Build-fält i den här listan tillämpas över hela enheten även i ett läge med omfattning, för att hålla ett värde
konsekvent överallt. Använd det endast för koherens-säkra fält - security patch är det
vanliga. Lägg **aldrig** in identitet eller Android-versionsgruppen här.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Exempel

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

*Den här dokumentationen genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [../CONTRIBUTING.md](CONTRIBUTING.md).*
