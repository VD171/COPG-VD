## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD - это модуль, предназначенный для глобальной подмены устройства.  
Это значит, что перехвачены будут даже системные приложения и всё устройство целиком.  
  
## Как использовать?
При использовании этого модуля с подменой рабочего FingerPrint применять PlayIntegrityFix или GooglePhotosUnlimited не нужно.  
### Пример файла конфигурации JSON  
`/data/adb/COPG-VD.json`
* Все поля НЕОБЯЗАТЕЛЬНЫ. Если какое-то поле не указано, оно будет пропущено.  
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
Обязательно используйте строки только в двойных кавычках.  
Блок выше и `module/COPG-VD.json.example` ежедневно обновляются workflow [Update COPG-VD.json](.github/workflows/update-json.yml), прямо из новейшего заводского образа Google.  
### Поддержание fingerprint в актуальном состоянии  
`fingerprint-update.sh` загружает этот файл и обновляет вашу конфигурацию - через WebUI (**Check Update** / **Update Now**) или самостоятельно **один раз за загрузку** (**Auto-update JSON on boot**, включено по умолчанию).  
* И `/data/adb/COPG-VD.json`, и `/data/adb/modules/COPG-VD/COPG-VD.json` обновляются, когда оба существуют, а предыдущее содержимое сохраняется как `.bak`.  
* Перезаписываются только поля сборки (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Всё остальное, что вы настроили, сохраняется: лишние ключи, `BOOTLOADER`/`BOARD`/`HARDWARE`, другие объекты, порядок ключей и форматирование.  
* Он никогда не откатывается назад: сборка upstream более старая, чем установленная, отклоняется. Это
  обычное дело (репозиторий может отставать от конфигурации, которую вы обновили вручную), и это также защита, которая
  важнее всего на Android, где единственный доступный загрузчик - это busybox `wget`, который не умеет
  проверять сертификаты TLS - по той же причине каждое значение проверяется перед использованием.  
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
### Настройки в конфигурации  
`COPG-VD.json` может нести объект `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - чтобы ваш выбор путешествовал вместе с резервной копией и мог быть отредактирован вручную. WebUI записывает как его, так и файлы-флаги, которые читают скрипты загрузки. `"spoof_version": "force"` отклоняется из файла и понижается: восстановление старой резервной копии не должно снова взводить его за вашей спиной.  
### WebUI  
Использовать WebUI не нужно, если вы редактируете файл конфигурации JSON напрямую.  
Если вы пользователь Magisk, используйте KsuWebUI от KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Отключите использование resetprop и включите только подмену Build info.  
#### Use ro.product.manufacturer:  
Отключите, если вам важна детекция "Found device spoofing" в приложении-детекторе root Disclosure.  

## Контакты

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
