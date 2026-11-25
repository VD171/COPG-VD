> **Languages:** [English](../AI-AGENTS.md) · العربية · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# وكلاء الذكاء الاصطناعي: سطح التحكم

يرحّب COPG-VD بالمساهمين من الذكاء الاصطناعي والوكلاء، والموديول بأكمله مبني ليُدار بلا واجهة (headless)،
دون كشط (scraping) الـ WebUI. هناك سطحان، والوكيل الذي يعمل بصلاحية root (كما تفعل الـ WebUI) يستخدم كليهما:

1. **ملف الإعداد** `/data/adb/COPG-VD/COPG-VD.json` - المصدر الوحيد للحقيقة. كل حقل من حقول الملف الشخصي وكل
   إعداد موجود هنا؛ قراءة هذا الملف والكتابة إليه هي الطريقة التي تغيّر بها ما ينتحله الموديول.
2. **نقطة دخول shell** `fingerprint-update.sh` - سكربت واحد بأفعال مستقرة للفحص والتطبيق وجلب الملفات
   الشخصية.

## ملف الإعداد

`/data/adb/COPG-VD/COPG-VD.json` كائن JSON بسيط. يقرؤه الموديول من العمليات المحقونة عبر قاعدة SELinux
مخصصة يوفّرها بنفسه؛ وهو لا يحمل أي بيانات اعتماد. يوجد مثال مرفق في `module/COPG-VD.json.example`،
يُحدَّث يومياً من أحدث صورة مصنع (factory image) من Google.

قواعد يجب على الوكيل اتباعها:

- **الـ strings بين علامات اقتباس مزدوجة فقط**، كما في JSON.
- **كل حقل اختياري.** أي حقل لا يُقدَّم يُتخطّى وتُبقى قيمة الـ ROM نفسها.
- المفاتيح ذات المستوى الأعلى التي توجّه الموديول هي `scope_mode` و`scope_whitelist` و`scope_blacklist`
  و`motor_drm` و`drm_targets` و`global_fields` و`process_overrides`، وكائن `COPG-VD` (حقول Build)، وقائمة
  `COPG-VD-Delete`، وكائن `COPG-VD-Settings` (`resetprop` و`autoupdate` و`spoof_version`). يوثّق [مرجع
  الإعداد](CONFIGURATION.md) كلاً منها.
- `"spoof_version": "force"` يُرفض عندما يأتي من الملف على القرص ويُخفَّض عند القراءة، بحيث لا يمكن لاستعادة
  نسخة احتياطية قديمة أن تعيد تفعيله بصمت. اضبط سياسة الإصدار عبر الإعدادات، لا بكتابة `force` يدوياً.
- بعد تعديل الملف، شغّل **`analyze`** (أدناه): ملف لا يُحلَّل يجعل الموديول ينتحل **لا شيء**، ولا يخبر بذلك
  سوى logcat.

يصل الإعداد المعدَّل إلى التطبيقات عند بدء العملية التالي. يمكن إعادة تطبيق الـ properties التي يسلّمها
`resetprop` دون إعادة تشغيل (`service.sh --props-only`)، لكن حقول `android.os.Build.*` تكتبها مكتبة Zygisk
عند بدء zygote، لذا **يلزم إعادة تشغيل** لكي تصل هذه إلى التطبيقات.

## عقد الـ shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

يطبع السكربت أسطراً مقروءة للبشر؛ أما المقروءة آلياً فتبدأ بـ `status:`. ورمز خروجه `0` عند النجاح وغير
صفري عند الفشل.

| الفعل | ما الذي يفعله | المخرجات النموذجية |
|---|---|---|
| `check` | يقارن الملف الشخصي المثبّت بأحدث build من upstream، ولا يكتب شيئاً. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | يجلب أحدث ملف شخصي ويدمجه في الإعداد (حقول build فقط؛ وتُحفظ مفاتيحك الأخرى). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | يدقّق الإعداد كما هو (التحليل، الإصدار مقابل الـ ROM، اتساق الـ fingerprint، المفاتيح المجهولة، التواريخ، الـ props). يطبع تقريراً؛ ويعكس رمز الخروج النتائج الحمراء/التحذيرية. | تقرير نصي |
| `fetch-index` | ينزّل فهرس الأجهزة الموقّع ويتحقق منه ويطبعه (`index.json`). | JSON الفهرس \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | ينزّل `build.prop` لجهاز واحد (المسار من الفهرس، مثل `pixel-9a/latest.prop`) ويكتب حقول build الخاصة به في الإعداد. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | يرحّل الحالة/الإعداد من التخطيط المسطّح القديم إلى `/data/adb/COPG-VD/`. | - |
| `migrate` | ترحيل إعداد لمرة واحدة بين إصدارات الموديول. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | التحديث التلقائي مرة واحدة لكل إقلاع؛ مُعدّ لـ `service.sh`، لا للاستخدام التفاعلي. | يكتب `update.status` |

يُتحقَّق من كل تنزيل قبل استخدامه (أداة التنزيل الوحيدة على الجهاز هي busybox `wget`، التي لا تستطيع التحقق
من TLS)، ومحدِّث الملفات الشخصية لا يرجع إلى الوراء أبداً: يُرفض أي build من upstream أقدم من المثبّت.
يحمل فهرس الـ feed وكل ملف `.prop` توقيع ed25519 منفصلاً يُتحقَّق منه قبل قراءة المحتوى.

## تدفقات الوكيل النموذجية

- **إبقاء الملف الشخصي محدّثاً:** `check`؛ إذا كان `status: update-available`، فـ `apply`؛ ثم أعد التشغيل
  لكي تصل `Build.*` الجديدة إلى التطبيقات.
- **التبديل إلى ملف Pixel شخصي آخر:** `fetch-index`، اختر مسار جهاز من الفهرس، `fetch <path>`، شغّل
  `analyze` للتأكد من أن الإعداد متسق، ثم أعد التشغيل.
- **تغيير النطاق أو أحد الـ engines:** عدّل `scope_mode` (أو مفتاح engine) في ملف الإعداد، شغّل `analyze`،
  ثم `service.sh --props-only` للتغييرات المُسلَّمة عبر property، أو أعد التشغيل لحقول Build.

## حواجز الأمان

- تغيير الإعداد أو تطبيق ملف شخصي يغيّر ما يراه كل تطبيق مستهدف؛ أكّد النية قبل الكتابة، كما تفعل الـ WebUI.
- لا تُرخِ أبداً أي حارس اتساق حقيقي: الـ SDK مُقيَّد بالـ framework الحقيقي تحت كل سياسة، وتبقى الشركة
  المصنّعة متناغمة مع بقية الملف الشخصي، ويُرفض ملف شخصي لجهاز مختلف. هذه متعمَّدة ويجب ألا تُتجاوز.
- الإعداد هو السطح المدعوم. لا تكشط الـ WebUI نفسها ولا تُؤتمتها.

<!-- doc-footer -->

---

> _تم إنشاء هذا التوثيق باستخدام Claude (Anthropic) ويتولى صيانته VD171. التصحيحات والتحسينات مرحّب بها؛ راجع [CONTRIBUTING.md](CONTRIBUTING.md)._
