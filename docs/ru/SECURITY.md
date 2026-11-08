> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · Русский · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Политика безопасности

COPG-VD работает от root и внедряется в процессы приложений через Zygisk. Мы относимся к безопасности
серьёзно.

## Сообщение об уязвимости

- **Сайт:** https://vd171.ru
- **Сайт:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Тема на XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Приложите ясное описание и, если возможно, шаги для воспроизведения. Мы ответим так скоро,
как сможем, и упомянем вас, если вы того пожелаете.

## Замечания об области действия

- Конфигурация находится в `/data/adb/COPG-VD.json`, читаемая только root. Модуль
  читает её из внедрённого процесса через выделенное правило SELinux, которое он поставляет сам; он
  не хранит никаких учётных данных или паролей.
- Хуки подмены присоединяются к работающим приложениям и проверяются на null, так что некорректный профиль
  деградирует плавно, а не обрушивает приложение.
- Нет **ни телеметрии, ни сети**, кроме опциональной загрузки профиля, которая
  скачивает публичный профиль Pixel по HTTPS с
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  с помощью собственного встроенного загрузчика модуля, а не `curl`/`wget` из `PATH`.
- Каждый предкомпилированный бинарник и библиотека прослеживаются до закреплённого публичного upstream и собираются
  в CI из исходного кода, который вы можете проверить.

*Эта документация была сгенерирована с Claude (Anthropic) и поддерживается VD171. Исправления и улучшения приветствуются - смотрите [CONTRIBUTING.md](CONTRIBUTING.md).*
