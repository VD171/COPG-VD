> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · Bahasa Indonesia · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Panduan Pengguna

COPG-VD menulis ulang fingerprint dan build perangkat sehingga aplikasi yang Anda pilih
melihat sebuah Pixel alih-alih perangkat Anda yang sebenarnya. Panduan ini membawa Anda dari
instalasi hingga pengaturan yang berfungsi, melewati pilihan-pilihan di sepanjang jalan.
Untuk setiap field dan nilai, lihat [CONFIGURATION.md](CONFIGURATION.md); untuk cara kerjanya
di dalam, lihat [ARCHITECTURE.md](ARCHITECTURE.md).

## Instalasi

1. Flash zip di KernelSU, APatch atau Magisk lalu reboot.
2. Zygisk harus aktif (bawaan, atau ReZygisk / Zygisk Next). Pengguna Magisk: aktifkan Zygisk.
3. Modul ini disertai profil Pixel, jadi tepat setelah reboot stack Google Play sudah
   melihat Pixel tersebut. Dengan fingerprint yang berfungsi, Anda tidak memerlukan
   PlayIntegrityFix atau GooglePhotosUnlimited.

Buka WebUI dari root manager Anda untuk mengendalikan modul. Pengguna Magisk membukanya dengan
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Semuanya juga
dapat diedit langsung di `/data/adb/COPG-VD.json`.

## Siapa yang melihat spoof (scope)

`scope_mode` menentukan proses mana yang menerima identitas palsu. Dalam mode scoped,
identitas dikirimkan per proses oleh Zygisk dan **tidak** bocor ke bagian sistem lainnya
melalui properti global.

| Mode | Siapa yang mendapat spoof |
|---|---|
| `playstore` (default) | Hanya stack Play: Google Play services, proses unstable-nya, dan Play Store. |
| `global` | Seluruh perangkat: setiap proses. |
| `whitelist` | Hanya aplikasi yang terdaftar di `scope_whitelist`. |
| `blacklist` | Setiap aplikasi kecuali yang ada di `scope_blacklist`. |

Mulailah dengan `playstore`. Ini adalah opsi paling ringan dan yang lolos Play Integrity
tanpa mengekspos spoof ke aplikasi yang tidak terkait.

## Mesin-mesin (engines)

Setiap mesin bersifat independen dan dapat dimatikan. Semua aktif secara default kecuali DRM.

- **Field Build (`motor_jni`)** - menulis ulang `android.os.Build.*` di proses yang
  ditargetkan. Inilah yang dibaca sebagian besar aplikasi.
- **Property hook (`motor_prop_hook`)** - menyajikan properti sistem palsu ke proses yang
  ditargetkan, melalui remap clean-room per proses dari area properti (tanpa hook fungsi).
- **resetprop** - menulis ulang properti sistem di seluruh perangkat, per grup (identity,
  version, boot state, SELinux, adb/usb, anti-emulator, dan satu pass pembersihan). Dalam
  mode scoped, grup identity dan version tetap di luar pass seluruh perangkat (Zygisk
  mengirimkannya per proses); grup boot, lock, dan SELinux tetap global. Nyalakan/matikan di
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, nonaktif secara default)** - melaporkan tingkat keamanan
  Widevine yang dipilih (L1 atau L3) ke aplikasi yang membacanya. Lihat bagian DRM di bawah.

## Menjaga fingerprint tetap segar

Sebuah fingerprint menua: Google merotasi factory image, dan yang lama perlahan kehilangan
nilainya. `fingerprint-update.sh` menjaga milik Anda tetap terkini, dari factory image
Google terbaru.

- Dari WebUI (tab Tools): **Check Update** dan **Update Now**.
- Secara mandiri, **sekali per boot**: **Auto-update JSON on boot** (aktif secara default).
  Berjalan di latar belakang, terus mencoba lagi selama sekitar sepuluh menit karena wifi
  biasanya belum aktif saat boot, dan tidak pernah menunda boot.
- Ia hanya menulis ulang field build (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Semua yang Anda sesuaikan tetap dipertahankan, dan konten
  sebelumnya disimpan sebagai `.bak`.
- Ia tidak pernah mundur (build upstream yang lebih lama ditolak), dan jika profil Anda
  men-spoof perangkat yang berbeda ia tidak menerapkan apa pun - fingerprint Pixel pada
  profil lain lebih buruk daripada yang lama.
- `resetprop` diterapkan ulang tepat setelah pembaruan, tetapi `android.os.Build` ditulis
  saat zygote mulai, jadi **reboot** agar nilai baru mencapai aplikasi. Log:
  `/data/adb/COPG-VD.update.log`.

## Jebakan versi Android

Hal yang paling sulit untuk dibuat benar. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` dan
`CODENAME` menggambarkan **ROM Anda**, bukan perangkat yang Anda spoof. Memberi tahu aplikasi
bahwa SDK lebih baru daripada framework yang sebenarnya membuat mereka memanggil API yang
tidak ada: aplikasi Google crash, ponsel reboot, dan dimulai lagi dari awal. Boot itu sendiri
selesai, jadi ini adalah **softloop** yang tidak meninggalkan apa pun di log boot.

Field-field ini tidak ada dalam config yang dikirimkan dan updater tidak pernah menulisnya.
**Spoof Android version** (`COPG-VD-Settings.spoof_version`) menentukan apakah mereka
diterapkan sama sekali:

- `never` (default) - versi ROM itu sendiri yang digunakan.
- `rom` - hanya menerapkan apa yang tidak melebihi ROM, yang dalam praktiknya berarti
  menurunkan SDK.
- `force` - menerapkan persis apa yang dikatakan config. Inilah yang menyebabkan softloop;
  gunakan hanya jika Anda tahu framework target mendukungnya.

Versi sebenarnya dibaca dari `/system/build.prop`, tidak pernah dari `getprop` (yang justru
hal yang dipalsukan modul ini). `force` juga ditolak saat memulihkan backup, sehingga backup
lama tidak dapat mengaktifkannya kembali di belakang Anda.

## DRM / Widevine

Nonaktif secara default (`motor_drm`). Ketika aktif, ia melaporkan tingkat Widevine yang
dipilih, `DRM_SECURITY_LEVEL` (`L1` atau `L3`), ke aplikasi yang membacanya.

Secara default spoof DRM mengikuti `scope_mode`. Untuk menerapkannya ke sekumpulan aplikasi
tertentu alih-alih - secara independen dari scope utama - daftarkan mereka di `drm_targets`.
Modul kemudian tetap dimuat di aplikasi yang terdaftar **hanya** untuk hook DRM, bahkan
ketika aplikasi itu berada di luar scope utama; daftar yang kosong atau tidak ada berarti
mengikuti scope. Ini memerlukan mode scoped (bukan `global`), dan berlaku pada **reboot**
berikutnya.

## Analyze: periksa config Anda

**Analyze** di WebUI (atau `fingerprint-update.sh analyze`) mengaudit config sebagaimana
adanya dan memberi tahu Anda apa yang salah sebelum aplikasi melakukannya:

- versi terhadap ROM (apakah akan softloop?),
- apakah file masih dapat diparse (file yang rusak membuat modul men-spoof **apa pun**, dan
  hanya logcat yang akan mengatakannya),
- apakah fingerprint selaras dengan field-field di sekitarnya,
- key yang tidak dibaca modul, tanggal yang mencurigakan, dan apakah properti aktif sudah
  membawa apa yang diminta config.

Jalankan setiap kali Anda mengedit config secara manual.

## WebUI

Opsional, tetapi cara mudah untuk mengendalikan segalanya. Lima tab:

- **About** - info modul dan versi.
- **Device** - setiap field build, diatur per state dan dikelompokkan berdasarkan kategori.
- **Spoofing** - mode scope dan saklar mesin.
- **System** - grup resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, auto-update saat boot, dan
  laporan Diagnostics (satu tombol untuk membaca dan mengekspor semua yang berguna untuk
  laporan bug).

Ia tidak membuat permintaan jaringan apa pun; semua yang dibutuhkannya disertakan di dalam
modul.

## Pemecahan masalah

- **Sebuah aplikasi masih melihat perangkat yang sebenarnya.** Periksa scope: pada
  `playstore` hanya stack Play yang tercakup. Pastikan config dapat diparse (jalankan
  Analyze). Setelah mengubah mesin, `drm_targets` atau profil, **reboot** - Zygisk membaca
  scope saat zygote mulai.
- **Play Integrity masih gagal.** Pastikan fingerprint segar (Check Update) dan bahwa
  `SECURITY_PATCH` ada di `global_fields` sehingga tetap koheren di seluruh perangkat. Kill
  Google Play services agar ia melakukan atestasi ulang.
- **Ponsel softloop setelah mengaktifkan version spoofing.** Itu adalah jebakan versi Android
  di atas - setel `spoof_version` kembali ke `never`.
- **WebUI tidak mau terbuka di Magisk.** Gunakan [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan sangat diterima - lihat [../CONTRIBUTING.md](CONTRIBUTING.md).*
