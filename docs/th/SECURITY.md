> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · ไทย · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# นโยบายความปลอดภัย

COPG-VD ทำงานในฐานะ root และถูกฉีดเข้าไปในโปรเซสของแอปผ่าน Zygisk เราให้ความสำคัญกับ
ความปลอดภัยอย่างจริงจัง

## การรายงานช่องโหว่

- **เว็บไซต์:** https://vd171.ru
- **เว็บไซต์:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **อีเมล:** vd.priv8@pm.me

ใส่คำอธิบายที่ชัดเจน และถ้าเป็นไปได้ ขั้นตอนในการทำซ้ำ เราจะตอบกลับโดยเร็วที่สุด
เท่าที่เราทำได้ และให้เครดิตคุณถ้าคุณต้องการ

## หมายเหตุขอบเขต

- การตั้งค่าอยู่ที่ `/data/adb/COPG-VD.json` อ่านได้โดย root เท่านั้น โมดูล
  อ่านมันจากโปรเซสที่ถูกฉีดผ่านกฎ SELinux เฉพาะที่มันมาพร้อมเอง มัน
  ไม่มี credential หรือ passphrase ใด ๆ
- hook การปลอมติดอยู่กับแอปที่กำลังทำงานและถูกตรวจสอบ null ดังนั้นโปรไฟล์ที่ผิดรูปแบบ
  จะเสื่อมลงอย่างนุ่มนวลแทนที่จะทำให้แอปล่ม
- **ไม่มี telemetry และไม่มีเครือข่าย** ยกเว้นการดึงโปรไฟล์ที่เป็นทางเลือก ซึ่ง
  ดาวน์โหลดโปรไฟล์ Pixel สาธารณะผ่าน HTTPS จาก
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  โดยใช้ตัวดาวน์โหลดที่มาพร้อมของโมดูลเอง ไม่ใช่ `curl`/`wget` จาก `PATH`
- ไบนารีและไลบรารีที่ build ไว้ล่วงหน้าทุกตัวสามารถสืบย้อนไปยังต้นทางสาธารณะที่ตรึงไว้ และถูก build
  ใน CI จากซอร์สที่คุณตรวจสอบได้

*เอกสารนี้สร้างด้วย Claude (Anthropic) และดูแลรักษาโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง - ดู [CONTRIBUTING.md](CONTRIBUTING.md)*
