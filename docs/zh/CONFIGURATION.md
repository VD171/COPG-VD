> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · 中文

---

# 配置参考

整个模块由一个文件驱动：`/data/adb/COPG-VD.json`。WebUI 会为你写入它，但你也可以手动编辑。
一个随附的示例位于 `module/COPG-VD.json.example`。

规则：

- **字符串只使用双引号**，就像在 JSON 中一样。
- **每个字段都是可选的。** 未提供的字段会被跳过，并保留 ROM 自己的值。
- 手动编辑后运行 **Analyze**：一个无法解析的文件会使模块**什么都不**伪装，而只有 logcat 才
  会说明。

## 顶层键

| 键 | 类型 | 含义 |
|---|---|---|
| `scope_mode` | string | `playstore`（默认）、`global`、`whitelist` 或 `blacklist`。参见 [USER-GUIDE.md](USER-GUIDE.md)。 |
| `scope_whitelist` | array | 当 `scope_mode` 为 `whitelist` 时获得伪装的软件包。 |
| `scope_blacklist` | array | 当 `scope_mode` 为 `blacklist` 时被排除的软件包。 |
| `COPG-VD` | object | 配置文件：要呈现的 Build 字段（见下文）。 |
| `COPG-VD-Delete` | array | 要移除而非设置的字段名（Build 字段变为 null；属性则用 `resetprop --delete` 移除）。 |
| `COPG-VD-Settings` | object | 随配置文件一起携带的模块设置（见下文）。 |
| `motor_jni` | bool | Build 字段引擎（重写 `android.os.Build.*`）。默认 `true`。 |
| `motor_prop_hook` | bool | 按进程属性引擎（净室属性重映射）。默认 `true`。 |
| `motor_drm` | bool | DRM / Widevine 引擎。默认 `false`。 |
| `drm_targets` | array | 无论 `scope_mode` 如何都获得 DRM 伪装的应用。空 = 遵循作用范围。 |
| `global_fields` | array | 即使在有范围限制的模式下也在设备范围内应用的 Build 字段，仅用于一致性安全的字段。 |
| `process_overrides` | object | 按进程的字段覆盖：`{ "process.name": { "FIELD": "value" } }`。 |
| `verbose_logs` | bool | 用于调试的额外 logcat 细节。默认 `false`。 |

## `COPG-VD` 配置文件对象

每一个条目都是呈现给目标进程的一个设备字段。常见的有：

| 组 | 字段 |
|---|---|
| Identity | `BRAND`、`DEVICE`、`MANUFACTURER`、`MODEL`、`PRODUCT`、`FINGERPRINT`、`BOARD`、`HARDWARE` |
| Build id | `DISPLAY`、`ID`、`INCREMENTAL`、`TIMESTAMP`、`TIME`、`HOST`、`USER`、`TYPE`、`TAGS`、`BOOTLOADER` |
| Attestation | `SECURITY_PATCH`、`FIRST_API_LEVEL`、`DEVICE_INITIAL_SDK_INT`、`UUID`、`SDK_FINGERPRINT` |
| Version（特殊） | `ANDROID_VERSION`、`RELEASE`、`SDK_INT`、`SDK`、`SDK_FULL`、`CODENAME`、`PREVIEW_SDK` |

`*_FOR_ATTESTATION` 变体（`BRAND_FOR_ATTESTATION`、`DEVICE_FOR_ATTESTATION`、
`MANUFACTURER_FOR_ATTESTATION`、`MODEL_FOR_ATTESTATION`、`PRODUCT_FOR_ATTESTATION`）让认证
（attestation）路径报告一个与普通值不同的值，从而使 keystore 保持一致。

> **version 组是特殊的。** `ANDROID_VERSION`、`SDK_INT`、`SDK_FULL` 和 `CODENAME` 描述的是你
> 的 ROM，而不是被伪装的设备。提高它们会使手机软循环。它们不在随附的配置文件中，只有在
> `COPG-VD-Settings.spoof_version` 允许时才会应用 -
> 参见 [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)。

### 字段状态

| 状态 | 做法 | 结果 |
|---|---|---|
| Set | `"KEY": "value"` | 写入该值。 |
| Empty | `"KEY": ""` | 写入一个空值。 |
| Delete | 名称在 `"COPG-VD-Delete": [ ... ]` 中 | 移除该字段。 |
| Skip | 不写入该键 | 保留 ROM 自己的值。 |

### DRM

`DRM_SECURITY_LEVEL`（`L1` 或 `L3`）是当 `motor_drm` 开启时报告的 Widevine 级别。

## `COPG-VD-Settings`

随配置文件一起携带的设置，因此备份会带上你的选择。

| 键 | 类型 / 取值 | 含义 |
|---|---|---|
| `resetprop` | bool | 设备范围的 resetprop 引擎是否运行。 |
| `autoupdate` | bool | `fingerprint-update.sh` 是否每次开机运行一次。默认开启。 |
| `spoof_manufacturer` | bool | 是否也伪装 manufacturer 字段。 |
| `spoof_version` | `never` / `rom` / `force` | Android 版本组如何应用。`never` 是默认值；在恢复备份时 `force` 会被拒绝。 |

## `global_fields`

此列表中的 Build 字段即使在有范围限制的模式下也会在设备范围内应用，以使某个值在各处保持一
致。只将它用于一致性安全的字段 - security patch 是常用的那一个。**绝不要**把 identity 或
Android 版本组放在这里。

```json
"global_fields": ["SECURITY_PATCH"]
```

## 示例

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出更正和改进 - 参见 [../CONTRIBUTING.md](CONTRIBUTING.md)。*
