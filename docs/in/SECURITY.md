> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · Bahasa Indonesia · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Kebijakan Keamanan

COPG-VD berjalan sebagai root dan disuntikkan ke proses aplikasi melalui Zygisk. Kami
menanggapi keamanan dengan serius.

## Melaporkan kerentanan

- **Situs:** https://vd171.ru
- **Situs:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Thread XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Sertakan deskripsi yang jelas dan, jika memungkinkan, langkah-langkah untuk mereproduksi. Kami
akan merespons secepat mungkin dan memberi Anda kredit jika Anda mau.

## Catatan scope

- Konfigurasi berada di `/data/adb/COPG-VD.json`, hanya dapat dibaca oleh root. Modul
  membacanya dari proses yang disuntikkan melalui aturan SELinux khusus yang disertakannya
  sendiri; ia tidak menyimpan kredensial atau frasa sandi.
- Hook spoofing ditempelkan ke aplikasi yang aktif dan null-checked sehingga profil yang
  salah bentuk menurun dengan anggun alih-alih membuat aplikasi crash.
- Tidak ada **telemetri dan tidak ada jaringan** kecuali pengambilan profil opsional, yang
  mengunduh profil Pixel publik melalui HTTPS dari
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  menggunakan downloader bawaan modul sendiri, bukan `curl`/`wget` dari `PATH`.
- Setiap biner dan library prebuilt dapat ditelusuri ke upstream publik yang dipin dan
  dibangun di CI dari sumber yang dapat Anda periksa.

*Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan sangat diterima - lihat [CONTRIBUTING.md](CONTRIBUTING.md).*
