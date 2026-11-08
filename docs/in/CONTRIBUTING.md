> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · Bahasa Indonesia · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Berkontribusi ke COPG-VD

Terima kasih telah membantu! COPG-VD dimaksudkan agar mudah untuk dikontribusikan. Panduan ini
memberi tahu Anda di mana segala sesuatu berada dan beberapa konvensi yang kami ikuti.

## Proyek sekilas

COPG-VD adalah **spoofer perangkat Zygisk**: sebuah library native kecil yang disuntikkan ke
proses aplikasi untuk menulis ulang fingerprint dan build perangkat, ditambah WebUI
vanilla-JS untuk mengendalikannya. Ini adalah fork dari COPG (oleh AlirezaParsi), dikelola
oleh VD171 di bawah lisensi Apache-2.0. Lihat [ARCHITECTURE.md](ARCHITECTURE.md) dan
[FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Secara default ia membatasi spoof ke stack Google Play melalui Zygisk, sehingga menjadi
alternatif yang lebih ringan dan lebih tangguh daripada PlayIntegrityFix.

## Kontributor AI dipersilakan

Asisten dan agen AI di sini adalah kontributor kelas satu, bukan sekadar pelengkap.

- Proyek ini dibuat agar mudah dibaca: konfigurasinya adalah satu file JSON
  (`/data/adb/COPG-VD.json`, didokumentasikan di [CONFIGURATION.md](CONFIGURATION.md)),
  mesin-mesinnya kecil dan mandiri, dan tata letaknya ada di [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Patch yang dibantu AI ditinjau dan diterima dengan ketentuan yang sama seperti lainnya -
  berdasarkan kebenaran, kejelasan, dan konvensi di bawah ini, bukan berdasarkan siapa (atau
  apa) yang menulisnya.
- Standar yang sama untuk semua: fitur yang nyata tidak pernah dilemahkan, spoof tetap
  koheren, dan tidak ada yang rahasia atau spesifik perangkat yang masuk ke repositori (lihat
  [.gitignore](../../.gitignore)).

## Penyiapan dev

- Anda memerlukan perangkat atau emulator yang di-root dengan Zygisk (KernelSU, APatch atau
  Magisk) untuk menguji.
- Bangun library native per ABI dengan NDK (r29) dan CMake - lihat langkah `Build zygisk
  libraries` di [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) untuk
  perintah yang tepat. CI membangun ketiga ABI untuk Anda.
- Bangun zip yang dapat di-flash: salin `libspoof.so` yang sudah dibangun ke
  `module/zygisk/<abi>.so`, lalu `cd module && zip -r9 ../COPG-VD-dev.zip .` dan flash.
- WebUI adalah `module/webroot/` (buka dari root manager). Logika spoofing ada di
  `zygisk/spoof_module.cpp`; pengambil profil adalah `module/fingerprint-update.sh`.

## Konvensi

- **Setiap file sumber modul** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) dimulai dengan header
  banner proyek (salin dari file mana pun yang sudah ada). Perkakas di bawah `.github/`
  menggunakan komentar pendek sebagai gantinya.
- **Kode dan komentar dalam bahasa Inggris.** Jaga komentar tetap minimal dan hanya di tempat
  yang diperlukan.
- **Tanpa em-dash atau en-dash**; selalu gunakan hyphen biasa `-`.
- WebUI adalah **vanilla JS** (satu `scripts.js`); tanpa framework.
- **Jangan pernah melemahkan** fitur yang nyata: jaga spoof tetap koheren, dan jangan membuat
  hook membuat aplikasi yang mereka tempeli crash (mereka null-checked dengan sengaja).

## Internasionalisasi (i18n)

- String UI berada di `module/webroot/lang/`. Bahasa Inggris adalah fallback kanonik
  (`en.js` + `en.json`); 20 bahasa lainnya adalah `<code>.json`.
- Untuk menambah atau mengubah string: edit `en.js` **dan** `en.json`, lalu perbarui setiap
  `<code>.json`. Menyentuh label yang terlihat berarti memperbarui **semua** file bahasa dan
  **semua** `README.<code>.md`.
- Terjemahan adalah JSON biasa - kontribusi pertama yang bagus.

## Commit & PR

- Jaga PR tetap fokus. Jelaskan apa dan mengapa.
- Sign off commit Anda (DCO): `git commit -s` (menambahkan `Signed-off-by:`).
- CI harus tetap hijau. Bersikaplah baik dalam review - lihat [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Good first issues

Cari label `good first issue` dan `help wanted`. Terjemahan, dokumentasi, dan profil Pixel
baru semuanya merupakan titik awal yang bagus.

*Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan sangat diterima - lihat [CONTRIBUTING.md](CONTRIBUTING.md).*
