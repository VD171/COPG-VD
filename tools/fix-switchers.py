#!/usr/bin/env python3
# Set the "> **Languages:**" switcher line on every in-repo doc file, deterministically,
# from the file's own location. Run after adding a translation or a new language. The EN
# community docs live at the repo root; the EN technical docs and all translations live
# under docs/. Idempotent: it replaces an existing leading switcher or inserts one.
#
#   tools/fix-switchers.py [repo_root]
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

def lang_path(base, code):   # path of <base> in <code>, relative to ROOT
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
