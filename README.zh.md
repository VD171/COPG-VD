## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD 是一个用于全局设备伪装的模块。  
这意味着即使是系统应用和整个设备也会被 hook。  
  
## 如何使用？
如果使用本模块并伪装一个可用的 FingerPrint，就无需再使用 PlayIntegrityFix 或 GooglePhotosUnlimited。  
### JSON 配置文件示例  
`/data/adb/COPG-VD.json`
* 所有字段均为可选。如果某个字段未提供，则会被跳过。  
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
请务必只使用双引号包裹的字符串。  
上面的代码块以及 `module/COPG-VD.json.example` 由 [Update COPG-VD.json](.github/workflows/update-json.yml) 工作流每天刷新，直接取自最新的 Google 工厂镜像。  
### 保持 fingerprint 为最新  
`fingerprint-update.sh` 会拉取该文件并更新你的配置，既可以从 WebUI（**Check Update** / **Update Now**），也可以自行在**每次开机执行一次**（**Auto-update JSON on boot**，默认开启）。  
* 当 `/data/adb/COPG-VD.json` 和 `/data/adb/modules/COPG-VD/COPG-VD.json` 两者都存在时都会被更新，之前的内容会保留为 `.bak`。  
* 只有 build 字段会被重写（fingerprint、ID、incremental、timestamp、安全补丁、SDK、UUID、host、user）。你自定义的其他一切都会被保留：额外的键、`BOOTLOADER`/`BOARD`/`HARDWARE`、其他对象、键的顺序和格式。  
* 它绝不会倒退：比已安装版本更旧的上游 build 会被拒绝。这是
  常见情况（仓库可能落后于你手动更新的配置），同时也是在 Android 上
  最重要的防护，因为 Android 上唯一可用的下载器是 busybox `wget`，它无法
  验证 TLS 证书 - 出于同样的原因，每个值在使用前都会经过校验。  
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
### 配置中的设置  
`COPG-VD.json` 可以携带一个 `COPG-VD-Settings` 对象 - `resetprop`、`autoupdate`、`spoof_manufacturer`、`spoof_version` - 这样你的选择会随备份一起保存，也可以手动编辑。WebUI 会同时写入该对象以及开机脚本所读取的标志文件。`"spoof_version": "force"` 会从文件中被拒绝并降级：恢复旧备份不得在你不知情的情况下重新启用它。  
### WebUI  
如果你直接编辑 JSON 配置文件，则无需使用 WebUI。  
如果你是 Magisk 用户，请使用 KOW 的 KsuWebUI（https://github.com/KOWX712/KsuWebUIStandalone/releases）。  
#### 使用 resetprop：  
禁用 resetprop 的使用，仅启用伪装 Build 信息。  
#### 使用 ro.product.manufacturer：  
如果你在意 Disclosure root 检测应用中的 "Found device spoofing" 检测，请将其禁用。  

## 联系方式

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
