/* Віджет VDLU - український переклад. Підключіть ПЕРЕД vdlu.js і передайте в init. Відсутні ключі беруть англійське значення за замовчуванням (часткове злиття допустиме).
 *   <script src="i18n/uk.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_UK });
 */
window.VDLU_I18N_UK = {
  ph_diff: 'Аналіз', ph_fetch: 'Завантаження', ph_apply: 'Застосування', ph_delete: 'Видалення', ph_commit: 'Перевірка',
  st_PLANNED: 'Заплановано', st_FETCHING: 'Завантаження', st_FETCHED: 'Завантажено', st_APPLYING: 'Застосування',
  st_APPLIED_LIVE: 'Застосовано (наживо)', st_PENDING_REBOOT: 'Очікує перезавантаження', st_DONE: 'Готово', st_ERROR: 'Помилка',
  processing: 'Обробка', updating: 'Оновлення', close: 'Закрити', ok: 'OK', cancel: 'Скасувати',
  bannerReboot: 'Перезавантажте, щоб активувати нову', so: '.so',
  appliedV: 'застосовано', updated: 'Оновлено', allVerified: 'усе перевірено',
  appliedLive: 'застосовано (наживо)', appliedShort: 'Застосовано', needRebootSo: 'потрібне перезавантаження для активації <code>.so</code>',
  error: 'Помилка', engineFail: 'збій рушія', retry: 'Повторити',
  cancelled: 'Скасовано', applied: 'застосовано', resumable: 'можна відновити', resume: 'Відновити',
  starting: 'Запуск…', startFail: 'Не вдалося запустити',
  cancelling: 'Скасування…', cancellingSub: 'зупинка в наступній безпечній точці',
  resuming: 'Відновлення…', resumeFail: 'Не вдалося відновити',
  noResponse: 'Немає відповіді', noResponseSub: 'рушій не запустився або завершився без журналу',
  checkBtn: 'Перевірити оновлення', updateNow: 'Оновити зараз', automation: 'Автоматизація',
  onOpen: 'Під час відкриття WebUI', onOpenSub: 'Запускає VDLU у фоні (застосовує наживо, готує <code>.so</code> до перезавантаження).',
  onReboot: 'Під час перезавантаження', onRebootSub: 'У pre-zygote застосовує все, зокрема <code>.so</code>, без зайвого перезавантаження.',
  bootRetryEvery: 'Повтор під час завантаження кожні (с)', bootRetryUpTo: 'Повтор під час завантаження до (хв)', bootRetryHint: 'Якщо пристрій завантажився без мережі, продовжувати спроби завантаження маніфесту. 0 хв = вимк.',
  source: 'Джерело', saveSource: 'Зберегти джерело', savedDot: 'Збережено.',
  netPolicy: 'Мережа', netAny: 'Wi-Fi + мобільна', netWifi: 'Лише Wi-Fi', netMobile: 'Лише мобільна',
  savedToast: 'збережено', saveFail: 'не вдалося зберегти', sourceSaved: 'джерело збережено',
  bootstrapping: 'Підготовка засобу оновлення…', bootstrapSub: 'одноразове завантаження завантажувача', bootstrapFail: 'Не вдалося підготувати засіб оновлення',
  searching: 'Пошук…', upToDate: 'Актуально', nothingNew: 'нічого нового',
  ahead: 'Новіша за канал', aheadSub: 'ваша версія новіша за опубліковане оновлення', deferred: 'Завантаження відкладено', deferredSub: 'очікування дозволеної мережі - відновиться за наступної перевірки',
  updateAvail: 'Доступне оновлення', install: 'встановити', fileOne: 'файл', fileMany: 'файлів',
  requiresReboot: 'потрібне перезавантаження', checkFail: 'Помилка перевірки', ksuUnavailable: 'API KSU недоступний',
  pendingUpdate: 'Очікуване оновлення', notNow: 'Не зараз', srcPlaceholder: 'https://…/&lt;модуль&gt;'
};
