#!/usr/bin/env python3
# Insert or refresh a "Documentation" section in every README - links to docs/ in the
# README's own language plus the project wiki - right before the <!-- vd-see-also -->
# marker. Deterministic and idempotent: it reuses each doc's own H1 title as the label and
# brackets its block with <!-- vd-docs --> so a re-run replaces it cleanly. Run after
# adding a doc or a language.
#
#   tools/readme-docs.py [repo_root]
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
    return f"{MARK}\n## {HEAD[lang]}\n\n" + " · ".join(links) + "\n\n"

def apply(lang):
    rp = os.path.join(ROOT, "README.md" if lang == "en" else f"README.{lang}.md")
    if not os.path.exists(rp):
        return False
    t = open(rp, encoding="utf-8").read()
    if SEEALSO not in t:
        return False
    t = re.sub(re.escape(MARK) + r".*?(?=" + re.escape(SEEALSO) + r")", "", t, flags=re.S)
    t = t.replace(SEEALSO, section(lang) + SEEALSO, 1)
    open(rp, "w", encoding="utf-8").write(t)
    return True

n = sum(apply(l) for l in LANGS)
print(f"README documentation section set on {n} files")
