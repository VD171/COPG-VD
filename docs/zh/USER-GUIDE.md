> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · 中文

---

# 用户指南

COPG-VD 会重写设备指纹（fingerprint）和 build 信息，使你选择的应用看到的是一台 Pixel，而
不是你的真实设备。本指南将带你从安装到一个可用的配置，并贯穿沿途的各种选择。关于每个字段和
取值，参见 [CONFIGURATION.md](CONFIGURATION.md)；关于其内部工作原理，参见
[ARCHITECTURE.md](ARCHITECTURE.md)。

## 安装

1. 在 KernelSU、APatch 或 Magisk 中刷入该 zip 并重启。
2. 必须启用 Zygisk（内置的，或 ReZygisk / Zygisk Next）。Magisk 用户：启用 Zygisk。
3. 模块自带一个 Pixel 配置文件，因此重启后 Google Play 栈立刻就会看到那台 Pixel。有了一个
   可用的指纹，你就不需要 PlayIntegrityFix 或 GooglePhotosUnlimited。

从你的 root 管理器打开 WebUI 来驱动该模块。Magisk 用户用
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) 打开它。一切
也都可以直接在 `/data/adb/COPG-VD/COPG-VD.json` 中编辑。

## 谁看到伪装（作用范围）

`scope_mode` 决定哪些进程接收被伪装的身份。在一个有范围限制的模式下，身份由 Zygisk 按进程
分别投递，并且**不会**通过全局属性泄漏给系统的其余部分。

| 模式 | 谁获得伪装 |
|---|---|
| `playstore`（默认） | 仅 Play 栈：Google Play services、它的不稳定进程以及 Play Store。 |
| `global` | 整台设备：每一个进程。 |
| `whitelist` | 仅 `scope_whitelist` 中列出的应用。 |
| `blacklist` | 除 `scope_blacklist` 中的应用之外的每一个应用。 |

从 `playstore` 开始。它是最轻量的选项，也是能通过 Play Integrity 而又不会把伪装暴露给无关
应用的选项。

## 各个引擎

每个引擎都是独立的，可以关闭。除 DRM 外，所有引擎默认开启。

- **Build 字段（`motor_jni`）** - 在目标进程中重写 `android.os.Build.*`。这是大多数应用读取
  的内容。
- **属性 hook（`motor_prop_hook`）** - 通过对属性区域进行按进程的净室（clean-room）重映射，
  向目标进程呈现被伪装的系统属性（没有函数 hook）。
- **resetprop** - 按组（identity、version、boot state、SELinux、adb/usb、anti-emulator，以及
  一次清理处理）在设备范围内重写系统属性。在一个有范围限制的模式下，identity 和 version 组不
  参与设备范围的处理（由 Zygisk 按进程投递）；boot、lock 和 SELinux 组仍保持全局。在
  `COPG-VD-Settings.resetprop` 中切换它。
- **DRM / Widevine（`motor_drm`，默认关闭）** - 向读取它的应用报告一个所选的 Widevine 安全
  级别（L1 或 L3）。参见下面的 DRM 部分。

## 保持指纹新鲜

指纹会老化：Google 会轮换出厂镜像，旧指纹会慢慢失去价值。`fingerprint-update.sh` 从最新的
Google 出厂镜像出发，使你的指纹保持最新。

- 从 WebUI（Tools 标签页）：**Check Update** 和 **Update Now**。
- 自行运行，**每次开机一次**：**Auto-update JSON on boot**（默认开启）。它在后台运行，由于开机
  时 wifi 通常尚未连上，它会持续重试约十分钟，并且绝不会拖慢开机。
- 它只重写 build 字段（fingerprint、ID、incremental、timestamp、security patch、SDK、UUID、
  host、user）。你自定义的一切都会保留，之前的内容会被保存为 `.bak`。
- 它绝不会倒退（更旧的上游 build 会被拒绝），而且如果你的配置文件伪装的是另一台设备，它什么
  都不会应用 - 在另一个配置文件上套用 Pixel 指纹比用一个旧指纹更糟。
- 更新之后会立即重新应用 `resetprop`，但 `android.os.Build` 是在 zygote 启动时写入的，因此要让
  新值到达应用，需**重启**。日志：`/data/adb/COPG-VD/update.log`。

## Android 版本陷阱

最难做对的事情。`ANDROID_VERSION`、`SDK_INT`、`SDK_FULL` 和 `CODENAME` 描述的是**你的
ROM**，而不是你伪装的设备。告诉应用 SDK 比框架实际的版本更新，会使它们去调用并不存在的
API：Google 的应用崩溃，手机重启，然后又从头开始。开机本身是完成的，所以这是一个在开机日志
里什么都不留下的**软循环（softloop）**。

这些字段不在随附的配置中，更新程序也绝不会写入它们。**Spoof Android version**
（`COPG-VD-Settings.spoof_version`）决定它们是否会被应用：

- `never`（默认） - 使用 ROM 自己的版本。
- `rom` - 只应用不超过 ROM 的部分，这在实践中意味着降低 SDK。
- `force` - 完全按照配置所说的应用。这正是导致软循环的原因；只有在你知道目标框架支持它时才
  使用。

真实版本是从 `/system/build.prop` 读取的，绝不会从 `getprop` 读取（而 `getprop` 正是本模块所
伪造的东西）。在恢复备份时 `force` 也会被拒绝，因此一个旧备份无法在你背后重新把它激活。

## DRM / Widevine

默认关闭（`motor_drm`）。开启时，它向读取它的应用报告一个所选的 Widevine 级别，
`DRM_SECURITY_LEVEL`（`L1` 或 `L3`）。

默认情况下，DRM 伪装遵循 `scope_mode`。若要改为将它应用于一组特定的应用 - 独立于主作用范围 -
请把它们列在 `drm_targets` 中。此时，即使某个被列出的应用处于主作用范围之外，模块也会**仅仅**
为了 DRM hook 而在该应用中保持加载；空列表或缺失的列表意味着遵循作用范围。这需要一个有范围
限制的模式（不是 `global`），并在下次**重启**时生效。

## Analyze：检查你的配置

WebUI 中的 **Analyze**（或 `fingerprint-update.sh analyze`）会审查当前状态下的配置，并在应用
发现之前告诉你哪里有问题：

- 版本相对于 ROM（会不会软循环？），
- 文件是否仍能解析（一个损坏的文件会使模块**什么都不**伪装，而只有 logcat 才会说明），
- 指纹是否与它周围的字段一致，
- 模块不会读取的键、可疑的日期，以及实时属性是否已经携带了配置所要求的内容。

每当你手动编辑配置时都运行它。

## WebUI

可选，但却是驱动一切的简便方式。五个标签页：

- **About** - 模块和版本信息。
- **Device** - 每个 build 字段，按状态设置并按类别分组。
- **Spoofing** - 作用范围模式和各引擎开关。
- **System** - resetprop 各组。
- **Tools** - Analyze、Check Update、Update Now、Backup / Restore、开机自动更新，以及
  Diagnostics 报告（一个按钮即可读取并导出对错误报告有用的一切）。

它不发出任何网络请求；它所需的一切都随模块内置。

## 疑难解答

- **某个应用仍看到真实设备。** 检查作用范围：在 `playstore` 下只覆盖 Play 栈。确认配置能够
  解析（运行 Analyze）。更改引擎、`drm_targets` 或配置文件后，请**重启** - Zygisk 在 zygote
  启动时读取作用范围。
- **Play Integrity 仍然失败。** 确保指纹是新鲜的（Check Update），并且 `SECURITY_PATCH` 在
  `global_fields` 中，这样它在设备范围内保持一致。结束 Google Play services 以让它重新认证。
- **启用版本伪装后手机软循环。** 那就是上面的 Android 版本陷阱 - 把 `spoof_version` 改回
  `never`。
- **WebUI 在 Magisk 上打不开。** 使用 [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases)。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出更正和改进 - 参见 [../CONTRIBUTING.md](CONTRIBUTING.md)。*
