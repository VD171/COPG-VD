/* VDLU विजेट - हिन्दी अनुवाद। vdlu.js से पहले लोड करें और init में पास करें। अनुपस्थित कुंजियाँ अंग्रेज़ी डिफ़ॉल्ट पर लौटती हैं (आंशिक मर्ज ठीक है)।
 *   <script src="i18n/hi.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_HI });
 */
window.VDLU_I18N_HI = {
  ph_diff: 'विश्लेषण कर रहे हैं', ph_fetch: 'डाउनलोड हो रहा है', ph_apply: 'लागू कर रहे हैं', ph_delete: 'हटा रहे हैं', ph_commit: 'सत्यापित कर रहे हैं',
  st_PLANNED: 'नियोजित', st_FETCHING: 'डाउनलोड हो रहा है', st_FETCHED: 'डाउनलोड हो गया', st_APPLYING: 'लागू हो रहा है',
  st_APPLIED_LIVE: 'लागू (लाइव)', st_PENDING_REBOOT: 'रीबूट की प्रतीक्षा', st_DONE: 'पूर्ण', st_ERROR: 'त्रुटि',
  processing: 'संसाधित हो रहा है', updating: 'अपडेट हो रहा है', close: 'बंद करें', ok: 'ठीक है', cancel: 'रद्द करें',
  bannerReboot: 'नई को सक्रिय करने के लिए रीबूट करें', so: '.so',
  appliedV: 'लागू', updated: 'अपडेट किया गया', allVerified: 'सब सत्यापित',
  appliedLive: 'लागू (लाइव)', appliedShort: 'लागू', needRebootSo: '<code>.so</code> सक्रिय करने के लिए रीबूट आवश्यक',
  error: 'त्रुटि', engineFail: 'इंजन विफल', retry: 'पुनः प्रयास',
  cancelled: 'रद्द किया गया', applied: 'लागू', resumable: 'फिर से शुरू करने योग्य', resume: 'फिर से शुरू करें',
  starting: 'शुरू हो रहा है…', startFail: 'शुरू नहीं हो सका',
  cancelling: 'रद्द हो रहा है…', cancellingSub: 'अगले सुरक्षित बिंदु पर रुकेगा',
  resuming: 'फिर से शुरू हो रहा है…', resumeFail: 'फिर से शुरू नहीं हो सका',
  noResponse: 'कोई प्रतिक्रिया नहीं', noResponseSub: 'इंजन शुरू नहीं हुआ या बिना जर्नल के समाप्त हो गया',
  checkBtn: 'अपडेट जाँचें', updateNow: 'अभी अपडेट करें', automation: 'स्वचालन',
  onOpen: 'WebUI खुलने पर', onOpenSub: 'VDLU को पृष्ठभूमि में चलाता है (लाइव लागू करता है, रीबूट के लिए <code>.so</code> तैयार करता है)।',
  onReboot: 'रीबूट पर', onRebootSub: 'pre-zygote में सब कुछ लागू करता है, <code>.so</code> सहित, बिना अतिरिक्त रीबूट के।',
  bootRetryEvery: 'बूट पर पुनः प्रयास हर (से)', bootRetryUpTo: 'बूट पर पुनः प्रयास अधिकतम (मिन)', bootRetryHint: 'यदि डिवाइस ऑफ़लाइन बूट होता है, तो मैनिफ़ेस्ट डाउनलोड का प्रयास करते रहें। 0 मिन = बंद।',
  source: 'स्रोत', saveSource: 'स्रोत सहेजें', savedDot: 'सहेजा गया।',
  netPolicy: 'नेटवर्क', netAny: 'Wi-Fi + मोबाइल', netWifi: 'केवल Wi-Fi', netMobile: 'केवल मोबाइल',
  savedToast: 'सहेजा गया', saveFail: 'सहेजना विफल', sourceSaved: 'स्रोत सहेजा गया',
  bootstrapping: 'अपडेटर तैयार हो रहा है…', bootstrapSub: 'फ़ेचर का एक-बार डाउनलोड', bootstrapFail: 'अपडेटर तैयार नहीं हो सका',
  searching: 'खोज हो रही है…', upToDate: 'अद्यतित', nothingNew: 'कुछ नया नहीं',
  ahead: 'फ़ीड से नया', aheadSub: 'आपका संस्करण प्रकाशित अपडेट से नया है', deferred: 'डाउनलोड स्थगित', deferredSub: 'अनुमत नेटवर्क की प्रतीक्षा - अगली जाँच पर फिर शुरू होगा',
  updateAvail: 'अपडेट उपलब्ध', install: 'इंस्टॉल करें', fileOne: 'फ़ाइल', fileMany: 'फ़ाइलें',
  requiresReboot: 'रीबूट आवश्यक', checkFail: 'जाँच विफल', ksuUnavailable: 'KSU API अनुपलब्ध',
  pendingUpdate: 'लंबित अपडेट', notNow: 'अभी नहीं', srcPlaceholder: 'https://…/&lt;मॉड्यूल&gt;'
};
