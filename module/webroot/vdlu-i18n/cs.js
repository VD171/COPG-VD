/* Widget VDLU - český překlad. Načtěte před vdlu.js a předejte v init. Chybějící klíče použijí anglický výchozí (částečné sloučení je ok).
 *   <script src="i18n/cs.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_CS });
 */
window.VDLU_I18N_CS = {
  ph_diff: 'Analýza', ph_fetch: 'Stahování', ph_apply: 'Použití', ph_delete: 'Odstraňování', ph_commit: 'Ověřování',
  st_PLANNED: 'Naplánováno', st_FETCHING: 'Stahování', st_FETCHED: 'Staženo', st_APPLYING: 'Použití',
  st_APPLIED_LIVE: 'Použito (za běhu)', st_PENDING_REBOOT: 'Čeká na restart', st_DONE: 'Hotovo', st_ERROR: 'Chyba',
  processing: 'Zpracování', updating: 'Aktualizace', close: 'Zavřít', ok: 'OK', cancel: 'Zrušit',
  bannerReboot: 'Restartujte pro aktivaci nové', so: '.so',
  appliedV: 'použito', updated: 'Aktualizováno', allVerified: 'vše ověřeno',
  appliedLive: 'použito (za běhu)', appliedShort: 'Použito', needRebootSo: 'vyžaduje restart pro aktivaci <code>.so</code>',
  error: 'Chyba', engineFail: 'selhání enginu', retry: 'Zkusit znovu',
  cancelled: 'Zrušeno', applied: 'použito', resumable: 'lze obnovit', resume: 'Obnovit',
  starting: 'Spouštění…', startFail: 'Spuštění selhalo',
  cancelling: 'Rušení…', cancellingSub: 'zastaví se v dalším bezpečném bodě',
  resuming: 'Obnovování…', resumeFail: 'Obnovení selhalo',
  noResponse: 'Žádná odpověď', noResponseSub: 'engine se nespustil nebo skončil bez žurnálu',
  checkBtn: 'Zkontrolovat aktualizace', updateNow: 'Aktualizovat', automation: 'Automatizace',
  onOpen: 'Při otevření WebUI', onOpenSub: 'Spustí VDLU na pozadí (použije za běhu, připraví <code>.so</code> na restart).',
  onReboot: 'Při restartu', onRebootSub: 'V pre-zygote použije vše včetně <code>.so</code> bez dalšího restartu.',
  bootRetryEvery: 'Opakování při startu každých (s)', bootRetryUpTo: 'Opakování při startu až (min)', bootRetryHint: 'Pokud se zařízení spustí offline, opakovat stahování manifestu. 0 min = vypnuto.',
  source: 'Zdroj', saveSource: 'Uložit zdroj', savedDot: 'Uloženo.',
  netPolicy: 'Síť', netAny: 'Wi-Fi + mobilní data', netWifi: 'Jen Wi-Fi', netMobile: 'Jen mobilní data',
  savedToast: 'uloženo', saveFail: 'uložení selhalo', sourceSaved: 'zdroj uložen',
  bootstrapping: 'Příprava aktualizátoru…', bootstrapSub: 'jednorázové stažení stahovače', bootstrapFail: 'Aktualizátor se nepodařilo připravit',
  searching: 'Hledání…', upToDate: 'Aktuální', nothingNew: 'nic nového',
  ahead: 'Novější než kanál', aheadSub: 'vaše verze je novější než zveřejněná aktualizace', deferred: 'Stahování odloženo', deferredSub: 'čeká na povolenou síť - obnoví se při příští kontrole',
  updateAvail: 'Dostupná aktualizace', install: 'instalovat', fileOne: 'soubor', fileMany: 'souborů',
  requiresReboot: 'vyžaduje restart', checkFail: 'Kontrola selhala', ksuUnavailable: 'API KSU nedostupné',
  pendingUpdate: 'Čekající aktualizace', notNow: 'Teď ne', srcPlaceholder: 'https://…/&lt;modul&gt;'
};
