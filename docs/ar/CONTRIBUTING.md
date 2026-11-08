> **Languages:** [English](../../CONTRIBUTING.md) · العربية · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# المساهمة في COPG-VD

شكراً لمساعدتك! يُقصد بـ COPG-VD أن تكون المساهمة فيه سهلة. يخبرك هذا الدليل
بأين توجد الأشياء وبالقواعد القليلة التي نتّبعها.

## المشروع في لمحة

COPG-VD هو **منتحِل جهاز بتقنية Zygisk**: مكتبة أصلية صغيرة تُحقن في عمليات
التطبيقات لإعادة كتابة بصمة الجهاز (fingerprint) والـ build، بالإضافة إلى WebUI بلغة JavaScript خام
(vanilla-JS) للتحكم فيه. وهو fork من COPG (من AlirezaParsi)، تتم صيانته بواسطة VD171 تحت
رخصة Apache-2.0. راجع [ARCHITECTURE.md](ARCHITECTURE.md) و[FILE-STRUCTURE.md](FILE-STRUCTURE.md).

افتراضياً يحصر الانتحال في مكدس Google Play عبر Zygisk، لذا فهو بديل
أخف وأكثر متانة لـ PlayIntegrityFix.

## المساهمون من الذكاء الاصطناعي مرحّب بهم

مساعدو ووكلاء الذكاء الاصطناعي مساهمون من الدرجة الأولى هنا، لا أمراً ثانوياً.

- بُني المشروع ليكون قابلاً للقراءة: الإعداد ملف JSON واحد
  (`/data/adb/COPG-VD.json`، موثَّق في [CONFIGURATION.md](CONFIGURATION.md))،
  والمحركات صغيرة ومكتفية ذاتياً، والتخطيط موجود في [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- تُراجع الرقع (patches) المساعَدة بالذكاء الاصطناعي وتُقبل بالشروط نفسها كأي رقعة أخرى - حسب
  الصحة والوضوح والقواعد أدناه، لا حسب من (أو ما) كتبها.
- المعيار نفسه للجميع: لا تُضعَف ميزة حقيقية أبداً، ويبقى الانتحال متسقاً،
  ولا يصل أي شيء سرّي أو خاص بالجهاز إلى المستودع (راجع [.gitignore](../../.gitignore)).

## إعداد بيئة التطوير

- تحتاج إلى جهاز مُروَّت (rooted) أو محاكٍ مع Zygisk (KernelSU أو APatch أو Magisk) للاختبار.
- ابنِ المكتبة الأصلية لكل ABI باستخدام NDK (r29) وCMake - راجع خطوة `Build zygisk
  libraries` في [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) لمعرفة
  الأمر الدقيق. يبني الـ CI جميع الـ ABIs الثلاثة نيابةً عنك.
- ابنِ ملف zip قابلاً للتفليش: انسخ `libspoof.so` المبني إلى `module/zygisk/<abi>.so`، ثم
  `cd module && zip -r9 ../COPG-VD-dev.zip .` ثم فلِّشه.
- الـ WebUI هو `module/webroot/` (افتحه من مدير الـ root). منطق الانتحال هو
  `zygisk/spoof_module.cpp`؛ وأداة جلب ملف التعريف هي `module/fingerprint-update.sh`.

## القواعد

- **يبدأ كل ملف مصدري للوحدة** (`.cpp`، `.sh`، `.js`، `.css`، `.html`) بترويسة
  بانر المشروع (انسخها من أي ملف موجود). تستخدم الأدوات تحت `.github/` تعليقاً قصيراً
  بدلاً من ذلك.
- **الكود والتعليقات بالإنجليزية.** أبقِ التعليقات في حدها الأدنى وفقط حيث تلزم.
- **لا em-dash ولا en-dash**؛ استخدم دائماً شرطة عادية `-`.
- الـ WebUI بـ **vanilla JS** (ملف `scripts.js` واحد)؛ بلا أطر عمل.
- **لا تُضعِف أبداً** ميزة حقيقية: أبقِ الانتحال متسقاً، ولا تجعل الخطّافات
  تعطّل تطبيقاً هي مرتبطة به (هي مُتحقَّق فيها من القيمة null عن قصد).

## التدويل (i18n)

- توجد سلاسل الواجهة في `module/webroot/lang/`. الإنجليزية هي الاحتياطي المرجعي
  (`en.js` + `en.json`)؛ واللغات الـ 20 الأخرى هي `<code>.json`.
- لإضافة سلسلة أو تغييرها: حرّر `en.js` **و** `en.json`، ثم حدّث كل
  `<code>.json`. لمس تسمية مرئية يعني تحديث **جميع** ملفات اللغات و
  **جميع** ملفات `README.<code>.md`.
- الترجمات هي JSON خام - مساهمة أولى رائعة.

## الـ Commits و الـ PRs

- أبقِ الـ PRs مركّزة. صِف ماذا ولماذا.
- وقّع على commitاتك (DCO): `git commit -s` (يضيف `Signed-off-by:`).
- يجب أن يبقى الـ CI أخضر. كن لطيفاً في المراجعات - راجع [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## مهام أولى جيدة

ابحث عن الوسمين `good first issue` و`help wanted`. الترجمات والوثائق وملفات تعريف Pixel
الجديدة كلها نقاط انطلاق رائعة.

*تم إنشاء هذه الوثائق باستخدام Claude (Anthropic) وتتم صيانتها بواسطة VD171. التصحيحات والتحسينات مرحّب بها - راجع [CONTRIBUTING.md](CONTRIBUTING.md).*
