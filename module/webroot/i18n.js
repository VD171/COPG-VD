/*
 * ======================================================================
 *  COPG-VD  ::  global device spoofer
 *  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
 *
 *  Copyright (C) 2026  VD171
 *  SPDX-License-Identifier: Apache-2.0
 *  Fork by VD171.
 *
 *  Licensed under the Apache License, Version 2.0; you may obtain a copy at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/COPG-VD
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
(function () {
  "use strict";
  var AVAILABLE = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja",
                   "ko", "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"];
  var dict = {}, fallback = (window.__I18N_EN || {});

  function pick() {
    try { var s = localStorage.getItem("copgvd_lang"); if (s && AVAILABLE.indexOf(s) >= 0) return s; } catch (e) {}
    var n = (navigator.language || "en").toLowerCase();
    if (AVAILABLE.indexOf(n) >= 0) return n;
    var base = n.split("-")[0];
    if (base === "id") return "in";
    if (base === "iw") return "he";
    if (AVAILABLE.indexOf(base) >= 0) return base;
    return "en";
  }

  async function fetchJson(path) {
    try { var r = await fetch(path, { cache: "no-store" }); return r.ok ? await r.json() : {}; }
    catch (e) { return {}; }
  }

  async function load(lang) {
    if (lang === "en") { dict = fallback; return; }
    var d = await fetchJson("lang/" + lang + ".json");
    dict = Object.keys(d).length ? d : fallback;
  }

  function t(key, vars) {
    var s = dict[key]; if (s == null) s = fallback[key]; if (s == null) s = key;
    if (vars) for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split("${" + k + "}").join(vars[k]);
    return s;
  }

  function apply(root) {
    var r = root || document;
    r.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    r.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    r.querySelectorAll("[data-i18n-title]").forEach(function (el) { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
  }

  window.I18N = {
    AVAILABLE: AVAILABLE,
    current: "en",
    t: t,
    apply: apply,
    async init() { this.current = pick(); await load(this.current); apply(document); },
    async set(lang) { this.current = lang; try { localStorage.setItem("copgvd_lang", lang); } catch (e) {} await load(lang); apply(document); }
  };
  window.t = t;
})();
