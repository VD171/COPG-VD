> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · Bahasa Indonesia · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arsitektur

COPG-VD adalah modul Zygisk: sebuah library native kecil (`libspoof.so`) yang disuntikkan
loader Zygisk ke dalam zygote dan, dari sana, ke dalam proses aplikasi. Yang dilakukannya
hanyalah menyajikan identitas perangkat yang dipilih ke proses yang Anda targetkan. Tidak ada
aplikasi dan, selain pengambilan profil opsional, tidak ada jaringan.

## Siklus hidup

1. **Zygote mulai.** Ketika zygote boot, loader memanggil `onLoad` modul. Ia membaca
   `/data/adb/COPG-VD/COPG-VD.json` sekali: konfigurasi scope dan profil.
2. **Fork aplikasi.** Untuk setiap aplikasi yang di-fork zygote, modul memutuskan di
   `preAppSpecialize` apakah proses ini berada dalam scope:
   - **dalam scope utama** (`playstore` / `global` / `whitelist` / `blacklist`), atau
   - **dalam scope DRM** (terdaftar di `drm_targets`).
   Jika bukan keduanya, modul **melepaskan diri** dari proses itu (`dlclose`) dan tidak
   meninggalkan jejak di dalamnya.
3. **Specialize.** Untuk proses yang tetap tinggal, mesin-mesin diterapkan di
   `postAppSpecialize`, selagi proses masih privileged.

Karena fork mewarisi salinan copy-on-write dari memori zygote, setiap aplikasi dimulai dari
config yang dibaca saat boot. Modul membaca ulang file per proses yang ditargetkan hanya
ketika file itu benar-benar berubah, sehingga aplikasi yang baru dijalankan atau dibuka
kembali akan mengambil profil yang telah diedit - tetapi keputusan scope itu sendiri dibuat
saat zygote mulai, jadi **mengubah scope, mesin, atau `drm_targets` memerlukan reboot**.

## Mesin-mesin (engines)

Masing-masing independen dan dapat diaktifkan/dimatikan.

- **Field Build (`motor_jni`).** Menulis ulang `android.os.Build.*` (dan `Build.VERSION.*`)
  di proses yang ditargetkan melalui JNI, sehingga kode Java membaca nilai palsu.
- **Property hook (`motor_prop_hook`).** Menyajikan properti sistem palsu ke proses melalui
  remap clean-room per proses dari area properti (`prop_virtualizer`). Ini adalah remap
  memori, bukan hook fungsi, jadi tidak ada jejak fungsi yang di-hook.
- **resetprop (seluruh perangkat).** Menulis properti sistem per grup - identity, version,
  boot state, SELinux, adb/usb, anti-emulator, ditambah satu pass pembersihan. Skrip boot
  menjalankannya. Dalam mode scoped, grup identity dan version ditinggalkan (Zygisk
  mengirimkannya per proses); grup boot, lock, dan SELinux tetap global agar perangkat
  koheren.
- **DRM / Widevine (`motor_drm`).** Meng-hook metode `MediaDrm` yang melaporkan tingkat
  keamanan Widevine (`getSecurityLevel`, `getPropertyString`) dan mengembalikan tingkat yang
  dikonfigurasi. Hook-nya null-checked, jadi profil yang salah bentuk menurun dengan anggun
  alih-alih membuat aplikasi crash. `drm_targets` memungkinkan mesin ini berjalan pada daftar
  aplikasinya sendiri, terpisah dari scope utama.

## Membaca config

Proses yang disuntikkan berjalan dalam domain SELinux zygote, yang secara default tidak dapat
menjangkau `/data/adb`. Modul menyertakan `sepolicy.rule` miliknya sendiri untuk
mengizinkannya, dan, sebagai cadangan, dapat membaca config melalui direktori modulnya yang
terbuka (`getModuleDir`), sehingga tetap berfungsi bahkan jika sebuah build Zygisk berhenti
memberikan path tersebut. File diparse dengan parser JSON tertanam yang kecil (`jsmn`); file
yang tidak dapat diparse berarti modul tidak men-spoof apa pun.

## Menjaga profil tetap segar

`fingerprint-update.sh` menyegarkan field build dari factory image Google terbaru, dari WebUI
atau sekali per boot. Ia menggunakan downloader bawaan modul sendiri (bukan `curl`/`wget` dari
`PATH`), memvalidasi setiap nilai sebelum digunakan, tidak pernah mundur, dan menolak profil
yang men-spoof perangkat yang berbeda. `android.os.Build` ditulis saat zygote mulai, jadi
nilai baru mencapai aplikasi pada reboot berikutnya. Lihat [USER-GUIDE.md](USER-GUIDE.md)
untuk sisi pengguna dan [CONFIGURATION.md](CONFIGURATION.md) untuk field-field-nya.

## Mengapa versi Android tidak di-spoof secara default

Menaikkan `SDK_INT` / `ANDROID_VERSION` di atas versi framework ROM yang sebenarnya membuat
aplikasi memanggil API yang tidak ada, yang membuat aplikasi Google crash dan mereboot ponsel
ke dalam softloop. Oleh karena itu grup version nonaktif secara default dan dikunci di balik
`spoof_version`. Modul membaca versi sebenarnya dari `/system/build.prop`, tidak pernah dari
`getprop`, karena `getprop` justru hal yang dipalsukannya. Lihat jebakannya di
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan sangat diterima - lihat [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan; lihat [CONTRIBUTING.md](CONTRIBUTING.md)._
