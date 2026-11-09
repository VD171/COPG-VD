#!/usr/bin/env bash
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
# Single source of truth for the module version: module/module.prop.
#
#   version.sh read            print the current version, nothing is written
#   version.sh patch|minor|major   bump it, rewrite module.prop and update.json
#
# Version is v<major>.<minor>[.<patch>]-vd (the .patch is omitted when it is 0, e.g. v6.10-vd =
# v6.10.0); versionCode = major*10000 + minor*100 + patch (two digits
# each, so parts up to 99 never collide and the code only grows - what Magisk/KernelSU require).
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

if ! printf '%s' "$current" | grep -qE "^v[0-9]+\.[0-9]+(\.[0-9]+)?${SUFFIX}$"; then
    echo "::error::version '$current' does not look like v<major>.<minor>[.<patch>]${SUFFIX}"
    exit 1
fi
if ! printf '%s' "$current_code" | grep -qE '^[0-9]+$'; then
    echo "::error::versionCode '$current_code' is not a number"
    exit 1
fi

numbers="${current#v}"
numbers="${numbers%$SUFFIX}"
major="${numbers%%.*}"
rest="${numbers#*.}"
minor="${rest%%.*}"
if [ "$rest" = "$minor" ]; then patch=0; else patch="${rest#*.}"; fi

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
    if [ "$patch" -eq 0 ]; then version="v${major}.${minor}${SUFFIX}"; else version="v${major}.${minor}.${patch}${SUFFIX}"; fi
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
