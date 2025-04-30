<div align="center">
  
<img src="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/icon-v2.png" style="width: 500px; height: 200px; object-fit: fill;" />
</div>
<h1 align="center">🎮 COPG - Ultimate Device Spoofer for Android Games</h1>

[![Zygisk](https://img.shields.io/badge/Zygisk-Compatible-brightgreen?style=for-the-badge)](https://github.com/topjohnwu/Magisk)
[![Android](https://img.shields.io/badge/Android-9.0%2B-blue?style=for-the-badge&logo=android)](https://www.android.com/)
[![License](https://img.shields.io/github/license/AlirezaParsi/COPG?style=for-the-badge)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/AlirezaParsi/COPG/total?style=for-the-badge&color=orange)](https://github.com/AlirezaParsi/COPG/releases)
[![Telegram](https://img.shields.io/badge/Telegram_Channel-2CA5E0?style=for-the-badge&logo=telegram)]([https://t.me/COPG_module])
![Built with](https://img.shields.io/badge/Made_with-❤-red?style=for-the-badge)

**The most advanced device spoofer for Android gaming - bypass restrictions and play any game on any device!**

## ✨ Why COPG Stands Out
- 🚀 **Real-time Device Spoofing**: Transform your device model on-the-fly
- ⚡ **Lightning Fast**: Adds just ~1ms to app launch time
- 🛡️ **Universal Compatibility**: Works with Magisk, KernelSU, and APatch
- 🌐 **Web Dashboard**: Control everything through a beautiful web interface
- 🔄 **Smart Updates**: Get new device profiles automatically
- 🔧 **Smart State Management**:
  - Auto-disable adaptive brightness
  - Do Not Disturb mode toggle
  - Screen timeout control
  - System logging management
- ⚙️ **Debugging Tools**: Detailed logging via `logcat -s "SpoofModule"`

## 🎮 Example Games
| Game | Spoofed Device | Status |
|------|---------------|--------|
| Call of Duty Mobile | Lenovo TB-9707F | ✅ Perfect |
| PUBG Mobile | Xiaomi Mi 13 Pro | ✅ Flawless |
| Mobile Legends | POCO F5 | ⚡ Optimized |

## 🛠️ Installation Made Simple

### 📋 Requirements
- Rooted Android device (9.0+)
- One of these root solutions:
  - ![Magisk](https://img.shields.io/badge/Magisk-v24%2B-00B39B?style=flat&logo=android) with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk) ( currently normal magisk only works with Rezygisk)
  - ![KernelSU](https://img.shields.io/badge/KernelSU-0.6.6%2B-7D4698?style=flat) with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)
  - ![APatch](https://img.shields.io/badge/APatch-0.10%2B-4285F4?style=flat) with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)
## 📃 Note
Standard/Native Zygisk isn't supported because its not safe.

## Download Module
> [!TIP]
> - You can download the module from:\
[![MMRL](https://mmrl.dev/assets/badge.svg)](https://mmrl.dev/repository/zguectZGR/COPG)
> - Or from [Releases](https://github.com/AlirezaParsi/COPG/releases) section.

### ⚙️ Installation Steps
1. Download the latest `COPG.zip` from [Releases](https://github.com/AlirezaParsi/COPG/releases)
2. Install via your root manager:
   - Magisk: Modules → Install from storage → Select ZIP
   - KernelSU: Modules → Install → Select ZIP
   - APatch: Modules → Install → Select ZIP
3. Reboot your device
4. Verify installation in your root manager (look for "✨ COPG spoof ✨")

## 🧩 Module Architecture
```mermaid
graph LR
    A[Game Launch] --> B{COPG Check}
    B -->|Match Found| C[Apply Spoof]
    B -->|No Match| D[Original Device]
    C --> E[Modified Build Props]
    E --> F[Game Runs!]
```
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
```
## ❓ FAQ
<details> <summary>📌 Will this get me banned?</summary> While COPG is designed to be undetectable, I cannot guarantee safety. Use at your own risk. </details><details> <summary>⚡ Does it affect performance?</summary> Minimal impact! My optimized code adds just ~1ms to launch time. </details>

## Activity
![Alt](https://repobeats.axiom.co/api/embed/83b280d0986b3c023ed5f1fdf3f00f77288e3da3.svg "Repobeats analytics image")

## 🖼 Screenshots 

### 🌐 WebUI Interface
<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="https://github.com/user-attachments/assets/c31fa24e-9a67-43b5-b5e1-a4b65190bed4" width="300" alt="Main Dashboard">
        <br><em>Settings Panel</em>
      </td>
      <td align="center">
        <img src="https://github.com/user-attachments/assets/61d2bf0e-72b2-4c01-ab8f-a536ffc3c3c4" width="300" alt="Settings">
        <br><em>Settings Panel</em>
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://github.com/user-attachments/assets/07b7b135-dddb-48ed-a699-0db8f0c0e758" width="300" alt="Profiles">
        <br><em>Device Profiles</em>
      </td>
      <td align="center">
        <img src="https://github.com/user-attachments/assets/6b420621-fc81-4b9f-ad35-7c71f6165faf" width="300" alt="Advanced">
        <br><em>Game list</em>
      </td>
    </tr>
  </table>
</div>

### 🎮 Game Examples
<div align="center">
  <img src="https://github.com/user-attachments/assets/735aa872-fbf0-4cd1-8299-1989c08b9b80" width="180" hspace="10" alt="Delta Force">
  <img src="https://github.com/user-attachments/assets/9a9fd8b2-7449-404f-888a-dedeefbe670d" width="180" hspace="10" alt="CODM">
  <img src="https://github.com/user-attachments/assets/d9d3398f-5944-44e6-8df6-312e099c9738" width="180" hspace="10" alt="PUBG Mobile">
  <img src="https://github.com/user-attachments/assets/4f80922a-dc68-48a5-80b5-b9523e47589b" width="180" hspace="10" alt="LoL">
</div>



<div align="center"> Made with ❤️ by Alireza Parsi | © 2025 COPG Project </div> ```
