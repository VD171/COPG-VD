/* VDLU 小部件 - 简体中文翻译。在 vdlu.js 之前加载并在 init 中传入。缺失的键回退到英文默认值（部分合并没问题）。
 *   <script src="i18n/zh.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_ZH });
 */
window.VDLU_I18N_ZH = {
  ph_diff: '正在分析', ph_fetch: '正在下载', ph_apply: '正在应用', ph_delete: '正在移除', ph_commit: '正在校验',
  st_PLANNED: '已计划', st_FETCHING: '正在下载', st_FETCHED: '已下载', st_APPLYING: '正在应用',
  st_APPLIED_LIVE: '已应用（实时）', st_PENDING_REBOOT: '等待重启', st_DONE: '完成', st_ERROR: '错误',
  processing: '处理中', updating: '更新中', close: '关闭', ok: '确定', cancel: '取消',
  bannerReboot: '重启以激活新版本', so: '.so',
  appliedV: '已应用', updated: '已更新', allVerified: '全部已校验',
  appliedLive: '已应用（实时）', appliedShort: '已应用', needRebootSo: '需要重启以激活 <code>.so</code>',
  error: '错误', engineFail: '引擎故障', retry: '重试',
  cancelled: '已取消', applied: '已应用', resumable: '可恢复', resume: '恢复',
  starting: '正在启动…', startFail: '启动失败',
  cancelling: '正在取消…', cancellingSub: '将在下一个安全点停止',
  resuming: '正在恢复…', resumeFail: '恢复失败',
  noResponse: '无响应', noResponseSub: '引擎未启动或在没有日志的情况下结束',
  checkBtn: '检查更新', updateNow: '立即更新', automation: '自动化',
  onOpen: '打开 WebUI 时', onOpenSub: '在后台运行 VDLU（实时应用，为重启准备 <code>.so</code>）。',
  onReboot: '重启时', onRebootSub: '在 pre-zygote 阶段应用所有内容，包括 <code>.so</code>，无需额外重启。',
  bootRetryEvery: '启动重试间隔（秒）', bootRetryUpTo: '启动重试上限（分钟）', bootRetryHint: '如果设备离线启动，持续重试获取清单。0 分钟 = 关闭。',
  source: '来源', saveSource: '保存来源', savedDot: '已保存。',
  netPolicy: '网络', netAny: 'Wi-Fi + 移动数据', netWifi: '仅 Wi-Fi', netMobile: '仅移动数据',
  savedToast: '已保存', saveFail: '保存失败', sourceSaved: '来源已保存',
  bootstrapping: '正在准备更新程序…', bootstrapSub: '一次性下载提取器', bootstrapFail: '无法准备更新程序',
  searching: '正在搜索…', upToDate: '已是最新', nothingNew: '没有新内容',
  ahead: '比订阅源更新', aheadSub: '你的版本比已发布的更新更新', silentUpdate: '静默更新', silentUpdateSub: '在后台应用更新，不显示重启栏。',
  deferred: '已推迟下载', deferredSub: '正在等待允许的网络，将在下次检查时恢复',
  updateAvail: '有可用更新', install: '安装', fileOne: '个文件', fileMany: '个文件',
  requiresReboot: '需要重启', checkFail: '检查失败', ksuUnavailable: 'KSU API 不可用',
  pendingUpdate: '待处理的更新', notNow: '暂不', srcPlaceholder: 'https://…/&lt;模块&gt;'
};
