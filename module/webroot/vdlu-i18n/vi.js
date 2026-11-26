/* Widget VDLU - bản dịch tiếng Việt. Tải TRƯỚC vdlu.js và truyền vào init. Khóa thiếu sẽ dùng mặc định tiếng Anh (gộp một phần cũng được).
 *   <script src="i18n/vi.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_VI });
 */
window.VDLU_I18N_VI = {
  ph_diff: 'Đang phân tích', ph_fetch: 'Đang tải xuống', ph_apply: 'Đang áp dụng', ph_delete: 'Đang xóa', ph_commit: 'Đang xác minh',
  st_PLANNED: 'Đã lên kế hoạch', st_FETCHING: 'Đang tải xuống', st_FETCHED: 'Đã tải xuống', st_APPLYING: 'Đang áp dụng',
  st_APPLIED_LIVE: 'Đã áp dụng (trực tiếp)', st_PENDING_REBOOT: 'Chờ khởi động lại', st_DONE: 'Xong', st_ERROR: 'Lỗi',
  processing: 'Đang xử lý', updating: 'Đang cập nhật', close: 'Đóng', ok: 'OK', cancel: 'Hủy',
  bannerReboot: 'Khởi động lại để kích hoạt bản mới', so: '.so',
  appliedV: 'đã áp dụng', updated: 'Đã cập nhật', allVerified: 'tất cả đã xác minh',
  appliedLive: 'đã áp dụng (trực tiếp)', appliedShort: 'Đã áp dụng', needRebootSo: 'cần khởi động lại để kích hoạt <code>.so</code>',
  error: 'Lỗi', engineFail: 'lỗi engine', retry: 'Thử lại',
  cancelled: 'Đã hủy', applied: 'đã áp dụng', resumable: 'có thể tiếp tục', resume: 'Tiếp tục',
  starting: 'Đang bắt đầu…', startFail: 'Không thể bắt đầu',
  cancelling: 'Đang hủy…', cancellingSub: 'dừng ở điểm an toàn kế tiếp',
  resuming: 'Đang tiếp tục…', resumeFail: 'Không thể tiếp tục',
  noResponse: 'Không có phản hồi', noResponseSub: 'engine không khởi động hoặc kết thúc mà không có nhật ký',
  checkBtn: 'Kiểm tra cập nhật', updateNow: 'Cập nhật ngay', automation: 'Tự động hóa',
  onOpen: 'Khi mở WebUI', onOpenSub: 'Chạy VDLU ở nền (áp dụng trực tiếp, chuẩn bị <code>.so</code> cho lần khởi động lại).',
  onReboot: 'Khi khởi động lại', onRebootSub: 'Ở pre-zygote áp dụng mọi thứ, gồm cả <code>.so</code>, mà không cần khởi động lại thêm.',
  bootRetryEvery: 'Thử lại khi khởi động mỗi (giây)', bootRetryUpTo: 'Thử lại khi khởi động tối đa (phút)', bootRetryHint: 'Nếu thiết bị khởi động khi ngoại tuyến, tiếp tục thử tải manifest. 0 phút = tắt.',
  source: 'Nguồn', saveSource: 'Lưu nguồn', savedDot: 'Đã lưu.',
  netPolicy: 'Mạng', netAny: 'Wi-Fi + di động', netWifi: 'Chỉ Wi-Fi', netMobile: 'Chỉ di động',
  savedToast: 'đã lưu', saveFail: 'lưu thất bại', sourceSaved: 'đã lưu nguồn',
  bootstrapping: 'Đang chuẩn bị trình cập nhật…', bootstrapSub: 'tải xuống một lần trình tìm nạp', bootstrapFail: 'Không thể chuẩn bị trình cập nhật',
  searching: 'Đang tìm…', upToDate: 'Đã mới nhất', nothingNew: 'không có gì mới',
  ahead: 'Mới hơn nguồn cấp', aheadSub: 'phiên bản của bạn mới hơn bản cập nhật đã phát hành', silentUpdate: 'Cập nhật im lặng', silentUpdateSub: 'Áp dụng bản cập nhật ở chế độ nền mà không hiển thị thanh khởi động lại.',
  deferred: 'Đã hoãn tải xuống', deferredSub: 'đang chờ mạng được phép, tiếp tục ở lần kiểm tra sau',
  updateAvail: 'Có bản cập nhật', install: 'cài đặt', fileOne: 'tệp', fileMany: 'tệp',
  requiresReboot: 'cần khởi động lại', checkFail: 'Kiểm tra thất bại', ksuUnavailable: 'API KSU không khả dụng',
  pendingUpdate: 'Cập nhật đang chờ', notNow: 'Để sau', srcPlaceholder: 'https://…/&lt;mô-đun&gt;'
};
