#!/usr/bin/env python3
# Keep the example in docs/CONFIGURATION.md (every language) aligned with the canonical
# module/COPG-VD.json.example. FINGERPRINT and SECURITY_PATCH change with each Google build;
# this copies them from the canonical into every CONFIGURATION.md example block so the docs
# never drift from the shipped profile. Idempotent. Run after a fingerprint refresh.
#
#   tools/sync-docs-example.py [repo_root]
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
