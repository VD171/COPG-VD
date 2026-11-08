#!/usr/bin/env python3
# Normalize in-repo markdown links in every doc file, from the file's own location. A doc
# links to the SAME-LANGUAGE version of another doc (sibling in docs/<lang>/, or the repo
# root / docs/ for English); a non-doc repo path (.github/..., .gitignore) links to the
# repo root at the right relative depth. Idempotent, so it is safe to re-run. External
# URLs and anchors are preserved. Run it after translating, before generating the wiki.
#
#   tools/fix-links.py [repo_root]
import os, re, sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"]
DOCS_BASES = ["USER-GUIDE", "CONFIGURATION", "ARCHITECTURE", "FILE-STRUCTURE"]
ROOT_BASES = ["CONTRIBUTING", "CODE_OF_CONDUCT", "SECURITY"]
BASES = DOCS_BASES + ROOT_BASES

def lang_path(base, code):   # path of <base> in <code>, relative to ROOT
    if code == "en":
        return f"docs/{base}.md" if base in DOCS_BASES else f"{base}.md"
    return f"docs/{code}/{base}.md"

LINK = re.compile(r"\]\(([^)]+)\)")

def rewrite_target(target, file_dir, lang):
    core, _, anchor = target.partition("#")
    if re.match(r"^[a-z]+://", core) or core.startswith("mailto:") or not core:
        return target
    name = os.path.basename(core)
    base = name[:-3] if name.endswith(".md") else None
    if base in BASES:                                   # a doc -> same-language version
        new = os.path.relpath(os.path.join(ROOT, lang_path(base, lang)), file_dir)
    elif core in (".gitignore",) or core.startswith(".github/") or core.startswith("screenshots/"):
        new = os.path.relpath(os.path.join(ROOT, core), file_dir)   # non-doc repo file at root
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
