## COPG-VD
COPG-VD is a fork of COPG by @AlirezaParsi, renamed to COPG-VD to prevent confusion.  
This module is redesigned for global device spoofing.  
This means even system apps and the whole device will be hooked.  
  
## How to use?
If using this module and spoofing a working FingerPrint, using PlayIntegrityFix or GooglePhotosUnlimited are unnecessary.  
### Example JSON config file  
`/data/adb/COPG-VD.json`
* All fields are OPTIONAL. If some field is not provided, it will be skipped.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.251212.007-factory-5f97f419.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.251212.007/14649019:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.251212.007",
    "ID": "ZP11.251212.007",
    "HOST": "8cd5129d7c52",
    "INCREMENTAL": "14649019",
    "TIMESTAMP": "1767121951",
    "ANDROID_VERSION": "16",
    "SDK_INT": "36",
    "PREVIEW_SDK": "20251208",
    "SDK_FULL": "36.1",
    "CODENAME": "CANARY",
    "USER": "android-build",
    "SDK_FINGERPRINT": "c4b0e4c42f160cf484d176323a8bb208",
    "SECURITY_PATCH": "2026-01-05"
  }
}
```
Be sure to use strings on double-quotes only.  
### WebUI  
Using the WebUI is unnecessary if you edit the JSON config file directly.  
If you are a Magisk user, use KsuWebUI by KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Disable resetprop usage and enable spoof Build info only.  
#### Use ro.product.manufacturer:  
Disable if you care for "Found device spoofing" detection in Disclosure root detector app.  
___
For multi-profiles and multiple targets,  
use the original COPG by AlirezaParsi:  
https://github.com/AlirezaParsi/COPG  
