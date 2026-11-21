/*
 * ======================================================================
 *  VDLiveUpdate (VDLU)  ::  flashless, incremental module updates
 *  A self-update engine for KernelSU/APatch/Magisk modules.
 *
 *  Copyright (C) 2026  VD171
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/VDLiveUpdate
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Channel        : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
/*
 * VDLU - flashless update widget for a root-manager WebUI (KernelSU/APatch).
 * Vanilla JS, no framework, no build, no CDN. Drop-in into a host index.html.
 * Contract: VDLiveUpdate/docs/INTERFACES.md §4 (journal.json), §5 (config), §9 (WEBUI<->ENGINE).
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
    bootRetryEvery: 'Boot retry every (s)', bootRetryUpTo: 'Boot retry up to (min)', bootRetryHint: 'If the device boots offline, keep retrying the manifest fetch. 0 min = off.',
    source: 'Source', saveSource: 'Save source', savedDot: 'Saved.',
    netPolicy: 'Network', netAny: 'Wi-Fi + mobile', netWifi: 'Wi-Fi only', netMobile: 'Mobile only',
    savedToast: 'saved', saveFail: 'save failed', sourceSaved: 'source saved',
    bootstrapping: 'Preparing updater…', bootstrapSub: 'one-time download of the fetcher', bootstrapFail: 'Could not prepare the updater',
    searching: 'Searching…', upToDate: 'Up to date', nothingNew: 'nothing new',
      ahead: 'Newer than the feed', aheadSub: 'your version is ahead of the published update',
      deferred: 'Download deferred', deferredSub: 'waiting for the allowed network - resumes at the next check',
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
    toolsSource: null,
    pollMs: 1000,
    exec: null,
    toast: null,
    confirm: null,
    onState: null
  };

  var elToast = null, elBanner = null, panelEl = null;
  var pollTimer = null, cancelRequested = false, running = false;
  var lastJournal = null, emptyTicks = 0, staleTicks = 0, lastSig = null, cfgCache = null;

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
  function engineRunning() {
    return ex('[ -d ' + q(C.vdluDir + '/lock.d') + ' ] && echo R || echo G').then(function (o) { return String(o).trim() === 'R'; }, function () { return false; });
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
      if (j && j.state === 'PENDING_REBOOT') showBanner(j.target);
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
    var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(done / total * 100))) : 0;
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
  // net_policy deferred the download to the allowed network - a benign wait, NOT an error. Gentle toast,
  // resumes on the next check/boot (or a manual retry) when the device is on the right network.
  function finishDeferred(j) {
    stopPoll(); running = false; cancelRequested = false;
    renderToast(j || {}, {
      kind: 'info',
      line: '<b>' + esc(T('deferred')) + '</b> · ' + esc((j && j.current) || T('deferredSub')),
      buttons: [
        { label: T('retry'), cls: 'ghost', on: function () { startUpdate(); } },
        { label: T('close'), cls: 'ghost', on: hideToast }
      ]
    });
    hideBanner();
  }

  function isTerminal(st) { return st === 'DONE' || st === 'ERROR' || st === 'PENDING_REBOOT' || st === 'DEFERRED'; }

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
      if (j.state === 'DEFERRED') { finishDeferred(j); return; }
      if (j.state === 'PENDING_REBOOT') { finishReboot(j); return; }   // terminal state is authoritative, NOT reboot_pending (which is true from the first fetch of any .so plan)
      if (j.state === 'DONE') { finishDone(j); return; }
      if (j.cancelled === true) { finishCancelled(j); return; }

      if (cancelRequested) {
        cancelFilePresent().then(function (present) {
          if (!present && !isTerminal(j.state)) finishCancelled(j);   // engine consumed the cancel and stopped at a safe point
          else renderToast(j, { buttons: progressButtons() });
        });
        return;
      }
      // stale-journal guard: a journal frozen on the same values is either a slow single-blob fetch OR an
      // engine that died mid-run (killed/crashed) without a terminal state. After staleTicks the lock is the
      // arbiter: alive => keep waiting (reset), dead => surface it instead of polling "updating" forever.
      var sig = j.state + '|' + (j.phase || '') + '|' + (j.done || 0) + '|' + (j.total || 0) + '|' + (j.current || '');
      if (sig === lastSig) {
        staleTicks++;
        if (staleTicks >= 20) {
          engineRunning().then(function (alive) {
            if (alive) { staleTicks = 0; renderToast(j, { buttons: progressButtons() }); return; }
            stopPoll(); running = false;
            renderToast(j, { kind: 'err', line: '<b>' + esc(T('error')) + '</b> · ' + esc(T('engineFail')), buttons: [{ label: T('resume'), cls: 'pri', on: function () { resume(); } }, { label: T('close'), cls: 'ghost', on: hideToast }] });
          });
          return;
        }
      } else { staleTicks = 0; lastSig = sig; }
      renderToast(j, { buttons: progressButtons() });
    }, function () {});
  }

  function startPoll() {
    stopPoll(); emptyTicks = 0; staleTicks = 0; lastSig = null;
    pollTimer = setInterval(tick, C.pollMs);
    tick();
  }

  // ---- fetch-bootstrap of the toolchain (webview-TLS approach for slim modules) ------------------
  // Slim modules ship NO curl. On the first https update, the WebUI (webview TLS) downloads the static
  // curl + the SIGNED tools-manifest, writes them to $VDLU_DIR/.work, and the engine's `install-tool`
  // verifies the manifest signature (ed25519-mini) AND the binary hash BEFORE adopting it into Tier-2
  // ($VDLU_DIR/tools/<abi>). Persisted there, it survives module updates: never re-fetched. A file://
  // (private/staging) source needs no curl, so this is a no-op there. The webview `fetch()` is just
  // transport - trust comes from the on-device signature/hash check, never from the download.
  var _abi = null;
  function curAbi() {
    if (_abi != null) return Promise.resolve(_abi);
    return ex('getprop ro.product.cpu.abi').then(function (o) { _abi = String(o || '').trim(); return _abi; }, function () { return ''; });
  }
  function deriveToolsFeed(src) {
    if (C.toolsSource) return C.toolsSource;
    if (!src) return '';
    return String(src).replace(/\/+$/, '').replace(/\/[^/]*$/, '/vdlu-tools');
  }
  function b64(u8) { var s = '', i; for (i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
  function writeB64Chunked(path, u8) {
    var CH = 49152, p = ex('rm -f ' + q(path) + ' && mkdir -p ' + q(path.replace(/\/[^/]*$/, '')));
    for (var off = 0; off < u8.length; off += CH) {
      (function (slice) { p = p.then(function () { return ex('printf %s ' + q(b64(slice)) + ' | base64 -d >> ' + q(path)); }); })(u8.subarray(off, off + CH));
    }
    return p;
  }
  function httpGet(url, binary) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch() in this webview'));
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return binary ? r.arrayBuffer() : r.text();
    });
  }
  function bootstrapTool(abi, cfg) {
    var feed = deriveToolsFeed((cfg.map || {}).tools_source || (cfg.map || {}).source);
    if (!feed) return Promise.reject(new Error('no tools_source'));
    feed = feed.replace(/\/+$/, '');
    var work = C.vdluDir + '/.work';
    renderToast({}, { indeterminate: true, line: '<b>' + esc(T('bootstrapping')) + '</b> · ' + esc(T('bootstrapSub')), buttons: [] });
    return httpGet(feed + '/tools-manifest.json', false).then(function (tm) {
      return ex('mkdir -p ' + q(work) + ' && printf %s ' + q(btoa(unescape(encodeURIComponent(String(tm))))) + ' | base64 -d > ' + q(work + '/tools-manifest.json'));
    }).then(function () {
      return httpGet(feed + '/' + abi + '/curl', true);
    }).then(function (buf) {
      return writeB64Chunked(work + '/tool.' + abi, new Uint8Array(buf));
    }).then(function () {
      return ex(envPrefix() + engine() + ' install-tool ' + q(abi) + ' 2>&1');
    });
  }
  function ensureToolchain() {
    return readConfig().then(function (cfg) {
      var src = (cfg.map || {}).source || '';
      if (src.indexOf('file://') === 0) return true;      // local staging: no curl needed
      return curAbi().then(function (abi) {
        if (!abi) return true;                             // unknown ABI: let the engine try
        // curl already available? Tier-2 (slim bootstrap), OR the host module's own bin/<abi> (a host
        // module may bundle curl/restic/rclone for its OWN features - VDLU reuses it), OR system.
        var probe = '{ [ -x ' + q(C.vdluDir + '/tools/' + abi + '/curl') + ' ] || [ -x ' + q(C.moduleDir + '/bin/' + abi + '/curl') + ' ] || command -v curl >/dev/null 2>&1 ; } && echo Y || echo N';
        return ex(probe).then(function (o) {
          if (String(o).trim() === 'Y') return true;       // present (Tier-2 / bundled / system) - no bootstrap
          return bootstrapTool(abi, cfg);
        });
      });
    });
  }

  function startUpdate() {
    if (running) { showToast(); return Promise.resolve(); }
    running = true; cancelRequested = false; lastJournal = null;
    renderToast({ target: null, total: 0, done: 0 }, { indeterminate: true, line: '<b>' + esc(T('starting')) + '</b>', buttons: progressButtons() });
    return ensureToolchain().then(doStartUpdate, function (err) {
      running = false;
      renderToast({}, { kind: 'err', line: '<b>' + esc(T('bootstrapFail')) + '</b> · ' + esc(err && err.message ? err.message : err), buttons: [{ label: T('close'), cls: 'ghost', on: hideToast }] });
    });
  }

  function doStartUpdate() {
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
    return ensureToolchain().then(function () {
      var cmd = '(' + envPrefix() + engine() + ' resume >/dev/null 2>&1 &) ; echo resumed';
      return ex(cmd).then(function () { startPoll(); }, function (err) {
        running = false;
        renderToast({}, { kind: 'err', line: '<b>' + esc(T('resumeFail')) + '</b> · ' + esc(err), buttons: [{ label: T('close'), cls: 'ghost', on: hideToast }] });
      });
    }, function (err) {
      running = false;
      renderToast({}, { kind: 'err', line: '<b>' + esc(T('bootstrapFail')) + '</b> · ' + esc(err && err.message ? err.message : err), buttons: [{ label: T('close'), cls: 'ghost', on: hideToast }] });
    });
  }

  function check() {
    return ensureToolchain().then(function () {
      return ex(envPrefix() + engine() + ' check 2>&1');
    }).then(function (out) {
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
      + '  <label class="vdlu-fld"><span>' + esc(T('bootRetryEvery')) + '</span><input class="vdlu-num" data-cfg="boot_retry_interval" type="number" min="5" step="5" inputmode="numeric"></label>'
      + '  <label class="vdlu-fld"><span>' + esc(T('bootRetryUpTo')) + '</span><input class="vdlu-num" data-cfg="boot_retry_minutes" type="number" min="0" step="1" inputmode="numeric"></label>'
      + '  <div class="vdlu-hint">' + esc(T('bootRetryHint')) + '</div>'
      + '</div>'
      + '<div class="vdlu-sec">'
      + '  <div class="vdlu-sec-ttl">' + esc(T('source')) + '</div>'
      + '  <label class="vdlu-fld"><span>source</span><input class="vdlu-inp" data-cfg="source" type="text" inputmode="url" spellcheck="false" placeholder="' + T('srcPlaceholder') + '"></label>'
      + '  <label class="vdlu-fld"><span>channel</span><select class="vdlu-sel" data-cfg="channel"><option value="stable">stable</option><option value="canary">canary</option></select></label>'
      + '  <label class="vdlu-fld"><span>profile</span><select class="vdlu-sel" data-cfg="profile"><option value="trusted">trusted</option><option value="hardened">hardened</option></select></label>'
      + '  <label class="vdlu-fld"><span>' + esc(T('netPolicy')) + '</span><select class="vdlu-sel" data-cfg="net_policy"><option value="any">' + esc(T('netAny')) + '</option><option value="wifi">' + esc(T('netWifi')) + '</option><option value="mobile">' + esc(T('netMobile')) + '</option></select></label>'
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
    [].forEach.call(panelEl.querySelectorAll('.vdlu-fld [data-cfg]:not(.vdlu-num)'), function (f) {
      var markDirty = function () { panelEl.querySelector('[data-a=save]').hidden = false; panelEl.querySelector('[data-a=saved]').hidden = true; };
      f.addEventListener('input', markDirty); f.addEventListener('change', markDirty);
    });
    // numeric config fields (boot retry) save immediately on change, like the toggles; revert on bad input.
    [].forEach.call(panelEl.querySelectorAll('.vdlu-num[data-cfg]'), function (n) {
      n.addEventListener('change', function () {
        var k = n.getAttribute('data-cfg'), v = String(n.value).trim();
        if (!/^\d+$/.test(v)) { n.value = ((cfgCache || { map: {} }).map || {})[k] || ''; return; }
        var p = {}; p[k] = v;
        writeConfig(p).then(function () { toastMsg(T('savedToast')); }, function () { n.value = ((cfgCache || { map: {} }).map || {})[k] || ''; toastMsg(T('saveFail')); });
      });
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

  function renderCheckResult(r, err) {
    if (!panelEl) return;                               // no panel mounted: stay quiet (auto-open)
    var box = panelEl.querySelector('[data-a=result]');
    if (!box) return;
    box.hidden = false; box.className = 'vdlu-result';
    if (err) { box.classList.add('err'); box.innerHTML = '<b>' + esc(T('checkFail')) + '</b><br>' + esc(err && err.message ? err.message : err); return; }
    if (r.ahead) { box.classList.add('ok'); box.innerHTML = '<b>' + esc(T('ahead')) + '</b> · ' + esc(T('aheadSub')) + (r.from != null ? ' (v' + esc(r.from) + (r.to != null ? ' &gt; v' + esc(r.to) : '') + ')' : ''); return; }
    if (!r.update) { box.classList.add('ok'); box.innerHTML = '<b>' + esc(T('upToDate')) + '</b> · ' + esc(T('nothingNew')) + (r.from != null ? ' (v' + esc(r.from) + ')' : ''); return; }
    box.classList.add('upd');
    box.innerHTML = '<b>' + esc(T('updateAvail')) + '</b><br>'
      + (r.from != null ? 'v' + esc(r.from) + ' → ' : esc(T('install')) + ' → ') + 'v' + esc(r.to)
      + ' · ' + esc(r.fetch) + ' ' + (Number(r.fetch) === 1 ? esc(T('fileOne')) : esc(T('fileMany')))
      + (r.reboot ? ' · <span class="vdlu-tag">' + esc(T('requiresReboot')) + '</span>' : '')
      + '<div class="vdlu-row" style="margin-top:10px"><button class="vdlu-btn pri" type="button" data-a="run2">' + esc(T('updateNow')) + '</button></div>';
    var b = box.querySelector('[data-a=run2]'); if (b) b.addEventListener('click', function () { startUpdate(); });
  }
  function doCheck() {
    if (!panelEl) return;
    var box = panelEl.querySelector('[data-a=result]');
    box.hidden = false; box.className = 'vdlu-result'; box.innerHTML = '<span class="vdlu-spin"></span> ' + esc(T('searching'));
    check().then(function (r) { renderCheckResult(r); }, function (e) { renderCheckResult(null, e); });
  }
  // auto_on_webui_open: quiet check first; the persistent progress toast (and auto-apply) only when a real
  // download will happen (update && fetch>0). Otherwise the result shows inline in the panel - no toast left.
  function autoUpdate() {
    return check().then(function (r) {
      if (r.update && Number(r.fetch) > 0) { startUpdate(); return; }
      hideToast();                                      // clear the one-time bootstrap toast, if any
      renderCheckResult(r);
    }, function (e) {
      hideToast();
      renderCheckResult(null, e);
    });
  }

  function doSaveSource() {
    var p = {};
    ['source', 'channel', 'profile', 'net_policy'].forEach(function (k) {
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
        if (j && j.state === 'PENDING_REBOOT') { showBanner(j.target); }
        else if (j && !isTerminal(j.state)) {
          // non-terminal transaction left by a previous session/boot: offer to resume
          renderToast(j, {
            kind: 'warn',
            line: '<b>' + esc(T('pendingUpdate')) + '</b> · ' + (Number(j.done) || 0) + '/' + (Number(j.total) || '?') + ' · ' + esc(T('resumable')),
            buttons: [{ label: T('resume'), cls: 'pri', on: function () { resume(); } }, { label: T('notNow'), cls: 'ghost', on: hideToast }]
          });
        }
        if (truthy((cfg.map || {}).auto_on_webui_open) && (!j || isTerminal(j.state))) autoUpdate();
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
