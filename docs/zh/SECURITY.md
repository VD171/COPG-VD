> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · 中文

---

# 安全策略

COPG-VD 以 root 身份运行，并通过 Zygisk 注入到应用进程中。我们认真对待安全。

## 报告漏洞

- **网站：** https://vd171.ru
- **网站：** https://vd.priv8.ru
- **Issues：** https://github.com/VD171/COPG-VD/issues
- **GitHub：** [@VD171](https://github.com/VD171)
- **XDA-Developers：** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA 主题帖：** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram：** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram：** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord：** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **电子邮件：** vd.priv8@pm.me

请附上清晰的描述，如果可能，附上复现步骤。我们会尽快回复，并在你愿意时给予你署名致谢。

## 范围说明

- 配置位于 `/data/adb/COPG-VD.json`，仅 root 可读。模块通过它自己附带的一条专用 SELinux 规则
  从被注入的进程中读取它；它不保存任何凭据或口令。
- 伪装 hook 附着在运行中的应用上，并做了空值检查，因此一个格式错误的配置文件会优雅降级，而
  不是使应用崩溃。
- 除了可选的配置文件获取外，**没有遥测、没有网络**；该获取使用模块自带的下载器，而不是
  `PATH` 中的 `curl`/`wget`，通过 HTTPS 从
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  下载一个公开的 Pixel 配置文件。
- 每一个预构建的二进制文件和库都可追溯到一个被固定（pinned）的公开上游，并在 CI 中从你可以
  检查的源码构建。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出更正和改进 - 参见 [CONTRIBUTING.md](CONTRIBUTING.md)。*
