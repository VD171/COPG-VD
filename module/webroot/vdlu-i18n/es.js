/* Widget VDLU - traducción al español. Cárgalo ANTES de vdlu.js y pásalo en init. Las claves faltantes usan el valor en inglés (la fusión parcial está bien).
 *   <script src="i18n/es.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_ES });
 */
window.VDLU_I18N_ES = {
  ph_diff: 'Analizando', ph_fetch: 'Descargando', ph_apply: 'Aplicando', ph_delete: 'Eliminando', ph_commit: 'Verificando',
  st_PLANNED: 'Planificado', st_FETCHING: 'Descargando', st_FETCHED: 'Descargado', st_APPLYING: 'Aplicando',
  st_APPLIED_LIVE: 'Aplicado (en vivo)', st_PENDING_REBOOT: 'Esperando reinicio', st_DONE: 'Listo', st_ERROR: 'Error',
  processing: 'Procesando', updating: 'Actualizando', close: 'Cerrar', ok: 'OK', cancel: 'Cancelar',
  bannerReboot: 'Reinicia para activar la nueva', so: '.so',
  appliedV: 'aplicado', updated: 'Actualizado', allVerified: 'todo verificado',
  appliedLive: 'aplicado (en vivo)', appliedShort: 'Aplicado', needRebootSo: 'requiere reiniciar para activar la <code>.so</code>',
  error: 'Error', engineFail: 'fallo del motor', retry: 'Reintentar',
  cancelled: 'Cancelado', applied: 'aplicados', resumable: 'reanudable', resume: 'Reanudar',
  starting: 'Iniciando…', startFail: 'No se pudo iniciar',
  cancelling: 'Cancelando…', cancellingSub: 'se detendrá en el próximo punto seguro',
  resuming: 'Reanudando…', resumeFail: 'No se pudo reanudar',
  noResponse: 'Sin respuesta', noResponseSub: 'el motor no se inició o terminó sin journal',
  checkBtn: 'Buscar actualizaciones', updateNow: 'Actualizar ahora', automation: 'Automatización',
  onOpen: 'Al abrir la WebUI', onOpenSub: 'Ejecuta VDLU en segundo plano (aplica LIVE, prepara la <code>.so</code> para el reinicio).',
  onReboot: 'Al reiniciar', onRebootSub: 'En pre-zygote aplica todo, incluida la <code>.so</code>, sin reinicio adicional.',
  bootRetryEvery: 'Reintento de arranque cada (s)', bootRetryUpTo: 'Reintento de arranque hasta (min)', bootRetryHint: 'Si el dispositivo arranca sin conexión, sigue reintentando la descarga del manifiesto. 0 min = desactivado.',
  source: 'Fuente', saveSource: 'Guardar fuente', savedDot: 'Guardado.',
  netPolicy: 'Red', netAny: 'Wi-Fi + móvil', netWifi: 'Solo Wi-Fi', netMobile: 'Solo móvil',
  savedToast: 'guardado', saveFail: 'error al guardar', sourceSaved: 'fuente guardada',
  bootstrapping: 'Preparando el actualizador…', bootstrapSub: 'descarga única del fetcher', bootstrapFail: 'No se pudo preparar el actualizador',
  searching: 'Buscando…', upToDate: 'Actualizado', nothingNew: 'nada nuevo',
  ahead: 'Más nueva que el feed', aheadSub: 'tu versión es más reciente que la actualización publicada', deferred: 'Descarga aplazada', deferredSub: 'esperando la red permitida - se reanuda en la próxima comprobación',
  updateAvail: 'Actualización disponible', install: 'instalar', fileOne: 'archivo', fileMany: 'archivos',
  requiresReboot: 'requiere reinicio', checkFail: 'Error al comprobar', ksuUnavailable: 'API de KSU no disponible',
  pendingUpdate: 'Actualización pendiente', notNow: 'Ahora no', srcPlaceholder: 'https://…/&lt;módulo&gt;'
};
