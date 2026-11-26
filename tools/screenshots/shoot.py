#!/usr/bin/env python3
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build: Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  AlirezaParsi & VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#  Fork by VD171.
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/COPG-VD
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
#
#  WebUI screenshot harness. Renders the real module/webroot WebUI in a
#  headless Chrome under a mocked `ksu.exec` bridge that answers every
#  shell command the UI runs with fictional, privacy-safe fixtures (a
#  coherent spoofed Pixel profile, NEVER a real device), then captures the
#  documented tabs in each of the 22 languages (dark theme, device chrome).
#  Output: docs/screenshots/<lang>/.
#
#  Why this lives in the repo:
#   - the version badge, the device fields, every label and the scope badge
#     come from the live webroot + lang/*.json, so a UI or string change is
#     reflected on the next run with no edit here;
#   - the shown version is read from module/module.prop, so a release bump
#     needs no change here either;
#   - fixtures are declared once in build_fixtures() below.
#
#  Usage:
#     python3 tools/screenshots/shoot.py            # all 22 languages
#     python3 tools/screenshots/shoot.py pt en ar   # only the given codes
#  Requires: python3-playwright + a system Google Chrome/Chromium.
# ======================================================================

import json
import os
import socketserver
import sys
import threading
from http.server import SimpleHTTPRequestHandler

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WEBROOT = os.path.join(ROOT, "module", "webroot")
OUTDIR = os.path.join(ROOT, "docs", "screenshots")
LANGS = ["ar", "cs", "de", "en", "es", "fa", "fr", "hi", "id", "it", "ja",
         "ko", "nl", "pl", "pt", "ru", "sv", "th", "tr", "uk", "vi", "zh"]
# (tab id to switch to, output basename) - matches COPG's documented set.
SCREENS = [
    ("devices", "device"),
    ("spoofing", "spoofing"),
    ("system", "system"),
    ("tools", "tools"),
]
VIEWPORT = {"width": 400, "height": 890}
SCALE = 3


def module_version():
    try:
        with open(os.path.join(ROOT, "module", "module.prop"), encoding="utf-8") as f:
            for line in f:
                if line.startswith("version="):
                    return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return "v6.0-vd"


def build_fixtures(version):
    # Fictional, privacy-safe spoofed profile: a coherent Pixel 9 Pro
    # (caiman) with invented build ids. NEVER derived from a real device.
    config = {
        "COPG-VD": {
            "DEVICE": "caiman",
            "BRAND": "google",
            "MODEL": "Pixel 9 Pro",
            "PRODUCT": "caiman",
            "MANUFACTURER": "Google",
            "FINGERPRINT": "google/caiman/caiman:16/BP31.250905.011/13698765:user/release-keys",
            "BOARD": "caiman",
            "BOOTLOADER": "unknown",
            "HARDWARE": "caiman",
            "ID": "BP31.250905.011",
            "DISPLAY": "BP31.250905.011",
            "HOST": "r-de3-a1b2c4d6",
            "INCREMENTAL": "13698765",
            "TIMESTAMP": "1756998000",
            "SECURITY_PATCH": "2025-09-05",
            "PREVIEW_SDK": "0",
            "SDK_FULL": "16",
            "CODENAME": "REL",
            "USER": "android-build",
            "SDK_FINGERPRINT": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
            "ANDROID_VERSION": "16",
            "SDK_INT": "36",
            "FIRST_API_LEVEL": "34",
        },
        "COPG-VD-Delete": [],
        "global_fields": [],
        "scope_mode": "playstore",
        "motor_jni": True,
        "motor_prop_hook": True,
        "prop_method": "mmap",
        "motor_drm": False,
        "verbose_logs": False,
        "resetprop": {
            "enabled": True,
            "grupos": {
                "identity": True, "version": False, "boot_state": True,
                "selinux_bootmode": True, "adb_usb": True,
                "anti_emulator": True, "cleanup": True,
            },
        },
        "COPG-VD-Settings": {
            "resetprop": "true", "autoupdate": "true", "spoof_version": "rom",
        },
    }
    # ROM reported by the (simulated) real device: used by the version
    # policy hint. Coherent with a Pixel on Android 16 / SDK 36.
    return {
        "version": version,
        "config": config,
        "rom_release": "16",
        "rom_sdk": "36",
    }


MOCK_JS = r"""
(function () {
  try { localStorage.setItem('theme', 'dark'); } catch (e) {}
  try { localStorage.setItem('copgvd_lang', "%LANG%"); } catch (e) {}

  var FIX = %FIX%;
  var CONFIG_JSON = JSON.stringify(FIX.config);

  function settingValue(cmd) {
    var m = /grep -oE '"([a-z_]+)"/.exec(cmd);
    if (!m) return "";
    var s = (FIX.config["COPG-VD-Settings"] || {});
    var v = s[m[1]];
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function answer(cmd) {
    cmd = String(cmd);
    // readSetting(): grep over the Settings object -> one scalar value.
    if (cmd.indexOf('COPG-VD-Settings') >= 0 && cmd.indexOf('grep -oE') >= 0) {
      return settingValue(cmd);
    }
    // loadVersion(): version= from module.prop.
    if (cmd.indexOf('module.prop') >= 0 && cmd.indexOf('version=') >= 0) {
      return FIX.version;
    }
    // update.status (loadToggleStates).
    if (cmd.indexOf('update.status') >= 0) return "";
    // version policy: Force marker probe.
    if (cmd.indexOf('.force') >= 0) return "0";
    // version policy: ROM release/sdk from build.prop.
    if (cmd.indexOf('/system/build.prop') >= 0) {
      return FIX.rom_release + "\n" + FIX.rom_sdk;
    }
    // checkRebootPending(): config mtime vs boot time.
    if (cmd.indexOf('uptime') >= 0 || cmd.indexOf('boot=$((') >= 0) return "clean";
    // loadConfig()/diag: plain cat of the config file.
    if (cmd.indexOf('COPG-VD.json') >= 0 && /(^|\s)cat\s/.test(cmd)) {
      return CONFIG_JSON;
    }
    return "";
  }

  window.ksu = {
    exec: function (cmd, opts, cbName) {
      var out = answer(cmd);
      setTimeout(function () {
        try { if (typeof window[cbName] === 'function') window[cbName](0, out, ""); } catch (e) {}
      }, 0);
    }
  };
})();
"""


# Device chrome (status bar + nav bar) overlaid in the safe-area insets so
# the shots match the look of the existing on-device fleet screenshots.
CHROME_JS = r"""
(function () {
  var st = document.createElement('style');
  st.textContent =
    '#toast-host{display:none!important;}' +
    ':root{--safe-t:42px!important;--safe-b:56px!important;}' +
    '#vd-statusbar{position:fixed;top:0;left:0;right:0;height:42px;z-index:9999;' +
      'background:#0E1217;color:#E8EDF2;display:flex;align-items:center;' +
      'justify-content:space-between;padding:0 18px;font-family:Poppins,system-ui,sans-serif;' +
      'font-size:14px;font-weight:600;pointer-events:none;}' +
    '#vd-statusbar .vd-clock{letter-spacing:.3px;}' +
    '#vd-statusbar .vd-icons{display:flex;align-items:center;gap:7px;color:#C4CDD6;}' +
    '#vd-navbar{position:fixed;bottom:0;left:0;right:0;height:56px;z-index:9999;' +
      'background:#0E1217;display:flex;align-items:center;justify-content:space-around;' +
      'pointer-events:none;}' +
    '#vd-navbar svg{stroke:#8B97A4;fill:none;}';
  document.head.appendChild(st);

  var sb = document.createElement('div');
  sb.id = 'vd-statusbar';
  sb.innerHTML =
    '<span class="vd-clock">9:41</span>' +
    '<span class="vd-icons">' +
      '<svg width="16" height="14" viewBox="0 0 18 14" fill="#C4CDD6"><rect x="0" y="9" width="3" height="5" rx="1"/><rect x="5" y="6" width="3" height="8" rx="1"/><rect x="10" y="3" width="3" height="11" rx="1"/><rect x="15" y="0" width="3" height="14" rx="1"/></svg>' +
      '<svg width="17" height="14" viewBox="0 0 20 16" fill="#C4CDD6"><path d="M10 3C6 3 2.8 4.6 .7 7.1L10 16l9.3-8.9C17.2 4.6 14 3 10 3z"/></svg>' +
      '<svg width="22" height="14" viewBox="0 0 26 14" fill="none"><rect x="1" y="2" width="21" height="10" rx="2.5" stroke="#C4CDD6" stroke-width="1.6"/><rect x="3" y="4" width="15" height="6" rx="1" fill="#C4CDD6"/><rect x="23" y="5" width="2" height="4" rx="1" fill="#C4CDD6"/></svg>' +
    '</span>';
  document.body.appendChild(sb);

  var nav = document.createElement('div');
  nav.id = 'vd-navbar';
  nav.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
    '<svg width="18" height="18" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>' +
    '<svg width="18" height="18" viewBox="0 0 24 24" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
  document.body.appendChild(nav);
})();
"""


def serve(directory):
    handler = lambda *a, **k: SimpleHTTPRequestHandler(*a, directory=directory, **k)
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def main(argv):
    langs = [a for a in argv[1:] if a in LANGS] or LANGS
    version = module_version()
    fixtures = build_fixtures(version)
    fix_json = json.dumps(fixtures, ensure_ascii=False)
    httpd, port = serve(WEBROOT)
    base = "http://127.0.0.1:%d/index.html" % port
    total = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True,
                                     args=["--force-color-profile=srgb"])
        try:
            for lang in langs:
                ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=SCALE,
                                          locale=lang)
                page = ctx.new_page()
                page.add_init_script(MOCK_JS.replace("%FIX%", fix_json).replace("%LANG%", lang))
                page.goto(base, wait_until="networkidle")
                page.wait_for_timeout(700)   # let boot() + exec microtasks settle
                page.evaluate(CHROME_JS)
                outlang = os.path.join(OUTDIR, lang)
                os.makedirs(outlang, exist_ok=True)
                for tab, name in SCREENS:
                    page.evaluate("(t) => { if (typeof switchTab === 'function') switchTab(t); }", tab)
                    page.wait_for_timeout(450)
                    page.evaluate("() => { window.scrollTo(0, 0);"
                                  " var c = document.querySelector('.tab-content.active .scroll-container');"
                                  " if (c) c.scrollTop = 0; }")
                    page.wait_for_timeout(150)
                    out = os.path.join(outlang, "%s.png" % name)
                    page.screenshot(path=out)
                    total += 1
                ctx.close()
                print("  %s: %d screens" % (lang, len(SCREENS)))
        finally:
            browser.close()
    httpd.shutdown()
    print("done: %d PNGs (%d langs) at version %s -> %s" %
          (total, len(langs), version, OUTDIR))


if __name__ == "__main__":
    main(sys.argv)
