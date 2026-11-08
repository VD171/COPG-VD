> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · ไทย · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# ข้อมูลอ้างอิงการตั้งค่า

ทั้งโมดูลถูกขับเคลื่อนด้วยไฟล์เดียว: `/data/adb/COPG-VD.json` WebUI เขียนมันให้
คุณ แต่คุณสามารถแก้ไขด้วยมือได้ ตัวอย่างที่มาพร้อมอยู่ที่ `module/COPG-VD.json.example`

กฎ:

- **สตริงใช้เครื่องหมายอัญประกาศคู่เท่านั้น** เหมือนใน JSON
- **ทุกฟิลด์เป็นทางเลือก** ฟิลด์ที่ไม่ได้ระบุจะถูกข้ามและใช้ค่าของ ROM
  เอง
- เรียกใช้ **Analyze** หลังจากแก้ไขด้วยมือ: ไฟล์ที่ parse ไม่ได้ทำให้โมดูลปลอม
  **อะไรไม่ได้เลย** และมีแต่ logcat เท่านั้นที่บอก

## คีย์ระดับบนสุด

| คีย์ | ชนิด | ความหมาย |
|---|---|---|
| `scope_mode` | string | `playstore` (ค่าเริ่มต้น), `global`, `whitelist` หรือ `blacklist` ดู [USER-GUIDE.md](USER-GUIDE.md) |
| `scope_whitelist` | array | แพ็กเกจที่ได้รับการปลอมเมื่อ `scope_mode` เป็น `whitelist` |
| `scope_blacklist` | array | แพ็กเกจที่ถูกยกเว้นเมื่อ `scope_mode` เป็น `blacklist` |
| `COPG-VD` | object | โปรไฟล์: ฟิลด์ Build ที่จะนำเสนอ (ดูด้านล่าง) |
| `COPG-VD-Delete` | array | ชื่อฟิลด์ที่จะลบแทนที่จะตั้งค่า (ฟิลด์ Build กลายเป็น null; พร็อพเพอร์ตีจะถูกลบด้วย `resetprop --delete`) |
| `COPG-VD-Settings` | object | การตั้งค่าโมดูลที่เดินทางไปกับโปรไฟล์ (ดูด้านล่าง) |
| `motor_jni` | bool | เครื่องยนต์ฟิลด์ Build (เขียน `android.os.Build.*` ใหม่) ค่าเริ่มต้น `true` |
| `motor_prop_hook` | bool | เครื่องยนต์พร็อพเพอร์ตีรายโปรเซส (รีแมปพร็อพเพอร์ตีแบบ clean-room) ค่าเริ่มต้น `true` |
| `motor_drm` | bool | เครื่องยนต์ DRM / Widevine ค่าเริ่มต้น `false` |
| `drm_targets` | array | แอปที่ได้รับการปลอม DRM โดยไม่คำนึงถึง `scope_mode` ว่าง = ทำตามขอบเขต |
| `global_fields` | array | ฟิลด์ Build ที่ใช้ทั้งอุปกรณ์แม้ในโหมดที่มีขอบเขต สำหรับฟิลด์ที่ปลอดภัยต่อความสอดคล้องเท่านั้น |
| `process_overrides` | object | การแทนที่ฟิลด์รายโปรเซส: `{ "process.name": { "FIELD": "value" } }` |
| `verbose_logs` | bool | รายละเอียด logcat เพิ่มเติมสำหรับการดีบัก ค่าเริ่มต้น `false` |

## ออบเจกต์โปรไฟล์ `COPG-VD`

แต่ละรายการเป็นฟิลด์อุปกรณ์ที่นำเสนอให้กับโปรเซสเป้าหมาย ที่พบบ่อย:

| กลุ่ม | ฟิลด์ |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (พิเศษ) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

ตัวแปร `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) ให้เส้นทาง
attestation รายงานค่าที่ต่างจากค่าธรรมดา เพื่อให้ keystore คงความ
สอดคล้อง

> **กลุ่ม version เป็นพิเศษ** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` และ `CODENAME`
> อธิบาย ROM ของคุณ ไม่ใช่อุปกรณ์ที่ปลอม การเพิ่มมันทำให้โทรศัพท์ softloop พวกมันไม่ได้
> อยู่ในโปรไฟล์ที่มาพร้อมและจะใช้ก็ต่อเมื่อ `COPG-VD-Settings.spoof_version` อนุญาต -
> ดู [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)

### สถานะของฟิลด์

| สถานะ | วิธี | ผลลัพธ์ |
|---|---|---|
| Set | `"KEY": "value"` | เขียนค่า |
| Empty | `"KEY": ""` | เขียนค่าว่าง |
| Delete | ชื่ออยู่ใน `"COPG-VD-Delete": [ ... ]` | ลบฟิลด์ |
| Skip | ไม่ใส่คีย์ | เก็บค่าของ ROM เอง |

### DRM

`DRM_SECURITY_LEVEL` (`L1` หรือ `L3`) คือระดับ Widevine ที่รายงานเมื่อ `motor_drm` เปิดอยู่

## `COPG-VD-Settings`

การตั้งค่าที่เดินทางไปกับโปรไฟล์ ดังนั้นข้อมูลสำรองจึงพกพาตัวเลือกของคุณไปด้วย

| คีย์ | ชนิด / ค่า | ความหมาย |
|---|---|---|
| `resetprop` | bool | เครื่องยนต์ resetprop ที่ทำทั้งอุปกรณ์ทำงานหรือไม่ |
| `autoupdate` | bool | `fingerprint-update.sh` ทำงานหนึ่งครั้งต่อการบูตหรือไม่ ค่าเริ่มต้นเปิด |
| `spoof_manufacturer` | bool | ฟิลด์ manufacturer ถูกปลอมด้วยหรือไม่ |
| `spoof_version` | `never` / `rom` / `force` | กลุ่มเวอร์ชัน Android ใช้อย่างไร `never` เป็นค่าเริ่มต้น; `force` ถูกปฏิเสธเมื่อกู้คืนข้อมูลสำรอง |

## `global_fields`

ฟิลด์ Build ในรายการนี้ถูกใช้ทั้งอุปกรณ์แม้ในโหมดที่มีขอบเขต เพื่อให้ค่า
สอดคล้องกันทุกที่ ใช้มันเฉพาะกับฟิลด์ที่ปลอดภัยต่อความสอดคล้อง - security patch เป็น
ตัวที่ใช้บ่อย **ห้าม** ใส่ identity หรือกลุ่มเวอร์ชัน Android ไว้ที่นี่

```json
"global_fields": ["SECURITY_PATCH"]
```

## ตัวอย่าง

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*เอกสารนี้สร้างด้วย Claude (Anthropic) และดูแลรักษาโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง - ดู [../CONTRIBUTING.md](CONTRIBUTING.md)*
