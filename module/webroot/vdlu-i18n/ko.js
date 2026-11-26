/* VDLU 위젯 - 한국어 번역. vdlu.js보다 먼저 로드하고 init에 전달하세요. 누락된 키는 영어 기본값으로 대체됩니다(부분 병합 가능).
 *   <script src="i18n/ko.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_KO });
 */
window.VDLU_I18N_KO = {
  ph_diff: '분석 중', ph_fetch: '다운로드 중', ph_apply: '적용 중', ph_delete: '제거 중', ph_commit: '확인 중',
  st_PLANNED: '예약됨', st_FETCHING: '다운로드 중', st_FETCHED: '다운로드됨', st_APPLYING: '적용 중',
  st_APPLIED_LIVE: '적용됨(라이브)', st_PENDING_REBOOT: '재부팅 대기 중', st_DONE: '완료', st_ERROR: '오류',
  processing: '처리 중', updating: '업데이트 중', close: '닫기', ok: '확인', cancel: '취소',
  bannerReboot: '새 항목을 적용하려면 재부팅하세요', so: '.so',
  appliedV: '적용됨', updated: '업데이트됨', allVerified: '모두 확인됨',
  appliedLive: '적용됨(라이브)', appliedShort: '적용됨', needRebootSo: '<code>.so</code>를 적용하려면 재부팅이 필요합니다',
  error: '오류', engineFail: '엔진 오류', retry: '다시 시도',
  cancelled: '취소됨', applied: '적용됨', resumable: '재개 가능', resume: '재개',
  starting: '시작 중…', startFail: '시작하지 못했습니다',
  cancelling: '취소 중…', cancellingSub: '다음 안전 지점에서 중지합니다',
  resuming: '재개 중…', resumeFail: '재개하지 못했습니다',
  noResponse: '응답 없음', noResponseSub: '엔진이 시작되지 않았거나 저널 없이 종료되었습니다',
  checkBtn: '업데이트 확인', updateNow: '지금 업데이트', automation: '자동화',
  onOpen: 'WebUI 열 때', onOpenSub: 'VDLU를 백그라운드에서 실행합니다(라이브로 적용하고 재부팅을 위해 <code>.so</code>를 준비합니다).',
  onReboot: '재부팅 시', onRebootSub: 'pre-zygote에서 <code>.so</code>를 포함한 모든 것을 추가 재부팅 없이 적용합니다.',
  bootRetryEvery: '부팅 시 재시도 간격(초)', bootRetryUpTo: '부팅 시 재시도 최대(분)', bootRetryHint: '기기가 오프라인으로 부팅되면 매니페스트 가져오기를 계속 재시도합니다. 0분 = 끔.',
  source: '소스', saveSource: '소스 저장', savedDot: '저장됨.',
  netPolicy: '네트워크', netAny: 'Wi-Fi + 모바일', netWifi: 'Wi-Fi 전용', netMobile: '모바일 전용',
  savedToast: '저장됨', saveFail: '저장 실패', sourceSaved: '소스 저장됨',
  bootstrapping: '업데이터 준비 중…', bootstrapSub: '페처 일회성 다운로드', bootstrapFail: '업데이터를 준비할 수 없습니다',
  searching: '검색 중…', upToDate: '최신 상태', nothingNew: '새 항목 없음',
  ahead: '피드보다 최신', aheadSub: '현재 버전이 게시된 업데이트보다 최신입니다', silentUpdate: '무음 업데이트', silentUpdateSub: '재부팅 바를 표시하지 않고 백그라운드에서 업데이트를 적용합니다.',
  deferred: '다운로드 연기됨', deferredSub: '허용된 네트워크 대기 중, 다음 확인 시 재개됩니다',
  updateAvail: '업데이트 있음', install: '설치', fileOne: '파일', fileMany: '파일',
  requiresReboot: '재부팅 필요', checkFail: '확인 실패', ksuUnavailable: 'KSU API 사용 불가',
  pendingUpdate: '대기 중인 업데이트', notNow: '나중에', srcPlaceholder: 'https://…/&lt;모듈&gt;'
};
