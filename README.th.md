## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD เป็นโมดูลที่ออกแบบมาเพื่อการปลอมแปลงอุปกรณ์แบบทั่วทั้งระบบ  
ซึ่งหมายความว่าแม้แต่แอประบบและทั้งอุปกรณ์ก็จะถูก hook ด้วย  
  
## วิธีใช้งาน?
หากใช้โมดูลนี้และปลอมแปลง FingerPrint ที่ใช้งานได้ ก็ไม่จำเป็นต้องใช้ PlayIntegrityFix หรือ GooglePhotosUnlimited  
### ตัวอย่างไฟล์กำหนดค่า JSON  
`/data/adb/COPG-VD.json`
* ทุกฟิลด์เป็นตัวเลือก หากไม่ได้ระบุฟิลด์ใด ฟิลด์นั้นจะถูกข้ามไป  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
โปรดใช้สตริงภายในเครื่องหมายอัญประกาศคู่เท่านั้น  
บล็อกด้านบนและ `module/COPG-VD.json.example` จะถูกรีเฟรชทุกวันโดยเวิร์กโฟลว์ [Update COPG-VD.json](.github/workflows/update-json.yml) โดยดึงมาจากอิมเมจโรงงานของ Google ล่าสุดโดยตรง  
### การทำให้ fingerprint เป็นเวอร์ชันล่าสุดอยู่เสมอ  
`fingerprint-update.sh` จะดึงไฟล์นั้นและอัปเดตการกำหนดค่าของคุณ ไม่ว่าจะจาก WebUI (**Check Update** / **Update Now**) หรือโดยตัวมันเอง **หนึ่งครั้งต่อการบูต** (**Auto-update JSON on boot** เปิดใช้งานตามค่าเริ่มต้น)  
* ทั้ง `/data/adb/COPG-VD.json` และ `/data/adb/modules/COPG-VD/COPG-VD.json` จะถูกอัปเดตเมื่อมีอยู่ทั้งคู่ และเนื้อหาเดิมจะถูกเก็บไว้เป็น `.bak`  
* เฉพาะฟิลด์ build เท่านั้นที่จะถูกเขียนใหม่ (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user) ทุกอย่างอื่นที่คุณปรับแต่งไว้จะถูกเก็บรักษาไว้ ได้แก่ คีย์เพิ่มเติม `BOOTLOADER`/`BOARD`/`HARDWARE` ออบเจกต์อื่น ๆ ลำดับคีย์ และการจัดรูปแบบ  
* มันจะไม่ย้อนกลับไปเวอร์ชันเก่า: build จากต้นทางที่เก่ากว่าตัวที่ติดตั้งอยู่จะถูกปฏิเสธ นี่เป็นเรื่องปกติ
  (รีโปอาจตามหลังการกำหนดค่าที่คุณอัปเดตด้วยมือ) และยังเป็นเกราะป้องกันที่
  สำคัญที่สุดบน Android ที่ซึ่งตัวดาวน์โหลดเดียวที่มีให้คือ busybox `wget` ซึ่งไม่สามารถ
  ตรวจสอบใบรับรอง TLS ได้ - ทุกค่าจะถูกตรวจสอบความถูกต้องก่อนใช้งานด้วยเหตุผลเดียวกัน  
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
### การตั้งค่าภายในการกำหนดค่า  
`COPG-VD.json` สามารถมีออบเจกต์ `COPG-VD-Settings` ได้ - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - เพื่อให้ตัวเลือกของคุณติดไปกับการสำรองข้อมูลและสามารถแก้ไขด้วยมือได้ WebUI จะเขียนทั้งค่าเหล่านั้นและไฟล์แฟล็กที่สคริปต์บูตอ่าน `"spoof_version": "force"` จะถูกปฏิเสธจากไฟล์และถูกลดระดับลง: การกู้คืนการสำรองข้อมูลเก่าต้องไม่เปิดใช้งานมันอีกครั้งโดยที่คุณไม่รู้ตัว  
### WebUI  
การใช้ WebUI ไม่จำเป็นหากคุณแก้ไขไฟล์กำหนดค่า JSON โดยตรง  
หากคุณเป็นผู้ใช้ Magisk ให้ใช้ KsuWebUI โดย KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases)  
#### ใช้ resetprop:  
ปิดการใช้งาน resetprop และเปิดใช้งานการปลอมแปลงเฉพาะข้อมูล Build เท่านั้น  
#### ใช้ ro.product.manufacturer:  
ปิดใช้งานหากคุณใส่ใจเรื่องการตรวจจับ "Found device spoofing" ในแอปตรวจจับ root ชื่อ Disclosure  

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
