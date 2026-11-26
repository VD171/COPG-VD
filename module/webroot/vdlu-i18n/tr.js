/* VDLU widget - Türkçe çeviri. vdlu.js'den ÖNCE yükleyin ve init içinde geçirin. Eksik anahtarlar İngilizce varsayılana döner (kısmi birleştirme olur).
 *   <script src="i18n/tr.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_TR });
 */
window.VDLU_I18N_TR = {
  ph_diff: 'Çözümleniyor', ph_fetch: 'İndiriliyor', ph_apply: 'Uygulanıyor', ph_delete: 'Kaldırılıyor', ph_commit: 'Doğrulanıyor',
  st_PLANNED: 'Planlandı', st_FETCHING: 'İndiriliyor', st_FETCHED: 'İndirildi', st_APPLYING: 'Uygulanıyor',
  st_APPLIED_LIVE: 'Uygulandı (canlı)', st_PENDING_REBOOT: 'Yeniden başlatma bekleniyor', st_DONE: 'Tamamlandı', st_ERROR: 'Hata',
  processing: 'İşleniyor', updating: 'Güncelleniyor', close: 'Kapat', ok: 'Tamam', cancel: 'İptal',
  bannerReboot: 'Yenisini etkinleştirmek için yeniden başlatın', so: '.so',
  appliedV: 'uygulandı', updated: 'Güncellendi', allVerified: 'tümü doğrulandı',
  appliedLive: 'uygulandı (canlı)', appliedShort: 'Uygulandı', needRebootSo: '<code>.so</code> etkinleştirmek için yeniden başlatma gerekir',
  error: 'Hata', engineFail: 'motor hatası', retry: 'Yeniden dene',
  cancelled: 'İptal edildi', applied: 'uygulandı', resumable: 'sürdürülebilir', resume: 'Sürdür',
  starting: 'Başlatılıyor…', startFail: 'Başlatılamadı',
  cancelling: 'İptal ediliyor…', cancellingSub: 'bir sonraki güvenli noktada duracak',
  resuming: 'Sürdürülüyor…', resumeFail: 'Sürdürülemedi',
  noResponse: 'Yanıt yok', noResponseSub: 'motor başlamadı veya günlük olmadan sona erdi',
  checkBtn: 'Güncellemeleri denetle', updateNow: 'Şimdi güncelle', automation: 'Otomasyon',
  onOpen: 'WebUI açıldığında', onOpenSub: 'VDLU\'yu arka planda çalıştırır (canlı uygular, <code>.so</code> dosyasını yeniden başlatma için hazırlar).',
  onReboot: 'Yeniden başlatmada', onRebootSub: 'pre-zygote aşamasında <code>.so</code> dahil her şeyi ek yeniden başlatma olmadan uygular.',
  bootRetryEvery: 'Açılışta yeniden deneme aralığı (sn)', bootRetryUpTo: 'Açılışta yeniden deneme süresi (dk)', bootRetryHint: 'Cihaz çevrimdışı açılırsa manifest indirmeyi denemeye devam et. 0 dk = kapalı.',
  source: 'Kaynak', saveSource: 'Kaynağı kaydet', savedDot: 'Kaydedildi.',
  netPolicy: 'Ağ', netAny: 'Wi-Fi + mobil', netWifi: 'Yalnızca Wi-Fi', netMobile: 'Yalnızca mobil',
  savedToast: 'kaydedildi', saveFail: 'kaydedilemedi', sourceSaved: 'kaynak kaydedildi',
  bootstrapping: 'Güncelleyici hazırlanıyor…', bootstrapSub: 'getiricinin tek seferlik indirmesi', bootstrapFail: 'Güncelleyici hazırlanamadı',
  searching: 'Aranıyor…', upToDate: 'Güncel', nothingNew: 'yeni bir şey yok',
  ahead: 'Akıştan daha yeni', aheadSub: 'sürümünüz yayımlanan güncellemeden daha yeni', silentUpdate: 'Sessiz güncelleme', silentUpdateSub: 'Güncellemeleri yeniden başlatma çubuğunu göstermeden arka planda uygular.',
  deferred: 'İndirme ertelendi', deferredSub: 'izin verilen ağ bekleniyor, sonraki denetimde sürdürülecek',
  updateAvail: 'Güncelleme mevcut', install: 'yükle', fileOne: 'dosya', fileMany: 'dosya',
  requiresReboot: 'yeniden başlatma gerektirir', checkFail: 'Denetim başarısız', ksuUnavailable: 'KSU API kullanılamıyor',
  pendingUpdate: 'Bekleyen güncelleme', notNow: 'Şimdi değil', srcPlaceholder: 'https://…/&lt;modül&gt;'
};
