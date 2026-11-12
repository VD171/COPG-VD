> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · Polski · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Dokumentacja konfiguracji

Cały moduł jest sterowany jednym plikiem: `/data/adb/COPG-VD/COPG-VD.json`. WebUI zapisuje go za
Ciebie, ale możesz go edytować ręcznie. Dostarczany przykład znajduje się w `module/COPG-VD.json.example`.
To jest jedyne źródło prawdy; kopia w katalogu modułu jest tylko domyślną wartością tylko do odczytu.
Konfiguracja pozostała po starszej wersji w `/data/adb/COPG-VD.json` jest automatycznie przenoszona do tego katalogu.
Własny log i stan modułu (`update.log`, `update.state`) również znajdują się tutaj.

Zasady:

- **Ciągi znaków używają tylko podwójnych cudzysłowów**, jak w JSON.
- **Każde pole jest opcjonalne.** Pole, którego nie podano, jest pomijane, a zachowywana jest
  własna wartość ROM-u.
- Uruchom **Analyze** po ręcznej edycji: plik, który się nie parsuje, sprawia, że moduł nie fałszuje
  **niczego**, a mówi o tym tylko logcat.

## Klucze najwyższego poziomu

| Klucz | Typ | Znaczenie |
|---|---|---|
| `scope_mode` | string | `playstore` (domyślny), `global`, `whitelist` lub `blacklist`. Zobacz [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Pakiety, które dostają spoof, gdy `scope_mode` to `whitelist`. |
| `scope_blacklist` | array | Pakiety wykluczone, gdy `scope_mode` to `blacklist`. |
| `COPG-VD` | object | Profil: pola Build do zaprezentowania (zobacz poniżej). |
| `COPG-VD-Delete` | array | Nazwy pól do usunięcia zamiast ustawienia (pole Build staje się null; właściwość jest usuwana za pomocą `resetprop --delete`). |
| `COPG-VD-Settings` | object | Ustawienia modułu, które podróżują z profilem (zobacz poniżej). |
| `motor_jni` | bool | Silnik pól Build (przepisuje `android.os.Build.*`). Domyślnie `true`. |
| `motor_prop_hook` | bool | Silnik właściwości per proces (clean-room remapowanie właściwości). Domyślnie `true`. |
| `motor_drm` | bool | Silnik DRM / Widevine. Domyślnie `false`. |
| `drm_targets` | array | Aplikacje, które dostają spoof DRM niezależnie od `scope_mode`. Pusty = podążaj za zakresem. |
| `global_fields` | array | Pola Build stosowane na poziomie całego urządzenia nawet w trybie z zakresem, tylko dla pól bezpiecznych pod względem spójności. |
| `process_overrides` | object | Nadpisania pól per proces: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Dodatkowe szczegóły logcat do debugowania. Domyślnie `false`. |

## Obiekt profilu `COPG-VD`

Każdy wpis to pole urządzenia prezentowane docelowym procesom. Najczęstsze:

| Grupa | Pola |
|---|---|
| Tożsamość | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Atestacja | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Wersja (specjalna) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Warianty `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) pozwalają ścieżce
atestacji zgłosić wartość inną niż zwykła, aby keystore pozostał
spójny.

> **Grupa wersji jest specjalna.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` i `CODENAME`
> opisują Twój ROM, a nie fałszowane urządzenie. Ich podniesienie wpędza telefon w softloop. Nie są
> w dostarczanym profilu i stosują się tylko wtedy, gdy pozwala na to `COPG-VD-Settings.spoof_version` -
> zobacz [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Stany pól

| Stan | Jak | Wynik |
|---|---|---|
| Ustaw | `"KEY": "value"` | Zapisuje wartość. |
| Pusty | `"KEY": ""` | Zapisuje pustą wartość. |
| Usuń | nazwa w `"COPG-VD-Delete": [ ... ]` | Usuwa pole. |
| Pomiń | pozostaw klucz poza konfiguracją | Zachowuje własną wartość ROM-u. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` lub `L3`) to poziom Widevine zgłaszany, gdy `motor_drm` jest włączony.

## `COPG-VD-Settings`

Ustawienia, które podróżują z profilem, więc kopia zapasowa niesie Twoje wybory.

| Klucz | Typ / wartości | Znaczenie |
|---|---|---|
| `resetprop` | bool | Czy działa silnik resetprop obejmujący całe urządzenie. |
| `autoupdate` | bool | Czy `fingerprint-update.sh` uruchamia się raz na rozruch. Domyślnie włączone. |
| `spoof_manufacturer` | bool | Czy pole producenta jest również fałszowane. |
| `spoof_version` | `never` / `rom` / `force` | Jak stosuje się grupa wersji Androida. `never` jest domyślne; `force` jest odrzucane podczas przywracania kopii zapasowej. |

## `global_fields`

Pola Build z tej listy są stosowane na poziomie całego urządzenia nawet w trybie z zakresem, aby utrzymać wartość
spójną wszędzie. Używaj tego tylko dla pól bezpiecznych pod względem spójności - zwykle jest to security patch.
**Nigdy** nie umieszczaj tu tożsamości ani grupy wersji Androida.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Przykład

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

*Ta dokumentacja została wygenerowana z Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
