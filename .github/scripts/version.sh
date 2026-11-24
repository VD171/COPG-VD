#!/usr/bin/env bash
# ======================================================================
#  VD-ModuleKit  ::  version.sh
#  Canonical version bumper for VD root modules: rewrites module/module.prop +
#  module/update.json, preserving the module's own zipUrl + changelog and
#  substituting only the version token (generic across modules).
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
#  Version scheme (owner-defined): fleet (default) or per-module via the SCHEME env var.
#     fleet  versionName v<major>.<counter>[.<patch>]  versionCode = major*10000 + counter*100 + patch
#            v1.0=10000, v1.01=10100, v1.01.1=10101, v1.02=10200, v2.0=20000  (.patch = binary refresh)
#     minor  versionName v<major>.<minor>              versionCode = major*10000 + minor
#            v1.09=10009, v1.10=10010, v2.00=20000      (no patch digit)      -> set SCHEME=minor
#
#  Usage: [SCHEME=fleet|minor] [SUFFIX=-tag] version.sh read | bump | major | patch
#    SUFFIX  optional fork tag kept on the versionName (e.g. -vd); stripped before parsing and
#            re-appended to the name, versionCode unchanged. Default empty = no-op for other modules.
#    read   print current version/versionCode
#    bump   feature bump (fleet: counter+1, patch->0 ; minor: minor+1)
#    major  major + 1, lower components -> 0
#    patch  fleet: patch + 1 (binary-refresh bump) ; minor: same as bump

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROP="$ROOT/module/module.prop"
UJSON="$ROOT/module/update.json"
REPO="VD171/$(basename "$ROOT")"
SCHEME="${SCHEME:-fleet}"
SUFFIX="${SUFFIX:-}"

# Emit the CI step outputs the release workflow consumes via steps.version.outputs.* (version,
# version_code, bumped, zip_name). echo-to-stdout alone leaves those outputs EMPTY -> a release CI
# that does `gh release create "${{ steps.version.outputs.version }}"` breaks fleet-wide. Guarded so
# local/CLI use (no $GITHUB_OUTPUT) is a no-op.
# emit_outputs <version> <version_code> <bumped:true|false> <zip_name>
emit_outputs() {
	[ -n "${GITHUB_OUTPUT:-}" ] || return 0
	{
		printf 'version=%s\n'      "$1"
		printf 'version_code=%s\n' "$2"
		printf 'bumped=%s\n'       "$3"
		printf 'zip_name=%s\n'     "$4"
	} >> "$GITHUB_OUTPUT"
}

verb="${1:-read}"
cur_name="${cur_name:-$(sed -n 's/^version=//p' "$PROP")}"
core="${cur_name}"; [ -n "$SUFFIX" ] && core="${cur_name%"$SUFFIX"}"
rest="${core#v}"                            # major.X[.Y] (fork SUFFIX stripped before parsing)
# Guard: if a fork tag survived (rest still non-numeric after stripping SUFFIX), fail clearly here
# instead of crashing on the arithmetic below with a cryptic "unbound variable".
case "$rest" in
  *[!0-9.]*)
    _tag="${cur_name##*-}"
    case "$cur_name" in *-*) _tag="-${_tag}" ;; *) _tag="<tag>" ;; esac
    echo "version.sh: '${cur_name}' has a fork tag; pass SUFFIX=${_tag}" >&2
    exit 2 ;;
esac
major="$((10#${rest%%.*}))"
tail="${rest#*.}"                           # X[.Y]

if [ "$SCHEME" = minor ]; then
  minor="$((10#${tail%%.*}))"
  case "$verb" in
    read) : ;;
    bump|patch) minor=$((minor+1)); if [ "$minor" -ge 10000 ]; then major=$((major+1)); minor=0; fi ;;
    major) major=$((major+1)); minor=0 ;;
    *) echo "usage: [SCHEME=minor] version.sh read|bump|major|patch" >&2; exit 2 ;;
  esac
  NAME="$(printf 'v%s.%02d' "$major" "$minor")${SUFFIX}"
  CODE="$(( major*10000 + minor ))"
else
  counter="$((10#${tail%%.*}))"
  case "$tail" in *.*) patch="$((10#${tail#*.}))" ;; *) patch=0 ;; esac
  fmt() {  # fmt <major> <counter> <patch>
    if [ "$2" -eq 0 ]; then set -- "$1" "0.0" "$3"; _base="v$1.0"; else _base="$(printf 'v%s.%02d' "$1" "$2")"; fi
    if [ "$3" -gt 0 ]; then printf '%s.%d' "$_base" "$3"; else printf '%s' "$_base"; fi
  }
  code() { printf '%d' "$(( $1*10000 + $2*100 + $3 ))"; }
  case "$verb" in
    read) : ;;
    bump)  counter=$((counter+1)); patch=0; if [ "$counter" -ge 100 ]; then major=$((major+1)); counter=0; fi ;;
    major) major=$((major+1)); counter=0; patch=0 ;;
    patch) patch=$((patch+1)); if [ "$patch" -ge 100 ]; then counter=$((counter+1)); patch=0; if [ "$counter" -ge 100 ]; then major=$((major+1)); counter=0; fi; fi ;;   # patch rolls into counter at 100 so versionCode never collides
    *) echo "usage: version.sh read|bump|major|patch" >&2; exit 2 ;;
  esac
  NAME="$(fmt "$major" "$counter" "$patch")${SUFFIX}"
  CODE="$(code "$major" "$counter" "$patch")"
fi

if [ "$verb" = read ]; then
  # read = no bump: report the current version + the existing zip basename (the workflow may package
  # without a bump), bumped=false so the release/commit steps gated on it are skipped.
  _rzip=""
  if [ -f "$UJSON" ]; then
    _ru="$(sed -n 's/.*"zipUrl"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$UJSON" | head -n1)"
    [ -n "$_ru" ] && _rzip="$(basename "$_ru")"
  fi
  emit_outputs "$NAME" "$CODE" false "$_rzip"
  echo "version=${NAME} versionCode=${CODE}"
  exit 0
fi

sed -i "s/^version=.*/version=${NAME}/"       "$PROP"
sed -i "s/^versionCode=.*/versionCode=${CODE}/" "$PROP"

# update manifest. Preserve the module's own zipUrl + changelog and substitute only the
# version token, so this bumper stays generic across modules: a flavored
# "-<ver>-universal-full.zip" and a single-flavor "<module>-<ver>.zip" both survive, with no
# per-module name baked in. size/sha256/notes are filled by the release workflow once the
# zip exists (version.sh runs before the build); the in-app update-check verb reads these.
[ -f "$UJSON" ] || { echo "version.sh: $UJSON missing; seed update.json with the module's zipUrl once, then bump" >&2; exit 1; }
old_zip="$(sed -n 's/.*"zipUrl"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$UJSON" | head -n1)"
old_cl="$(sed -n 's/.*"changelog"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$UJSON" | head -n1)"
[ -n "$old_zip" ] || { echo "version.sh: $UJSON has no zipUrl to derive the new one from" >&2; exit 1; }
new_zip="${old_zip//"$cur_name"/$NAME}"
# A SUFFIX module whose release zip carries the BARE version (no suffix) will not match cur_name,
# so this substitution is a no-op and the zipUrl stays stale. Warn loud (non-fatal: don't break releases).
if [ -n "$old_zip" ] && [ "$NAME" != "$cur_name" ] && [ "$new_zip" = "$old_zip" ]; then
  echo "::warning::version.sh: zipUrl not updated - it does not contain '$cur_name'; a SUFFIX module whose release zip omits the suffix will advertise a stale download link" >&2
fi
[ -n "$old_cl" ] || old_cl="https://raw.githubusercontent.com/${REPO}/main/CHANGELOG.md"
ZIP="$(basename "$new_zip")"

cat > "$UJSON" <<EOF
{
  "version": "${NAME}",
  "versionCode": ${CODE},
  "zipUrl": "${new_zip}",
  "changelog": "${old_cl}",
  "notes": "",
  "size": 0,
  "sha256": ""
}
EOF

emit_outputs "$NAME" "$CODE" true "$ZIP"
echo "version=${NAME} versionCode=${CODE} zip=${ZIP}"
