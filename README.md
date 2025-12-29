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
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "Pixel 9 Pro Fold",
    "MANUFACTURER": "Google",
    "MODEL": "comet",
    "FINGERPRINT": "google/comet_beta/comet:16/CP11.251114.007/14621658:user/release-keys",
    "PRODUCT": "comet",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "CP11.251114.007",
    "ID": "CP11.251114.007",
    "HOST": "r-a06a74e0f133947d-zsc4",
    "INCREMENTAL": "14621658",
    "TIMESTAMP": "1766184311",
    "ANDROID_VERSION": "16",
    "SDK_INT": "36",
    "SECURITY_PATCH": "2025-12-05"
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
