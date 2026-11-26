/* ابزارک VDLU - ترجمهٔ فارسی. پیش از vdlu.js بارگذاری و در init پاس دهید. کلیدهای ناموجود به انگلیسی بازمی‌گردند (ادغام جزئی اشکالی ندارد).
 *   <script src="i18n/fa.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_FA });
 */
window.VDLU_I18N_FA = {
  ph_diff: 'در حال تحلیل', ph_fetch: 'در حال دانلود', ph_apply: 'در حال اعمال', ph_delete: 'در حال حذف', ph_commit: 'در حال تأیید',
  st_PLANNED: 'برنامه‌ریزی‌شده', st_FETCHING: 'در حال دانلود', st_FETCHED: 'دانلود شد', st_APPLYING: 'در حال اعمال',
  st_APPLIED_LIVE: 'اعمال شد (زنده)', st_PENDING_REBOOT: 'در انتظار راه‌اندازی مجدد', st_DONE: 'انجام شد', st_ERROR: 'خطا',
  processing: 'در حال پردازش', updating: 'در حال به‌روزرسانی', close: 'بستن', ok: 'تأیید', cancel: 'لغو',
  bannerReboot: 'برای فعال‌سازی مورد جدید دستگاه را راه‌اندازی مجدد کنید', so: '.so',
  appliedV: 'اعمال شد', updated: 'به‌روزرسانی شد', allVerified: 'همه تأیید شد',
  appliedLive: 'اعمال شد (زنده)', appliedShort: 'اعمال‌شده', needRebootSo: 'برای فعال‌سازی <code>.so</code> نیاز به راه‌اندازی مجدد است',
  error: 'خطا', engineFail: 'خطای موتور', retry: 'تلاش مجدد',
  cancelled: 'لغو شد', applied: 'اعمال شد', resumable: 'قابل ازسرگیری', resume: 'ازسرگیری',
  starting: 'در حال شروع…', startFail: 'شروع ناموفق بود',
  cancelling: 'در حال لغو…', cancellingSub: 'در نقطهٔ امن بعدی متوقف می‌شود',
  resuming: 'در حال ازسرگیری…', resumeFail: 'ازسرگیری ناموفق بود',
  noResponse: 'بدون پاسخ', noResponseSub: 'موتور شروع نشد یا بدون ژورنال پایان یافت',
  checkBtn: 'بررسی به‌روزرسانی‌ها', updateNow: 'اکنون به‌روزرسانی کن', automation: 'خودکارسازی',
  onOpen: 'هنگام باز شدن WebUI', onOpenSub: 'VDLU را در پس‌زمینه اجرا می‌کند (زنده اعمال می‌کند، <code>.so</code> را برای راه‌اندازی مجدد آماده می‌کند).',
  onReboot: 'هنگام راه‌اندازی مجدد', onRebootSub: 'در pre-zygote همه چیز را، از جمله <code>.so</code>، بدون راه‌اندازی مجدد اضافی اعمال می‌کند.',
  bootRetryEvery: 'تلاش مجدد هنگام بوت هر (ثانیه)', bootRetryUpTo: 'تلاش مجدد هنگام بوت تا (دقیقه)', bootRetryHint: 'اگر دستگاه آفلاین بوت شود، دانلود مانیفست را ادامه بده. ۰ دقیقه = خاموش.',
  source: 'منبع', saveSource: 'ذخیرهٔ منبع', savedDot: 'ذخیره شد.',
  netPolicy: 'شبکه', netAny: 'Wi-Fi + دادهٔ همراه', netWifi: 'فقط Wi-Fi', netMobile: 'فقط دادهٔ همراه',
  savedToast: 'ذخیره شد', saveFail: 'ذخیره ناموفق بود', sourceSaved: 'منبع ذخیره شد',
  bootstrapping: 'در حال آماده‌سازی به‌روزرسان…', bootstrapSub: 'دانلود یک‌بارهٔ واکشی‌کننده', bootstrapFail: 'آماده‌سازی به‌روزرسان ممکن نشد',
  searching: 'در حال جستجو…', upToDate: 'به‌روز', nothingNew: 'چیز جدیدی نیست',
  ahead: 'جدیدتر از فید', aheadSub: 'نسخهٔ شما جدیدتر از به‌روزرسانی منتشرشده است', silentUpdate: 'به‌روزرسانی بی‌صدا', silentUpdateSub: 'به‌روزرسانی‌ها را در پس‌زمینه و بدون نمایش نوار راه‌اندازی مجدد اعمال می‌کند.',
  deferred: 'دانلود به تعویق افتاد', deferredSub: 'در انتظار شبکهٔ مجاز، در بررسی بعدی ازسر گرفته می‌شود',
  updateAvail: 'به‌روزرسانی موجود است', install: 'نصب', fileOne: 'فایل', fileMany: 'فایل',
  requiresReboot: 'نیازمند راه‌اندازی مجدد', checkFail: 'بررسی ناموفق بود', ksuUnavailable: 'KSU API در دسترس نیست',
  pendingUpdate: 'به‌روزرسانی در انتظار', notNow: 'الان نه', srcPlaceholder: 'https://…/&lt;ماژول&gt;'
};
