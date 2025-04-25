# 🎮 COPG - Device Spoofer for Android Games

![Zygisk](https://img.shields.io/badge/Zygisk-Compatible-brightgreen)
![Android](https://img.shields.io/badge/Android-9.0%2B-blue)
[![License](https://img.shields.io/github/license/AlirezaParsi/COPG)](LICENSE)

COPG is an advanced Zygisk module that dynamically spoofs device properties for Android games, bypassing device restrictions and compatibility checks.

## ✨ Features

### Core Functionality
- **Real-time Device Spoofing**: Modifies `android.os.Build` fields (model, brand, etc.) for targeted apps
- **Optimized Performance**: Adds only ~1ms to app launch time with cached JNI calls
- **Dynamic Configuration**: Update spoof list via `config.json` without recompiling
- **Multi-Root Support**: Works with Magisk (Zygisk/Zygisk Next/Rezygisk) and KernelSU (Zygisk Next/Rezygisk) and APatch (Zygisk Next/Rezygisk)

### Enhanced Features
- **Smart State Management**:
  - Auto-disable adaptive brightness
  - Do Not Disturb mode toggle
  - Screen timeout control
  - System logging management
- **Web UI Control**: Manage games and devices through a browser interface
- **Debugging Tools**: Detailed logging via `logcat -s "SpoofModule"`
- **Smart Updates**: In-app module updates with changelog support

## 📦 Installation

### Requirements
- Rooted Android device (Android 9.0+)
- One of:
  - Magisk v24+ with Zygisk enabled or [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)
  - KernelSU with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)
  - APatch with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)

### Installation Steps
1. Download the latest `COPG.zip` from [Releases](https://github.com/AlirezaParsi/COPG/releases)
2. Install via your root manager:
   - Magisk: Modules → Install from storage → Select ZIP
   - KernelSU: Modules → Install → Select ZIP
   - APatch: Modules → Install → Select ZIP
3. Reboot your device
4. Verify installation in your root manager (look for "✨ COPG spoof ✨")

## 🛠️ Configuration

### Example Default Configuration
The module includes predefined spoof profiles for popular games:
- **Call of Duty Mobile**: Spoofs as Lenovo TB-9707F
- **PUBG Mobile**: Spoofs as Xiaomi Mi 13 Pro
- **Mobile Legends**: Spoofs as POCO F5

### Customizing Spoof Profiles
Edit `/data/adb/modules/COPG/config.json` with this format:

```json
{
  "PACKAGES_REDMAGIC9": [
    "com.mobilelegends.mi",
    "com.supercell.brawlstars"
  ],
  "PACKAGES_REDMAGIC9_DEVICE": {
    "BRAND": "ZTE",
    "MODEL": "NX769J",
    "FINGERPRINT": "ZTE/NX769J...",
    "CPUINFO": "Qualcomm Snapdragon 8 Gen 3"
  }
}
## 🧩 Module Architecture
graph TD
    A[Zygote] --> B[COPG]
    B --> C{Target App?}
    C -->|Yes| D[Apply Spoof]
    C -->|No| E[Pass Through]
    D --> F[Runtime Hooks]
    F --> G[Build Prop Override]
