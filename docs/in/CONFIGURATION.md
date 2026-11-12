> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · Bahasa Indonesia · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Referensi konfigurasi

Seluruh modul dikendalikan oleh satu file: `/data/adb/COPG-VD/COPG-VD.json`. WebUI menuliskannya
untuk Anda, tetapi Anda dapat mengeditnya secara manual. Contoh yang disertakan ada di
`module/COPG-VD.json.example`.
Inilah satu-satunya sumber kebenaran; salinan di bawah direktori modul hanyalah default yang hanya-baca. Konfigurasi yang tersisa dari versi lama di `/data/adb/COPG-VD.json` dipindahkan ke direktori ini secara otomatis. Log dan keadaan milik modul sendiri (`update.log`, `update.state`) juga berada di sini.

Aturan:

- **String hanya menggunakan tanda kutip ganda**, seperti dalam JSON.
- **Setiap field bersifat opsional.** Field yang tidak disediakan akan dilewati dan nilai ROM
  sendiri dipertahankan.
- Jalankan **Analyze** setelah mengedit secara manual: file yang tidak dapat diparse membuat
  modul men-spoof **apa pun**, dan hanya logcat yang mengatakannya.

## Key tingkat atas

| Key | Tipe | Arti |
|---|---|---|
| `scope_mode` | string | `playstore` (default), `global`, `whitelist` atau `blacklist`. Lihat [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Paket yang mendapat spoof ketika `scope_mode` adalah `whitelist`. |
| `scope_blacklist` | array | Paket yang dikecualikan ketika `scope_mode` adalah `blacklist`. |
| `COPG-VD` | object | Profil: field Build yang akan disajikan (lihat di bawah). |
| `COPG-VD-Delete` | array | Nama field yang akan dihapus alih-alih diatur (field Build menjadi null; sebuah properti dihapus dengan `resetprop --delete`). |
| `COPG-VD-Settings` | object | Pengaturan modul yang ikut bersama profil (lihat di bawah). |
| `motor_jni` | bool | Mesin field Build (menulis ulang `android.os.Build.*`). Default `true`. |
| `motor_prop_hook` | bool | Mesin properti per proses (remap properti clean-room). Default `true`. |
| `motor_drm` | bool | Mesin DRM / Widevine. Default `false`. |
| `drm_targets` | array | Aplikasi yang mendapat spoof DRM terlepas dari `scope_mode`. Kosong = ikuti scope. |
| `global_fields` | array | Field Build yang diterapkan di seluruh perangkat bahkan dalam mode scoped, hanya untuk field yang aman secara koherensi. |
| `process_overrides` | object | Override field per proses: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Detail logcat tambahan untuk debugging. Default `false`. |

## Object profil `COPG-VD`

Setiap entri adalah field perangkat yang disajikan ke proses yang ditargetkan. Yang umum:

| Grup | Field |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (khusus) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Varian `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) memungkinkan
jalur attestation melaporkan nilai yang berbeda dari nilai biasa, sehingga keystore tetap
koheren.

> **Grup version bersifat khusus.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` dan `CODENAME`
> menggambarkan ROM Anda, bukan perangkat yang di-spoof. Menaikkannya membuat ponsel softloop.
> Mereka tidak ada dalam profil yang dikirimkan dan hanya diterapkan ketika
> `COPG-VD-Settings.spoof_version` mengizinkannya - lihat
> [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### State field

| State | Cara | Hasil |
|---|---|---|
| Set | `"KEY": "value"` | Menulis nilai. |
| Empty | `"KEY": ""` | Menulis nilai kosong. |
| Delete | nama di `"COPG-VD-Delete": [ ... ]` | Menghapus field. |
| Skip | biarkan key dihilangkan | Mempertahankan nilai ROM sendiri. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` atau `L3`) adalah tingkat Widevine yang dilaporkan ketika
`motor_drm` aktif.

## `COPG-VD-Settings`

Pengaturan yang ikut bersama profil, sehingga backup membawa pilihan Anda.

| Key | Tipe / nilai | Arti |
|---|---|---|
| `resetprop` | bool | Apakah mesin resetprop seluruh perangkat berjalan. |
| `autoupdate` | bool | Apakah `fingerprint-update.sh` berjalan sekali per boot. Default aktif. |
| `spoof_manufacturer` | bool | Apakah field manufacturer ikut di-spoof. |
| `spoof_version` | `never` / `rom` / `force` | Bagaimana grup version Android diterapkan. `never` adalah default; `force` ditolak saat memulihkan backup. |

## `global_fields`

Field Build dalam daftar ini diterapkan di seluruh perangkat bahkan dalam mode scoped, untuk
menjaga sebuah nilai tetap konsisten di mana-mana. Gunakan hanya untuk field yang aman secara
koherensi - security patch adalah yang biasa. **Jangan pernah** menaruh identity atau grup
version Android di sini.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Contoh

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

*Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan sangat diterima - lihat [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan; lihat [CONTRIBUTING.md](CONTRIBUTING.md)._
