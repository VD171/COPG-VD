> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · فارسی · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# مشارکت در COPG-VD

ممنون که کمک می‌کنید! COPG-VD طوری طراحی شده که مشارکت در آن آسان باشد. این راهنما به شما
می‌گوید چیزها کجا قرار دارند و چند قراردادی که دنبال می‌کنیم.

## پروژه در یک نگاه

COPG-VD یک **spoofer دستگاه مبتنی بر Zygisk** است: یک کتابخانه native کوچک که به درون
پردازه‌های اپ تزریق می‌شود تا fingerprint دستگاه و build را بازنویسی کند، به علاوه یک WebUI
با JS خالص برای هدایت آن. این یک fork از COPG (نوشته AlirezaParsi) است، که توسط VD171 تحت
مجوز Apache-2.0 نگهداری می‌شود. [ARCHITECTURE.md](ARCHITECTURE.md) و
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) را ببینید.

به صورت پیش‌فرض spoof را از طریق Zygisk به استک Google Play محدود می‌کند، پس یک جایگزین
سبک‌تر و مقاوم‌تر برای PlayIntegrityFix است.

## مشارکت‌کنندگان AI خوش‌آمدند

دستیارها و عامل‌های AI اینجا مشارکت‌کنندگان درجه‌یک هستند، نه یک فکر بعدی.

- پروژه طوری ساخته شده که خوانا باشد: پیکربندی یک فایل JSON واحد است
  (`/data/adb/COPG-VD.json`، مستندشده در [CONFIGURATION.md](CONFIGURATION.md))،
  موتورها کوچک و خودبسنده‌اند، و چیدمان در [FILE-STRUCTURE.md](FILE-STRUCTURE.md) است.
- وصله‌های کمک‌شده با AI با همان شرایط هر وصله دیگری بازبینی و پذیرفته می‌شوند - بر اساس
  درستی، شفافیت و قراردادهای زیر، نه بر اساس اینکه چه کسی (یا چه چیزی) آن‌ها را نوشته.
- معیار یکسان برای همه: یک قابلیت واقعی هرگز تضعیف نمی‌شود، spoof همخوان می‌ماند، و هیچ چیز
  محرمانه یا مخصوص دستگاه در مخزن فرود نمی‌آید (ببینید [.gitignore](../../.gitignore)).

## راه‌اندازی توسعه

- برای تست به یک دستگاه یا امولاتور روت‌شده با Zygisk (KernelSU، APatch یا Magisk) نیاز دارید.
- کتابخانه native را به ازای هر ABI با NDK (r29) و CMake بسازید - برای فرمان دقیق، گام
  `Build zygisk libraries` در [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml)
  را ببینید. CI هر سه ABI را برای شما می‌سازد.
- یک zip قابل فلش بسازید: `libspoof.so` ساخته‌شده را به `module/zygisk/<abi>.so` کپی کنید،
  سپس `cd module && zip -r9 ../COPG-VD-dev.zip .` و آن را فلش کنید.
- WebUI در `module/webroot/` است (آن را از مدیر روت باز کنید). منطق spoofing در
  `zygisk/spoof_module.cpp` است؛ دریافت‌کننده پروفایل `module/fingerprint-update.sh` است.

## قراردادها

- **هر فایل منبع ماژول** (`.cpp`، `.sh`، `.js`، `.css`، `.html`) با سربرگ banner پروژه
  شروع می‌شود (آن را از هر فایل موجود کپی کنید). ابزارهای زیر `.github/` به جای آن از یک
  کامنت کوتاه استفاده می‌کنند.
- **کد و کامنت‌ها به انگلیسی.** کامنت‌ها را حداقلی و فقط جایی که لازم است نگه دارید.
- **بدون em-dash یا en-dash**؛ همیشه از یک hyphen ساده `-` استفاده کنید.
- WebUI با **JS خالص** است (یک `scripts.js`)؛ بدون framework.
- **هرگز** یک قابلیت واقعی را **تضعیف نکنید**: spoof را همخوان نگه دارید، و hook ها را طوری
  نکنید که اپی را که به آن متصل‌اند کرش کنند (آن‌ها عمداً null-check شده‌اند).

## بین‌المللی‌سازی (i18n)

- رشته‌های UI در `module/webroot/lang/` قرار دارند. انگلیسی fallback متعارف است
  (`en.js` + `en.json`)؛ ۲۰ زبان دیگر `<code>.json` هستند.
- برای افزودن یا تغییر یک رشته: `en.js` **و** `en.json` را ویرایش کنید، سپس هر `<code>.json`
  را به‌روز کنید. دست زدن به یک برچسب قابل‌مشاهده یعنی به‌روزرسانی **همه** فایل‌های زبان و
  **همه** `README.<code>.md`.
- ترجمه‌ها JSON ساده‌اند - یک مشارکت اول عالی.

## Commit ها و PR ها

- PR ها را متمرکز نگه دارید. توصیف کنید چه چیزی و چرا.
- commit های خود را sign off کنید (DCO): `git commit -s` (مقدار `Signed-off-by:` را اضافه می‌کند).
- CI باید سبز بماند. در بازبینی‌ها مهربان باشید - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) را ببینید.

## issue های خوب برای شروع

به دنبال برچسب‌های `good first issue` و `help wanted` بگردید. ترجمه‌ها، مستندات، و پروفایل‌های
جدید Pixel همگی نقاط شروع عالی هستند.

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگهداری می‌شود. اصلاحات و بهبودها خوش‌آمدند - [CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
