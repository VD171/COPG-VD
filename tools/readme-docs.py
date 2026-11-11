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
"""Insert or refresh a "Documentation" section in every README (links to docs/ in
the README's own language plus the wiki), before the <!-- vd-see-also --> marker.
Deterministic and idempotent. Run after adding a doc or a language.

    tools/readme-docs.py [repo_root]
"""
import os, re, sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"]
HEAD = {"en": "Documentation", "ar": "التوثيق", "cs": "Dokumentace", "de": "Dokumentation",
        "es": "Documentación", "fa": "مستندات", "fr": "Documentation", "hi": "दस्तावेज़ीकरण",
        "in": "Dokumentasi", "it": "Documentazione", "ja": "ドキュメント", "ko": "문서",
        "nl": "Documentatie", "pl": "Dokumentacja", "pt": "Documentação", "ru": "Документация",
        "sv": "Dokumentation", "th": "เอกสารประกอบ", "tr": "Belgeler", "vi": "Tài liệu", "zh": "文档"}
DOCS = ["USER-GUIDE", "CONFIGURATION", "ARCHITECTURE", "FILE-STRUCTURE"]
WIKI = "https://github.com/VD171/COPG-VD/wiki"
MARK = "<!-- vd-docs -->"
ENDMARK = "<!-- /vd-docs -->"
SEEALSO = "<!-- vd-see-also -->"

def h1(path):
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.startswith("# "):
                return line[2:].strip()
    return None

def doc_path(lang, base):
    return f"docs/{base}.md" if lang == "en" else f"docs/{lang}/{base}.md"

def section(lang):
    links = []
    for d in DOCS:
        label = h1(os.path.join(ROOT, doc_path(lang, d))) or d
        links.append(f"[{label}]({doc_path(lang, d)})")
    wiki = WIKI if lang == "en" else f"{WIKI}/{lang}-Home"
    links.append(f"[Wiki]({wiki})")
    return f"{MARK}\n## {HEAD[lang]}\n\n" + " · ".join(links) + f"\n\n{ENDMARK}\n\n"

def apply(lang):
    rp = os.path.join(ROOT, "README.md" if lang == "en" else f"README.{lang}.md")
    if not os.path.exists(rp):
        return False
    t = open(rp, encoding="utf-8").read()
    t = re.sub(re.escape(MARK) + r".*?" + re.escape(ENDMARK) + r"\n*", "", t, flags=re.S)
    t = re.sub(re.escape(MARK) + r".*?(?=" + re.escape(SEEALSO) + r")", "", t, flags=re.S)
    heads = [m.start() for m in re.finditer(r"(?m)^## ", t)]
    if len(heads) < 2:
        return False
    pos = heads[1]
    t = t[:pos] + section(lang) + t[pos:]
    open(rp, "w", encoding="utf-8").write(t)
    return True

n = sum(apply(l) for l in LANGS)
print(f"README documentation section set on {n} files")
