/* Widget VDLU - traduzione italiana. Carica PRIMA di vdlu.js e passa in init. Le chiavi mancanti usano il valore inglese predefinito (unione parziale ok).
 *   <script src="i18n/it.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_IT });
 */
window.VDLU_I18N_IT = {
  ph_diff: 'Analisi', ph_fetch: 'Download', ph_apply: 'Applicazione', ph_delete: 'Rimozione', ph_commit: 'Verifica',
  st_PLANNED: 'Pianificato', st_FETCHING: 'Download', st_FETCHED: 'Scaricato', st_APPLYING: 'Applicazione',
  st_APPLIED_LIVE: 'Applicato (a caldo)', st_PENDING_REBOOT: 'In attesa di riavvio', st_DONE: 'Fatto', st_ERROR: 'Errore',
  processing: 'Elaborazione', updating: 'Aggiornamento', close: 'Chiudi', ok: 'OK', cancel: 'Annulla',
  bannerReboot: 'Riavvia per attivare la nuova', so: '.so',
  appliedV: 'applicato', updated: 'Aggiornato', allVerified: 'tutto verificato',
  appliedLive: 'applicato (a caldo)', appliedShort: 'Applicato', needRebootSo: 'richiede un riavvio per attivare la <code>.so</code>',
  error: 'Errore', engineFail: 'errore del motore', retry: 'Riprova',
  cancelled: 'Annullato', applied: 'applicati', resumable: 'riprendibile', resume: 'Riprendi',
  starting: 'Avvio…', startFail: 'Avvio non riuscito',
  cancelling: 'Annullamento…', cancellingSub: 'si ferma al prossimo punto sicuro',
  resuming: 'Ripresa…', resumeFail: 'Ripresa non riuscita',
  noResponse: 'Nessuna risposta', noResponseSub: 'il motore non è stato avviato o è terminato senza journal',
  checkBtn: 'Controlla aggiornamenti', updateNow: 'Aggiorna ora', automation: 'Automazione',
  onOpen: 'All\'apertura della WebUI', onOpenSub: 'Esegue VDLU in background (applica a caldo, prepara la <code>.so</code> per il riavvio).',
  onReboot: 'Al riavvio', onRebootSub: 'In pre-zygote applica tutto, inclusa la <code>.so</code>, senza riavvio aggiuntivo.',
  bootRetryEvery: 'Nuovo tentativo all\'avvio ogni (s)', bootRetryUpTo: 'Nuovo tentativo all\'avvio fino a (min)', bootRetryHint: 'Se il dispositivo si avvia offline, continua a ritentare il download del manifesto. 0 min = disattivato.',
  source: 'Sorgente', saveSource: 'Salva sorgente', savedDot: 'Salvato.',
  netPolicy: 'Rete', netAny: 'Wi-Fi + dati mobili', netWifi: 'Solo Wi-Fi', netMobile: 'Solo dati mobili',
  savedToast: 'salvato', saveFail: 'salvataggio non riuscito', sourceSaved: 'sorgente salvata',
  bootstrapping: 'Preparazione dell\'updater…', bootstrapSub: 'download una tantum del fetcher', bootstrapFail: 'Impossibile preparare l\'updater',
  searching: 'Ricerca…', upToDate: 'Aggiornato', nothingNew: 'niente di nuovo',
  ahead: 'Più recente del feed', aheadSub: 'la tua versione è più recente dell\'aggiornamento pubblicato', deferred: 'Download rimandato', deferredSub: 'in attesa della rete consentita - riprende al prossimo controllo',
  updateAvail: 'Aggiornamento disponibile', install: 'installa', fileOne: 'file', fileMany: 'file',
  requiresReboot: 'richiede riavvio', checkFail: 'Controllo non riuscito', ksuUnavailable: 'API KSU non disponibile',
  pendingUpdate: 'Aggiornamento in sospeso', notNow: 'Non ora', srcPlaceholder: 'https://…/&lt;modulo&gt;'
};
