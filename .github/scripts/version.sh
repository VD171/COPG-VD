#!/usr/bin/env bash
# Single source of truth for the module version: module/module.prop.
#
#   version.sh read            print the current version, nothing is written
#   version.sh patch|minor|major   bump it, rewrite module.prop and update.json
#
# The version string is v<major>.<minor>.<patch>-vd and versionCode is derived from it as
# major*10000 + minor*100 + patch (v5.0.0 = 50000, v5.12.3 = 51203), so no number is ever
# typed by hand. Two decimal places per component: every part can go up to 99 before any of
# them could collide with its neighbour, and the code only ever grows - which is the one
# thing Magisk/KernelSU actually require, since versionCode is what decides "there is an
# update", not the version string.
# Writes version/versionCode/zip/tag to $GITHUB_OUTPUT when running in Actions.
set -euo pipefail

MODULE_PROP="module/module.prop"
UPDATE_JSON="module/update.json"
REPO="${GITHUB_REPOSITORY:-VD171/COPG-VD}"
SUFFIX="-vd"

action="${1:-read}"

[ -f "$MODULE_PROP" ] || { echo "::error::$MODULE_PROP not found"; exit 1; }

prop() { sed -n "s/^$1=//p" "$MODULE_PROP" | head -n 1; }

current="$(prop version)"
current_code="$(prop versionCode)"

if ! printf '%s' "$current" | grep -qE "^v[0-9]+\.[0-9]+\.[0-9]+${SUFFIX}$"; then
    echo "::error::version '$current' does not look like v<major>.<minor>.<patch>${SUFFIX}"
    exit 1
fi
if ! printf '%s' "$current_code" | grep -qE '^[0-9]+$'; then
    echo "::error::versionCode '$current_code' is not a number"
    exit 1
fi

numbers="${current#v}"
numbers="${numbers%$SUFFIX}"
major="${numbers%%.*}"
patch="${numbers##*.}"
minor="${numbers#*.}"
minor="${minor%.*}"

case "$action" in
    read)
        version="$current"
        version_code="$current_code"
        ;;
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
    *) echo "usage: ${0##*/} read|patch|minor|major"; exit 1 ;;
esac

if [ "$action" != "read" ]; then
    version="v${major}.${minor}.${patch}${SUFFIX}"
    if [ "$minor" -gt 99 ] || [ "$patch" -gt 99 ]; then
        echo "::error::$version cannot be packed: minor and patch hold two digits each."
        exit 1
    fi
    version_code=$((major * 10000 + minor * 100 + patch))
    if [ "$version_code" -le "$current_code" ]; then
        echo "::error::new versionCode $version_code is not greater than $current_code"
        exit 1
    fi
    zip_name="COPG-VD-${version}.zip"
    sed -i "s/^version=.*/version=${version}/; s/^versionCode=.*/versionCode=${version_code}/" "$MODULE_PROP"
    cat > "$UPDATE_JSON" <<EOF
{
  "version": "${version}",
  "zipUrl": "https://github.com/${REPO}/releases/download/${version}/${zip_name}",
  "versionCode": "${version_code}"
}
EOF
    echo "bumped $current ($current_code) -> $version ($version_code)"
fi

zip_name="COPG-VD-${version}.zip"
echo "version=$version"
echo "version_code=$version_code"
echo "zip_name=$zip_name"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
        echo "version=$version"
        echo "version_code=$version_code"
        echo "zip_name=$zip_name"
        echo "bumped=$([ "$action" = read ] && echo false || echo true)"
    } >> "$GITHUB_OUTPUT"
fi
