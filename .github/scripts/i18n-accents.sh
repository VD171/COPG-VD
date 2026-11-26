#!/bin/sh
# ======================================================================
#  VD-ModuleKit  ::  i18n-accents.sh
#  Catch ASCII-folded translations: an accented-Latin language file whose
#  diacritics were stripped by a sync or processing pipeline.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
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
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
#  Vendored from VD-ModuleKit; the host module fills the contact chain and keeps
#  its own license and product banner.
# ======================================================================
#
# i18n-accents - catch ASCII-FOLDED translations: an accented-Latin language file whose diacritics were
# stripped by a sync/processing pipeline (German with ue/ae instead of umlauts; es/fr/it WebUI jsons with
# near-zero accents). The content and the keys are all there, only the diacritics are gone, so a
# key-parity check passes clean while the translation is silently mangled. This closes that blind-spot:
# it measures the DENSITY of non-ASCII characters and flags a substantial accented-Latin file that carries
# suspiciously few.
#
# Scans the given dir(s) recursively for two kinds of translation file:
#   - *.json lang files whose stem is a language code (webroot/lang/<code>.json, locales/<code>.json, ...)
#   - *.md doc translations under a <code>/ dir, or named README.<code>.md / <code>-*.md
# The language code comes from the path/name. Only ACCENTED-LATIN languages are checked - the ones that
# reliably carry diacritics in any substantial text: es fr it pt de cs pl sv tr vi ro hu hr sk. Near-ASCII
# Latin langs (en nl id) and NON-Latin scripts (ar fa hi ja ko th zh ru uk ...) are recognized as
# translations but NOT accent-checked: they are empty-or-present, a different failure that would
# false-positive here.
#
# Heuristic (deliberately CONSERVATIVE - only a CLEAR fold flags, never merely low-accent content):
#   - A file is JUDGED only when it has SUBSTANTIAL content (> CONTENT_FLOOR non-whitespace chars OR
#     > KEYS_FLOOR json keys); a tiny file is skipped (cannot tell).
#   - A judged file is FLAGGED as folded when its non-ASCII byte count is below ABS_ACCENT_FLOOR (a clean
#     fold leaves ~0), OR its non-ASCII density is below RATIO_PERMILLE per-mille (catches a large folded
#     file that kept a couple of stray non-ASCII bytes). The leanest real accented-Latin file in the fleet
#     (Italian) sits several times above the ratio floor, so genuinely-accented files pass.
#
# Usage: i18n-accents.sh <dir> [<dir>...]
# Exit: 0 all checked files retain diacritics (or nothing to check) - 1 folding detected - 2 bad usage.
set -u

# --- floors (tuned against the real fleet; see tooling/AUDIT.md) ---
CONTENT_FLOOR=400   # min non-whitespace chars to judge a file at all
KEYS_FLOOR=15       # ...or this many json keys (a lang json with many short values is still substantial)
ABS_ACCENT_FLOOR=3  # a substantial file with fewer non-ASCII bytes than this is a clean fold
RATIO_PERMILLE=2    # ...or density below 2 per-mille (0.2%); the leanest real file (it) is >2x this

# accented-Latin langs that reliably carry diacritics -> CHECKED
CHECKED=" es fr it pt de cs pl sv tr vi ro hu hr sk "
# recognized as translations but NOT accent-checked (near-ASCII Latin + non-Latin scripts)
EXCLUDED=" en nl id ar fa hi ja ko th zh ru uk be bg el he kk mk sr sl et lv lt fi da nb no "

in_checked()  { case "$CHECKED" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
is_known()    { case "$CHECKED$EXCLUDED" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

# lang_code_of <path> -> prints the translation language code, or nothing if the file is not a recognized
# translation (filters update.json / module.prop / README.md / ARCHITECTURE.md ... which carry no code).
lang_code_of() {
	f=$1; base=${f##*/}
	case "$base" in
	*.json)
		# <code>.json whose stem is a known language code (update.json, package.json, ... are skipped)
		stem=${base%.json}
		is_known "$stem" && printf '%s' "$stem"
		;;
	*.md)
		# 1) under a <code>/ directory: .../<code>/USER-GUIDE.md
		parent=${f%/*}; pdir=${parent##*/}
		if is_known "$pdir"; then printf '%s' "$pdir"; return; fi
		stem=${base%.md}
		# 2) README.<code>.md / name.<code>.md  (last dot-segment is the code)
		case "$stem" in
		*.*) seg=${stem##*.}; if is_known "$seg"; then printf '%s' "$seg"; return; fi ;;
		esac
		# 3) <code>-something.md  (prefix before the first dash)
		case "$stem" in
		*-*) pre=${stem%%-*}; if is_known "$pre"; then printf '%s' "$pre"; return; fi ;;
		esac
		;;
	esac
}

[ "$#" -gt 0 ] || { echo "usage: i18n-accents.sh <dir> [<dir>...]" >&2; exit 2; }
for d; do [ -d "$d" ] || { echo "i18n-accents: not a directory: $d" >&2; exit 2; }; done

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT INT TERM

flagged=0
checked=0

# Collect candidate translation files from the actual filesystem, pruning vcs/build/dep dirs.
find "$@" \( -name .git -o -name build -o -name .gradle -o -name .cxx -o -name node_modules \) -prune \
	-o -type f \( -name '*.json' -o -name '*.md' \) -print 2>/dev/null | sort > "$tmp"

while IFS= read -r f; do
	[ -n "$f" ] || continue
	code=$(lang_code_of "$f")
	[ -n "$code" ] || continue        # not a recognized translation file
	in_checked "$code" || continue     # recognized but not accent-bearing (en/nl/id/non-Latin) -> skip

	# metrics: non-whitespace content size, json key count, non-ASCII byte count
	content=$(( $(LC_ALL=C tr -d '[:space:]' < "$f" | wc -c) ))
	nonascii=$(( $(LC_ALL=C tr -d '\000-\177' < "$f" | wc -c) ))
	keys=0
	case "$f" in *.json) keys=$(( $(grep -oE '"[^"]+"[[:space:]]*:' "$f" 2>/dev/null | wc -l) )) ;; esac

	# substantial? (otherwise a tiny file - can't judge, skip clean)
	if [ "$content" -le "$CONTENT_FLOOR" ] && [ "$keys" -le "$KEYS_FLOOR" ]; then
		continue
	fi
	checked=$((checked + 1))
	[ "$content" -gt 0 ] || continue

	permille=$(( nonascii * 1000 / content ))
	if [ "$nonascii" -lt "$ABS_ACCENT_FLOOR" ] || [ "$permille" -lt "$RATIO_PERMILLE" ]; then
		printf '::error::i18n-accents: ASCII-folded translation: %s (lang=%s, non-ASCII=%s, content=%s, density=%s per-mille) - accented-Latin diacritics appear stripped\n' \
			"$f" "$code" "$nonascii" "$content" "$permille" >&2
		flagged=$((flagged + 1))
	fi
done < "$tmp"

if [ "$flagged" -gt 0 ]; then
	printf 'i18n-accents: FAIL - %d accented-Latin translation(s) look ASCII-folded (diacritics lost); re-sync from the un-folded source\n' "$flagged" >&2
	exit 1
fi
printf 'i18n-accents: OK - %d accented-Latin translation(s) checked, all retain diacritics\n' "$checked"
exit 0
