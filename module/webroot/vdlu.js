/*
 * VDLU - flashless update widget for a root-manager WebUI (KernelSU/APatch).
 * Vanilla JS, no framework, no build, no CDN. Drop-in into a host index.html.
 * Contract: VDLiveUpdate/INTERFACES.md §4 (journal.json), §5 (config), §9 (WEBUI<->ENGINE).
 *
 * Public API (window.VDLU):
 *   init(opts)             configure the widget (see defaults + i18n below).
 *   onWebUIOpen()          call on host load: evaluates journal/banner + auto_on_webui_open.
 *   mountUpdatesPanel(el)  renders the "Updates" tab inside `el`.
 *   check()               -> Promise<{update,from,to,fetch,reboot}>  (update.sh check).
 *   startUpdate()          fires `run` in the background + progress toast.
 *   cancel()               creates $VDLU_DIR/cancel.
 *   resume()               resumes the current transaction (update.sh resume) + toast.
 *   refreshBanner()        re-evaluates the persistent pending-reboot banner.
 *
 * i18n: all UI strings default to English. A host passes init({i18n:{...}}) to override any
 * key (flat keys below). Phase/state keys are 'ph_<phase>' / 'st_<STATE>'. Keys not overridden
 * fall back to English, so a partial map is fine.
 */
(function () {
  'use strict';

  var DEFAULT_I18N = {
    ph_diff: 'Analyzing', ph_fetch: 'Downloading', ph_apply: 'Applying', ph_delete: 'Removing', ph_commit: 'Verifying',
    st_PLANNED: 'Planned', st_FETCHING: 'Downloading', st_FETCHED: 'Downloaded', st_APPLYING: 'Applying',
    st_APPLIED_LIVE: 'Applied (live)', st_PENDING_REBOOT: 'Awaiting reboot', st_DONE: 'Done', st_ERROR: 'Error',
    processing: 'Processing', updating: 'Updating', close: 'Close', ok: 'OK', cancel: 'Cancel',
    bannerReboot: 'Reboot to activate the new', so: '.so',
    appliedV: 'applied', updated: 'Updated', allVerified: 'all verified',
    appliedLive: 'applied (live)', appliedShort: 'Applied', needRebootSo: 'needs a reboot to activate the <code>.so</code>',
    error: 'Error', engineFail: 'engine failure', retry: 'Retry',
    cancelled: 'Cancelled', applied: 'applied', resumable: 'resumable', resume: 'Resume',
    starting: 'Starting…', startFail: 'Failed to start',
    cancelling: 'Cancelling…', cancellingSub: 'stopping at the next safe point',
    resuming: 'Resuming…', resumeFail: 'Failed to resume',
    noResponse: 'No response', noResponseSub: 'the engine did not start or ended without a journal',
    checkBtn: 'Check for updates', updateNow: 'Update now', automation: 'Automation',
    onOpen: 'On WebUI open', onOpenSub: 'Runs VDLU in the background (applies LIVE, stages the <code>.so</code> for the reboot).',
    onReboot: 'On reboot', onRebootSub: 'In pre-zygote applies everything, including the <code>.so</code>, with no extra reboot.',
    source: 'Source', saveSource: 'Save source', savedDot: 'Saved.',
    savedToast: 'saved', saveFail: 'save failed', sourceSaved: 'source saved',
    searching: 'Searching…', upToDate: 'Up to date', nothingNew: 'nothing new',
    updateAvail: 'Update available', install: 'install', fileOne: 'file', fileMany: 'files',
    requiresReboot: 'requires reboot', checkFail: 'Check failed', ksuUnavailable: 'KSU API unavailable',
    pendingUpdate: 'Pending update', notNow: 'Not now', srcPlaceholder: 'https://…/&lt;module&gt;'
  };
  var I = {};
  for (var _k in DEFAULT_I18N) I[_k] = DEFAULT_I18N[_k];
  function T(k) { return I[k] != null ? I[k] : (DEFAULT_I18N[k] != null ? DEFAULT_I18N[k] : k); }
  function phaseLabel(p) { return I['ph_' + p] || DEFAULT_I18N['ph_' + p]; }
  function stateLabel(s) { return I['st_' + s] || DEFAULT_I18N['st_' + s]; }

  var C = {
    moduleDir: '/data/adb/modules/vdlu',
    vdluDir: '/data/adb/vdlu/vdlu',
    modid: 'vdlu',
    module: 'vdlu',
    pollMs: 1000,
    exec: null,
    toast: null,
    confirm: null,
    onState: null
  };

  var elToast = null, elBanner = null, panelEl = null;
  var pollTimer = null, cancelRequested = false, running = false;
  var lastJournal = null, emptyTicks = 0, cfgCache = null;

  function ex(cmd) {
    if (typeof C.exec === 'function') return C.exec(cmd);
    return new Promise(function (ok, no) {
      var n = 'vdlu_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      window[n] = function (e, out, err) { delete window[n]; e === 0 ? ok(out || '') : no(err || ('rc=' + e)); };
      if (typeof ksu !== 'undefined' && ksu.exec) ksu.exec(cmd, '{}', n);
      else { delete window[n]; no(T('ksuUnavailable')); }
    });
  }

  function toastMsg(m) {
    if (typeof C.toast === 'function') { C.toast(m); return; }
    var t = document.getElementById('vdlu-minitoast');
    if (!t) { t = document.createElement('div'); t.id = 'vdlu-minitoast'; t.className = 'vdlu-minitoast'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
  function envPrefix() { return 'VDLU_DIR=' + q(C.vdluDir) + ' MODULE_DIR=' + q(C.moduleDir) + ' MODID=' + q(C.modid) + ' '; }
  function engine() { return 'sh ' + q(C.moduleDir + '/vdlu/update.sh'); }

  function fmtBytes(n) {
    n = Number(n); if (!n || n < 0) return '';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(1)) + ' ' + u[i];
  }

  // ---- journal JSON (robust parse: the engine's concurrent write may arrive half-written) -------
  function parseJournal(raw) {
    if (!raw) return null;
    raw = raw.trim(); if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return undefined; } // undefined = unreadable now (keep last)
  }
  function readJournal() {
    return ex('cat ' + q(C.vdluDir + '/journal.json') + ' 2>/dev/null').then(parseJournal, function () { return null; });
  }
  function cancelFilePresent() {
    return ex('[ -e ' + q(C.vdluDir + '/cancel') + ' ] && echo P || echo G').then(function (o) { return o.trim() === 'P'; }, function () { return false; });
  }

  // ---- config (key=value, §5): reads all, changes only touched keys, preserves order/unknowns
  function readConfig() {
    return ex('cat ' + q(C.vdluDir + '/config') + ' 2>/dev/null').then(function (raw) {
      var order = [], map = {};
      String(raw || '').split('\n').forEach(function (ln) {
        if (!ln || /^\s*#/.test(ln)) return;
        var i = ln.indexOf('='); if (i < 0) return;
        var k = ln.slice(0, i).trim(), v = ln.slice(i + 1).trim();
        if (!k) return; if (order.indexOf(k) < 0) order.push(k); map[k] = v;
      });
      cfgCache = { order: order, map: map };
      return cfgCache;
    }, function () { cfgCache = { order: [], map: {} }; return cfgCache; });
  }
  function writeConfig(patch) {
    var base = cfgCache || { order: [], map: {} };
    var order = base.order.slice(), map = {};
    base.order.forEach(function (k) { map[k] = base.map[k]; });
    Object.keys(patch).forEach(function (k) {
      var v = String(patch[k]).replace(/[\r\n]/g, '');
      if (order.indexOf(k) < 0) order.push(k); map[k] = v;
    });
    var body = order.map(function (k) { return k + '=' + map[k]; }).join('\n') + '\n';
    var cmd = 'cat > ' + q(C.vdluDir + '/config') + " << 'VDLUEOF'\n" + body + 'VDLUEOF';
    return ex(cmd).then(function () { cfgCache = { order: order, map: map }; return cfgCache; });
  }

  // ---- persistent pending-reboot banner ----------------------------------------------------------
  function ensureBanner() {
    if (elBanner) return elBanner;
    elBanner = document.createElement('div');
    elBanner.id = 'vdlu-banner'; elBanner.className = 'vdlu-banner'; elBanner.hidden = true;
    if (document.body.firstChild) document.body.insertBefore(elBanner, document.body.firstChild);
    else document.body.appendChild(elBanner);
    return elBanner;
  }
  function showBanner(ver) {
    ensureBanner();
    elBanner.innerHTML = '<span class="vdlu-banner-ic">⚠️</span><span class="vdlu-banner-tx">' + esc(T('bannerReboot')) + ' <code>.so</code>'
      + (ver != null ? ' (v' + esc(ver) + ')' : '') + '</span>';
    elBanner.hidden = false;
  }
  function hideBanner() { if (elBanner) elBanner.hidden = true; }
  function refreshBanner() {
    return readJournal().then(function (j) {
      if (j && (j.reboot_pending === true || j.state === 'PENDING_REBOOT')) showBanner(j.target);
      else hideBanner();
      return j;
    });
  }

  // ---- progress toast (non-blocking corner overlay) ----------------------------------------------
  function ensureToast() {
    if (elToast) return elToast;
    elToast = document.createElement('div');
    elToast.id = 'vdlu-toast'; elToast.className = 'vdlu-toast'; elToast.hidden = true;
    elToast.innerHTML =
      '<div class="vdlu-toast-hd"><span class="vdlu-toast-ttl" data-r="ttl">VDLU</span>'
      + '<button class="vdlu-toast-x" type="button" data-r="close" title="' + esc(T('close')) + '">&times;</button></div>'
      + '<div class="vdlu-bar"><i data-r="bar"></i></div>'
      + '<div class="vdlu-toast-ln" data-r="ln"></div>'
      + '<div class="vdlu-toast-ft" data-r="ft"></div>';
    document.body.appendChild(elToast);
    elToast.querySelector('[data-r=close]').addEventListener('click', hideToast);
    return elToast;
  }
  function tr(name) { return elToast.querySelector('[data-r=' + name + ']'); }
  function showToast() { ensureToast(); elToast.hidden = false; }
  function hideToast() { if (elToast) elToast.hidden = true; }

  function renderToast(j, opts) {
    ensureToast(); opts = opts || {};
    var total = Number(j && j.total) || 0, done = Number(j && j.done) || 0;
    var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(done / total * 100))) : (opts.indeterminate ? 0 : 0);
    tr('ttl').textContent = T('updating') + ' ' + (C.module || C.modid) + (j && j.target != null ? ' → v' + j.target : '');
    var bar = tr('bar');
    bar.style.width = pct + '%';
    elToast.classList.toggle('ind', !!opts.indeterminate && total === 0);

    elToast.classList.remove('ok', 'err', 'warn');
    if (opts.kind) elToast.classList.add(opts.kind);

    var ln = tr('ln');
    if (opts.line != null) {
      ln.innerHTML = opts.line;
    } else {
      var ph = phaseLabel(j && j.phase) || stateLabel(j && j.state) || (j && j.state) || T('processing');
      var cur = (j && j.current) ? ' · ' + esc(j.current) : '';
      var by = (j && j.bytes) ? ' · ' + fmtBytes(j.bytes) : '';
      ln.innerHTML = '<b>' + esc(ph) + '</b> ' + done + '/' + (total || '?') + cur + by;
    }

    var ft = tr('ft');
    ft.innerHTML = '';
    (opts.buttons || []).forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button'; el.className = 'vdlu-btn' + (b.cls ? ' ' + b.cls : '');
      el.textContent = b.label; el.addEventListener('click', b.on);
      ft.appendChild(el);
    });
    showToast();
    if (typeof C.onState === 'function') { try { C.onState(j, opts); } catch (e) {} }
  }

  function progressButtons() {
    return [{ label: T('cancel'), cls: 'ghost', on: function () { cancel(); } }];
  }

  // ---- update cycle ------------------------------------------------------------------------------
  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function finishDone(j) {
    stopPoll(); running = false; cancelRequested = false;
    var v = j && j.target != null ? j.target : (lastJournal && lastJournal.target);
    renderToast(j || lastJournal || {}, {
      kind: 'ok',
      line: '<b>' + (v != null ? 'v' + esc(v) + ' ' + esc(T('appliedV')) : esc(T('updated'))) + '</b> · ' + esc(T('allVerified')),
      buttons: [{ label: T('ok'), cls: 'ghost', on: hideToast }]
    });
    hideBanner();
  }
  function finishReboot(j) {
    stopPoll(); running = false; cancelRequested = false;
    var v = j && j.target != null ? j.target : null;
    renderToast(j, {
      kind: 'ok',
      line: '<b>' + (v != null ? 'v' + esc(v) + ' ' + esc(T('appliedLive')) : esc(T('appliedShort'))) + '</b> · ' + T('needRebootSo'),
      buttons: [{ label: T('ok'), cls: 'ghost', on: hideToast }]
    });
    showBanner(v);
  }
  function finishError(j) {
    stopPoll(); running = false; cancelRequested = false;
    var err = (j && j.error) ? j.error : T('engineFail');
    renderToast(j || {}, {
      kind: 'err',
      line: '<b>' + esc(T('error')) + '</b> · ' + esc(err),
      buttons: [
        { label: T('retry'), cls: 'ghost', on: function () { startUpdate(); } },
        { label: T('close'), cls: 'ghost', on: hideToast }
      ]
    });
    hideBanner();
  }
  function finishCancelled(j) {
    stopPoll(); running = false; cancelRequested = false;
    var total = Number(j && j.total) || 0, done = Number(j && j.done) || 0;
    renderToast(j || {}, {
      kind: 'warn',
      line: '<b>' + esc(T('cancelled')) + '</b> · ' + done + '/' + (total || '?') + ' ' + esc(T('applied')) + ' · ' + esc(T('resumable')),
      buttons: [
        { label: T('resume'), cls: 'pri', on: function () { resume(); } },
        { label: T('close'), cls: 'ghost', on: hideToast }
      ]
    });
  }

  function isTerminal(st) { return st === 'DONE' || st === 'ERROR' || st === 'PENDING_REBOOT'; }

  function tick() {
    readJournal().then(function (j) {
      if (j === undefined) return;            // unreadable this tick (partial write): keep current render
      if (j === null) {                        // journal absent
        emptyTicks++;
        if (lastJournal) { finishDone(lastJournal); return; }   // gone after progress => COMMIT cleared the journal (DONE)
        if (emptyTicks >= 8) { stopPoll(); running = false; renderToast({}, { kind: 'err', line: '<b>' + esc(T('noResponse')) + '</b> · ' + esc(T('noResponseSub')), buttons: [{ label: T('close'), cls: 'ghost', on: hideToast }] }); }
        return;
      }
      emptyTicks = 0; lastJournal = j;

      if (j.state === 'ERROR' || j.error) { finishError(j); return; }
      if (j.state === 'PENDING_REBOOT' || j.reboot_pending === true) { finishReboot(j); return; }
      if (j.state === 'DONE') { finishDone(j); return; }
      if (j.cancelled === true) { finishCancelled(j); return; }

      if (cancelRequested) {
        cancelFilePresent().then(function (present) {
          if (!present && !isTerminal(j.state)) finishCancelled(j);   // engine consumed the cancel and stopped at a safe point
          else renderToast(j, { buttons: progressButtons() });
        });
        return;
      }
      renderToast(j, { buttons: progressButtons() });
    }, function () {});
  }

  function startPoll() {
    stopPoll(); emptyTicks = 0;
    pollTimer = setInterval(tick, C.pollMs);
    tick();
  }

  function startUpdate() {
    if (running) { showToast(); return Promise.resolve(); }
    running = true; cancelRequested = false; lastJournal = null;
    renderToast({ target: null, total: 0, done: 0 }, { indeterminate: true, line: '<b>' + esc(T('starting')) + '</b>', buttons: progressButtons() });
    var cmd = '(' + envPrefix() + engine() + ' run >/dev/null 2>&1 &) ; echo started';
    return ex(cmd).then(function () { startPoll(); }, function (err) {
      running = false;
      renderToast({}, { kind: 'err', line: '<b>' + esc(T('startFail')) + '</b> · ' + esc(err), buttons: [{ label: T('close'), cls: 'ghost', on: hideToast }] });
    });
  }

  function cancel() {
    cancelRequested = true;
    renderToast(lastJournal || {}, { line: '<b>' + esc(T('cancelling')) + '</b> · ' + esc(T('cancellingSub')), buttons: [] });
    return ex('touch ' + q(C.vdluDir + '/cancel')).then(function () { if (!pollTimer && running) startPoll(); }, function () {});
  }

  function resume() {
    if (running) { showToast(); return Promise.resolve(); }
    running = true; cancelRequested = false;
    renderToast(lastJournal || {}, { indeterminate: !(lastJournal && lastJournal.total), line: '<b>' + esc(T('resuming')) + '</b>', buttons: progressButtons() });
    var cmd = '(' + envPrefix() + engine() + ' resume >/dev/null 2>&1 &) ; echo resumed';
    return ex(cmd).then(function () { startPoll(); }, function (err) {
      running = false;
      renderToast({}, { kind: 'err', line: '<b>' + esc(T('resumeFail')) + '</b> · ' + esc(err), buttons: [{ label: T('close'), cls: 'ghost', on: hideToast }] });
    });
  }

  function check() {
    return ex(envPrefix() + engine() + ' check 2>&1').then(function (out) {
      var line = String(out).trim().split('\n').filter(function (l) { return l.trim(); }).pop() || '';
      var r;
      try { r = JSON.parse(line); } catch (e) { throw new Error(out.trim() || T('checkFail')); }
      return r;
    });
  }

  // ---- "Updates" tab/panel -----------------------------------------------------------------------
  function mountUpdatesPanel(el) {
    panelEl = typeof el === 'string' ? document.getElementById(el) : el;
    if (!panelEl) return;
    panelEl.classList.add('vdlu-panel');
    panelEl.innerHTML =
      '<div class="vdlu-sec">'
      + '  <div class="vdlu-row vdlu-actions">'
      + '    <button class="vdlu-btn pri" type="button" data-a="check">' + esc(T('checkBtn')) + '</button>'
      + '    <button class="vdlu-btn" type="button" data-a="run">' + esc(T('updateNow')) + '</button>'
      + '  </div>'
      + '  <div class="vdlu-result" data-a="result" hidden></div>'
      + '</div>'
      + '<div class="vdlu-sec">'
      + '  <div class="vdlu-sec-ttl">' + esc(T('automation')) + '</div>'
      + '  <div class="vdlu-tg"><div class="vdlu-tg-tx"><b>' + esc(T('onOpen')) + '</b><small>' + T('onOpenSub') + '</small></div>'
      + '    <span class="vdlu-sw" data-cfg="auto_on_webui_open" role="switch" tabindex="0"></span></div>'
      + '  <div class="vdlu-tg"><div class="vdlu-tg-tx"><b>' + esc(T('onReboot')) + '</b><small>' + T('onRebootSub') + '</small></div>'
      + '    <span class="vdlu-sw" data-cfg="auto_on_reboot" role="switch" tabindex="0"></span></div>'
      + '</div>'
      + '<div class="vdlu-sec">'
      + '  <div class="vdlu-sec-ttl">' + esc(T('source')) + '</div>'
      + '  <label class="vdlu-fld"><span>source</span><input class="vdlu-inp" data-cfg="source" type="text" inputmode="url" spellcheck="false" placeholder="' + T('srcPlaceholder') + '"></label>'
      + '  <label class="vdlu-fld"><span>channel</span><select class="vdlu-sel" data-cfg="channel"><option value="stable">stable</option><option value="canary">canary</option></select></label>'
      + '  <label class="vdlu-fld"><span>profile</span><select class="vdlu-sel" data-cfg="profile"><option value="trusted">trusted</option><option value="hardened">hardened</option></select></label>'
      + '  <button class="vdlu-btn" type="button" data-a="save" hidden>' + esc(T('saveSource')) + '</button>'
      + '  <div class="vdlu-hint" data-a="saved" hidden>' + esc(T('savedDot')) + '</div>'
      + '</div>';

    panelEl.querySelector('[data-a=check]').addEventListener('click', doCheck);
    panelEl.querySelector('[data-a=run]').addEventListener('click', function () { startUpdate(); });
    panelEl.querySelector('[data-a=save]').addEventListener('click', doSaveSource);

    var swToggle = function (sw) {
      var k = sw.getAttribute('data-cfg'), on = !sw.classList.contains('on');
      sw.classList.toggle('on', on); sw.classList.toggle('off', !on);
      var p = {}; p[k] = on ? '1' : '0';
      writeConfig(p).then(function () { toastMsg(T('savedToast')); }, function () { sw.classList.toggle('on'); sw.classList.toggle('off'); toastMsg(T('saveFail')); });
    };
    [].forEach.call(panelEl.querySelectorAll('.vdlu-sw'), function (sw) {
      sw.addEventListener('click', function () { swToggle(sw); });
      sw.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); swToggle(sw); } });
    });
    [].forEach.call(panelEl.querySelectorAll('.vdlu-fld [data-cfg]'), function (f) {
      var markDirty = function () { panelEl.querySelector('[data-a=save]').hidden = false; panelEl.querySelector('[data-a=saved]').hidden = true; };
      f.addEventListener('input', markDirty); f.addEventListener('change', markDirty);
    });

    return readConfig().then(fillPanelFromConfig);
  }

  function fillPanelFromConfig(cfg) {
    if (!panelEl) return;
    var m = (cfg || cfgCache || { map: {} }).map;
    [].forEach.call(panelEl.querySelectorAll('.vdlu-sw[data-cfg]'), function (sw) {
      var on = truthy(m[sw.getAttribute('data-cfg')]);
      sw.classList.toggle('on', on); sw.classList.toggle('off', !on);
    });
    [].forEach.call(panelEl.querySelectorAll('.vdlu-fld [data-cfg]'), function (f) {
      var v = m[f.getAttribute('data-cfg')]; if (v != null) f.value = v;
    });
  }
  function truthy(v) { v = String(v == null ? '' : v).trim().toLowerCase(); return v === '1' || v === 'true' || v === 'on' || v === 'yes'; }

  function doCheck() {
    var box = panelEl.querySelector('[data-a=result]');
    box.hidden = false; box.className = 'vdlu-result'; box.innerHTML = '<span class="vdlu-spin"></span> ' + esc(T('searching'));
    check().then(function (r) {
      if (!r.update) { box.classList.add('ok'); box.innerHTML = '<b>' + esc(T('upToDate')) + '</b> · ' + esc(T('nothingNew')) + (r.from != null ? ' (v' + esc(r.from) + ')' : ''); return; }
      box.classList.add('upd');
      box.innerHTML = '<b>' + esc(T('updateAvail')) + '</b><br>'
        + (r.from != null ? 'v' + esc(r.from) + ' → ' : esc(T('install')) + ' → ') + 'v' + esc(r.to)
        + ' · ' + esc(r.fetch) + ' ' + (Number(r.fetch) === 1 ? esc(T('fileOne')) : esc(T('fileMany')))
        + (r.reboot ? ' · <span class="vdlu-tag">' + esc(T('requiresReboot')) + '</span>' : '')
        + '<div class="vdlu-row" style="margin-top:10px"><button class="vdlu-btn pri" type="button" data-a="run2">' + esc(T('updateNow')) + '</button></div>';
      var b = box.querySelector('[data-a=run2]'); if (b) b.addEventListener('click', function () { startUpdate(); });
    }, function (e) {
      box.classList.add('err'); box.innerHTML = '<b>' + esc(T('checkFail')) + '</b><br>' + esc(e && e.message ? e.message : e);
    });
  }

  function doSaveSource() {
    var p = {};
    ['source', 'channel', 'profile'].forEach(function (k) {
      var f = panelEl.querySelector('.vdlu-fld [data-cfg=' + k + ']'); if (f) p[k] = f.value.trim();
    });
    writeConfig(p).then(function () {
      panelEl.querySelector('[data-a=save]').hidden = true;
      panelEl.querySelector('[data-a=saved]').hidden = false;
      toastMsg(T('sourceSaved'));
    }, function () { toastMsg(T('saveFail')); });
  }

  // ---- host load entry ---------------------------------------------------------------------------
  function onWebUIOpen() {
    ensureBanner();
    return readConfig().then(function (cfg) {
      return readJournal().then(function (j) {
        lastJournal = j || null;
        if (j && (j.state === 'PENDING_REBOOT' || j.reboot_pending === true)) { showBanner(j.target); }
        else if (j && j.state === 'ERROR') { lastJournal = j; }
        else if (j && !isTerminal(j.state)) {
          // non-terminal transaction left by a previous session/boot: offer to resume
          renderToast(j, {
            kind: 'warn',
            line: '<b>' + esc(T('pendingUpdate')) + '</b> · ' + (Number(j.done) || 0) + '/' + (Number(j.total) || '?') + ' · ' + esc(T('resumable')),
            buttons: [{ label: T('resume'), cls: 'pri', on: function () { resume(); } }, { label: T('notNow'), cls: 'ghost', on: hideToast }]
          });
        }
        if (truthy((cfg.map || {}).auto_on_webui_open) && (!j || isTerminal(j.state))) startUpdate();
        return j;
      });
    });
  }

  function init(opts) {
    opts = opts || {};
    if (opts.i18n) { Object.keys(opts.i18n).forEach(function (k) { if (opts.i18n[k] != null) I[k] = opts.i18n[k]; }); }
    Object.keys(opts).forEach(function (k) { if (k !== 'i18n' && opts[k] != null) C[k] = opts[k]; });
    if (!opts.module && opts.modid) C.module = opts.modid;
    ensureBanner();
    return window.VDLU;
  }

  window.VDLU = {
    init: init,
    onWebUIOpen: onWebUIOpen,
    mountUpdatesPanel: mountUpdatesPanel,
    check: check,
    startUpdate: startUpdate,
    cancel: cancel,
    resume: resume,
    refreshBanner: refreshBanner,
    readConfig: readConfig,
    writeConfig: writeConfig,
    i18n: DEFAULT_I18N,
    _config: C
  };
})();
