/* VDLU ウィジェット - 日本語訳。vdlu.js より前に読み込み、init に渡します。欠落したキーは英語の既定値になります（部分マージ可）。
 *   <script src="i18n/ja.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_JA });
 */
window.VDLU_I18N_JA = {
  ph_diff: '解析中', ph_fetch: 'ダウンロード中', ph_apply: '適用中', ph_delete: '削除中', ph_commit: '検証中',
  st_PLANNED: '計画済み', st_FETCHING: 'ダウンロード中', st_FETCHED: 'ダウンロード済み', st_APPLYING: '適用中',
  st_APPLIED_LIVE: '適用済み（ライブ）', st_PENDING_REBOOT: '再起動待ち', st_DONE: '完了', st_ERROR: 'エラー',
  processing: '処理中', updating: '更新中', close: '閉じる', ok: 'OK', cancel: 'キャンセル',
  bannerReboot: '新しいものを有効にするには再起動してください', so: '.so',
  appliedV: '適用済み', updated: '更新済み', allVerified: 'すべて検証済み',
  appliedLive: '適用済み（ライブ）', appliedShort: '適用済み', needRebootSo: '<code>.so</code> を有効にするには再起動が必要です',
  error: 'エラー', engineFail: 'エンジンの失敗', retry: '再試行',
  cancelled: 'キャンセル済み', applied: '適用', resumable: '再開可能', resume: '再開',
  starting: '開始中…', startFail: '開始できませんでした',
  cancelling: 'キャンセル中…', cancellingSub: '次の安全なポイントで停止します',
  resuming: '再開中…', resumeFail: '再開できませんでした',
  noResponse: '応答なし', noResponseSub: 'エンジンが起動しなかったか、ジャーナルなしで終了しました',
  checkBtn: '更新を確認', updateNow: '今すぐ更新', automation: '自動化',
  onOpen: 'WebUI を開いたとき', onOpenSub: 'VDLU をバックグラウンドで実行します（ライブで適用し、再起動用に <code>.so</code> を準備します）。',
  onReboot: '再起動時', onRebootSub: 'pre-zygote で <code>.so</code> を含むすべてを追加の再起動なしで適用します。',
  bootRetryEvery: '起動時の再試行間隔（秒）', bootRetryUpTo: '起動時の再試行上限（分）', bootRetryHint: 'デバイスがオフラインで起動した場合、マニフェストの取得を再試行し続けます。0 分 = オフ。',
  source: 'ソース', saveSource: 'ソースを保存', savedDot: '保存しました。',
  netPolicy: 'ネットワーク', netAny: 'Wi-Fi + モバイル', netWifi: 'Wi-Fi のみ', netMobile: 'モバイルのみ',
  savedToast: '保存しました', saveFail: '保存に失敗しました', sourceSaved: 'ソースを保存しました',
  bootstrapping: 'アップデーターを準備中…', bootstrapSub: 'フェッチャーを一度だけダウンロード', bootstrapFail: 'アップデーターを準備できませんでした',
  searching: '検索中…', upToDate: '最新です', nothingNew: '新着なし',
  ahead: 'フィードより新しい', aheadSub: 'お使いのバージョンは公開済みの更新より新しいです', deferred: 'ダウンロードを延期', deferredSub: '許可されたネットワークを待機中 - 次回の確認で再開します',
  updateAvail: '更新があります', install: 'インストール', fileOne: 'ファイル', fileMany: 'ファイル',
  requiresReboot: '再起動が必要', checkFail: '確認に失敗しました', ksuUnavailable: 'KSU API を利用できません',
  pendingUpdate: '保留中の更新', notNow: '今はしない', srcPlaceholder: 'https://…/&lt;モジュール&gt;'
};
