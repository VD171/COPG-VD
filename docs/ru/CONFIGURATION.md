> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · Русский · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Справочник по конфигурации

Весь модуль управляется одним файлом: `/data/adb/COPG-VD.json`. WebUI записывает его за
вас, но вы можете редактировать его вручную. Поставляемый пример находится в `module/COPG-VD.json.example`.

Правила:

- **Строки используют только двойные кавычки**, как в JSON.
- **Каждое поле необязательно.** Поле, которое не указано, пропускается, и сохраняется собственное
  значение ROM.
- Запускайте **Analyze** после ручного редактирования: файл, который не парсится, заставляет модуль подменять
  **ничего**, и только logcat об этом скажет.

## Ключи верхнего уровня

| Ключ | Тип | Значение |
|---|---|---|
| `scope_mode` | string | `playstore` (по умолчанию), `global`, `whitelist` или `blacklist`. Смотрите [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Пакеты, которые получают подмену, когда `scope_mode` равен `whitelist`. |
| `scope_blacklist` | array | Пакеты, исключённые, когда `scope_mode` равен `blacklist`. |
| `COPG-VD` | object | Профиль: поля Build для предоставления (смотрите ниже). |
| `COPG-VD-Delete` | array | Имена полей для удаления вместо установки (поле Build становится null; свойство удаляется через `resetprop --delete`). |
| `COPG-VD-Settings` | object | Настройки модуля, которые путешествуют вместе с профилем (смотрите ниже). |
| `motor_jni` | bool | Движок полей Build (переписывает `android.os.Build.*`). По умолчанию `true`. |
| `motor_prop_hook` | bool | Движок свойств для каждого процесса (clean-room переотображение свойств). По умолчанию `true`. |
| `motor_drm` | bool | Движок DRM / Widevine. По умолчанию `false`. |
| `drm_targets` | array | Приложения, которые получают подмену DRM независимо от `scope_mode`. Пусто = следовать за областью действия. |
| `global_fields` | array | Поля Build, применяемые на уровне всего устройства даже в режиме с областью действия, только для полей, безопасных с точки зрения согласованности. |
| `process_overrides` | object | Переопределения полей для каждого процесса: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Дополнительная детализация logcat для отладки. По умолчанию `false`. |

## Объект профиля `COPG-VD`

Каждая запись - это поле устройства, предоставляемое целевым процессам. Наиболее распространённые:

| Группа | Поля |
|---|---|
| Идентичность | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Аттестация | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Версия (особая) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Варианты `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) позволяют пути
аттестации сообщать значение, отличное от обычного, чтобы keystore оставался
согласованным.

> **Группа версии особая.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` и `CODENAME`
> описывают вашу ROM, а не подменяемое устройство. Их повышение уводит телефон в softloop. Их нет
> в поставляемом профиле, и они применяются только тогда, когда это разрешает `COPG-VD-Settings.spoof_version` -
> смотрите [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Состояния полей

| Состояние | Как | Результат |
|---|---|---|
| Установить | `"KEY": "value"` | Записывает значение. |
| Пусто | `"KEY": ""` | Записывает пустое значение. |
| Удалить | имя в `"COPG-VD-Delete": [ ... ]` | Удаляет поле. |
| Пропустить | оставьте ключ вне конфигурации | Сохраняет собственное значение ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` или `L3`) - это уровень Widevine, сообщаемый, когда `motor_drm` включён.

## `COPG-VD-Settings`

Настройки, которые путешествуют вместе с профилем, так что резервная копия несёт ваши выборы.

| Ключ | Тип / значения | Значение |
|---|---|---|
| `resetprop` | bool | Запускается ли движок resetprop на уровне всего устройства. |
| `autoupdate` | bool | Запускается ли `fingerprint-update.sh` один раз за загрузку. По умолчанию включено. |
| `spoof_manufacturer` | bool | Подменяется ли также поле производителя. |
| `spoof_version` | `never` / `rom` / `force` | Как применяется группа версии Android. `never` - значение по умолчанию; `force` отклоняется при восстановлении резервной копии. |

## `global_fields`

Поля Build в этом списке применяются на уровне всего устройства даже в режиме с областью действия, чтобы сохранить значение
согласованным везде. Используйте это только для полей, безопасных с точки зрения согласованности - обычно это security patch.
**Никогда** не помещайте сюда идентичность или группу версии Android.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Пример

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

*Эта документация была сгенерирована с Claude (Anthropic) и поддерживается VD171. Исправления и улучшения приветствуются - смотрите [../CONTRIBUTING.md](CONTRIBUTING.md).*
