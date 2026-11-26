/* VDLU-widget - Nederlandse vertaling. Laad VÓÓR vdlu.js en geef door in init. Ontbrekende sleutels vallen terug op het Engelse standaard (gedeeltelijk samenvoegen is ok).
 *   <script src="i18n/nl.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_NL });
 */
window.VDLU_I18N_NL = {
  ph_diff: 'Analyseren', ph_fetch: 'Downloaden', ph_apply: 'Toepassen', ph_delete: 'Verwijderen', ph_commit: 'Verifiëren',
  st_PLANNED: 'Gepland', st_FETCHING: 'Downloaden', st_FETCHED: 'Gedownload', st_APPLYING: 'Toepassen',
  st_APPLIED_LIVE: 'Toegepast (live)', st_PENDING_REBOOT: 'Wacht op herstart', st_DONE: 'Klaar', st_ERROR: 'Fout',
  processing: 'Verwerken', updating: 'Bijwerken', close: 'Sluiten', ok: 'OK', cancel: 'Annuleren',
  bannerReboot: 'Herstart om de nieuwe te activeren', so: '.so',
  appliedV: 'toegepast', updated: 'Bijgewerkt', allVerified: 'alles geverifieerd',
  appliedLive: 'toegepast (live)', appliedShort: 'Toegepast', needRebootSo: 'vereist een herstart om de <code>.so</code> te activeren',
  error: 'Fout', engineFail: 'enginefout', retry: 'Opnieuw',
  cancelled: 'Geannuleerd', applied: 'toegepast', resumable: 'hervatbaar', resume: 'Hervatten',
  starting: 'Starten…', startFail: 'Starten mislukt',
  cancelling: 'Annuleren…', cancellingSub: 'stopt bij het volgende veilige punt',
  resuming: 'Hervatten…', resumeFail: 'Hervatten mislukt',
  noResponse: 'Geen reactie', noResponseSub: 'de engine is niet gestart of eindigde zonder journal',
  checkBtn: 'Controleren op updates', updateNow: 'Nu bijwerken', automation: 'Automatisering',
  onOpen: 'Bij openen WebUI', onOpenSub: 'Voert VDLU op de achtergrond uit (past LIVE toe, zet de <code>.so</code> klaar voor de herstart).',
  onReboot: 'Bij herstart', onRebootSub: 'In pre-zygote wordt alles toegepast, inclusief de <code>.so</code>, zonder extra herstart.',
  bootRetryEvery: 'Opnieuw proberen bij opstarten elke (s)', bootRetryUpTo: 'Opnieuw proberen bij opstarten tot (min)', bootRetryHint: 'Als het apparaat offline opstart, blijf het ophalen van het manifest proberen. 0 min = uit.',
  source: 'Bron', saveSource: 'Bron opslaan', savedDot: 'Opgeslagen.',
  netPolicy: 'Netwerk', netAny: 'Wi-Fi + mobiel', netWifi: 'Alleen Wi-Fi', netMobile: 'Alleen mobiel',
  savedToast: 'opgeslagen', saveFail: 'opslaan mislukt', sourceSaved: 'bron opgeslagen',
  bootstrapping: 'Updater voorbereiden…', bootstrapSub: 'eenmalige download van de fetcher', bootstrapFail: 'Kan de updater niet voorbereiden',
  searching: 'Zoeken…', upToDate: 'Up-to-date', nothingNew: 'niets nieuws',
  ahead: 'Nieuwer dan de feed', aheadSub: 'jouw versie is nieuwer dan de gepubliceerde update', silentUpdate: 'Stille update', silentUpdateSub: 'Past updates op de achtergrond toe zonder de herstartbalk te tonen.',
  deferred: 'Download uitgesteld', deferredSub: 'wacht op het toegestane netwerk, hervat bij de volgende controle',
  updateAvail: 'Update beschikbaar', install: 'installeren', fileOne: 'bestand', fileMany: 'bestanden',
  requiresReboot: 'vereist herstart', checkFail: 'Controle mislukt', ksuUnavailable: 'KSU-API niet beschikbaar',
  pendingUpdate: 'Update in behandeling', notNow: 'Niet nu', srcPlaceholder: 'https://…/&lt;module&gt;'
};
