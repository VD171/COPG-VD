// COPG-VD WebUI i18n. Loads lang/<code>.json over same-origin fetch (CSP connect-src 'self'),
// falls back to English, and fills ${expr} placeholders left verbatim from the source strings.
(function () {
  "use strict";
  var AVAILABLE = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja",
                   "ko", "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"];
  var dict = {}, fallback = {};

  function pick() {
    try { var s = localStorage.getItem("copgvd_lang"); if (s && AVAILABLE.indexOf(s) >= 0) return s; } catch (e) {}
    var n = (navigator.language || "en").toLowerCase();
    if (AVAILABLE.indexOf(n) >= 0) return n;
    var base = n.split("-")[0];
    if (base === "id") return "in";            // Android legacy code for Indonesian
    if (base === "iw") return "he";            // (not shipped, but normalize)
    if (AVAILABLE.indexOf(base) >= 0) return base;
    return "en";
  }

  async function fetchJson(path) {
    try { var r = await fetch(path, { cache: "no-store" }); return r.ok ? await r.json() : {}; }
    catch (e) { return {}; }
  }

  async function load(lang) {
    fallback = await fetchJson("lang/en.json");
    dict = (lang === "en") ? fallback : await fetchJson("lang/" + lang + ".json");
  }

  // t(key, vars): vars keys are the EXACT ${...} expression text kept in the strings,
  // e.g. t("msg_070", {"error": e}) or t("msg_061", {"successCount": n, "files.length": m}).
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
  window.t = t;   // scripts.js calls t(...) directly
})();
