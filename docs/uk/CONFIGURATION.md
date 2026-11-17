> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · Українська · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Довідник з конфігурації

Увесь модуль керується одним файлом: `/data/adb/COPG-VD/COPG-VD.json`. WebUI записує його за
вас, але ви можете редагувати його вручну. Постачений приклад лежить у `module/COPG-VD.json.example`.
Це єдине джерело істини; копія в каталозі модуля: лише доступне тільки для читання значення за замовчуванням.
Конфігурація, що залишилася від старішої версії у `/data/adb/COPG-VD.json`, автоматично переноситься до цього каталогу.
Власні журнал і стан модуля (`update.log`, `update.state`) живуть тут само.

Правила:

- **Рядки використовують лише подвійні лапки**, як у JSON.
- **Кожне поле необов'язкове.** Поле, яке не надано, пропускається, і зберігається власне
  значення ROM.
- Запускайте **Аналіз** після ручного редагування: файл, що не парситься, змушує модуль не підміняти
  **нічого**, і лише logcat про це скаже.

## Ключі верхнього рівня

| Ключ | Тип | Значення |
|---|---|---|
| `scope_mode` | string | `playstore` (за замовчуванням), `global`, `whitelist` або `blacklist`. Див. [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Пакети, що отримують підміну, коли `scope_mode` це `whitelist`. |
| `scope_blacklist` | array | Пакети, виключені, коли `scope_mode` це `blacklist`. |
| `COPG-VD` | object | Профіль: поля Build для подання (див. нижче). |
| `COPG-VD-Delete` | array | Назви полів для видалення замість встановлення (поле Build стає null; властивість видаляється через `resetprop --delete`). |
| `COPG-VD-Settings` | object | Налаштування модуля, що подорожують разом з профілем (див. нижче). |
| `motor_jni` | bool | Рушій полів Build (переписує `android.os.Build.*`). За замовчуванням `true`. |
| `motor_prop_hook` | bool | Попроцесний рушій властивостей (чистий ремап властивостей). За замовчуванням `true`. |
| `motor_drm` | bool | Рушій DRM / Widevine. За замовчуванням `false`. |
| `drm_targets` | array | Застосунки, що отримують підміну DRM незалежно від `scope_mode`. Порожньо = слідувати області. |
| `global_fields` | array | Поля Build, застосовані для всього пристрою навіть у режимі з областю, лише для полів, безпечних для узгодженості. |
| `process_overrides` | object | Попроцесні перевизначення полів: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Додаткова деталізація logcat для налагодження. За замовчуванням `false`. |

## Об'єкт профілю `COPG-VD`

Кожен запис: поле пристрою, подане цільовим процесам. Поширені з них:

| Група | Поля |
|---|---|
| Ідентичність | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Атестація | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Версія (особлива) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Варіанти `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) дозволяють шляху
атестації повідомляти значення, відмінне від звичайного, щоб keystore залишався
узгодженим.

> **Група версії особлива.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` і `CODENAME`
> описують вашу ROM, а не підмінений пристрій. Їх підвищення softloop'ить телефон. Їх немає
> у постаченому профілі, і вони застосовуються лише коли це дозволяє `COPG-VD-Settings.spoof_version` -
> див. [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Стани полів

| Стан | Як | Результат |
|---|---|---|
| Set | `"KEY": "value"` | Записує значення. |
| Empty | `"KEY": ""` | Записує порожнє значення. |
| Delete | ім'я у `"COPG-VD-Delete": [ ... ]` | Видаляє поле. |
| Skip | залиште ключ поза | Зберігає власне значення ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` або `L3`): рівень Widevine, що повідомляється, коли `motor_drm` увімкнено.

## `COPG-VD-Settings`

Налаштування, що подорожують разом з профілем, тож резервна копія несе ваші вибори.

| Ключ | Тип / значення | Значення |
|---|---|---|
| `resetprop` | bool | Чи запускається загальнопристроєвий рушій resetprop. |
| `autoupdate` | bool | Чи запускається `fingerprint-update.sh` раз на завантаження. За замовчуванням увімкнено. |
| `spoof_version` | `never` / `rom` / `force` | Як застосовується група версії Android. `never` за замовчуванням; `force` відхиляється під час відновлення резервної копії. |

## `global_fields`

Поля Build у цьому списку застосовуються для всього пристрою навіть у режимі з областю, щоб тримати значення
узгодженим усюди. Використовуйте його лише для полів, безпечних для узгодженості: патч безпеки
звичайний такий. **Ніколи** не ставте тут ідентичність чи групу версії Android.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Приклад

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

<!-- doc-footer -->

---

> _Ця документація створена за допомогою Claude (Anthropic) і підтримується VD171. Виправлення та покращення вітаються; див. [CONTRIBUTING.md](CONTRIBUTING.md)._
