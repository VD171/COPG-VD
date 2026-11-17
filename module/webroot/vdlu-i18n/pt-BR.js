/* VDLU widget - tradução pt-BR. Inclua ANTES do vdlu.js e passe no init:
 *   <script src="i18n/pt-BR.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_PT_BR });
 * Chaves ausentes caem no default inglês (merge parcial é ok). */
window.VDLU_I18N_PT_BR = {
  ph_diff: 'Analisando', ph_fetch: 'Baixando', ph_apply: 'Aplicando', ph_delete: 'Removendo', ph_commit: 'Verificando',
  st_PLANNED: 'Planejado', st_FETCHING: 'Baixando', st_FETCHED: 'Baixado', st_APPLYING: 'Aplicando',
  st_APPLIED_LIVE: 'Aplicado (vivo)', st_PENDING_REBOOT: 'Aguardando reboot', st_DONE: 'Concluído', st_ERROR: 'Erro',
  processing: 'Processando', updating: 'Atualizando', close: 'Fechar', ok: 'OK', cancel: 'Cancelar',
  bannerReboot: 'Reinicie para ativar a nova', so: '.so',
  appliedV: 'aplicado', updated: 'Atualizado', allVerified: 'tudo verificado',
  appliedLive: 'aplicado (vivo)', appliedShort: 'Aplicado', needRebootSo: 'falta ativar a <code>.so</code> no reboot',
  error: 'Erro', engineFail: 'falha no engine', retry: 'Tentar de novo',
  cancelled: 'Cancelado', applied: 'aplicados', resumable: 'retomável', resume: 'Retomar',
  starting: 'Iniciando…', startFail: 'Falha ao iniciar',
  cancelling: 'Cancelando…', cancellingSub: 'parando no próximo ponto seguro',
  resuming: 'Retomando…', resumeFail: 'Falha ao retomar',
  noResponse: 'Sem resposta', noResponseSub: 'o engine não iniciou ou terminou sem journal',
  checkBtn: 'Procurar atualização', updateNow: 'Atualizar agora', automation: 'Automação',
  onOpen: 'Ao abrir a WebUI', onOpenSub: 'Dispara o VDLU em background (aplica LIVE, encena a <code>.so</code> p/ o reboot).',
  onReboot: 'No reboot', onRebootSub: 'Em pre-zygote aplica tudo, inclusive a <code>.so</code>, sem reboot extra.',
  source: 'Fonte', saveSource: 'Salvar fonte', savedDot: 'Salvo.',
  savedToast: 'salvo', saveFail: 'falha ao salvar', sourceSaved: 'fonte salva',
  searching: 'Procurando…', upToDate: 'Atualizado', nothingNew: 'nada novo',
  updateAvail: 'Atualização disponível', install: 'instalar', fileOne: 'arquivo', fileMany: 'arquivos',
  requiresReboot: 'requer reboot', checkFail: 'Falha no check', ksuUnavailable: 'KSU API indisponível',
  pendingUpdate: 'Atualização pendente', notNow: 'Agora não', srcPlaceholder: 'https://…/&lt;módulo&gt;'
};
