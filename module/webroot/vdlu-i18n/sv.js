/* VDLU-widget - svensk översättning. Läs in FÖRE vdlu.js och skicka med i init. Saknade nycklar faller tillbaka på engelska standardvärdet (partiell sammanslagning är ok).
 *   <script src="i18n/sv.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_SV });
 */
window.VDLU_I18N_SV = {
  ph_diff: 'Analyserar', ph_fetch: 'Laddar ner', ph_apply: 'Tillämpar', ph_delete: 'Tar bort', ph_commit: 'Verifierar',
  st_PLANNED: 'Planerad', st_FETCHING: 'Laddar ner', st_FETCHED: 'Nedladdad', st_APPLYING: 'Tillämpar',
  st_APPLIED_LIVE: 'Tillämpad (live)', st_PENDING_REBOOT: 'Väntar på omstart', st_DONE: 'Klar', st_ERROR: 'Fel',
  processing: 'Bearbetar', updating: 'Uppdaterar', close: 'Stäng', ok: 'OK', cancel: 'Avbryt',
  bannerReboot: 'Starta om för att aktivera den nya', so: '.so',
  appliedV: 'tillämpad', updated: 'Uppdaterad', allVerified: 'allt verifierat',
  appliedLive: 'tillämpad (live)', appliedShort: 'Tillämpad', needRebootSo: 'kräver omstart för att aktivera <code>.so</code>',
  error: 'Fel', engineFail: 'motorfel', retry: 'Försök igen',
  cancelled: 'Avbruten', applied: 'tillämpade', resumable: 'kan återupptas', resume: 'Återuppta',
  starting: 'Startar…', startFail: 'Kunde inte starta',
  cancelling: 'Avbryter…', cancellingSub: 'stoppar vid nästa säkra punkt',
  resuming: 'Återupptar…', resumeFail: 'Kunde inte återuppta',
  noResponse: 'Inget svar', noResponseSub: 'motorn startade inte eller avslutades utan journal',
  checkBtn: 'Sök efter uppdateringar', updateNow: 'Uppdatera nu', automation: 'Automatisering',
  onOpen: 'När WebUI öppnas', onOpenSub: 'Kör VDLU i bakgrunden (tillämpar live, förbereder <code>.so</code> för omstarten).',
  onReboot: 'Vid omstart', onRebootSub: 'I pre-zygote tillämpas allt, inklusive <code>.so</code>, utan extra omstart.',
  bootRetryEvery: 'Nytt försök vid start var (s)', bootRetryUpTo: 'Nytt försök vid start upp till (min)', bootRetryHint: 'Om enheten startar offline, fortsätt försöka hämta manifestet. 0 min = av.',
  source: 'Källa', saveSource: 'Spara källa', savedDot: 'Sparat.',
  netPolicy: 'Nätverk', netAny: 'Wi-Fi + mobilt', netWifi: 'Endast Wi-Fi', netMobile: 'Endast mobilt',
  savedToast: 'sparat', saveFail: 'kunde inte spara', sourceSaved: 'källa sparad',
  bootstrapping: 'Förbereder uppdateraren…', bootstrapSub: 'engångsnedladdning av hämtaren', bootstrapFail: 'Kunde inte förbereda uppdateraren',
  searching: 'Söker…', upToDate: 'Uppdaterad', nothingNew: 'inget nytt',
  ahead: 'Nyare än flödet', aheadSub: 'din version är nyare än den publicerade uppdateringen', deferred: 'Nedladdning uppskjuten', deferredSub: 'väntar på tillåtet nätverk - återupptas vid nästa kontroll',
  updateAvail: 'Uppdatering tillgänglig', install: 'installera', fileOne: 'fil', fileMany: 'filer',
  requiresReboot: 'kräver omstart', checkFail: 'Kontrollen misslyckades', ksuUnavailable: 'KSU-API ej tillgängligt',
  pendingUpdate: 'Väntande uppdatering', notNow: 'Inte nu', srcPlaceholder: 'https://…/&lt;modul&gt;'
};
