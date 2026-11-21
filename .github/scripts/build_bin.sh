#!/usr/bin/env bash
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build: Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  AlirezaParsi & VD171
#  SPDX-License-Identifier: Apache-2.0
#  Fork by VD171.  Channel: @Priv8_VD https://t.me/Priv8_VD
# ======================================================================
#
#  Assemble module/bin/<abi>/ by FETCHING prebuilt binaries from the Termux
#  package REPOSITORY (packages.termux.dev/apt): the official .debs, never from a
#  Termux installed on some device. These are the tools the hardened VDLU engine
#  needs on-device that Android does not ship: openssl (ed25519 -rawin manifest
#  verify), curl (https manifest/blob fetch) and zstd (zst-encoded blobs). The
#  engine puts bin/<abi> on PATH and bin/<abi>/lib on LD_LIBRARY_PATH itself.
#
#  For each ABI: resolve the tool packages + their transitive Depends from the
#  Termux Packages index, download and extract the .debs into a merged prefix,
#  copy the wanted binaries, then copy ONLY the shared-library closure each
#  binary needs (resolved with readelf) into bin/<abi>/lib.
#
#  Requirements (CI/ubuntu, or Fedora): curl, ar (binutils), tar, xz, zstd, readelf.
#  Runs unprivileged; no NDK, no toolchain.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_BASE="$ROOT/module/bin"
WORK="${WORK:-$(mktemp -d)}"
REPO="${TERMUX_REPO:-https://packages.termux.dev/apt/termux-main}"

termux_arch() { case "$1" in
  arm64-v8a) echo aarch64 ;; armeabi-v7a) echo arm ;; x86) echo i686 ;; x86_64) echo x86_64 ;;
esac; }

ABIS="${ABIS:-arm64-v8a armeabi-v7a x86 x86_64}"
TOOL_PKGS="zstd curl openssl-tool"
WANT_BINS="zstd curl openssl"
# libs always provided by Android (never bundle these)
BIONIC="libc.so libm.so libdl.so liblog.so libandroid.so libz.so libselinux.so libc++.so libc++_shared.so libstdc++.so libEGL.so libnativehelper.so libbinder.so"

pkgfield() { awk -v p="$1" -v f="$2" '
    $1=="Package:" {cur=$2}
    cur==p && $1==f":" {$1=""; sub(/^ /,""); print; exit}' "$3"; }

sha() { { sha256sum "$1" 2>/dev/null || true; } | cut -d' ' -f1; }

write_provenance() {
  local abi="$1" out="$OUT_BASE/$abi" w="$WORK/$abi" prov f rel first=1
  {
    printf '{\n'
    printf '  "abi": "%s",\n' "$abi"
    printf '  "generated_utc": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '  "policy": "All files are fetched at build time from the official upstream listed below, never from a device. Audit: re-fetch the pinned sources, extract, and compare the file sha256 values.",\n'
    printf '  "sources": [\n'
    [ -s "$w/src.jsonl" ] && sed -e 's/^/    /' -e '$!s/$/,/' "$w/src.jsonl"
    printf '  ],\n'
    printf '  "files": [\n'
    for f in "$out"/* "$out"/lib/*; do
      [ -f "$f" ] || continue
      case "$f" in */.gitkeep|*/PROVENANCE.json) continue ;; esac
      rel="${f#"$out"/}"
      [ "$first" = 1 ] || printf ',\n'; first=0
      printf '    {"path": "%s", "bytes": %s, "sha256": "%s"}' "$rel" "$(stat -c%s "$f")" "$(sha "$f")"
    done
    printf '\n  ]\n}\n'
  } > "$out/PROVENANCE.json"
  prov="$out/PROVENANCE.json"
  echo "  provenance: $prov ($(grep -c '"sha256"' "$prov") files, $(grep -c '"version"' "$prov") source packages)"
}

build_abi() {
  local abi="$1" arch; arch="$(termux_arch "$abi")"
  local out="$OUT_BASE/$abi"; local w="$WORK/$abi"; local prefix="$w/prefix"
  mkdir -p "$out/lib" "$w/deb" "$prefix"
  echo "== $abi ($arch) =="

  local idx="$w/Packages"
  curl -fsSL "$REPO/dists/stable/main/binary-$arch/Packages" -o "$idx"

  local seen="" queue="$TOOL_PKGS" pkg dep deps
  while [ -n "$queue" ]; do
    pkg="${queue%% *}"; queue="${queue#"$pkg"}"; queue="${queue# }"
    case " $seen " in *" $pkg "*) continue ;; esac; seen="$seen $pkg"
    deps="$(pkgfield "$pkg" Depends "$idx" | tr ',' ' ' | sed 's/([^)]*)//g')"
    for dep in $deps; do queue="$queue $dep"; done
  done

  : > "$w/src.jsonl"
  for pkg in $seen; do
    local fn ver; fn="$(pkgfield "$pkg" Filename "$idx")"; [ -n "$fn" ] || continue
    curl -fsSL "$REPO/$fn" -o "$w/deb/$pkg.deb"
    ver="$(pkgfield "$pkg" Version "$idx")"
    printf '{"type": "termux-deb", "package": "%s", "version": "%s", "url": "%s", "deb_sha256": "%s"}\n' \
      "$pkg" "$ver" "$REPO/$fn" "$(sha "$w/deb/$pkg.deb")" >> "$w/src.jsonl"
    ( cd "$w/deb" && ar p "$pkg.deb" data.tar.xz 2>/dev/null | tar -xJ -C "$prefix" 2>/dev/null \
      || ar p "$pkg.deb" data.tar.gz 2>/dev/null | tar -xz -C "$prefix" 2>/dev/null \
      || ar p "$pkg.deb" data.tar.zst 2>/dev/null | tar --zstd -x -C "$prefix" 2>/dev/null ) || true
  done
  local U="$prefix/data/data/com.termux/files/usr"

  local missing=""
  for b in $WANT_BINS; do
    if [ -e "$U/bin/$b" ]; then cp -Lf "$U/bin/$b" "$out/$b"; chmod 0755 "$out/$b"
    else missing="$missing $b"; fi
  done
  [ -n "$missing" ] && { echo "  ERROR missing bins:$missing"; exit 1; }

  local lqueue="" seenlib=""
  for b in $WANT_BINS; do [ -f "$out/$b" ] && lqueue="$lqueue $out/$b"; done
  while [ -n "$lqueue" ]; do
    f="${lqueue%% *}"; lqueue="${lqueue#"$f"}"; lqueue="${lqueue# }"
    for n in $(readelf -d "$f" 2>/dev/null | sed -n 's/.*(NEEDED).*\[\(.*\)\]/\1/p'); do
      case " $BIONIC " in *" $n "*) continue ;; esac
      case " $seenlib " in *" $n "*) continue ;; esac
      [ -f "$U/lib/$n" ] || continue
      seenlib="$seenlib $n"; cp "$U/lib/$n" "$out/lib/$n"; lqueue="$lqueue $out/lib/$n"
    done
  done

  # Termux openssl wants its CA bundle + ENGINE config under $PREFIX/etc/tls; VDLU
  # only verifies a signature (no TLS trust store needed for pkeyutl), so none is
  # bundled. curl's https DOES need CAs: point it at the system store at runtime via
  # the engine env; here we only ship the binaries + their .so closure.

  : > "$out/.gitkeep"
  echo "  bins: $(ls "$out" | grep -v '^\.' | grep -v '^lib$' | grep -v PROVENANCE | tr '\n' ' ')"
  echo "  libs: $(ls "$out/lib" 2>/dev/null | wc -l) ($(du -sh "$out/lib" 2>/dev/null | cut -f1))"
}

for abi in $ABIS; do build_abi "$abi"; write_provenance "$abi"; done
echo "done. binaries + libs under $OUT_BASE/<abi>/ (engine sets LD_LIBRARY_PATH=bin/<abi>/lib)"
echo "each bin/<abi>/ carries PROVENANCE.json (source + sha256 of every shipped file)"
