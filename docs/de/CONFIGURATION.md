> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · Deutsch · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Konfigurationsreferenz

Das gesamte Modul wird von einer Datei gesteuert: `/data/adb/COPG-VD/COPG-VD.json`. Die WebUI schreibt
sie für dich, aber du kannst sie von Hand bearbeiten. Ein mitgeliefertes Beispiel liegt unter
`module/COPG-VD.json.example`.
Dies ist die einzige Quelle der Wahrheit; die Kopie im Modulverzeichnis ist nur ein
schreibgeschützter Standard. Eine aus einer älteren Version übrig gebliebene Konfiguration unter
`/data/adb/COPG-VD.json` wird automatisch in dieses Verzeichnis verschoben. Das eigene
Log und der Zustand des Moduls (`update.log`, `update.state`) liegen ebenfalls hier.

Regeln:

- **Strings verwenden nur doppelte Anführungszeichen**, wie in JSON.
- **Jedes Feld ist optional.** Ein nicht angegebenes Feld wird übersprungen, und der eigene
  Wert der ROM bleibt erhalten.
- Führe nach dem Bearbeiten von Hand **Analyze** aus: eine Datei, die nicht parst, lässt das
  Modul **nichts** vortäuschen, und nur logcat sagt es.

## Top-Level-Schlüssel

| Schlüssel | Typ | Bedeutung |
|---|---|---|
| `scope_mode` | string | `playstore` (Standard), `global`, `whitelist` oder `blacklist`. Siehe [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Pakete, die die Täuschung erhalten, wenn `scope_mode` auf `whitelist` steht. |
| `scope_blacklist` | array | Pakete, die ausgeschlossen werden, wenn `scope_mode` auf `blacklist` steht. |
| `COPG-VD` | object | Das Profil: die zu präsentierenden Build-Felder (siehe unten). |
| `COPG-VD-Delete` | array | Feldnamen, die entfernt statt gesetzt werden (ein Build-Feld wird null; eine Property wird mit `resetprop --delete` entfernt). |
| `COPG-VD-Settings` | object | Moduleinstellungen, die mit dem Profil reisen (siehe unten). |
| `motor_jni` | bool | Build-Felder-Engine (schreibt `android.os.Build.*` um). Standard `true`. |
| `motor_prop_hook` | bool | Property-Engine pro Prozess (Clean-Room-Property-Remap). Standard `true`. |
| `motor_drm` | bool | DRM-/Widevine-Engine. Standard `false`. |
| `drm_targets` | array | Apps, die die DRM-Täuschung unabhängig von `scope_mode` erhalten. Leer = dem Scope folgen. |
| `global_fields` | array | Build-Felder, die auch in einem Scope-Modus geräteweit angewandt werden, nur für kohärenzsichere Felder. |
| `process_overrides` | object | Feld-Overrides pro Prozess: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Zusätzliche logcat-Details zum Debuggen. Standard `false`. |

## Das `COPG-VD`-Profilobjekt

Jeder Eintrag ist ein Gerätefeld, das den anvisierten Prozessen präsentiert wird. Die gängigen:

| Gruppe | Felder |
|---|---|
| Identität | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build-ID | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestierung | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (speziell) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Die `*_FOR_ATTESTATION`-Varianten (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) lassen den
Attestierungspfad einen anderen Wert als den einfachen melden, sodass der Keystore kohärent bleibt.

> **Die Versionsgruppe ist speziell.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` und `CODENAME`
> beschreiben deine ROM, nicht das vorgetäuschte Gerät. Sie anzuheben, bringt das Telefon in
> einen Softloop. Sie sind nicht im mitgelieferten Profil und greifen nur, wenn
> `COPG-VD-Settings.spoof_version` es erlaubt - siehe [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Feldzustände

| Zustand | Wie | Ergebnis |
|---|---|---|
| Setzen | `"KEY": "value"` | Schreibt den Wert. |
| Leer | `"KEY": ""` | Schreibt einen leeren Wert. |
| Löschen | Name in `"COPG-VD-Delete": [ ... ]` | Entfernt das Feld. |
| Überspringen | Schlüssel weglassen | Behält den eigenen Wert der ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` oder `L3`) ist die gemeldete Widevine-Stufe, wenn `motor_drm` an ist.

## `COPG-VD-Settings`

Einstellungen, die mit dem Profil reisen, sodass ein Backup deine Entscheidungen mitträgt.

| Schlüssel | Typ / Werte | Bedeutung |
|---|---|---|
| `resetprop` | bool | Ob die geräteweite resetprop-Engine läuft. |
| `autoupdate` | bool | Ob `fingerprint-update.sh` einmal pro Boot läuft. Standardmäßig an. |
| `spoof_manufacturer` | bool | Ob auch das Herstellerfeld gefälscht wird. |
| `spoof_version` | `never` / `rom` / `force` | Wie die Android-Versionsgruppe greift. `never` ist der Standard; `force` wird beim Wiederherstellen eines Backups abgelehnt. |

## `global_fields`

Build-Felder in dieser Liste werden auch in einem Scope-Modus geräteweit angewandt, um einen
Wert überall konsistent zu halten. Nutze sie nur für kohärenzsichere Felder - der Security Patch
ist der übliche. Lege **niemals** Identität oder die Android-Versionsgruppe hier ab.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Beispiel

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

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen; siehe [CONTRIBUTING.md](CONTRIBUTING.md)._
