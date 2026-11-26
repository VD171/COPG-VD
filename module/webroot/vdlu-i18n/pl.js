/* Widget VDLU - polskie tłumaczenie. Wczytaj PRZED vdlu.js i przekaż w init. Brakujące klucze używają angielskiego domyślnego (częściowe scalenie jest ok).
 *   <script src="i18n/pl.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_PL });
 */
window.VDLU_I18N_PL = {
  ph_diff: 'Analizowanie', ph_fetch: 'Pobieranie', ph_apply: 'Stosowanie', ph_delete: 'Usuwanie', ph_commit: 'Weryfikowanie',
  st_PLANNED: 'Zaplanowano', st_FETCHING: 'Pobieranie', st_FETCHED: 'Pobrano', st_APPLYING: 'Stosowanie',
  st_APPLIED_LIVE: 'Zastosowano (na żywo)', st_PENDING_REBOOT: 'Oczekiwanie na restart', st_DONE: 'Gotowe', st_ERROR: 'Błąd',
  processing: 'Przetwarzanie', updating: 'Aktualizowanie', close: 'Zamknij', ok: 'OK', cancel: 'Anuluj',
  bannerReboot: 'Uruchom ponownie, aby aktywować nową', so: '.so',
  appliedV: 'zastosowano', updated: 'Zaktualizowano', allVerified: 'wszystko zweryfikowane',
  appliedLive: 'zastosowano (na żywo)', appliedShort: 'Zastosowano', needRebootSo: 'wymaga restartu, aby aktywować <code>.so</code>',
  error: 'Błąd', engineFail: 'błąd silnika', retry: 'Ponów',
  cancelled: 'Anulowano', applied: 'zastosowano', resumable: 'wznawialne', resume: 'Wznów',
  starting: 'Uruchamianie…', startFail: 'Nie udało się uruchomić',
  cancelling: 'Anulowanie…', cancellingSub: 'zatrzyma się w następnym bezpiecznym punkcie',
  resuming: 'Wznawianie…', resumeFail: 'Nie udało się wznowić',
  noResponse: 'Brak odpowiedzi', noResponseSub: 'silnik nie uruchomił się lub zakończył bez dziennika',
  checkBtn: 'Sprawdź aktualizacje', updateNow: 'Aktualizuj teraz', automation: 'Automatyzacja',
  onOpen: 'Po otwarciu WebUI', onOpenSub: 'Uruchamia VDLU w tle (stosuje LIVE, przygotowuje <code>.so</code> do restartu).',
  onReboot: 'Przy restarcie', onRebootSub: 'W pre-zygote stosuje wszystko, w tym <code>.so</code>, bez dodatkowego restartu.',
  bootRetryEvery: 'Ponawianie przy starcie co (s)', bootRetryUpTo: 'Ponawianie przy starcie do (min)', bootRetryHint: 'Jeśli urządzenie uruchomi się offline, ponawiaj pobieranie manifestu. 0 min = wył.',
  source: 'Źródło', saveSource: 'Zapisz źródło', savedDot: 'Zapisano.',
  netPolicy: 'Sieć', netAny: 'Wi-Fi + komórkowa', netWifi: 'Tylko Wi-Fi', netMobile: 'Tylko komórkowa',
  savedToast: 'zapisano', saveFail: 'nie udało się zapisać', sourceSaved: 'źródło zapisane',
  bootstrapping: 'Przygotowywanie aktualizatora…', bootstrapSub: 'jednorazowe pobranie pobieracza', bootstrapFail: 'Nie udało się przygotować aktualizatora',
  searching: 'Szukanie…', upToDate: 'Aktualne', nothingNew: 'nic nowego',
  ahead: 'Nowsza niż kanał', aheadSub: 'twoja wersja jest nowsza niż opublikowana aktualizacja', silentUpdate: 'Cicha aktualizacja', silentUpdateSub: 'Stosuje aktualizacje w tle bez pokazywania paska ponownego uruchomienia.',
  deferred: 'Pobieranie odroczone', deferredSub: 'oczekiwanie na dozwoloną sieć, wznowi się przy następnym sprawdzeniu',
  updateAvail: 'Dostępna aktualizacja', install: 'zainstaluj', fileOne: 'plik', fileMany: 'plików',
  requiresReboot: 'wymaga restartu', checkFail: 'Sprawdzanie nie powiodło się', ksuUnavailable: 'API KSU niedostępne',
  pendingUpdate: 'Oczekująca aktualizacja', notNow: 'Nie teraz', srcPlaceholder: 'https://…/&lt;moduł&gt;'
};
