/* Виджет VDLU - русский перевод. Подключите ДО vdlu.js и передайте в init. Отсутствующие ключи берут английское значение по умолчанию (частичное слияние допустимо).
 *   <script src="i18n/ru.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_RU });
 */
window.VDLU_I18N_RU = {
  ph_diff: 'Анализ', ph_fetch: 'Загрузка', ph_apply: 'Применение', ph_delete: 'Удаление', ph_commit: 'Проверка',
  st_PLANNED: 'Запланировано', st_FETCHING: 'Загрузка', st_FETCHED: 'Загружено', st_APPLYING: 'Применение',
  st_APPLIED_LIVE: 'Применено (вживую)', st_PENDING_REBOOT: 'Ожидает перезагрузки', st_DONE: 'Готово', st_ERROR: 'Ошибка',
  processing: 'Обработка', updating: 'Обновление', close: 'Закрыть', ok: 'OK', cancel: 'Отмена',
  bannerReboot: 'Перезагрузите, чтобы активировать новую', so: '.so',
  appliedV: 'применено', updated: 'Обновлено', allVerified: 'всё проверено',
  appliedLive: 'применено (вживую)', appliedShort: 'Применено', needRebootSo: 'требуется перезагрузка для активации <code>.so</code>',
  error: 'Ошибка', engineFail: 'сбой движка', retry: 'Повторить',
  cancelled: 'Отменено', applied: 'применено', resumable: 'можно возобновить', resume: 'Возобновить',
  starting: 'Запуск…', startFail: 'Не удалось запустить',
  cancelling: 'Отмена…', cancellingSub: 'остановка в следующей безопасной точке',
  resuming: 'Возобновление…', resumeFail: 'Не удалось возобновить',
  noResponse: 'Нет ответа', noResponseSub: 'движок не запустился или завершился без журнала',
  checkBtn: 'Проверить обновления', updateNow: 'Обновить сейчас', automation: 'Автоматизация',
  onOpen: 'При открытии WebUI', onOpenSub: 'Запускает VDLU в фоне (применяет вживую, готовит <code>.so</code> к перезагрузке).',
  onReboot: 'При перезагрузке', onRebootSub: 'В pre-zygote применяет всё, включая <code>.so</code>, без лишней перезагрузки.',
  bootRetryEvery: 'Повтор при загрузке каждые (с)', bootRetryUpTo: 'Повтор при загрузке до (мин)', bootRetryHint: 'Если устройство загрузилось без сети, продолжать попытки загрузки манифеста. 0 мин = выкл.',
  source: 'Источник', saveSource: 'Сохранить источник', savedDot: 'Сохранено.',
  netPolicy: 'Сеть', netAny: 'Wi-Fi + моб. сеть', netWifi: 'Только Wi-Fi', netMobile: 'Только моб. сеть',
  savedToast: 'сохранено', saveFail: 'не удалось сохранить', sourceSaved: 'источник сохранён',
  bootstrapping: 'Подготовка средства обновления…', bootstrapSub: 'однократная загрузка загрузчика', bootstrapFail: 'Не удалось подготовить средство обновления',
  searching: 'Поиск…', upToDate: 'Актуально', nothingNew: 'ничего нового',
  ahead: 'Новее, чем в ленте', aheadSub: 'ваша версия новее опубликованного обновления', deferred: 'Загрузка отложена', deferredSub: 'ожидание разрешённой сети - возобновится при следующей проверке',
  updateAvail: 'Доступно обновление', install: 'установить', fileOne: 'файл', fileMany: 'файлов',
  requiresReboot: 'требуется перезагрузка', checkFail: 'Ошибка проверки', ksuUnavailable: 'API KSU недоступен',
  pendingUpdate: 'Ожидающее обновление', notNow: 'Не сейчас', srcPlaceholder: 'https://…/&lt;модуль&gt;'
};
