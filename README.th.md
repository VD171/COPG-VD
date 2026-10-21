## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD เป็นเครื่องมือปลอมแปลงอุปกรณ์: มันจะเขียน fingerprint และ build ของอุปกรณ์ใหม่ เพื่อให้แอปเห็นอุปกรณ์ที่คุณเลือกแทนที่จะเป็นอุปกรณ์จริง  
มันทำงานบน Zygisk (KernelSU, APatch หรือ Magisk) และโดยค่าเริ่มต้นจะจำกัดขอบเขตการปลอมแปลงไว้ที่สแตก Google Play - จึงเป็นทางเลือกที่เบากว่าและทนทานกว่า PlayIntegrityFix  

## ภาพหน้าจอ

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## วิธีใช้งาน?
ติดตั้งโมดูล รีบูต แล้วโปรไฟล์ที่มาพร้อมกัน (ซึ่งเป็น Pixel) จะถูกปลอมแปลงให้กับแอปเป้าหมาย เมื่อมี fingerprint ที่ใช้งานได้ คุณก็ไม่จำเป็นต้องใช้ PlayIntegrityFix หรือ GooglePhotosUnlimited  
ทุกอย่างกำหนดค่าได้ใน `/data/adb/COPG-VD.json` หรือจาก WebUI ทุกฟิลด์เป็นตัวเลือก (OPTIONAL) - ฟิลด์ที่ไม่ได้ระบุจะถูกข้ามไป  

### Scope - ใครเห็นการปลอมแปลง
`scope_mode` ตัดสินว่าโปรเซสใดจะได้รับตัวตนที่ปลอมแปลง ในโหมดที่จำกัดขอบเขต ตัวตนจะถูกส่งมอบแยกรายโปรเซสโดย Zygisk และจะไม่รั่วไหลไปยังส่วนที่เหลือของระบบผ่าน global properties  
* **Google Play** (`playstore`, ค่าเริ่มต้น) - เฉพาะสแตก Play เท่านั้น (Google Play services, โปรเซส unstable ของมัน และ Play Store)  
* **Global** - ทั้งอุปกรณ์ ทุกโปรเซสเห็นมัน  
* **Whitelist** - เฉพาะแอปที่อยู่ใน `scope_whitelist`  
* **Blacklist** - ทุกแอปยกเว้นแอปที่อยู่ใน `scope_blacklist`  

### Engines - การปลอมแปลงถูกส่งมอบอย่างไร
แต่ละตัวเป็นอิสระต่อกันและสามารถปิดได้:  
* **Build fields (JNI)** - เขียน `android.os.Build.*` ใหม่ในโปรเซสเป้าหมาย  
* **Property hook** - แสดงพรอเพอร์ตีระบบที่ปลอมแปลงให้กับโปรเซสเป้าหมาย (การ remap พื้นที่พรอเพอร์ตีแบบ clean-room แยกรายโปรเซส ไม่มีการ hook ฟังก์ชัน)  
* **resetprop** - เขียนพรอเพอร์ตีระบบใหม่ จัดการเป็นกลุ่ม: identity, version, boot state, SELinux, adb/usb, anti-emulator และรอบทำความสะอาด ในโหมดที่จำกัดขอบเขต กลุ่ม identity และ version จะไม่อยู่ใน resetprop ระดับทั้งอุปกรณ์ (Zygisk ส่งมอบแยกรายโปรเซส) ส่วนกลุ่ม boot/lock/SELinux จะยังคงเป็น global  
* **DRM / Widevine** (ปิดตามค่าเริ่มต้น) - รายงานระดับความปลอดภัย Widevine ที่เลือกไว้ คือ L1 หรือ L3 ให้กับแอปที่อ่านมัน  

### Fields - set, empty, delete หรือ skip
ภายในออบเจกต์ `COPG-VD` แต่ละฟิลด์ Build มีสี่สถานะ:  
* **Set** - `"KEY": "value"` เขียนค่า  
* **Empty** - `"KEY": ""` เขียนค่าว่าง  
* **Delete** - ระบุคีย์ไว้ใน `"COPG-VD-Delete": [ ... ]` ที่ระดับบนสุดเพื่อลบมัน (ฟิลด์ Build จะกลายเป็น null, พรอเพอร์ตีจะถูกลบด้วย `resetprop --delete`)  
* **Skip** - ละคีย์ออกไปทั้งหมด ค่าของ ROM เองจะถูกเก็บไว้  

รายการ `"global_fields": [ ... ]` จะใช้ฟิลด์ Build ที่ระบุชื่อไว้แบบทั้งอุปกรณ์แม้ในโหมดที่จำกัดขอบเขต เพื่อให้ค่าสอดคล้องกันทุกที่ - สำหรับฟิลด์ที่ปลอดภัยต่อความสอดคล้องเท่านั้น (เช่น security patch) ห้ามใช้กับ identity และห้ามใช้กับกลุ่มเวอร์ชัน Android โดยเด็ดขาด  

### Example JSON config file
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.260918.007-factory-f5955275.zip",
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.260918.007/16484274:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.260918.007",
    "ID": "ZP11.260918.007",
    "HOST": "51b22e6d8afb",
    "INCREMENTAL": "16484274",
    "TIMESTAMP": "1790806751",
    "PREVIEW_SDK": "20261007",
    "USER": "android-build",
    "SDK_FINGERPRINT": "d9ad4b00fa641d6e43c42cc969f49492",
    "UUID": "_mQOcxvuFzRVZAjNEr2UUUpk2fv0mqDc8RpFyaeJjuk",
    "SECURITY_PATCH": "2026-10-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "global_fields": ["SECURITY_PATCH"]
}
```
โปรดใช้สตริงภายในเครื่องหมายอัญประกาศคู่เท่านั้น  
บล็อกด้านบนและ `module/COPG-VD.json.example` จะถูกรีเฟรชทุกวันโดยเวิร์กโฟลว์ [Update COPG-VD.json](.github/workflows/update-json.yml) โดยดึงมาจากอิมเมจโรงงานของ Google ล่าสุดโดยตรง  

### การทำให้ fingerprint เป็นเวอร์ชันล่าสุดอยู่เสมอ
`fingerprint-update.sh` จะดึงไฟล์นั้นและอัปเดตการกำหนดค่าของคุณ ไม่ว่าจะจาก WebUI (**Check Update** / **Update Now**) หรือโดยตัวมันเอง **หนึ่งครั้งต่อการบูต** (**Auto-update JSON on boot** เปิดใช้งานตามค่าเริ่มต้น)  
* ทั้ง `/data/adb/COPG-VD.json` และ `/data/adb/modules/COPG-VD/COPG-VD.json` จะถูกอัปเดตเมื่อมีอยู่ทั้งคู่ และเนื้อหาเดิมจะถูกเก็บไว้เป็น `.bak`  
* เฉพาะฟิลด์ build เท่านั้นที่จะถูกเขียนใหม่ (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user) ทุกอย่างอื่นที่คุณปรับแต่งไว้จะถูกเก็บรักษาไว้ ได้แก่ คีย์เพิ่มเติม `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE` ออบเจกต์อื่น ๆ ลำดับคีย์ และการจัดรูปแบบ  
* มันจะไม่ย้อนกลับไปเวอร์ชันเก่า: build จากต้นทางที่เก่ากว่าตัวที่ติดตั้งอยู่จะถูกปฏิเสธ นี่เป็นเรื่องปกติ (รีโปอาจตามหลังการกำหนดค่าที่คุณอัปเดตด้วยมือ) และยังเป็นเกราะป้องกันที่สำคัญที่สุดบน Android ที่ซึ่งตัวดาวน์โหลดเดียวที่มีให้คือ busybox `wget` ซึ่งไม่สามารถตรวจสอบใบรับรอง TLS ได้ - ทุกค่าจะถูกตรวจสอบความถูกต้องก่อนใช้งานด้วยเหตุผลเดียวกัน  
* หากโปรไฟล์ของคุณปลอมแปลงเป็น **อุปกรณ์อื่น** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` ต่างกัน) จะไม่มีการใช้อะไรเลย - fingerprint ของ Pixel บนโปรไฟล์อื่นแย่ยิ่งกว่า fingerprint เก่า  
* ขณะบูต มันจะทำงานเบื้องหลังและลองใหม่ต่อเนื่องประมาณ 10 นาที เพราะโดยปกติแล้ว wifi ยังไม่พร้อมใช้งานเมื่อการบูตเสร็จสิ้น มันจะไม่ทำให้การบูตล่าช้า  
* `resetprop` จะถูกนำไปใช้ใหม่ทันทีหลังการอัปเดต แต่ `android.os.Build` ถูกเขียนโดยโมดูล zygisk เมื่อ zygote เริ่มทำงาน: **รีบูต** เพื่อให้ค่าใหม่ไปถึงแอป  
* บันทึกอยู่ที่ `/data/adb/COPG-VD.update.log`  

### เวอร์ชัน Android - และเหตุผลที่ไม่ปลอมแปลง
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` และ `CODENAME` อธิบายถึง **ROM ของคุณ** ไม่ใช่อุปกรณ์ที่กำลังปลอมแปลง การบอกแอปว่า SDK ใหม่กว่าเฟรมเวิร์กจริง ทำให้แอปเรียก API ที่ไม่มีอยู่จริง: แอปของ Google ขัดข้อง โทรศัพท์รีบูต แล้วก็เริ่มใหม่ การบูตเองเสร็จสมบูรณ์ ดังนั้นมันจึงเป็น **softloop** และไม่มีอะไรปรากฏในบันทึกการบูต  
* ค่าเหล่านี้ไม่ได้อยู่ในการกำหนดค่าที่มาพร้อมโมดูล และตัวอัปเดตจะไม่เขียนค่าเหล่านี้  
* **Spoof Android version** ใน WebUI เป็นตัวตัดสินว่าจะมีการนำไปใช้หรือไม่:  
  * **Never** (ค่าเริ่มต้น) - ใช้เวอร์ชันของ ROM เอง  
  * **Up to this ROM** - เฉพาะสิ่งที่ไม่เกินเวอร์ชันนั้น ซึ่งในทางปฏิบัติหมายถึงการลด SDK ลง  
  * **Force** - ตรงตามที่การกำหนดค่าระบุไว้ นี่คือสิ่งที่ทำให้เกิด softloop  
* เวอร์ชันจริงจะถูกอ่านจาก `/system/build.prop` ไม่เคยอ่านจาก `getprop` - เพราะนั่นคือสิ่งที่โมดูลนี้ปลอมแปลงเลยทีเดียว  

### Analyze
**Analyze** ใน WebUI (หรือ `fingerprint-update.sh analyze`) จะตรวจสอบการกำหนดค่าตามที่เป็นอยู่: เวอร์ชันเทียบกับ ROM, ว่าไฟล์ยังสามารถแยกวิเคราะห์ได้หรือไม่ (ไฟล์ที่เสียหายจะทำให้โมดูลปลอมแปลง **ไม่อะไรเลย** และมีเพียง logcat เท่านั้นที่จะบอก), ว่า fingerprint สอดคล้องกับฟิลด์รอบ ๆ หรือไม่, คีย์ที่โมดูลไม่ได้อ่าน, วันที่, และว่า prop มีค่าตามที่การกำหนดค่าร้องขอไว้แล้วหรือไม่  

### WebUI
WebUI เป็นตัวเลือก - ทุกอย่างสามารถแก้ไขได้โดยตรงในไฟล์กำหนดค่า JSON - แต่มันเป็นวิธีที่ง่ายในการควบคุมโมดูล มันมีห้าแท็บ: **About**, **Device** (ทุกฟิลด์ ตั้งค่าแยกตามสถานะ จัดกลุ่มตามหมวดหมู่), **Spoofing** (scope และ engines), **System** (กลุ่ม resetprop) และ **Tools** (Analyze, Check Update, Update Now, Backup/Restore และการอัปเดตอัตโนมัติขณะบูต) มันไม่ส่งคำขอเครือข่ายใด ๆ ทุกอย่างที่มันต้องการมาพร้อมภายในโมดูล  
หากคุณเป็นผู้ใช้ Magisk ให้ใช้ KsuWebUI โดย KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases)  

### การตั้งค่าภายในการกำหนดค่า
`COPG-VD.json` เก็บการตั้งค่าของมันไว้ข้าง ๆ โปรไฟล์ เพื่อให้ตัวเลือกของคุณติดไปกับการสำรองข้อมูลและสามารถแก้ไขด้วยมือได้: `scope_mode`, สวิตช์ของ engine, กลุ่ม resetprop, `global_fields` และออบเจกต์ `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`) WebUI จะเขียนทั้งการกำหนดค่าและไฟล์แฟล็กที่สคริปต์บูตอ่าน `"spoof_version": "force"` จะถูกปฏิเสธจากไฟล์และถูกลดระดับลง: การกู้คืนการสำรองข้อมูลเก่าต้องไม่เปิดใช้งานมันอีกครั้งโดยที่คุณไม่รู้ตัว  

## ช่องทางติดต่อ

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
