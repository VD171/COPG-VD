## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD - это спуфер устройства: он переписывает fingerprint и build устройства, чтобы приложения видели выбранное вами устройство вместо настоящего.  
Он работает на Zygisk (KernelSU, APatch или Magisk) и по умолчанию ограничивает спуф стеком Google Play - поэтому это более лёгкая и надёжная альтернатива PlayIntegrityFix.  

## Скриншоты

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Как использовать?
Установите модуль, перезагрузитесь, и поставляемый профиль (Pixel) подменяется для целевых приложений. С рабочим fingerprint вам не нужны PlayIntegrityFix или GooglePhotosUnlimited.  
Всё настраивается в `/data/adb/COPG-VD.json` или из WebUI. Все поля НЕОБЯЗАТЕЛЬНЫ - поле, которое не указано, пропускается.  

### Область - кто видит спуф
`scope_mode` решает, какие процессы получают подменённую идентичность. В режиме с ограниченной областью идентичность доставляется по каждому процессу через Zygisk и не утекает в остальную систему через глобальные свойства.  
* **Google Play** (`playstore`, по умолчанию) - только стек Play (Google Play services, его процесс unstable и Play Store).  
* **Global** - всё устройство; её видит каждый процесс.  
* **Whitelist** - только приложения в `scope_whitelist`.  
* **Blacklist** - все приложения, кроме тех, что в `scope_blacklist`.  

### Движки - как доставляется спуф
Каждый из них независим и может быть отключён:  
* **Build fields (JNI)** - переписывает `android.os.Build.*` в целевых процессах.  
* **Property hook** - предоставляет подменённые системные свойства целевым процессам (чистое попроцессное переотображение области свойств, без хука функций).  
* **resetprop** - переписывает системные свойства, управляемые по группам: идентичность, версия, состояние загрузки, SELinux, adb/usb, анти-эмулятор и проход очистки. В режиме с ограниченной областью группы идентичности и версии остаются вне общесистемного resetprop (Zygisk доставляет их по каждому процессу); группы загрузки/блокировки/SELinux остаются глобальными.  
* **DRM / Widevine** (выключено по умолчанию) - сообщает выбранный уровень безопасности Widevine, L1 или L3, приложениям, которые его читают. По умолчанию следует области выше; задайте `drm_targets` (список приложений), чтобы применять подмену DRM **только** к этим приложениям, независимо от `scope_mode` - модуль остаётся загруженным в перечисленном приложении только ради DRM-хука, даже когда это приложение находится вне основной области. Пусто или отсутствует означает следовать области. (Требуется режим с областью, не Global.)  

### Поля - задать, пустое, удалить или пропустить
Внутри объекта `COPG-VD` каждое поле Build имеет четыре состояния:  
* **Задать** - `"KEY": "value"` записывает значение.  
* **Пустое** - `"KEY": ""` записывает пустое значение.  
* **Удалить** - укажите ключ в `"COPG-VD-Delete": [ ... ]` верхнего уровня, чтобы удалить его (поле Build становится null, свойство удаляется через `resetprop --delete`).  
* **Пропустить** - полностью опустите ключ; сохраняется собственное значение ROM.  

Список `"global_fields": [ ... ]` применяет указанные поля Build ко всему устройству даже в режиме с ограниченной областью, чтобы сохранить значение одинаковым везде - только для полей, безопасных с точки зрения согласованности (например, security patch), никогда для идентичности и никогда для группы версии Android.  

### Пример файла конфигурации JSON
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.261016.008-factory-28d56d15.zip",
  "scope_mode": "playstore",
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": [],
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.261016.008",
    "ID": "ZP11.261016.008",
    "HOST": "e4df75f83a59",
    "INCREMENTAL": "16754936",
    "TIMESTAMP": "1793211232",
    "PREVIEW_SDK": "20261104",
    "USER": "android-build",
    "SDK_FINGERPRINT": "ee82a872870173d77e68050e21a2bcbf",
    "UUID": "FjWvtSORkI0sEwekaPz2s30gqV5vWP_EZHFtBiXzboc",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  }
}
```
Обязательно используйте строки только в двойных кавычках.  
Блок выше и `module/COPG-VD.json.example` ежедневно обновляются workflow [Update COPG-VD.json](.github/workflows/update-json.yml), прямо из новейшего заводского образа Google.  

### Поддержание fingerprint в актуальном состоянии
`fingerprint-update.sh` загружает этот файл и обновляет вашу конфигурацию, через WebUI (**Check Update** / **Update Now**) или самостоятельно **один раз за загрузку** (**Auto-update JSON on boot**, включено по умолчанию).  
* И `/data/adb/COPG-VD.json`, и `/data/adb/modules/COPG-VD/COPG-VD.json` обновляются, когда оба существуют, а предыдущее содержимое сохраняется как `.bak`.  
* Переписываются только поля сборки (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Всё остальное, что вы настроили, сохраняется: лишние ключи, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, другие объекты, порядок ключей и форматирование.  
* Он никогда не откатывается назад: сборка upstream более старая, чем установленная, отклоняется. Это обычное дело (репозиторий может отставать от конфигурации, которую вы обновили вручную), и это также защита, которая важнее всего на Android, где единственный доступный загрузчик - это busybox `wget`, который не умеет проверять сертификаты TLS - по той же причине каждое значение проверяется перед использованием.  
* Если ваш профиль подменяет **другое устройство** (другие `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), ничего не применяется - fingerprint Pixel на другом профиле хуже, чем старый fingerprint.  
* При загрузке он работает в фоне и продолжает повторять попытки около 10 минут, потому что wifi обычно ещё не поднят к моменту завершения загрузки. Он никогда не задерживает загрузку.  
* `resetprop` повторно применяется сразу после обновления, но `android.os.Build` записывается модулем zygisk при запуске zygote: **перезагрузите** устройство, чтобы новые значения дошли до приложений.  
* Лог в `/data/adb/COPG-VD.update.log`.  

### Версия Android - и почему она не подменяется
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` и `CODENAME` описывают **вашу ROM**, а не подменяемое устройство. Если сказать приложениям, что SDK новее, чем на самом деле framework, они начнут вызывать API, которых не существует: приложения Google падают, телефон перезагружается, и всё начинается заново. Сама загрузка завершается, поэтому это **softloop**, и в логах загрузки ничего не появляется.  
* Их нет в поставляемой конфигурации, и обновлятор их никогда не записывает.  
* **Spoof Android version** в WebUI решает, применяются ли они вообще:  
  * **Never** (по умолчанию) - используется собственная версия ROM.  
  * **Up to this ROM** - только то, что её не превышает, что на практике означает понижение SDK.  
  * **Force** - ровно то, что указано в конфигурации. Именно это вызывает softloop.  
* Реальная версия читается из `/system/build.prop`, никогда из `getprop` - ведь именно его этот модуль и фальсифицирует.  

### Analyze
**Analyze** в WebUI (или `fingerprint-update.sh analyze`) проверяет конфигурацию в её текущем виде: версию относительно ROM, разбирается ли файл вообще (сломанный заставляет модуль не подменять **ничего**, и сообщит об этом только logcat), согласуется ли fingerprint с окружающими полями, ключи, которые модуль не читает, даты, и несут ли props уже то, что запрашивает конфигурация.  

### WebUI
WebUI необязателен - всё можно редактировать прямо в JSON-конфигурации - но это простой способ управлять модулем. У него пять вкладок: **About**, **Device** (все поля, задаются по состоянию, сгруппированы по категориям), **Spoofing** (область и движки), **System** (группы resetprop) и **Tools** (Analyze, Check Update, Update Now, Backup/Restore и авто-обновление при загрузке). Он не делает никаких сетевых запросов; всё необходимое поставляется внутри модуля.  
Если вы пользователь Magisk, используйте KsuWebUI от KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Настройки в конфигурации
`COPG-VD.json` несёт свои настройки рядом с профилем, поэтому ваш выбор путешествует вместе с резервной копией и может быть отредактирован вручную: `scope_mode`, переключатели движков, группы resetprop, `global_fields` и объект `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). WebUI записывает как конфигурацию, так и файлы-флаги, которые читают скрипты загрузки. `"spoof_version": "force"` отклоняется из файла и понижается: восстановление старой резервной копии не должно снова взводить его за вашей спиной.  

## Контакты

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
* **GitHub:** @VD171 https://github.com/VD171

<!-- vd-docs -->
## Документация

[Руководство пользователя](docs/ru/USER-GUIDE.md) · [Справочник по конфигурации](docs/ru/CONFIGURATION.md) · [Архитектура](docs/ru/ARCHITECTURE.md) · [Структура файлов](docs/ru/FILE-STRUCTURE.md) · [Wiki](https://github.com/VD171/COPG-VD/wiki/ru-Home)

<!-- vd-see-also -->

## Смотрите также

- **[VD Infos](https://github.com/VD171/VD-Infos)** - Отладчик методов
- **[VD Google](https://github.com/VD171/VD-Google)** - Ваши сервисы Google, прочитанные на устройстве
- **[VD Backup](https://github.com/VD171/VD-Backup)** - Резервное копирование и восстановление приложений и данных

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork of @T3SL4).

---

**Теги:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
