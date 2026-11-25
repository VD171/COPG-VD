> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · 中文

---

# AI 智能体：控制面

COPG-VD 欢迎 AI 和智能体贡献者，整个模块的构建就是为了无界面地驱动，而无需 scrape WebUI。存在两个面，以
root 身份运行的智能体（正如 WebUI 所做的那样）两者都会使用：

1. **配置文件** `/data/adb/COPG-VD/COPG-VD.json` - 唯一的真实来源。每个配置文件字段和每项设置都在这里；读取和写入该文件就是你更改模块所伪装内容的方式。
2. **shell 入口点** `fingerprint-update.sh` - 一个脚本，带有用于检查、应用和获取配置文件的稳定动词。

## 配置文件

`/data/adb/COPG-VD/COPG-VD.json` 是一个普通的 JSON 对象。模块通过它自身提供的专用 SELinux 规则从被注入的进程中读取它；它不保存任何凭据。随附的示例位于 `module/COPG-VD.json.example`，每天从最新的 Google 出厂镜像刷新。

智能体必须遵守的规则：

- **字符串只使用双引号**，就像在 JSON 中一样。
- **每个字段都是可选的。** 未提供的字段会被跳过，并保留 ROM 自己的值。
- 驱动模块的顶层键是 `scope_mode`、`scope_whitelist`、`scope_blacklist`、`motor_drm`、`drm_targets`、`global_fields`、`process_overrides`、`COPG-VD` 对象（Build 字段）、一个 `COPG-VD-Delete` 列表和一个 `COPG-VD-Settings` 对象（`resetprop`、`autoupdate`、`spoof_version`）。[配置参考](CONFIGURATION.md)对每一项都有记录。
- `"spoof_version": "force"` 在来自磁盘上的文件时会被拒绝，并在读取时被降级，因此恢复旧备份无法悄悄地重新启用它。请通过设置来设定版本策略，而不是手写 `force`。
- 编辑文件后，运行 **`analyze`**（见下文）：无法解析的文件会使模块**什么也不**伪装，而且只有 logcat 会说明这一点。

更改后的配置会在下一次进程启动时到达应用。通过 `resetprop` 投送的属性可以在不重启的情况下重新应用（`service.sh --props-only`），但 `android.os.Build.*` 字段是在 zygote 启动时由 Zygisk 库写入的，因此要让它们到达应用**需要重启**。

## shell 契约

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

脚本会打印人类可读的行；机器可读的行以 `status:` 开头。它的退出码在成功时为 `0`，失败时为非零。

| 动词 | 它做什么 | 典型输出 |
|---|---|---|
| `check` | 将已安装的配置文件与最新的 upstream build 进行比较，不写入任何内容。 | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | 获取最新的配置文件并将其合并到配置中（仅 build 字段；你的其他键会被保留）。 | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | 核对当前状态的配置（解析、版本与 ROM 的对比、fingerprint 一致性、未知键、日期、props）。打印一份报告；退出码反映 red/warn 发现。 | 一份文本报告 |
| `fetch-index` | 下载并验证已签名的设备索引并打印它（`index.json`）。 | 索引 JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | 下载某个设备的 `build.prop`（路径来自索引，例如 `pixel-9a/latest.prop`）并将其 build 字段写入配置。 | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | 将状态/配置从旧的扁平布局迁移到 `/data/adb/COPG-VD/`。 | - |
| `migrate` | 在模块版本之间进行一次性配置迁移。 | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | 每次启动一次的自动更新；用于 `service.sh`，而非交互式使用。 | 写入 `update.status` |

每次下载在使用前都会经过验证（设备上唯一的下载器是 busybox `wget`，它无法验证 TLS），并且配置文件更新程序绝不会倒退：比已安装版本更旧的 upstream build 会被拒绝。订阅源索引和每个 `.prop` 都带有一个分离的 ed25519 签名，在读取内容之前会先验证它。

## 典型的智能体流程

- **保持配置文件最新：** `check`；如果 `status: update-available`，则 `apply`；然后重启，让新的 `Build.*` 到达应用。
- **切换到另一个 Pixel 配置文件：** `fetch-index`，从索引中选择一个设备路径，`fetch <path>`，运行 `analyze` 以确认配置一致，然后重启。
- **更改范围或某个引擎：** 在配置文件中编辑 `scope_mode`（或某个引擎开关），运行 `analyze`，然后对通过属性投送的更改运行 `service.sh --props-only`，或为 Build 字段重启。

## 安全护栏

- 更改配置或应用配置文件会改变每个目标应用所看到的内容；在写入之前确认意图，就像 WebUI 所做的那样。
- 绝不要放松真正的一致性防护：在任何策略下 SDK 都被限制在真实的 framework，制造商与配置文件的其余部分保持同步，并且用于其他设备的配置文件会被拒绝。这些都是有意为之，绝不能被绕过。
- 配置是受支持的面。不要 scrape 或自动化 WebUI 本身。

<!-- doc-footer -->

---

> _本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_
