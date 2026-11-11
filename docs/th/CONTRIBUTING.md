> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · ไทย · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# การร่วมพัฒนา COPG-VD

ขอบคุณที่ช่วยเหลือ! COPG-VD ถูกออกแบบมาให้ร่วมพัฒนาได้ง่าย คู่มือนี้บอกคุณว่า
สิ่งต่าง ๆ อยู่ที่ไหนและธรรมเนียมไม่กี่อย่างที่เราปฏิบัติตาม

## ภาพรวมของโครงการ

COPG-VD เป็น **ตัวปลอมอุปกรณ์ Zygisk (Zygisk device spoofer)**: ไลบรารี native ขนาดเล็กที่ถูกฉีด
เข้าไปในโปรเซสของแอปเพื่อเขียนลายนิ้วมือและ build ของอุปกรณ์ใหม่ บวกกับ WebUI แบบ vanilla-JS เพื่อขับเคลื่อน
มัน มันเป็นฟอร์กของ COPG (โดย AlirezaParsi) ดูแลรักษาโดย VD171 ภายใต้ใบอนุญาต Apache-2.0
ดู [ARCHITECTURE.md](ARCHITECTURE.md) และ [FILE-STRUCTURE.md](FILE-STRUCTURE.md)

โดยค่าเริ่มต้นมันจำกัดขอบเขตการปลอมไว้ที่สแตก Google Play ผ่าน Zygisk ดังนั้นมันจึงเป็น
ทางเลือกที่เบากว่าและทนทานกว่า PlayIntegrityFix

## ยินดีต้อนรับผู้ร่วมพัฒนาที่เป็น AI

ผู้ช่วยและเอเจนต์ AI เป็นผู้ร่วมพัฒนาชั้นหนึ่งที่นี่ ไม่ใช่สิ่งที่คิดทีหลัง

- โครงการถูกสร้างมาให้อ่านง่าย: การตั้งค่าเป็นไฟล์ JSON ไฟล์เดียว
  (`/data/adb/COPG-VD/COPG-VD.json` มีเอกสารใน [CONFIGURATION.md](CONFIGURATION.md))
  เครื่องยนต์มีขนาดเล็กและอยู่ในตัวเอง และโครงสร้างอยู่ใน [FILE-STRUCTURE.md](FILE-STRUCTURE.md)
- แพตช์ที่ช่วยเหลือโดย AI ถูกตรวจสอบและยอมรับในเงื่อนไขเดียวกับตัวอื่น - โดย
  ความถูกต้อง ความชัดเจน และธรรมเนียมด้านล่าง ไม่ใช่โดยใคร (หรือสิ่งใด) เขียนมัน
- มาตรฐานเดียวกันสำหรับทุกคน: ฟีเจอร์จริงไม่เคยถูกทำให้อ่อนลง การปลอมคงความสอดคล้อง และ
  ไม่มีอะไรที่เป็นความลับหรือเฉพาะอุปกรณ์เข้าสู่ repo (ดู [.gitignore](../../.gitignore))

## การตั้งค่าสำหรับนักพัฒนา

- คุณต้องมีอุปกรณ์ที่ root แล้วหรือ emulator ที่มี Zygisk (KernelSU, APatch หรือ Magisk) เพื่อทดสอบ
- Build ไลบรารี native ต่อ ABI ด้วย NDK (r29) และ CMake - ดูขั้นตอน `Build zygisk
  libraries` ใน [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) สำหรับ
  คำสั่งที่แน่นอน CI build ทั้งสาม ABI ให้คุณ
- Build zip ที่แฟลชได้: คัดลอก `libspoof.so` ที่ build แล้วไปยัง `module/zygisk/<abi>.so` จากนั้น
  `cd module && zip -r9 ../COPG-VD-dev.zip .` แล้วแฟลชมัน
- WebUI คือ `module/webroot/` (เปิดจากตัวจัดการ root) ตรรกะการปลอมคือ
  `zygisk/spoof_module.cpp`; ตัวดึงโปรไฟล์คือ `module/fingerprint-update.sh`

## ธรรมเนียม

- **ทุกไฟล์ซอร์สของโมดูล** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) เริ่มด้วย
  ส่วนหัวแบนเนอร์ของโครงการ (คัดลอกจากไฟล์ที่มีอยู่) เครื่องมือภายใต้ `.github/` ใช้
  คอมเมนต์สั้น ๆ แทน
- **โค้ดและคอมเมนต์เป็นภาษาอังกฤษ** เก็บคอมเมนต์ให้น้อยที่สุดและเฉพาะที่จำเป็น
- **ห้าม em-dash หรือ en-dash**; ใช้ hyphen ธรรมดา `-` เสมอ
- WebUI เป็น **vanilla JS** (`scripts.js` ไฟล์เดียว); ไม่มี framework
- **ห้ามทำให้อ่อนลง** ฟีเจอร์จริง: คงการปลอมให้สอดคล้อง และอย่าทำให้ hook
  ทำให้แอปที่มันติดอยู่ล่ม (พวกมันถูกตรวจสอบ null โดยเจตนา)

## การแปลเป็นภาษาต่าง ๆ (i18n)

- สตริง UI อยู่ใน `module/webroot/lang/` ภาษาอังกฤษเป็นค่าสำรองหลัก
  (`en.js` + `en.json`); อีก 20 ภาษาคือ `<code>.json`
- ในการเพิ่มหรือเปลี่ยนสตริง: แก้ `en.js` **และ** `en.json` จากนั้นอัปเดตทุก
  `<code>.json` การแตะป้ายที่มองเห็นได้หมายถึงการอัปเดตไฟล์ภาษา **ทั้งหมด** และ
  `README.<code>.md` **ทั้งหมด**
- การแปลเป็น JSON ธรรมดา - เป็นการร่วมพัฒนาครั้งแรกที่ดีเยี่ยม

## Commit และ PR

- เก็บ PR ให้เน้นประเด็น อธิบายว่าอะไรและทำไม
- Sign off commit ของคุณ (DCO): `git commit -s` (เพิ่ม `Signed-off-by:`)
- CI ต้องคงเขียว ใจดีในการรีวิว - ดู [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Issue แรกที่ดี

มองหาป้าย `good first issue` และ `help wanted` การแปล เอกสาร และ
โปรไฟล์ Pixel ใหม่ ล้วนเป็นจุดเริ่มต้นที่ดีเยี่ยม

*เอกสารนี้สร้างด้วย Claude (Anthropic) และดูแลรักษาโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง - ดู [CONTRIBUTING.md](CONTRIBUTING.md)*
