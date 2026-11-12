> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · Čeština · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Referenční příručka konfigurace

Celý modul je řízen jedním souborem: `/data/adb/COPG-VD/COPG-VD.json`. WebUI jej zapisuje za vás,
ale můžete jej upravovat ručně. Dodávaný příklad leží v `module/COPG-VD.json.example`.
Toto je jediný zdroj pravdy; kopie v adresáři modulu je jen výchozí hodnota pouze pro čtení.
Konfigurace zbylá ze starší verze v `/data/adb/COPG-VD.json` se automaticky přesune do
tohoto adresáře. Vlastní log a stav modulu (`update.log`, `update.state`) jsou také zde.

Pravidla:

- **Řetězce používají pouze dvojité uvozovky**, jako v JSON.
- **Každé pole je volitelné.** Pole, které není poskytnuto, je přeskočeno a je zachována
  vlastní hodnota ROM.
- Po ruční úpravě spusťte **Analyze**: soubor, který se neparsuje, přiměje modul podvrhnout
  **nic**, a řekne to pouze logcat.

## Klíče nejvyšší úrovně

| Klíč | Typ | Význam |
|---|---|---|
| `scope_mode` | string | `playstore` (výchozí), `global`, `whitelist` nebo `blacklist`. Viz [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Balíčky, které dostanou spoof, když je `scope_mode` `whitelist`. |
| `scope_blacklist` | array | Balíčky vyloučené, když je `scope_mode` `blacklist`. |
| `COPG-VD` | object | Profil: pole Build k předložení (viz níže). |
| `COPG-VD-Delete` | array | Názvy polí k odebrání místo nastavení (pole Build se stane null; vlastnost je odebrána pomocí `resetprop --delete`). |
| `COPG-VD-Settings` | object | Nastavení modulu, která cestují s profilem (viz níže). |
| `motor_jni` | bool | Engine polí Build (přepisuje `android.os.Build.*`). Výchozí `true`. |
| `motor_prop_hook` | bool | Engine vlastností per proces (clean-room přemapování vlastností). Výchozí `true`. |
| `motor_drm` | bool | Engine DRM / Widevine. Výchozí `false`. |
| `drm_targets` | array | Aplikace, které dostanou DRM spoof bez ohledu na `scope_mode`. Prázdné = následovat rozsah. |
| `global_fields` | array | Pole Build aplikovaná napříč zařízením i v rozsahovém režimu, pouze pro pole bezpečná z hlediska koherence. |
| `process_overrides` | object | Přepsání polí per proces: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Extra detail logcatu pro ladění. Výchozí `false`. |

## Profilový objekt `COPG-VD`

Každá položka je pole zařízení předkládané cíleným procesům. Běžné:

| Skupina | Pole |
|---|---|
| Identita | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| ID buildu | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Atestace | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Verze (speciální) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Varianty `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) umožňují
atestační cestě hlásit jinou hodnotu než prostou, takže keystore zůstává koherentní.

> **Skupina verze je speciální.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` a `CODENAME`
> popisují vaši ROM, ne podvržené zařízení. Jejich zvýšení dostane telefon do softloopu.
> Nejsou v dodávaném profilu a aplikují se pouze, když to `COPG-VD-Settings.spoof_version`
> dovolí - viz [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Stavy pole

| Stav | Jak | Výsledek |
|---|---|---|
| Nastavit | `"KEY": "value"` | Zapíše hodnotu. |
| Prázdné | `"KEY": ""` | Zapíše prázdnou hodnotu. |
| Smazat | název v `"COPG-VD-Delete": [ ... ]` | Odebere pole. |
| Přeskočit | vynechat klíč | Zachová vlastní hodnotu ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` nebo `L3`) je úroveň Widevine hlášená, když je `motor_drm`
zapnutý.

## `COPG-VD-Settings`

Nastavení, která cestují s profilem, takže záloha nese vaše volby.

| Klíč | Typ / hodnoty | Význam |
|---|---|---|
| `resetprop` | bool | Zda běží engine resetprop napříč zařízením. |
| `autoupdate` | bool | Zda `fingerprint-update.sh` běží jednou za boot. Výchozí zapnuto. |
| `spoof_manufacturer` | bool | Zda je podvrženo i pole výrobce. |
| `spoof_version` | `never` / `rom` / `force` | Jak se aplikuje skupina verze Androidu. `never` je výchozí; `force` je odmítnut při obnově zálohy. |

## `global_fields`

Pole Build v tomto seznamu se aplikují napříč zařízením i v rozsahovém režimu, aby zůstala
hodnota všude konzistentní. Používejte jej pouze pro pole bezpečná z hlediska koherence -
bezpečnostní záplata je obvyklá. **Nikdy** sem nedávejte identitu ani skupinu verze
Androidu.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Příklad

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

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je udržována VD171. Opravy a vylepšení jsou vítány - viz [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Tato dokumentace byla vytvořena pomocí Claude (Anthropic) a spravuje ji VD171. Opravy a vylepšení jsou vítány; viz [CONTRIBUTING.md](CONTRIBUTING.md)._
