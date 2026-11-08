> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · Italiano · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Riferimento di configurazione

L'intero modulo è pilotato da un solo file: `/data/adb/COPG-VD.json`. La WebUI lo scrive per
te, ma puoi modificarlo a mano. Un esempio incluso si trova in `module/COPG-VD.json.example`.

Regole:

- **Le stringhe usano solo doppi apici**, come in JSON.
- **Ogni campo è opzionale.** Un campo non fornito viene saltato e il valore stesso della ROM
  viene mantenuto.
- Esegui **Analyze** dopo aver modificato a mano: un file che non viene parsato fa sì che il modulo non falsifichi
  **niente**, e solo logcat lo dice.

## Chiavi di primo livello

| Chiave | Tipo | Significato |
|---|---|---|
| `scope_mode` | string | `playstore` (predefinita), `global`, `whitelist` o `blacklist`. Vedi [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Pacchetti che ricevono lo spoof quando `scope_mode` è `whitelist`. |
| `scope_blacklist` | array | Pacchetti esclusi quando `scope_mode` è `blacklist`. |
| `COPG-VD` | object | Il profilo: i campi Build da presentare (vedi sotto). |
| `COPG-VD-Delete` | array | Nomi di campi da rimuovere invece di impostare (il campo Build diventa null; una proprietà viene rimossa con `resetprop --delete`). |
| `COPG-VD-Settings` | object | Impostazioni del modulo che viaggiano con il profilo (vedi sotto). |
| `motor_jni` | bool | Motore dei campi Build (riscrive `android.os.Build.*`). Predefinito `true`. |
| `motor_prop_hook` | bool | Motore delle proprietà per processo (remap clean-room delle proprietà). Predefinito `true`. |
| `motor_drm` | bool | Motore DRM / Widevine. Predefinito `false`. |
| `drm_targets` | array | App che ricevono lo spoof DRM indipendentemente da `scope_mode`. Vuoto = segue lo scope. |
| `global_fields` | array | Campi Build applicati a livello dell'intero dispositivo anche in una modalità scoped, solo per campi sicuri per la coerenza. |
| `process_overrides` | object | Override di campo per processo: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Dettaglio logcat extra per il debug. Predefinito `false`. |

## L'oggetto profilo `COPG-VD`

Ogni voce è un campo del dispositivo presentato ai processi interessati. Quelli comuni:

| Gruppo | Campi |
|---|---|
| Identità | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestazione | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Versione (speciale) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Le varianti `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) permettono al
percorso di attestazione di riportare un valore diverso da quello semplice, così il keystore resta
coerente.

> **Il gruppo versione è speciale.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME`
> descrivono la tua ROM, non il dispositivo falsificato. Alzarli manda il telefono in softloop. Non sono
> nel profilo incluso e si applicano solo quando `COPG-VD-Settings.spoof_version` lo consente -
> vedi [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Stati dei campi

| Stato | Come | Risultato |
|---|---|---|
| Set | `"KEY": "value"` | Scrive il valore. |
| Empty | `"KEY": ""` | Scrive un valore vuoto. |
| Delete | nome in `"COPG-VD-Delete": [ ... ]` | Rimuove il campo. |
| Skip | ometti la chiave | Mantiene il valore stesso della ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` o `L3`) è il livello Widevine riportato quando `motor_drm` è attivo.

## `COPG-VD-Settings`

Impostazioni che viaggiano con il profilo, così un backup porta con sé le tue scelte.

| Chiave | Tipo / valori | Significato |
|---|---|---|
| `resetprop` | bool | Se il motore resetprop device-wide viene eseguito. |
| `autoupdate` | bool | Se `fingerprint-update.sh` viene eseguito una volta per boot. Attivo di default. |
| `spoof_manufacturer` | bool | Se anche il campo manufacturer viene falsificato. |
| `spoof_version` | `never` / `rom` / `force` | Come si applica il gruppo versione Android. `never` è il predefinito; `force` viene rifiutato durante il ripristino di un backup. |

## `global_fields`

I campi Build in questa lista vengono applicati a livello dell'intero dispositivo anche in una modalità scoped, per mantenere un valore
coerente ovunque. Usala solo per campi sicuri per la coerenza - la security patch è quello
abituale. **Mai** mettere qui l'identità o il gruppo versione Android.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Esempio

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

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [../CONTRIBUTING.md](CONTRIBUTING.md).*
