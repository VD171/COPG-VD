#!/usr/bin/env python3
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build: Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
#  Fork by VD171.
#
#  Licensed under the Apache License, Version 2.0; you may obtain a copy at
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/COPG-VD
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
"""Keep the example in docs/CONFIGURATION.md (every language) aligned with the
canonical module/COPG-VD.json.example: copy its FINGERPRINT and SECURITY_PATCH into
every example block. Idempotent. Run after a fingerprint refresh.

    tools/sync-docs-example.py [repo_root]
"""
import os, re, json, sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
canon = json.load(open(os.path.join(ROOT, "module/COPG-VD.json.example"), encoding="utf-8"))["COPG-VD"]
FP, SP = canon["FINGERPRINT"], canon["SECURITY_PATCH"]
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"]

def cfg_path(lang):
    return "docs/CONFIGURATION.md" if lang == "en" else f"docs/{lang}/CONFIGURATION.md"

n = 0
for lang in LANGS:
    p = os.path.join(ROOT, cfg_path(lang))
    if not os.path.exists(p):
        continue
    t = open(p, encoding="utf-8").read()
    nt = re.sub(r'("FINGERPRINT":\s*)"[^"]*"', lambda m: m.group(1) + json.dumps(FP), t)
    nt = re.sub(r'("SECURITY_PATCH":\s*)"[^"]*"', lambda m: m.group(1) + json.dumps(SP), nt)
    if nt != t:
        open(p, "w", encoding="utf-8").write(nt)
        n += 1
print(f"synced {n} CONFIGURATION.md (patch={SP})")
