> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · 中文

---

# 为 COPG-VD 做贡献

感谢你的帮助！COPG-VD 的设计初衷就是易于贡献。本指南告诉你各部分的位置以及我们所遵循的少数
几条约定。

## 项目一览

COPG-VD 是一个 **Zygisk 设备伪装器（Zygisk device spoofer）**：一个被注入到应用进程中以重写
设备指纹和 build 信息的小型原生库，外加一个用于驱动它的纯 JS（vanilla-JS）WebUI。它是 COPG
（作者 AlirezaParsi）的一个分支，由 VD171 在 Apache-2.0 许可证下维护。参见
[ARCHITECTURE.md](ARCHITECTURE.md) 和 [FILE-STRUCTURE.md](FILE-STRUCTURE.md)。

默认情况下，它通过 Zygisk 将伪装限定在 Google Play 栈，因此它是比 PlayIntegrityFix 更轻量、
更稳健的替代方案。

## 欢迎 AI 贡献者

AI 助手和智能体在这里是一等的贡献者，而不是事后才考虑的东西。

- 本项目的构建以可读为目标：配置是单个 JSON 文件（`/data/adb/COPG-VD/COPG-VD.json`，在
  [CONFIGURATION.md](CONFIGURATION.md) 中有文档说明），各引擎小而自洽，布局在
  [FILE-STRUCTURE.md](FILE-STRUCTURE.md) 中。
- 由 AI 协助的补丁与任何其他补丁按同样的条件被审查和接受 - 依据正确性、清晰度和下面的约定，
  而不是依据是谁（或什么）写的。
- 对所有人同一条标准：一个真实功能绝不被削弱，伪装保持一致，并且没有任何机密的或设备专属的
  东西进入仓库（参见 [.gitignore](../../.gitignore)）。

## 开发环境搭建

- 你需要一台已 root 的设备或带 Zygisk（KernelSU、APatch 或 Magisk）的模拟器来测试。
- 用 NDK（r29）和 CMake 按 ABI 构建原生库 - 确切命令参见
  [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) 中的 `Build zygisk
  libraries` 步骤。CI 会为你构建全部三个 ABI。
- 构建一个可刷入的 zip：把构建好的 `libspoof.so` 复制到 `module/zygisk/<abi>.so`，然后
  `cd module && zip -r9 ../COPG-VD-dev.zip .`，并刷入它。
- WebUI 是 `module/webroot/`（从 root 管理器打开它）。伪装逻辑是 `zygisk/spoof_module.cpp`；
  配置文件获取器是 `module/fingerprint-update.sh`。

## 约定

- **每个模块源文件**（`.cpp`、`.sh`、`.js`、`.css`、`.html`）都以项目横幅标头（banner
  header）开头（从任意现有文件中复制它）。`.github/` 下的工具则使用一个简短注释代替。
- **代码和注释用英文。** 注释保持最少，只在需要的地方。
- **不用 em-dash 或 en-dash**；始终用普通连字符 `-`。
- WebUI 是 **vanilla JS**（单个 `scripts.js`）；没有框架。
- **绝不削弱**一个真实功能：保持伪装一致，并且不要让 hook 使它们所附着的应用崩溃（它们是有意
  做了空值检查的）。

## 国际化（i18n）

- UI 字符串位于 `module/webroot/lang/`。英文是规范的回退（`en.js` + `en.json`）；其余 20 种
  语言是 `<code>.json`。
- 要添加或更改一个字符串：编辑 `en.js` **和** `en.json`，然后更新每一个 `<code>.json`。改动
  一个可见的标签意味着要更新**所有**语言文件和**所有** `README.<code>.md`。
- 翻译是纯 JSON - 一个很棒的首次贡献。

## 提交与 PR

- 保持 PR 聚焦。描述做了什么以及为什么。
- 为你的提交签名（DCO）：`git commit -s`（会添加 `Signed-off-by:`）。
- CI 必须保持绿色。在审查中请友善 - 参见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 适合新手的问题（good first issues）

寻找 `good first issue` 和 `help wanted` 标签。翻译、文档和新的 Pixel 配置文件都是很棒的起
点。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出更正和改进 - 参见 [CONTRIBUTING.md](CONTRIBUTING.md)。*
