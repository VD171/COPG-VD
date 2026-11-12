> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · ไทย · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# สถาปัตยกรรม

COPG-VD เป็นโมดูล Zygisk: ไลบรารี native ขนาดเล็ก (`libspoof.so`) ที่ตัวโหลด Zygisk
ฉีดเข้าไปใน zygote และจากตรงนั้นเข้าไปในโปรเซสของแอป ทั้งหมดที่มันทำคือการนำเสนอ
ตัวตนอุปกรณ์ที่เลือกให้กับโปรเซสที่คุณกำหนดเป้าหมาย ไม่มีแอป และนอกจากการดึง
โปรไฟล์ที่เป็นทางเลือกแล้ว ก็ไม่มีเครือข่าย

## วงจรชีวิต

1. **Zygote เริ่ม** เมื่อ zygote บูต ตัวโหลดเรียก `onLoad` ของโมดูล มัน
   อ่าน `/data/adb/COPG-VD/COPG-VD.json` หนึ่งครั้ง: การตั้งค่าขอบเขตและโปรไฟล์
2. **App fork** สำหรับทุกแอปที่ zygote fork โมดูลตัดสินใจใน
   `preAppSpecialize` ว่าโปรเซสนี้อยู่ในขอบเขตหรือไม่:
   - **อยู่ในขอบเขตหลัก** (`playstore` / `global` / `whitelist` / `blacklist`) หรือ
   - **อยู่ในขอบเขต DRM** (ลงรายการใน `drm_targets`)
   ถ้าไม่อยู่ทั้งสอง โมดูลจะ **ถอนตัว** (detach) ออกจากโปรเซสนั้น (`dlclose`) และไม่ทิ้ง
   ร่องรอยไว้ในนั้น
3. **Specialize** สำหรับโปรเซสที่ยังอยู่ เครื่องยนต์จะใช้ใน `postAppSpecialize`
   ขณะที่โปรเซสยังมีสิทธิ์พิเศษ

เพราะ fork สืบทอดสำเนาหน่วยความจำแบบ copy-on-write ของ zygote แต่ละแอปจึงเริ่มจากคอนฟิก
ที่อ่านตอนบูต โมดูลอ่านไฟล์ซ้ำต่อโปรเซสเป้าหมายก็ต่อเมื่อมันเปลี่ยนแปลงจริง ๆ
ดังนั้นแอปที่เพิ่งเริ่มหรือเปิดใหม่จะรับโปรไฟล์ที่แก้ไขแล้ว - แต่การตัดสิน
ขอบเขตเองถูกทำตอน zygote เริ่ม ดังนั้น **การเปลี่ยนขอบเขต, เครื่องยนต์ หรือ
`drm_targets` ต้องรีบูต**

## เครื่องยนต์

แต่ละตัวเป็นอิสระและสลับเปิดปิดได้

- **ฟิลด์ Build (`motor_jni`)** เขียน `android.os.Build.*` (และ `Build.VERSION.*`)
  ใหม่ในโปรเซสเป้าหมายผ่าน JNI ดังนั้นโค้ด Java อ่านค่าที่ปลอมขึ้น
- **Property hook (`motor_prop_hook`)** นำเสนอพร็อพเพอร์ตีระบบที่ปลอมขึ้นให้กับ
  โปรเซสผ่านการรีแมปพื้นที่พร็อพเพอร์ตีแบบ clean-room รายโปรเซส (`prop_virtualizer`)
  มันคือการรีแมปหน่วยความจำ ไม่ใช่การ hook ฟังก์ชัน ดังนั้นจึงไม่มีรอยเท้าของฟังก์ชันที่ถูก hook
- **resetprop (ทั้งอุปกรณ์)** เขียนพร็อพเพอร์ตีระบบเป็นกลุ่ม - identity, version,
  boot state, SELinux, adb/usb, anti-emulator บวกกับการเก็บกวาดอีกรอบ สคริปต์บูตเรียก
  ใช้มัน ในโหมดที่มีขอบเขต กลุ่ม identity และ version จะถูกละไว้ (Zygisk ส่งให้
  เป็นรายโปรเซส) กลุ่ม boot, lock และ SELinux ยังคงเป็นส่วนกลางเพื่อให้อุปกรณ์สอดคล้อง
- **DRM / Widevine (`motor_drm`)** hook เมธอด `MediaDrm` ที่รายงานระดับความปลอดภัยของ
  Widevine (`getSecurityLevel`, `getPropertyString`) และคืนค่าระดับที่ตั้งค่าไว้
  hook ถูกตรวจสอบ null ดังนั้นโปรไฟล์ที่ผิดรูปแบบจะเสื่อมลงอย่างนุ่มนวลแทนที่จะทำให้แอป
  ล่ม `drm_targets` ให้เครื่องยนต์นี้ทำงานบนรายการแอปของตัวเอง แยกจาก
  ขอบเขตหลัก

## การอ่านคอนฟิก

โปรเซสที่ถูกฉีดทำงานในโดเมน SELinux ของ zygote ซึ่งโดยค่าเริ่มต้นไม่สามารถเข้าถึง
`/data/adb` ได้ โมดูลมาพร้อม `sepolicy.rule` ของตัวเองเพื่ออนุญาตมัน และในฐานะทางเลือกสำรอง
สามารถอ่านคอนฟิกผ่านไดเรกทอรีโมดูลที่เปิดอยู่ (`getModuleDir`) ดังนั้นมันจึงทำงาน
ต่อได้แม้ว่า build ของ Zygisk หยุดให้สิทธิ์เส้นทาง ไฟล์ถูก parse ด้วย parser JSON
ฝังตัวขนาดเล็ก (`jsmn`) ไฟล์ที่ parse ไม่ได้หมายความว่าโมดูลปลอมอะไรไม่ได้เลย

## รักษาโปรไฟล์ให้สดใหม่

`fingerprint-update.sh` รีเฟรชฟิลด์ build จาก Google factory image ตัวใหม่ล่าสุด
จาก WebUI หรือหนึ่งครั้งต่อการบูต มันใช้ตัวดาวน์โหลดที่มาพร้อมของโมดูลเอง (ไม่ใช่
`curl`/`wget` จาก `PATH`) ตรวจสอบทุกค่าก่อนใช้ ไม่เคยถอยหลัง และปฏิเสธ
โปรไฟล์ที่ปลอมเป็นอุปกรณ์อื่น `android.os.Build` ถูกเขียนตอน zygote เริ่ม ดังนั้น
ค่าใหม่จึงไปถึงแอปในการรีบูตครั้งถัดไป ดู [USER-GUIDE.md](USER-GUIDE.md) สำหรับฝั่งผู้ใช้
และ [CONFIGURATION.md](CONFIGURATION.md) สำหรับฟิลด์

## ทำไมเวอร์ชัน Android จึงไม่ถูกปลอมโดยค่าเริ่มต้น

การเพิ่ม `SDK_INT` / `ANDROID_VERSION` ให้สูงกว่า framework ของ ROM จริง ๆ ทำให้แอป
เรียก API ที่ไม่มีอยู่ ซึ่งทำให้แอปของ Google ล่มและรีบูตโทรศัพท์เข้าสู่
softloop กลุ่ม version จึงปิดโดยค่าเริ่มต้นและถูกกำกับไว้หลัง
`spoof_version` โมดูลอ่านเวอร์ชันจริงจาก `/system/build.prop` ไม่เคยจาก
`getprop` เพราะ `getprop` คือสิ่งที่มันปลอม ดูกับดักใน
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)

*เอกสารนี้สร้างด้วย Claude (Anthropic) และดูแลรักษาโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง - ดู [../CONTRIBUTING.md](CONTRIBUTING.md)*

<!-- doc-footer -->

---

> _เอกสารนี้สร้างขึ้นด้วย Claude (Anthropic) และดูแลโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง ดู [CONTRIBUTING.md](CONTRIBUTING.md)_
