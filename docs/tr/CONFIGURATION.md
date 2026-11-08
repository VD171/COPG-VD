> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · Türkçe · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Yapılandırma referansı

Tüm modül tek bir dosya tarafından yönetilir: `/data/adb/COPG-VD.json`. WebUI onu sizin
için yazar, ancak elle de düzenleyebilirsiniz. Birlikte gelen bir örnek
`module/COPG-VD.json.example` konumundadır.

Kurallar:

- **Dizeler yalnızca çift tırnak kullanır**, JSON'daki gibi.
- **Her alan isteğe bağlıdır.** Sağlanmayan bir alan atlanır ve ROM'un kendi değeri
  korunur.
- Elle düzenledikten sonra **Analyze** çalıştırın: ayrıştırılamayan bir dosya modülün
  **hiçbir şey** sahtelememesine neden olur ve bunu yalnızca logcat söyler.

## Üst düzey anahtarlar

| Anahtar | Tür | Anlam |
|---|---|---|
| `scope_mode` | string | `playstore` (varsayılan), `global`, `whitelist` veya `blacklist`. Bkz. [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | `scope_mode` `whitelist` iken sahtelemeyi alan paketler. |
| `scope_blacklist` | array | `scope_mode` `blacklist` iken hariç tutulan paketler. |
| `COPG-VD` | object | Profil: sunulacak Build alanları (aşağıya bakın). |
| `COPG-VD-Delete` | array | Ayarlamak yerine kaldırılacak alan adları (Build alanı null olur; bir özellik `resetprop --delete` ile kaldırılır). |
| `COPG-VD-Settings` | object | Profille birlikte seyahat eden modül ayarları (aşağıya bakın). |
| `motor_jni` | bool | Build alanları motoru (`android.os.Build.*` değerlerini yeniden yazar). Varsayılan `true`. |
| `motor_prop_hook` | bool | Süreç başına özellik motoru (temiz-oda özellik yeniden eşlemesi). Varsayılan `true`. |
| `motor_drm` | bool | DRM / Widevine motoru. Varsayılan `false`. |
| `drm_targets` | array | `scope_mode`'dan bağımsız olarak DRM sahtelemesini alan uygulamalar. Boş = kapsamı takip et. |
| `global_fields` | array | Yalnızca tutarlılık açısından güvenli alanlar için, kapsamlı bir modda bile cihaz genelinde uygulanan Build alanları. |
| `process_overrides` | object | Süreç başına alan geçersiz kılmaları: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Hata ayıklama için ekstra logcat ayrıntısı. Varsayılan `false`. |

## `COPG-VD` profil nesnesi

Her giriş, hedeflenen süreçlere sunulan bir cihaz alanıdır. Yaygın olanlar:

| Grup | Alanlar |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (özel) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

`*_FOR_ATTESTATION` varyantları (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`),
attestation yolunun düz olandan farklı bir değer bildirmesini sağlar, böylece keystore
tutarlı kalır.

> **Sürüm grubu özeldir.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` ve `CODENAME`
> ROM'unuzu tanımlar, sahtelenen cihazı değil. Onları yükseltmek telefonu softloop yapar.
> Birlikte gelen profilde yoktur ve yalnızca `COPG-VD-Settings.spoof_version` izin
> verdiğinde uygulanır - bkz. [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Alan durumları

| Durum | Nasıl | Sonuç |
|---|---|---|
| Set | `"KEY": "value"` | Değeri yazar. |
| Empty | `"KEY": ""` | Boş bir değer yazar. |
| Delete | `"COPG-VD-Delete": [ ... ]` içindeki ad | Alanı kaldırır. |
| Skip | anahtarı dışarıda bırakın | ROM'un kendi değerini korur. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` veya `L3`), `motor_drm` açıkken bildirilen Widevine
seviyesidir.

## `COPG-VD-Settings`

Profille birlikte seyahat eden ayarlar, böylece bir yedek seçimlerinizi taşır.

| Anahtar | Tür / değerler | Anlam |
|---|---|---|
| `resetprop` | bool | Cihaz geneli resetprop motorunun çalışıp çalışmayacağı. |
| `autoupdate` | bool | `fingerprint-update.sh`'nin önyükleme başına bir kez çalışıp çalışmayacağı. Varsayılan açık. |
| `spoof_manufacturer` | bool | Manufacturer alanının da sahtelenip sahtelenmeyeceği. |
| `spoof_version` | `never` / `rom` / `force` | Android sürüm grubunun nasıl uygulanacağı. `never` varsayılandır; `force` bir yedek geri yüklenirken reddedilir. |

## `global_fields`

Bu listedeki Build alanları, bir değerin her yerde tutarlı olması için kapsamlı bir modda
bile cihaz genelinde uygulanır. Onu yalnızca tutarlılık açısından güvenli alanlar için
kullanın - security patch olağan olanıdır. Buraya identity veya Android sürüm grubunu
**asla** koymayın.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Örnek

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

*Bu belge Claude (Anthropic) ile oluşturulmuş ve VD171 tarafından sürdürülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [../CONTRIBUTING.md](CONTRIBUTING.md).*
