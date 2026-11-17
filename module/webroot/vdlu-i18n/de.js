/* VDLU-Widget - deutsche Übersetzung. Vor vdlu.js einbinden und in init übergeben. Fehlende Schlüssel nutzen den englischen Standard (teilweises Zusammenführen ist ok).
 *   <script src="i18n/de.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_DE });
 */
window.VDLU_I18N_DE = {
  ph_diff: 'Analysieren', ph_fetch: 'Herunterladen', ph_apply: 'Anwenden', ph_delete: 'Entfernen', ph_commit: 'Überprüfen',
  st_PLANNED: 'Geplant', st_FETCHING: 'Wird geladen', st_FETCHED: 'Geladen', st_APPLYING: 'Wird angewendet',
  st_APPLIED_LIVE: 'Angewendet (live)', st_PENDING_REBOOT: 'Neustart erforderlich', st_DONE: 'Fertig', st_ERROR: 'Fehler',
  processing: 'Verarbeiten', updating: 'Aktualisieren', close: 'Schließen', ok: 'OK', cancel: 'Abbrechen',
  bannerReboot: 'Neu starten, um die neue zu aktivieren', so: '.so',
  appliedV: 'angewendet', updated: 'Aktualisiert', allVerified: 'alles überprüft',
  appliedLive: 'angewendet (live)', appliedShort: 'Angewendet', needRebootSo: 'Neustart nötig, um die <code>.so</code> zu aktivieren',
  error: 'Fehler', engineFail: 'Engine-Fehler', retry: 'Wiederholen',
  cancelled: 'Abgebrochen', applied: 'angewendet', resumable: 'fortsetzbar', resume: 'Fortsetzen',
  starting: 'Wird gestartet…', startFail: 'Start fehlgeschlagen',
  cancelling: 'Wird abgebrochen…', cancellingSub: 'stoppt am nächsten sicheren Punkt',
  resuming: 'Wird fortgesetzt…', resumeFail: 'Fortsetzen fehlgeschlagen',
  noResponse: 'Keine Antwort', noResponseSub: 'die Engine startete nicht oder endete ohne Journal',
  checkBtn: 'Nach Updates suchen', updateNow: 'Jetzt aktualisieren', automation: 'Automatisierung',
  onOpen: 'Beim Öffnen der WebUI', onOpenSub: 'Führt VDLU im Hintergrund aus (wendet LIVE an, stellt die <code>.so</code> für den Neustart bereit).',
  onReboot: 'Beim Neustart', onRebootSub: 'Wendet in pre-zygote alles an, auch die <code>.so</code>, ohne zusätzlichen Neustart.',
  bootRetryEvery: 'Boot-Wiederholung alle (s)', bootRetryUpTo: 'Boot-Wiederholung bis zu (Min.)', bootRetryHint: 'Wenn das Gerät offline startet, den Manifest-Abruf weiter wiederholen. 0 Min. = aus.',
  source: 'Quelle', saveSource: 'Quelle speichern', savedDot: 'Gespeichert.',
  netPolicy: 'Netzwerk', netAny: 'WLAN + Mobilfunk', netWifi: 'Nur WLAN', netMobile: 'Nur Mobilfunk',
  savedToast: 'gespeichert', saveFail: 'Speichern fehlgeschlagen', sourceSaved: 'Quelle gespeichert',
  bootstrapping: 'Updater wird vorbereitet…', bootstrapSub: 'einmaliger Download des Fetchers', bootstrapFail: 'Updater konnte nicht vorbereitet werden',
  searching: 'Suchen…', upToDate: 'Aktuell', nothingNew: 'nichts Neues',
  ahead: 'Neuer als der Feed', aheadSub: 'deine Version ist neuer als das veröffentlichte Update', deferred: 'Download verschoben', deferredSub: 'wartet auf das erlaubte Netzwerk - wird bei der nächsten Prüfung fortgesetzt',
  updateAvail: 'Update verfügbar', install: 'installieren', fileOne: 'Datei', fileMany: 'Dateien',
  requiresReboot: 'erfordert Neustart', checkFail: 'Prüfung fehlgeschlagen', ksuUnavailable: 'KSU-API nicht verfügbar',
  pendingUpdate: 'Ausstehendes Update', notNow: 'Nicht jetzt', srcPlaceholder: 'https://…/&lt;Modul&gt;'
};
