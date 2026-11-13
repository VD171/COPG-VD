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
"""Normalize in-repo markdown links in every doc, from the file's own location: a
doc links to the same-language version of another doc, a non-doc repo path to the
repo root at the right depth. Idempotent. External URLs and anchors are preserved.

    tools/fix-links.py [repo_root]
"""
import os, re, sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"]
DOCS_BASES = ["USER-GUIDE", "CONFIGURATION", "ARCHITECTURE", "FILE-STRUCTURE"]
ROOT_BASES = ["CONTRIBUTING", "CODE_OF_CONDUCT", "SECURITY"]
BASES = DOCS_BASES + ROOT_BASES
LINK = re.compile(r"\]\(([^)]+)\)")

def lang_path(base, code):
    if code == "en":
        return f"docs/{base}.md" if base in DOCS_BASES else f"{base}.md"
    return f"docs/{code}/{base}.md"

def rewrite_target(target, file_dir, lang):
    core, _, anchor = target.partition("#")
    if re.match(r"^[a-z]+://", core) or core.startswith("mailto:") or not core:
        return target
    base = os.path.basename(core)[:-3] if core.endswith(".md") else None
    if base in BASES:
        new = os.path.relpath(os.path.join(ROOT, lang_path(base, lang)), file_dir)
    elif core in (".gitignore",) or core.startswith(".github/") or core.startswith("screenshots/"):
        new = os.path.relpath(os.path.join(ROOT, core), file_dir)
    else:
        return target
    return new + ("#" + anchor if anchor else "")

def fix_file(path, lang):
    if not os.path.exists(path):
        return False
    d = os.path.dirname(path)
    t = open(path, encoding="utf-8").read()
    nt = LINK.sub(lambda m: "](" + rewrite_target(m.group(1), d, lang) + ")", t)
    if nt != t:
        open(path, "w", encoding="utf-8").write(nt)
    return True

n = 0
for base in BASES:
    for code in LANGS:
        if fix_file(os.path.join(ROOT, lang_path(base, code)), code):
            n += 1
print(f"links normalized across {n} files")
