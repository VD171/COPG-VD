> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · 中文

---

# 架构

COPG-VD 是一个 Zygisk 模块：一个很小的原生库（`libspoof.so`），由 Zygisk 加载器注入到 zygote
中，并从那里注入到应用进程中。它所做的全部就是向你所针对的进程呈现一个所选的设备身份。没有
应用程序，而且除了可选的配置文件获取之外，没有网络。

## 生命周期

1. **Zygote 启动。** 当 zygote 启动时，加载器调用模块的 `onLoad`。它读取一次
   `/data/adb/COPG-VD/COPG-VD.json`：作用范围配置和配置文件。
2. **应用 fork。** 对于 zygote fork 出的每一个应用，模块在 `preAppSpecialize` 中决定该进程是
   否在作用范围内：
   - **在主作用范围内**（`playstore` / `global` / `whitelist` / `blacklist`），或
   - **在 DRM 作用范围内**（列在 `drm_targets` 中）。
   如果两者都不是，模块就从该进程**分离**（`dlclose`），不在其中留下任何痕迹。
3. **Specialize。** 对于保留下来的进程，各引擎在 `postAppSpecialize` 中应用，此时进程仍具有
   特权。

由于各个 fork 继承了 zygote 的写时复制（copy-on-write）内存，每个应用都从开机时读取的配置开
始。模块只有在文件确实发生变化时才会按目标进程重新读取它，因此一个新启动或重新打开的应用会
获取到被编辑过的配置文件 - 但作用范围的决定本身是在 zygote 启动时做出的，所以**更改作用范
围、引擎或 `drm_targets` 需要重启**。

## 各个引擎

每一个都是独立且可切换的。

- **Build 字段（`motor_jni`）。** 通过 JNI 在目标进程中重写 `android.os.Build.*`（以及
  `Build.VERSION.*`），使 Java 代码读到被伪装的值。
- **属性 hook（`motor_prop_hook`）。** 通过对属性区域进行净室的、按进程的重映射
  （`prop_virtualizer`），向进程呈现被伪装的系统属性。它是一次内存重映射，而不是函数 hook，
  因此没有被 hook 的函数痕迹。
- **resetprop（设备范围）。** 按组写入系统属性 - identity、version、boot state、SELinux、
  adb/usb、anti-emulator，外加一次清理处理。开机脚本运行它。在一个有范围限制的模式下，
  identity 和 version 组被排除在外（由 Zygisk 按进程投递）；boot、lock 和 SELinux 组保持全
  局，以使设备保持一致。
- **DRM / Widevine（`motor_drm`）。** Hook 报告 Widevine 安全级别的 `MediaDrm` 方法
  （`getSecurityLevel`、`getPropertyString`），并返回所配置的级别。这些 hook 都做了空值检
  查，因此一个格式错误的配置文件会优雅降级，而不是使应用崩溃。`drm_targets` 让这个引擎在它自
  己的应用列表上运行，与主作用范围解耦。

## 读取配置

被注入的进程运行在 zygote 的 SELinux 域中，默认情况下无法访问 `/data/adb`。模块自带它自己的
`sepolicy.rule` 来允许这一点，并且作为一种回退，可以通过它打开的模块目录
（`getModuleDir`）读取配置，因此即使某个 Zygisk 版本不再授予该路径，它也能继续工作。文件是用
一个小型嵌入式 JSON 解析器（`jsmn`）解析的；一个无法解析的文件意味着模块什么都不伪装。

## 保持配置文件新鲜

`fingerprint-update.sh` 从最新的 Google 出厂镜像刷新 build 字段，可从 WebUI 或每次开机一次。
它使用模块自带的下载器（而不是 `PATH` 中的 `curl`/`wget`），在使用前校验每一个值，绝不倒退，
并拒绝一个伪装成另一台设备的配置文件。`android.os.Build` 是在 zygote 启动时写入的，因此新值
会在下一次重启时到达应用。关于用户侧参见 [USER-GUIDE.md](USER-GUIDE.md)，关于字段参见
[CONFIGURATION.md](CONFIGURATION.md)。

## 为什么默认不伪装 Android 版本

把 `SDK_INT` / `ANDROID_VERSION` 提高到超过 ROM 框架实际的版本，会使应用去调用并不存在的
API，这会使 Google 的应用崩溃并把手机重启进一个软循环。因此 version 组默认关闭，并受
`spoof_version` 的把关。模块从 `/system/build.prop` 读取真实版本，绝不会从 `getprop` 读取，因
为 `getprop` 正是它所伪造的东西。参见 [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)
中的陷阱。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出更正和改进 - 参见 [../CONTRIBUTING.md](CONTRIBUTING.md)。*

<!-- doc-footer -->

---

> _本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_
