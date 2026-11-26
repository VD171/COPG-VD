> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · Bahasa Indonesia · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Agen AI: permukaan kendali

COPG-VD menyambut kontributor AI dan agen, dan seluruh modul dibangun untuk dikendalikan tanpa antarmuka,
tanpa scraping WebUI. Ada dua permukaan, dan agen yang berjalan sebagai root (seperti yang dilakukan WebUI)
menggunakan keduanya:

1. **File konfigurasi** `/data/adb/COPG-VD/COPG-VD.json` - satu-satunya sumber kebenaran. Setiap field
   profil dan setiap pengaturan berada di sini, membaca dan menulis file ini adalah cara mengubah apa yang
   dipalsukan modul.
2. **Titik masuk shell** `fingerprint-update.sh` - satu skrip dengan verb yang stabil untuk memeriksa,
   menerapkan, dan mengambil profil.

## File konfigurasi

`/data/adb/COPG-VD/COPG-VD.json` adalah objek JSON biasa. Modul membacanya dari proses yang diinjeksi
melalui aturan SELinux khusus yang disertakannya sendiri, file ini tidak menyimpan kredensial. Contoh yang
disertakan ada di `module/COPG-VD.json.example`, disegarkan setiap hari dari citra pabrik Google terbaru.

Aturan yang harus diikuti agen:

- **String hanya menggunakan tanda kutip ganda**, seperti dalam JSON.
- **Setiap field bersifat opsional.** Field yang tidak disediakan akan dilewati dan nilai milik ROM
  dipertahankan.
- Kunci tingkat atas yang mengarahkan modul adalah `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, objek `COPG-VD` (field Build), daftar
  `COPG-VD-Delete`, dan objek `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_version`). [Referensi
  konfigurasi](CONFIGURATION.md) mendokumentasikan masing-masing.
- `"spoof_version": "force"` ditolak ketika berasal dari file di disk dan diturunkan saat dibaca, sehingga
  memulihkan cadangan lama tidak dapat mengaktifkannya kembali secara diam-diam. Atur kebijakan versi
  melalui pengaturan, bukan dengan menulis `force` secara manual.
- Setelah mengedit file, jalankan **`analyze`** (di bawah): file yang tidak dapat diurai membuat modul
  tidak memalsukan **apa pun**, dan hanya logcat yang memberitahukannya.

Config yang diubah menjangkau aplikasi pada awal proses berikutnya. Properti yang dikirim `resetprop` dapat
diterapkan ulang tanpa reboot (`service.sh --props-only`), tetapi field `android.os.Build.*` ditulis oleh
pustaka Zygisk saat zygote dimulai, jadi **reboot diperlukan** agar field tersebut menjangkau aplikasi.

## Kontrak shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Skrip mencetak baris yang dapat dibaca manusia, baris yang dapat dibaca mesin dimulai dengan `status:`. Kode
keluarnya `0` saat berhasil dan bukan nol saat gagal.

| Verb | Apa yang dilakukan | Keluaran umum |
|---|---|---|
| `check` | Membandingkan profil terpasang dengan build hulu terbaru, tidak menulis apa pun. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Mengambil profil terbaru dan menggabungkannya ke dalam config (hanya field Build, kunci Anda yang lain dipertahankan). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Mengaudit config apa adanya (parse, versi vs ROM, koherensi fingerprint, kunci tak dikenal, tanggal, props). Mencetak laporan, kode keluar mencerminkan temuan red/warn. | laporan teks |
| `fetch-index` | Mengunduh dan memverifikasi indeks perangkat yang ditandatangani dan mencetaknya (`index.json`). | JSON indeks \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Mengunduh `build.prop` satu perangkat (path dari indeks, mis. `pixel-9a/latest.prop`) dan menulis field Build-nya ke dalam config. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Memigrasi state/config dari tata letak datar lama ke `/data/adb/COPG-VD/`. | - |
| `migrate` | Migrasi config sekali jalan antar versi modul. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Pembaruan otomatis sekali per boot, ditujukan untuk `service.sh`, bukan penggunaan interaktif. | menulis `update.status` |

Setiap unduhan divalidasi sebelum digunakan (satu-satunya pengunduh di perangkat adalah `wget` busybox, yang
tidak dapat memvalidasi TLS), dan pembaru profil tidak pernah mundur: build hulu yang lebih tua dari yang
terpasang ditolak. Indeks feed dan setiap `.prop` membawa tanda tangan ed25519 terpisah yang diverifikasi
sebelum konten dibaca.

## Alur agen umum

- **Menjaga profil tetap segar:** `check`; jika `status: update-available`, `apply`; lalu reboot agar
  `Build.*` baru menjangkau aplikasi.
- **Beralih ke profil Pixel lain:** `fetch-index`, pilih path perangkat dari indeks, `fetch <path>`,
  jalankan `analyze` untuk memastikan config koheren, lalu reboot.
- **Mengubah cakupan atau engine:** edit `scope_mode` (atau saklar engine) di file konfigurasi, jalankan
  `analyze`, lalu `service.sh --props-only` untuk perubahan yang dikirim lewat properti, atau reboot untuk
  field Build.

## Pengaman

- Mengubah config atau menerapkan profil mengubah apa yang dilihat setiap aplikasi yang ditargetkan;
  konfirmasikan niat sebelum menulis, seperti yang dilakukan WebUI.
- Jangan pernah melonggarkan pengaman koherensi yang nyata: SDK dibatasi pada framework asli di bawah setiap
  kebijakan, pabrikan tetap selaras dengan sisa profil, dan profil untuk perangkat yang berbeda ditolak. Ini
  disengaja dan tidak boleh dilewati.
- Config adalah permukaan yang didukung. Jangan scrape atau otomatiskan WebUI itu sendiri.

<!-- doc-footer -->

---

> _Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan, lihat [CONTRIBUTING.md](CONTRIBUTING.md)._
