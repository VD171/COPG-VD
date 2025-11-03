<div align="center">
  
<img src="https://raw.githubusercontent.com/AlirezaParsi/COPG/refs/heads/JSON/banner.png" style="width: 500px; height: 200px; object-fit: fill;" />
</div>
<h1 align="center">🎮 COPG - Ultimate Device Spoofer for Android Games & Apps</h1>

[![Zygisk](https://img.shields.io/badge/Zygisk-Compatible-brightgreen?style=for-the-badge)](https://github.com/topjohnwu/Magisk)
[![Android](https://img.shields.io/badge/Android-9.0%2B-blue?style=for-the-badge&logo=android)](https://www.android.com/)
[![License](https://img.shields.io/github/license/AlirezaParsi/COPG?style=for-the-badge)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/AlirezaParsi/COPG/total?style=for-the-badge&color=orange)](https://github.com/AlirezaParsi/COPG/releases)
![Built with](https://img.shields.io/badge/Made_with-❤-red?style=for-the-badge)

**The most advanced device spoofer for Android gaming - bypass restrictions and play any game on any device!**

## 🌟 COPG - Ultimate Device Spoofer for Games & Apps 🌟
**Unlock the full potential of your games and apps with COPG! Spoof your device to enjoy premium features, max performance, and exclusive benefits. 🚀**
### 🎮 Maximize Your Gaming Experience
- Call of Duty Mobile: 120 FPS (BR/MT)
- PUBG/BGMI: 120 FPS + Haptic Feedback
- Delta Force: 120 FPS/HD Graphics
- Mobile Legends: Ultra 120 FPS
- Freefire / Freefire max 120 FPS
- +60 games supported!
### 📱 Exclusive App Enhancements
Google Photos: Unlimited backup + AI generator
TikTok: Stream in stunning 1080p
### 🔧 Flexible & Future-Proof
Add new devices or games anytime
Beautiful WebUI to manage your spoofed apps
💡 Why Choose COPG?
Transform your device into a powerhouse for gaming and apps. Easy to use, fully customizable, and packed with features!

## 🛠️ Installation Made Simple

### 📋 Requirements
- Rooted Android device (9.0+)
- One of these root solutions:
  - ![Magisk](https://img.shields.io/badge/Magisk-v24%2B-00B39B?style=flat&logo=android) with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)/[NeoZygisk](https://github.com/JingMatrix/NeoZygisk)
  - ![KernelSU](https://img.shields.io/badge/KernelSU-0.6.6%2B-7D4698?style=flat) with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)/[NeoZygisk](https://github.com/JingMatrix/NeoZygisk)
  - ![APatch](https://img.shields.io/badge/APatch-0.10%2B-4285F4?style=flat) with [Zygisk Next](https://github.com/Dr-TSNG/ZygiskNext)/[Rezygisk](https://github.com/PerformanC/ReZygisk)/[NeoZygisk](https://github.com/JingMatrix/NeoZygisk)
## 📃 Note
- Standard/Native Zygisk isn't supported because its not safe.
- WebUI-X is recommended.

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
graph TD
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
    "FINGERPRINT": "ZTE/NX769J..."
  }
}
```
## ❓ FAQ
<details>
<summary>🤔 What does COPG stand for?</summary>
COPG stands for CO (from Call of Duty) and PG (from PUBG). The module was initially created for these two games. Although it now supports all games and applications, the original name was kept to preserve its historical background.
</details>

<details>
<summary>📌 Will this get me banned?</summary>
While COPG is designed to be undetectable, I cannot guarantee safety. Use at your own risk.
</details>

<details>
<summary>⚡ Does it affect performance?</summary>
Minimal impact! The optimized code adds only ~1ms to the launch time.
</details>

<details>
<summary>🔧 How to access WebUI?</summary>
Use the WebUI X app:<br>
<br>
<a href="https://github.com/MMRLApp/WebUI-X-Portable"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="GitHub"></a>
<a href="https://play.google.com/store/apps/details?id=com.dergoogler.mmrl.wx"><img src="https://img.shields.io/badge/Google_Play-414141?logo=google-play&logoColor=white" alt="Play Store"></a>
</details>

## Activity
![Alt](https://repobeats.axiom.co/api/embed/83b280d0986b3c023ed5f1fdf3f00f77288e3da3.svg "Repobeats analytics image")

## Star History

<a href="https://www.star-history.com/#AlirezaParsi/COPG&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=AlirezaParsi/COPG&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=AlirezaParsi/COPG&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=AlirezaParsi/COPG&type=Date" />
 </picture>
</a>

## 🖼 Screenshots 

### 🌐 WebUI Interface
<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="https://github.com/AlirezaParsi/COPG/blob/JSON/screenshots/Screenshot_20250913-210930_WebUI%20X.png?raw=true" width="300" alt="Main Dashboard">
        <br><em>Settings Panel</em>
      </td>
      <td align="center">
        <img src="https://github.com/AlirezaParsi/COPG/blob/JSON/screenshots/Screenshot_20250913-211818_WebUI%20X.png?raw=true" width="300" alt="Settings">
        <br><em>Add new App/game</em>
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://github.com/AlirezaParsi/COPG/blob/JSON/screenshots/Screenshot_20250913-211418_WebUI%20X.png?raw=true" width="300" alt="Profiles">
        <br><em>Device Profiles</em>
      </td>
      <td align="center">
        <img src="https://github.com/AlirezaParsi/COPG/blob/JSON/screenshots/Screenshot_20250913-211454_WebUI%20X.png?raw=true" width="300" alt="Advanced">
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
  <img src="https://github.com/AlirezaParsi/COPG/blob/JSON/screenshots/Screenshot_20250914-131838_Free%20Fire%20MAX.png?raw=true" width="180" hspace="10" alt="FreeFire MAX">
  <img src="https://github.com/AlirezaParsi/COPG/blob/JSON/screenshots/Screenshot_20250913-211947_Mobile%20Legends_%20Bang%20Bang.US.png?raw=true" width="180" hspace="10" alt="Mobile Legends Bang Bang.US">
</div>

---
- [![Telegram Channel](https://img.shields.io/badge/Telegram_Channel-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/COPG_module)
- [![Telegram Group](https://img.shields.io/badge/Telegram_Group-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/TheAOSP)
---

<div align="center"> Made with ❤️ by Alireza Parsi | © 2025 COPG Project </div> 
