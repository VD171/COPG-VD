/* วิดเจ็ต VDLU - คำแปลภาษาไทย โหลดก่อน vdlu.js และส่งใน init คีย์ที่ขาดจะกลับไปใช้ค่าเริ่มต้นภาษาอังกฤษ (รวมบางส่วนได้)
 *   <script src="i18n/th.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_TH });
 */
window.VDLU_I18N_TH = {
  ph_diff: 'กำลังวิเคราะห์', ph_fetch: 'กำลังดาวน์โหลด', ph_apply: 'กำลังนำไปใช้', ph_delete: 'กำลังลบ', ph_commit: 'กำลังตรวจสอบ',
  st_PLANNED: 'วางแผนแล้ว', st_FETCHING: 'กำลังดาวน์โหลด', st_FETCHED: 'ดาวน์โหลดแล้ว', st_APPLYING: 'กำลังนำไปใช้',
  st_APPLIED_LIVE: 'นำไปใช้แล้ว (สด)', st_PENDING_REBOOT: 'รอรีบูต', st_DONE: 'เสร็จสิ้น', st_ERROR: 'ข้อผิดพลาด',
  processing: 'กำลังประมวลผล', updating: 'กำลังอัปเดต', close: 'ปิด', ok: 'ตกลง', cancel: 'ยกเลิก',
  bannerReboot: 'รีบูตเพื่อเปิดใช้งานตัวใหม่', so: '.so',
  appliedV: 'นำไปใช้แล้ว', updated: 'อัปเดตแล้ว', allVerified: 'ตรวจสอบครบแล้ว',
  appliedLive: 'นำไปใช้แล้ว (สด)', appliedShort: 'นำไปใช้แล้ว', needRebootSo: 'ต้องรีบูตเพื่อเปิดใช้งาน <code>.so</code>',
  error: 'ข้อผิดพลาด', engineFail: 'เอนจินล้มเหลว', retry: 'ลองใหม่',
  cancelled: 'ยกเลิกแล้ว', applied: 'นำไปใช้แล้ว', resumable: 'ทำต่อได้', resume: 'ทำต่อ',
  starting: 'กำลังเริ่ม…', startFail: 'เริ่มไม่สำเร็จ',
  cancelling: 'กำลังยกเลิก…', cancellingSub: 'จะหยุดที่จุดปลอดภัยถัดไป',
  resuming: 'กำลังทำต่อ…', resumeFail: 'ทำต่อไม่สำเร็จ',
  noResponse: 'ไม่มีการตอบสนอง', noResponseSub: 'เอนจินไม่เริ่มทำงานหรือจบลงโดยไม่มีบันทึก',
  checkBtn: 'ตรวจหาการอัปเดต', updateNow: 'อัปเดตเดี๋ยวนี้', automation: 'ระบบอัตโนมัติ',
  onOpen: 'เมื่อเปิด WebUI', onOpenSub: 'เรียกใช้ VDLU ในพื้นหลัง (นำไปใช้แบบสด เตรียม <code>.so</code> ไว้สำหรับการรีบูต)',
  onReboot: 'เมื่อรีบูต', onRebootSub: 'ในช่วง pre-zygote จะนำทุกอย่างไปใช้ รวมถึง <code>.so</code> โดยไม่ต้องรีบูตเพิ่ม',
  bootRetryEvery: 'ลองใหม่ตอนบูตทุก (วินาที)', bootRetryUpTo: 'ลองใหม่ตอนบูตได้ถึง (นาที)', bootRetryHint: 'หากอุปกรณ์บูตขณะออฟไลน์ ให้ลองดึงรายการไฟล์ต่อไป 0 นาที = ปิด',
  source: 'แหล่งที่มา', saveSource: 'บันทึกแหล่งที่มา', savedDot: 'บันทึกแล้ว',
  netPolicy: 'เครือข่าย', netAny: 'Wi-Fi + มือถือ', netWifi: 'Wi-Fi เท่านั้น', netMobile: 'มือถือเท่านั้น',
  savedToast: 'บันทึกแล้ว', saveFail: 'บันทึกไม่สำเร็จ', sourceSaved: 'บันทึกแหล่งที่มาแล้ว',
  bootstrapping: 'กำลังเตรียมตัวอัปเดต…', bootstrapSub: 'ดาวน์โหลดตัวดึงข้อมูลครั้งเดียว', bootstrapFail: 'ไม่สามารถเตรียมตัวอัปเดตได้',
  searching: 'กำลังค้นหา…', upToDate: 'เป็นเวอร์ชันล่าสุด', nothingNew: 'ไม่มีอะไรใหม่',
  ahead: 'ใหม่กว่าฟีด', aheadSub: 'เวอร์ชันของคุณใหม่กว่าการอัปเดตที่เผยแพร่', silentUpdate: 'อัปเดตแบบเงียบ', silentUpdateSub: 'ใช้การอัปเดตในพื้นหลังโดยไม่แสดงแถบรีบูต',
  deferred: 'เลื่อนการดาวน์โหลด', deferredSub: 'กำลังรอเครือข่ายที่อนุญาต จะทำต่อเมื่อตรวจครั้งถัดไป',
  updateAvail: 'มีการอัปเดต', install: 'ติดตั้ง', fileOne: 'ไฟล์', fileMany: 'ไฟล์',
  requiresReboot: 'ต้องรีบูต', checkFail: 'ตรวจสอบไม่สำเร็จ', ksuUnavailable: 'ไม่สามารถใช้ KSU API ได้',
  pendingUpdate: 'การอัปเดตที่รอดำเนินการ', notNow: 'ยังไม่ใช่ตอนนี้', srcPlaceholder: 'https://…/&lt;โมดูล&gt;'
};
