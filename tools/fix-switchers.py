#!/usr/bin/env python3
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
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
"""Set the "> **Languages:**" switcher on every in-repo doc, from the file's own
location. Idempotent. Run after adding a translation or a new language.

    tools/fix-switchers.py [repo_root]
"""
import os, sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"]
ENDO = {"en": "English", "ar": "العربية", "cs": "Čeština", "de": "Deutsch", "es": "Español",
        "fa": "فارسی", "fr": "Français", "hi": "हिन्दी", "in": "Bahasa Indonesia", "it": "Italiano",
        "ja": "日本語", "ko": "한국어", "nl": "Nederlands", "pl": "Polski", "pt": "Português",
        "ru": "Русский", "sv": "Svenska", "th": "ไทย", "tr": "Türkçe", "vi": "Tiếng Việt", "zh": "中文"}
DOCS_BASES = ["USER-GUIDE", "CONFIGURATION", "ARCHITECTURE", "FILE-STRUCTURE"]
ROOT_BASES = ["CONTRIBUTING", "CODE_OF_CONDUCT", "SECURITY"]

def lang_path(base, code):
    if code == "en":
        return f"docs/{base}.md" if base in DOCS_BASES else f"{base}.md"
    return f"docs/{code}/{base}.md"

def switcher(base, cur):
    me_dir = os.path.dirname(os.path.join(ROOT, lang_path(base, cur)))
    parts = []
    for code in LANGS:
        if code == cur:
            parts.append(ENDO[code])
        else:
            rel = os.path.relpath(os.path.join(ROOT, lang_path(base, code)), me_dir)
            parts.append(f"[{ENDO[code]}]({rel})")
    return "> **Languages:** " + " · ".join(parts)

def fix(base, cur):
    path = os.path.join(ROOT, lang_path(base, cur))
    if not os.path.exists(path):
        return False
    lines = open(path, encoding="utf-8").read().split("\n")
    if lines and lines[0].startswith("> **Languages:**"):
        i = 1
        while i < len(lines) and lines[i].strip() != "---":
            i += 1
        i += 1
        while i < len(lines) and lines[i].strip() == "":
            i += 1
        lines = lines[i:]
    open(path, "w", encoding="utf-8").write(switcher(base, cur) + "\n\n---\n\n" + "\n".join(lines))
    return True

n = 0
for base in DOCS_BASES + ROOT_BASES:
    for code in LANGS:
        if fix(base, code):
            n += 1
print(f"switchers set on {n} files")
