#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Refresh COPG-VD.json with the props of the latest Google factory image.

No full download: the factory zip (~4 GB) is read with HTTP Range requests only.

    factory.zip  ->  image-<build>.zip (STORED, so its bytes are addressable)
                     |- system_dlkm.img  (~1 MB streamed) -> device identity + FINGERPRINT + UUID
                     '- system.img       (~300 MB streamed, stops at the first hit)
                                                           -> SECURITY_PATCH, TIMESTAMP, SDK, ...

Both images are EROFS and keep build.prop as plain text, so each member is inflated on
the fly and the stream is dropped as soon as the props show up. Nothing touches the disk.

Usage:
    update_copg_json.py [--product comet_beta] [--track canary|beta|any]
                        [--json module/COPG-VD.json.example] [--readme README.md]
                        [--force] [--check-only]

Exit codes: 0 = done (changed or already up to date), 1 = failure.
"""
import argparse
import json
import os
import re
import struct
import sys
import time
import urllib.request
import zlib

FLASH_HOME = "https://flash.android.com"
FLASH_API = "https://content-flashstation-pa.googleapis.com/v1/builds"
UA = "COPG-VD-updater/1.0"

# build.prop -> JSON field. First prop found wins; missing ones keep the current value.
#
# ANDROID_VERSION, SDK_INT, SDK_FULL and CODENAME are DELIBERATELY ABSENT. They describe the
# Android version, and a device told it runs a newer SDK than it does will have apps call APIs
# its framework does not have - Google's crash, the device reboots, and it repeats. That is a
# softloop, not a bootloop, so nobody looking at boot logs finds anything. The version belongs
# to the ROM and is never taken from the build being spoofed.
# See Historicos/2026-08-07_versao-do-android-nunca-se-spoofa.md (Fedora repo).
PROP_MAP = {
    "BRAND": ("ro.product.system_dlkm.brand", "ro.product.brand_for_attestation"),
    "DEVICE": ("ro.product.system_dlkm.device", "ro.product.device_for_attestation"),
    "MANUFACTURER": ("ro.product.system_dlkm.manufacturer", "ro.product.manufacturer_for_attestation"),
    "MODEL": ("ro.product.system_dlkm.model", "ro.product.model_for_attestation"),
    "FINGERPRINT": ("ro.system_dlkm.build.fingerprint",),
    "PRODUCT": ("ro.product.system_dlkm.name",),
    "DISPLAY": ("ro.build.display.id", "ro.system_dlkm.build.id"),
    "ID": ("ro.system_dlkm.build.id", "ro.build.id"),
    "HOST": ("ro.build.host",),
    "INCREMENTAL": ("ro.system_dlkm.build.version.incremental", "ro.build.version.incremental"),
    "TIMESTAMP": ("ro.system_dlkm.build.date.utc", "ro.build.date.utc"),
    "PREVIEW_SDK": ("ro.build.version.preview_sdk",),
    "USER": ("ro.build.user",),
    "SDK_FINGERPRINT": ("ro.build.version.preview_sdk_fingerprint",),
    "UUID": ("ro.system_dlkm.build.uuid", "ro.build.uuid"),
    "SECURITY_PATCH": ("ro.build.version.security_patch",),
}

# Used only when the JSON file does not exist yet: key order of the generated object.
DEFAULT_ORDER = ["BRAND", "DEVICE", "MANUFACTURER", "MODEL", "FINGERPRINT", "PRODUCT",
                 "BOOTLOADER", "BOARD", "HARDWARE", "DISPLAY", "ID", "HOST", "INCREMENTAL",
                 "TIMESTAMP", "PREVIEW_SDK", "USER", "SDK_FINGERPRINT", "UUID", "SECURITY_PATCH"]
DEFAULT_HEADER = [("Instructions", "Use strings on double-quotes only."),
                  ("Instructions", "All fields are OPTIONAL. If some field is not provided, "
                                   "it will be skipped."),
                  ("Strings extracted from", "")]
# Fields no build.prop carries; kept from the current file (or these defaults).
DEFAULT_STATIC = {"BOOTLOADER": "unknown", "BOARD": "comet", "HARDWARE": "comet"}


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def fail(msg):
    log(f"::error::{msg}")
    sys.exit(1)


# --------------------------------------------------------------------------- HTTP
def http(url, headers=None, retries=4):
    """GET with retries. Returns the open response (caller reads/closes it)."""
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
            return urllib.request.urlopen(req, timeout=60)
        except Exception as exc:  # noqa: BLE001 - network flakiness, retry
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"GET {url}: {last}")


def get_bytes(url, start=None, end=None, headers=None):
    headers = dict(headers or {})
    if start is not None:
        headers["Range"] = f"bytes={start}-" + ("" if end is None else str(end))
    with http(url, headers) as resp:
        return resp.read()


def content_length(url):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        if resp.headers.get("Accept-Ranges") != "bytes":
            fail(f"server does not accept range requests: {url}")
        return int(resp.headers["Content-Length"])


# --------------------------------------------------------------------------- flashstation API
def latest_build(product, track):
    """Newest build published for `product`: dict with buildId, name and factory URL."""
    page = http(FLASH_HOME).read().decode("utf-8", "replace")
    m = re.search(r"<body data-client-config=[^;]*;([^&\"]+)", page)
    if not m:
        fail("could not read the flash.android.com API key")
    data = json.loads(get_bytes(f"{FLASH_API}?product={product}&key={m.group(1)}",
                                headers={"Referer": FLASH_HOME}))   # the API demands it
    builds = data.get("flashstationBuild") or []
    if not builds:
        fail(f"the API returned no build for product={product}")

    def wanted(b):
        meta = b.get("previewMetadata") or {}
        if track == "canary":
            return bool(meta.get("canary"))
        if track == "beta":
            return not meta.get("canary")
        return True

    picked = [b for b in builds if wanted(b) and b.get("factoryImageDownloadUrl")]
    if not picked:
        fail(f"no build matches track={track} for product={product}")
    best = max(picked, key=lambda b: int(b.get("buildId") or 0))
    return {"build_id": best["buildId"], "name": best.get("releaseCandidateName", ""),
            "url": best["factoryImageDownloadUrl"],
            "track": ((best.get("previewMetadata") or {}).get("releaseTrackVersionName") or track)}


# --------------------------------------------------------------------------- zip over HTTP
def _zip64_extra(extra, csz, usz, lho):
    """Replace the 0xFFFFFFFF placeholders with the values of the zip64 extra field."""
    pos = 0
    while pos + 4 <= len(extra):
        hid, hsz = struct.unpack("<HH", extra[pos:pos + 4])
        if hid == 0x0001:
            blob, off = extra[pos + 4:pos + 4 + hsz], 0
            for name in ("usz", "csz", "lho"):
                if (name == "usz" and usz != 0xFFFFFFFF) or \
                   (name == "csz" and csz != 0xFFFFFFFF) or \
                   (name == "lho" and lho != 0xFFFFFFFF):
                    continue
                if off + 8 > len(blob):
                    break
                val = struct.unpack("<Q", blob[off:off + 8])[0]
                off += 8
                if name == "usz":
                    usz = val
                elif name == "csz":
                    csz = val
                else:
                    lho = val
        pos += 4 + hsz
    return csz, usz, lho


class RemoteZip:
    """Central directory of a zip served over HTTP, addressed from `base` (absolute offset)."""

    def __init__(self, url, base=0, size=None):
        self.url, self.base = url, base
        self.size = size if size is not None else content_length(url)
        self.entries = self._read_central_dir()

    def _read_central_dir(self):
        tail_len = min(self.size, 66000)
        tail = get_bytes(self.url, self.base + self.size - tail_len, self.base + self.size - 1)
        pos = tail.rfind(b"PK\x05\x06")
        if pos < 0:
            fail(f"end of central directory not found in {self.url}")
        cd_size, cd_off = struct.unpack("<II", tail[pos + 12:pos + 20])
        loc = tail.rfind(b"PK\x06\x07")           # zip64, only when the zip needs it
        if loc >= 0:
            eocd64_off = struct.unpack("<Q", tail[loc + 8:loc + 16])[0]
            head = get_bytes(self.url, self.base + eocd64_off, self.base + eocd64_off + 55)
            cd_size, cd_off = struct.unpack("<QQ", head[40:56])
        cd = get_bytes(self.url, self.base + cd_off, self.base + cd_off + cd_size - 1)

        entries, pos = {}, 0
        while pos + 46 <= len(cd) and cd[pos:pos + 4] == b"PK\x01\x02":
            meth, csz, usz, nlen, elen, clen, lho = struct.unpack(
                "<H8xIIHHH8xI", cd[pos + 10:pos + 46])
            name = cd[pos + 46:pos + 46 + nlen].decode("utf-8", "replace")
            extra = cd[pos + 46 + nlen:pos + 46 + nlen + elen]
            if 0xFFFFFFFF in (csz, usz, lho):
                csz, usz, lho = _zip64_extra(extra, csz, usz, lho)
            entries[name] = {"method": meth, "csize": csz, "usize": usz, "lho": lho}
            pos += 46 + nlen + elen + clen
        if not entries:
            fail(f"empty central directory in {self.url}")
        return entries

    def data_offset(self, name):
        """Absolute offset of the member payload (the local header carries its own sizes)."""
        e = self.entries[name]
        head = get_bytes(self.url, self.base + e["lho"], self.base + e["lho"] + 29)
        if head[:4] != b"PK\x03\x04":
            fail(f"broken local header for {name}")
        nlen, elen = struct.unpack("<HH", head[26:30])
        return self.base + e["lho"] + 30 + nlen + elen

    def scan_props(self, name, needle, window=65536, chunk=1 << 20):
        """Stream the member and return the build.prop text around the first `needle` hit."""
        e = self.entries[name]
        if e["method"] not in (0, 8):
            fail(f"{name}: unsupported compression method {e['method']}")
        start = self.data_offset(name)
        dec = zlib.decompressobj(-zlib.MAX_WBITS) if e["method"] == 8 else None
        read = 0
        buf = b""
        with http(self.url, {"Range": f"bytes={start}-{start + e['csize'] - 1}"}) as resp:
            while read < e["csize"]:
                block = resp.read(chunk)
                if not block:
                    break
                read += len(block)
                buf += dec.decompress(block) if dec else block
                hit = buf.find(needle)
                if hit < 0:
                    buf = buf[-(window + len(needle)):]        # keep a straddling hit alive
                elif len(buf) - hit >= window:
                    log(f"    {name}: props found after {read / 1e6:.0f} MB")
                    return buf[max(0, hit - window):hit + window]
                else:
                    buf = buf[max(0, hit - window):]           # hold context, read the tail
        hit = buf.find(needle)
        if hit >= 0:
            log(f"    {name}: props found after {read / 1e6:.0f} MB")
            return buf[max(0, hit - window):hit + window]
        fail(f"{name}: '{needle.decode()}' not found after {read / 1e6:.0f} MB")


PROP_LINE = re.compile(r"^[A-Za-z0-9_.\-]+=[^\x00-\x08\x0b-\x1f\x7f]*$")


def parse_props(blob, needle):
    """Props of the single build.prop that holds `needle` (the window may touch other files)."""
    lines = blob.decode("utf-8", "replace").splitlines()
    anchor = next((i for i, ln in enumerate(lines) if needle.decode() in ln), None)
    if anchor is None:
        return {}

    def is_prop(ln):
        return ln == "" or ln.startswith("#") or bool(PROP_LINE.match(ln))

    first = anchor
    while first > 0 and is_prop(lines[first - 1]):
        first -= 1
    last = anchor
    while last + 1 < len(lines) and is_prop(lines[last + 1]):
        last += 1

    props = {}
    for line in lines[first:last + 1]:
        if line.startswith("ro.") and "=" in line:
            key, val = line.split("=", 1)
            props.setdefault(key.strip(), val.strip())
    return props


def collect_props(factory_url):
    """All build.prop keys needed, read from the two cheapest images of the factory zip."""
    log(f"  factory: {factory_url}")
    outer = RemoteZip(factory_url)
    inner_name = next((n for n in outer.entries if re.search(r"/image-.*\.zip$", n)), None)
    if not inner_name:
        fail("image-*.zip not found inside the factory zip")
    if outer.entries[inner_name]["method"] != 0:
        fail(f"{inner_name} is compressed; range reads into it are not possible")
    inner = RemoteZip(factory_url, base=outer.data_offset(inner_name),
                      size=outer.entries[inner_name]["csize"])

    props = {}
    # cheap: device identity, real FINGERPRINT and UUID (~1 MB)
    dlkm = b"ro.product.system_dlkm.brand="
    props.update(parse_props(inner.scan_props("system_dlkm.img", dlkm, window=8192), dlkm))
    # the rest lives in /system/build.prop (~300 MB, the stream stops at the hit)
    patch = b"ro.build.version.security_patch="
    props.update(parse_props(inner.scan_props("system.img", patch), patch))
    return props


# --------------------------------------------------------------------------- JSON file
def read_json(path):
    """(header pairs, COPG-VD pairs) preserving order and duplicate keys."""
    if not os.path.exists(path):
        return list(DEFAULT_HEADER), [(k, DEFAULT_STATIC.get(k, "")) for k in DEFAULT_ORDER]
    raw = open(path, encoding="utf-8").read()
    decoder = json.JSONDecoder(object_pairs_hook=lambda pairs: pairs)
    top = decoder.decode(raw)
    body = next((v for k, v in top if k == "COPG-VD"), [])
    header = [(k, v) for k, v in top if k != "COPG-VD"]
    return header, list(body)


def render_json(header, body):
    lines = ["{"]
    lines += [f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}," for k, v in header]
    lines.append('  "COPG-VD": {')
    lines += [f"    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},"
              for k, v in body]
    lines[-1] = lines[-1].rstrip(",")
    lines += ["  }", "}", ""]
    return "\n".join(lines)


def apply_props(body, props, static):
    """New COPG-VD pairs: every mapped field refreshed, everything else preserved."""
    values = {}
    for field, candidates in PROP_MAP.items():
        for prop in candidates:
            if props.get(prop):
                values[field] = props[prop]
                break
    out, seen = [], set()
    for key, old in body:
        seen.add(key)
        out.append((key, values.get(key, old)))
    for key in DEFAULT_ORDER:                      # fields the current file does not have yet
        if key not in seen:
            out.append((key, values.get(key, static.get(key, ""))))
    return out, values


def update_readme(path, json_text):
    """Keep the ```json block of the README in sync with the generated file."""
    if not os.path.exists(path):
        return False
    raw = open(path, encoding="utf-8").read()
    pattern = re.compile(r"(```json\n)(.*?\"COPG-VD\".*?)(```)", re.S)
    if not pattern.search(raw):
        log("::warning::json block not found in the README; skipped")
        return False
    new = pattern.sub(lambda m: m.group(1) + json_text + m.group(3), raw, count=1)
    if new == raw:
        return False
    open(path, "w", encoding="utf-8").write(new)
    return True


def gh_output(**kwargs):
    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as fh:
        for key, val in kwargs.items():
            fh.write(f"{key}={val}\n")


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--product", default="comet_beta", help="flashstation product (device)")
    ap.add_argument("--track", default="canary", choices=("canary", "beta", "any"))
    ap.add_argument("--json", default="module/COPG-VD.json.example")
    ap.add_argument("--readme", default="README.md")
    ap.add_argument("--force", action="store_true", help="rewrite even if the build is the same")
    ap.add_argument("--check-only", action="store_true", help="only report, write nothing")
    args = ap.parse_args()

    log(f"== COPG-VD: product={args.product} track={args.track} ==")
    build = latest_build(args.product, args.track)
    log(f"  latest: {build['name']} ({build['track']}) incremental={build['build_id']}")

    header, body = read_json(args.json)
    current = dict(body)
    static = {k: current.get(k, v) for k, v in DEFAULT_STATIC.items()}
    same = (current.get("ID") == build["name"]
            and current.get("INCREMENTAL") == build["build_id"])
    if same and not args.force:
        log(f"  {args.json} is already on {build['name']} - nothing to do.")
        gh_output(changed="false", build=build["name"], incremental=build["build_id"])
        return

    # Never walk the committed build backwards. The API returns the highest canary buildId it
    # currently lists, and a withdrawn build makes that number drop - which would commit a
    # downgrade that every device then refuses anyway (the updater has the same guard).
    try:
        if int(build["build_id"]) < int(current.get("INCREMENTAL") or 0):
            log(f"::warning::upstream build {build['name']} ({build['build_id']}) is older than "
                f"the committed {current.get('ID')} ({current.get('INCREMENTAL')}) - not touching it")
            gh_output(changed="false", build=build["name"], incremental=build["build_id"])
            return
    except ValueError:
        fail(f"non-numeric incremental: API {build['build_id']!r}, file {current.get('INCREMENTAL')!r}")

    props = collect_props(build["url"])
    body, values = apply_props(body, props, static)
    missing = [f for f in PROP_MAP if f not in values]
    if missing:
        fail(f"fields not found in the build.prop: {', '.join(missing)}")

    source = "Strings extracted from"
    if source not in [k for k, _ in header]:
        header.append((source, ""))
    header = [(k, build["url"] if k == source else v) for k, v in header]
    text = render_json(header, body)
    log(f"  FINGERPRINT: {values['FINGERPRINT']}")
    log(f"  SECURITY_PATCH: {values['SECURITY_PATCH']} | TIMESTAMP: {values['TIMESTAMP']}")

    if args.check_only:
        log("  --check-only: file not written.")
        print(text)
        gh_output(changed="true", build=build["name"], incremental=build["build_id"])
        return

    changed = not os.path.exists(args.json) or open(args.json, encoding="utf-8").read() != text
    if changed:
        os.makedirs(os.path.dirname(args.json) or ".", exist_ok=True)
        open(args.json, "w", encoding="utf-8").write(text)
        log(f"  written: {args.json}")
    readme_changed = update_readme(args.readme, text) if args.readme else False
    if readme_changed:
        log(f"  written: {args.readme}")

    gh_output(changed=str(changed or readme_changed).lower(), build=build["name"],
              incremental=build["build_id"], fingerprint=values["FINGERPRINT"],
              security_patch=values["SECURITY_PATCH"], factory_url=build["url"])


if __name__ == "__main__":
    main()
