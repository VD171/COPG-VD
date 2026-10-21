## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD 是一个设备伪装器：它会重写设备的 fingerprint 和 build，让应用看到你选择的设备，而不是真实的设备。  
它运行在 Zygisk（KernelSU、APatch 或 Magisk）之上，并且默认将伪装范围限定在 Google Play 栈 - 因此它是比 PlayIntegrityFix 更轻量、更稳健的替代方案。  

## 截图

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## 如何使用？
安装模块，重启，随附的配置文件（一台 Pixel）就会对目标应用进行伪装。有了可用的 fingerprint，你就不需要 PlayIntegrityFix 或 GooglePhotosUnlimited。  
一切都在 `/data/adb/COPG-VD.json` 中配置，或通过 WebUI 配置。所有字段均为可选 - 未提供的字段会被跳过。  

### Scope - 谁会看到伪装
`scope_mode` 决定哪些进程获得伪装的身份。在限定范围的模式下，身份由 Zygisk 逐进程交付，不会通过 global properties 泄露给系统的其余部分。  
* **Google Play**（`playstore`，默认）- 仅限 Play 栈（Google Play services、其 unstable 进程和 Play Store）。  
* **Global** - 整台设备；每个进程都能看到它。  
* **Whitelist** - 仅限 `scope_whitelist` 中的应用。  
* **Blacklist** - 除 `scope_blacklist` 中的应用之外的每个应用。  

### Engines - 伪装如何交付
每一个都是独立的，都可以关闭：  
* **Build fields (JNI)** - 在目标进程中重写 `android.os.Build.*`。  
* **Property hook** - 向目标进程呈现伪装的系统属性（对属性区域进行逐进程的 clean-room 重映射，不 hook 函数）。  
* **resetprop** - 重写系统属性，按组管理：identity、version、boot state、SELinux、adb/usb、anti-emulator 以及一次清理。在限定范围的模式下，identity 和 version 组不纳入设备范围的 resetprop（由 Zygisk 逐进程交付）；boot/lock/SELinux 组保持 global。  
* **DRM / Widevine**（默认关闭）- 向读取它的应用报告所选的 Widevine 安全级别，L1 或 L3。  

### Fields - set、empty、delete 或 skip
在 `COPG-VD` 对象内部，每个 Build 字段有四种状态：  
* **Set** - `"KEY": "value"` 写入该值。  
* **Empty** - `"KEY": ""` 写入一个空值。  
* **Delete** - 在顶层的 `"COPG-VD-Delete": [ ... ]` 中列出该键以移除它（Build 字段变为 null，属性通过 `resetprop --delete` 移除）。  
* **Skip** - 完全不写该键；保留 ROM 自身的值。  

`"global_fields": [ ... ]` 列表会在设备范围内应用所列出的 Build 字段，即使在限定范围的模式下也是如此，以便让某个值在各处保持一致 - 仅适用于对一致性安全的字段（例如 security patch），绝不用于 identity，也绝不用于 Android 版本组。  

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
请务必只使用双引号包裹的字符串。  
上面的代码块以及 `module/COPG-VD.json.example` 由 [Update COPG-VD.json](.github/workflows/update-json.yml) 工作流每天刷新，直接取自最新的 Google 工厂镜像。  

### 保持 fingerprint 为最新
`fingerprint-update.sh` 会拉取该文件并更新你的配置，既可以从 WebUI（**Check Update** / **Update Now**），也可以自行在**每次开机执行一次**（**Auto-update JSON on boot**，默认开启）。  
* 当 `/data/adb/COPG-VD.json` 和 `/data/adb/modules/COPG-VD/COPG-VD.json` 两者都存在时都会被更新，之前的内容会保留为 `.bak`。  
* 只有 build 字段会被重写（fingerprint、ID、incremental、timestamp、安全补丁、SDK、UUID、host、user）。你自定义的其他一切都会被保留：额外的键、`scope_mode`、`BOOTLOADER`/`BOARD`/`HARDWARE`、其他对象、键的顺序和格式。  
* 它绝不会倒退：比已安装版本更旧的上游 build 会被拒绝。这是常见情况（仓库可能落后于你手动更新的配置），同时也是在 Android 上最重要的防护，因为 Android 上唯一可用的下载器是 busybox `wget`，它无法验证 TLS 证书 - 出于同样的原因，每个值在使用前都会经过校验。  
* 如果你的配置文件伪装的是**另一台设备**（不同的 `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`），则不会应用任何内容 - 在另一份配置上套用 Pixel 的 fingerprint 比用旧的 fingerprint 更糟。  
* 开机时它在后台运行，并会持续重试约 10 分钟，因为开机完成时 wifi 通常还没就绪。它绝不会拖慢开机。  
* `resetprop` 会在更新后立即重新应用，但 `android.os.Build` 是在 zygote 启动时由 zygisk 模块写入的：请**重启**以使新值传达到各应用。  
* 日志位于 `/data/adb/COPG-VD.update.log`。  

### Android 版本 - 以及为什么不对其进行伪装
`ANDROID_VERSION`、`SDK_INT`、`SDK_FULL` 和 `CODENAME` 描述的是**你的 ROM**，而不是被伪装的设备。告诉应用 SDK 比框架实际版本更新，会使它们调用并不存在的 API：Google 的应用崩溃，手机重启，然后一切重新开始。开机本身是能完成的，所以这是一种 **softloop**，而且开机日志里不会显示任何东西。  
* 它们不在随附的配置中，更新程序也绝不会写入它们。  
* WebUI 中的 **Spoof Android version** 决定它们是否会被应用：  
  * **Never**（默认）- 使用 ROM 自身的版本。  
  * **Up to this ROM** - 仅应用不超过它的部分，实际上意味着降低 SDK。  
  * **Force** - 完全按照配置所写。这正是导致 softloop 的原因。  
* 真实版本是从 `/system/build.prop` 读取的，绝不从 `getprop` 读取 - 因为那正是本模块所伪造的东西。  

### Analyze
WebUI 中的 **Analyze**（或 `fingerprint-update.sh analyze`）会审查当前状态下的配置：版本与 ROM 的对比、文件是否仍能被解析（损坏的文件会使模块**什么都不**伪装，而且只有 logcat 会提示）、fingerprint 是否与周围字段一致、模块不读取的键、日期，以及这些 prop 是否已经携带了配置所要求的值。  

### WebUI
WebUI 是可选的 - 一切都可以直接在 JSON 配置文件中编辑 - 但它是驱动模块的便捷方式。它有五个标签页：**About**、**Device**（每个字段，按状态设置，按类别分组）、**Spoofing**（scope 和 engines）、**System**（resetprop 组）以及 **Tools**（Analyze、Check Update、Update Now、Backup/Restore 以及开机自动更新）。它不发出任何网络请求；它所需的一切都随模块一起打包。  
如果你是 Magisk 用户，请使用 KOW 的 KsuWebUI（https://github.com/KOWX712/KsuWebUIStandalone/releases）。  

### 配置中的设置
`COPG-VD.json` 将其设置放在配置文件旁边，这样你的选择会随备份一起保存，也可以手动编辑：`scope_mode`、各 engine 开关、resetprop 组、`global_fields`，以及一个 `COPG-VD-Settings` 对象（`resetprop`、`autoupdate`、`spoof_manufacturer`、`spoof_version`）。WebUI 会同时写入配置以及开机脚本所读取的标志文件。`"spoof_version": "force"` 会从文件中被拒绝并降级：恢复旧备份不得在你不知情的情况下重新启用它。  

## 联系方式

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
