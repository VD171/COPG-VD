> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · Українська · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Політика безпеки

COPG-VD працює від root і впроваджується в процеси застосунків через Zygisk. Ми
ставимося до безпеки серйозно.

## Повідомлення про вразливість

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Додайте чіткий опис і, якщо можливо, кроки для відтворення. Ми відповімо щойно
зможемо та згадаємо вас у подяках, якщо ви цього бажаєте.

## Зауваження щодо області дії

- Конфігурація зберігається в `/data/adb/COPG-VD.json`, доступному для читання лише
  root. Модуль читає її з впровадженого процесу через власне правило SELinux, яке він
  сам постачає; вона не містить жодних облікових даних чи паролів.
- Хуки підміни під'єднані до живих застосунків і мають перевірки на null, тож
  некоректний профіль деградує плавно, а не роняє застосунок.
- Немає жодної телеметрії та жодної мережі, окрім необов'язкового завантаження
  профілю, яке тягне публічний профіль Pixel через HTTPS з
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  за допомогою власного вбудованого завантажувача модуля, а не `curl`/`wget` з `PATH`.
- Кожен попередньо зібраний бінарник і бібліотека простежуються до зафіксованого
  публічного upstream і збираються в CI з вихідного коду, який ви можете перевірити.

<!-- doc-footer -->

---

> _Ця документація створена за допомогою Claude (Anthropic) і підтримується VD171. Виправлення та покращення вітаються; див. [CONTRIBUTING.md](CONTRIBUTING.md)._
