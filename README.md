## COPG-VD
COPG-VD is a module designed for global device spoofing.  
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
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260123.011-factory-9f28f269.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260123.011/14822050:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260123.011",
    "ID": "ZP11.260123.011",
    "HOST": "9e07efa7dda9",
    "INCREMENTAL": "14822050",
    "TIMESTAMP": "1770081304",
    "ANDROID_VERSION": "16",
    "SDK_INT": "36",
    "PREVIEW_SDK": "20260119",
    "SDK_FULL": "36.1",
    "CODENAME": "CANARY",
    "USER": "android-build",
    "SDK_FINGERPRINT": "778045b9782faa743903c5e636f4745d",
    "UUID": "2nn-rheGNyLgsb6UeLWcvacQ67Pvqwp3rvo8JD5Edf8",
    "SECURITY_PATCH": "2026-02-05"
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
