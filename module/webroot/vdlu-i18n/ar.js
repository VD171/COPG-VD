/* ودجة VDLU - الترجمة العربية. حمّله قبل vdlu.js ومرّره في init. المفاتيح الناقصة تعود إلى الإنجليزية (الدمج الجزئي مقبول).
 *   <script src="i18n/ar.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_AR });
 */
window.VDLU_I18N_AR = {
  ph_diff: 'جارٍ التحليل', ph_fetch: 'جارٍ التنزيل', ph_apply: 'جارٍ التطبيق', ph_delete: 'جارٍ الإزالة', ph_commit: 'جارٍ التحقق',
  st_PLANNED: 'مُخطط', st_FETCHING: 'جارٍ التنزيل', st_FETCHED: 'تم التنزيل', st_APPLYING: 'جارٍ التطبيق',
  st_APPLIED_LIVE: 'تم التطبيق (مباشر)', st_PENDING_REBOOT: 'بانتظار إعادة التشغيل', st_DONE: 'تم', st_ERROR: 'خطأ',
  processing: 'جارٍ المعالجة', updating: 'جارٍ التحديث', close: 'إغلاق', ok: 'موافق', cancel: 'إلغاء',
  bannerReboot: 'أعد التشغيل لتفعيل الجديدة', so: '.so',
  appliedV: 'تم التطبيق', updated: 'تم التحديث', allVerified: 'تم التحقق من الكل',
  appliedLive: 'تم التطبيق (مباشر)', appliedShort: 'مُطبَّق', needRebootSo: 'يتطلب إعادة التشغيل لتفعيل <code>.so</code>',
  error: 'خطأ', engineFail: 'فشل المحرك', retry: 'إعادة المحاولة',
  cancelled: 'أُلغي', applied: 'تم التطبيق', resumable: 'قابل للاستئناف', resume: 'استئناف',
  starting: 'جارٍ البدء…', startFail: 'فشل البدء',
  cancelling: 'جارٍ الإلغاء…', cancellingSub: 'سيتوقف عند نقطة الأمان التالية',
  resuming: 'جارٍ الاستئناف…', resumeFail: 'فشل الاستئناف',
  noResponse: 'لا استجابة', noResponseSub: 'لم يبدأ المحرك أو انتهى دون سجل',
  checkBtn: 'التحقق من التحديثات', updateNow: 'تحديث الآن', automation: 'الأتمتة',
  onOpen: 'عند فتح WebUI', onOpenSub: 'يشغّل VDLU في الخلفية (يطبّق مباشرةً، ويجهّز <code>.so</code> لإعادة التشغيل).',
  onReboot: 'عند إعادة التشغيل', onRebootSub: 'في pre-zygote يطبّق كل شيء، بما في ذلك <code>.so</code>، دون إعادة تشغيل إضافية.',
  bootRetryEvery: 'إعادة المحاولة عند الإقلاع كل (ث)', bootRetryUpTo: 'إعادة المحاولة عند الإقلاع حتى (د)', bootRetryHint: 'إذا أقلع الجهاز دون اتصال، تابع محاولة تنزيل البيان. 0 دقيقة = إيقاف.',
  source: 'المصدر', saveSource: 'حفظ المصدر', savedDot: 'تم الحفظ.',
  netPolicy: 'الشبكة', netAny: 'Wi-Fi + بيانات الجوال', netWifi: 'Wi-Fi فقط', netMobile: 'بيانات الجوال فقط',
  savedToast: 'تم الحفظ', saveFail: 'فشل الحفظ', sourceSaved: 'تم حفظ المصدر',
  bootstrapping: 'جارٍ تجهيز أداة التحديث…', bootstrapSub: 'تنزيل لمرة واحدة لأداة الجلب', bootstrapFail: 'تعذّر تجهيز أداة التحديث',
  searching: 'جارٍ البحث…', upToDate: 'محدَّث', nothingNew: 'لا جديد',
  ahead: 'أحدث من الخلاصة', aheadSub: 'نسختك أحدث من التحديث المنشور', silentUpdate: 'تحديث صامت', silentUpdateSub: 'يطبّق التحديثات في الخلفية دون إظهار شريط إعادة التشغيل.',
  deferred: 'تأجّل التنزيل', deferredSub: 'بانتظار الشبكة المسموح بها، يُستأنف عند الفحص التالي',
  updateAvail: 'يتوفر تحديث', install: 'تثبيت', fileOne: 'ملف', fileMany: 'ملفات',
  requiresReboot: 'يتطلب إعادة التشغيل', checkFail: 'فشل الفحص', ksuUnavailable: 'واجهة KSU غير متاحة',
  pendingUpdate: 'تحديث معلّق', notNow: 'ليس الآن', srcPlaceholder: 'https://…/&lt;وحدة&gt;'
};
