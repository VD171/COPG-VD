# VDLU feed - COPG-VD release step (hardened profile)

COPG-VD ships the VDLU engine (`vdlu/update.sh` + `vdlu/vdlu-verify`) and the public keyring
(`vdlu/keyring/vd-2026.pub`). The `.zip` install is unchanged; VDLU is additive (flashless incremental
updates between releases). This file documents the producer step that turns a release tree into a signed
feed. The engine, packer and signer are canonical and live in `VD/Sources/VDLiveUpdate`.

## What the feed is

A VDLU feed is `manifest.json` + `blobs/<sha256>` served under the module's `source` URL. COPG-VD's seeded
`source` is `https://vd171.github.io/VD-Modules/COPG-VD` (Pages of the VD-Modules MMRL repo). The device
engine downloads the manifest, verifies its signature against the embedded keyring, then fetches only the
blobs whose sha256 changed.

## Step 0 - re-vendor the canonical engine/webui/verifier FIRST (anti-lapse)

Before packing, copy the CURRENT canonical VDLU files from `VD/Sources/VDLiveUpdate` into the module tree.
Copy the files at the canonical HEAD at release time - NEVER a remembered sha. The v6.13 release shipped a
STALE `webroot/vdlu.js` (the fetch-bootstrap never ran on a clean device) because this list omitted it; the
full source->dest map is therefore pinned here so nothing is missed again.

| canonical source (`VDLiveUpdate/`) | module dest | notes |
|---|---|---|
| `engine/update.sh` | `vdlu/update.sh` | ENGINE_VERSION=3; mode 0755 |
| `engine/vdlu-verify` | `vdlu/vdlu-verify` | mode 0755 |
| `verify/ed25519-mini/<abi>/ed25519-mini` | `vdlu/verify/<abi>/ed25519-mini` | **COPG-VD ABIs only: arm64-v8a, armeabi-v7a, x86_64** (matches `zygisk/<abi>.so`; COPG-VD ships no x86). `customize.sh` keeps only the device ABI |
| `webui/vdlu.js` | `webroot/vdlu.js` | **the one the v6.13 lapse dropped** |
| `webui/vdlu.css` | `webroot/vdlu.css` | |
| `webui/i18n/*.js` | `webroot/vdlu-i18n/` | Updates-panel translations (whole dir, shared filenames). `scripts.js` `loadVdluI18n()` loads only the active language's file on demand (global `window.VDLU_I18N_<UPPER>`); English is the widget default. New shared langs need no code change - just re-copy the dir |

⚠️ **The keyring is NOT a copy of `keys/vd-2026.pub`.** `keys/vd-2026.pub` is a 113-byte **PEM** (the PC-side pubkey `vdlu-sign`/openssl use). The module's `vdlu/keyring/vd-2026.pub` is the **RAW 32-byte** ed25519 key the on-device `ed25519-mini` needs - a different encoding. Copying the PEM over it BREAKS on-device verification. The raw keyring is STABLE (same key until rotation) and already correct in the tree: **do NOT touch it** during re-vendor. (Verify, don't copy: its sha256 is `2c63383990ca...`; the signed baseline must verify against it.) Only on a key **rotation** is it re-copied - and then from `keys/vd-2026.pub.raw` (the RAW 32 bytes that `vdlu-keygen` emits alongside the PEM via `openssl pkey -pubout -outform DER | tail -c 32`), NEVER from the `.pub` PEM.

NOT vendored (fetched at runtime, served from the shared tools-feed, never in the `.zip`):
`tools/curl/<abi>/curl` + the signed `tools-manifest.json`. The tools-feed is packed separately with
`vdlu-pack ... --raw` (served raw at a fixed path, so `enc=raw`, not `gz`) and shares
`https://vd171.github.io/VD-Modules/vdlu-tools/` across every slim module.

Re-check the canonical HEAD on the release day; copy only the files that actually differ (compare with
`cmp`), not any sha pinned here. Only after this re-vendor is the tree ready to pack.

## Producing a release (public = hardened, signature MANDATORY)

Run after the module tree is assembled exactly as it ships in the `.zip` (same tree, post-packaging), so
the manifest's hashes match the bytes a device already has:

```sh
VDLU=../../VDLiveUpdate          # VD/Sources/VDLiveUpdate
MODULE_TREE=module               # the packaged tree (zygisk/<abi>.so already built + copied)
OUT=../COPG-VD-vdlu-feed         # staging dir for manifest.json + blobs/
VERSION=61200                    # module.prop versionCode (monotonic; the manifest version)

# 1. pack: per-file sha256/size/mode, enc (gz when it pays), class (reboot/soft/live), blobs/ + manifest.json
"$VDLU/producer/vdlu-pack" "$MODULE_TREE" "$OUT" COPG-VD "$VERSION"

# 2. sign: ed25519 over the canonical manifest; key_id must match the embedded pubkey (vd-2026)
"$VDLU/producer/vdlu-sign" "$OUT/manifest.json" "$VDLU/keys/vd-2026.pem" vd-2026
```

- `vd-2026.pem` is the PRIVATE key. It stays with the release/owner, NEVER in the module tree or the repo.
  Only `vdlu/keyring/vd-2026.pub` ships.
- `channel=stable` is the seeded channel; a canary feed is a separate `manifest.json` under a `canary` path.
- `version` is the `versionCode` from `module.prop` (monotonic). Hardened blocks downgrades: a manifest
  whose version is below the installed one is refused (anti-replay).
- The zygisk `.so` is class `reboot`: VDLU stages it and the pre-zygote `post-fs-data.sh` swaps it on the
  next boot (no second reboot). A device never swaps a `.so` into a live zygote.

## On-device tools (slim - Abordagem B, v6.13+)

The `.zip` ships ONLY the `ed25519-mini` verifier (per ABI under `vdlu/verify/<abi>/`) plus the raw
keyring - no `openssl`, `curl` or `zstd`. The old `module/bin/<abi>/` bundle (openssl + curl + zstd +
their `.so` closures) is GONE; the zip dropped from ~13.5 MB to ~660 KB. Blob decompression uses toybox
`gzip` (manifest `enc=gz`, already on-device); the signature check is the embedded `ed25519-mini` against
the raw keyring (`vdlu/keyring/vd-2026.pub`, 32 bytes).

The one tool Android lacks - a static `curl` for the https blob fetch - is NOT bundled. On the first
https update the WebUI (webview TLS) downloads it from the shared tools-feed; the engine's `install-tool`
verifies the signed `tools-manifest.json` (ed25519-mini) AND the binary's sha256 BEFORE adopting it, then
it persists in Tier-2 (`/data/adb/<mod>/vdlu/tools/<abi>/curl`) - fetched once, never again unless the
module is fully uninstalled. The webview `fetch()` is only transport; trust is the on-device
signature/hash check, never the download.

The static curl + ed25519-mini are built reproducibly (NDK, bionic-dynamic = zero closure) in
`VD/Sources/VDLiveUpdate/{tools/curl,verify/ed25519-mini}/<abi>/`, each with `PROVENANCE.json` +
`build.sh`. The tools-feed is SHARED across every slim module at
`https://vd171.github.io/VD-Modules/vdlu-tools/<abi>/curl` (+ signed `tools-manifest.json`), derived from
the module's `source` by replacing its last path segment with `vdlu-tools` - so all modules reuse one
curl, signed with the same `vd-2026` key. `customize.sh` keeps only the device ABI's
`vdlu/verify/<abi>/ed25519-mini` on install.

## Retention (prune orphan blobs)

Blobs are content-addressed and immutable: the packer dedups by sha256 and only ever ADDS, so `blobs/`
grows every release. Keep the feed (and the Pages site) small with `vdlu-gc`, which removes blobs that NO
retained manifest references. Archive each signed manifest first so the GC has version history, then prune
(dry-run by default, `--apply` to delete):

```sh
mkdir -p "$OUT/manifests"
cp "$OUT/manifest.json" "$OUT/manifests/$VERSION.json"     # archive the SIGNED manifest
"$VDLU/producer/vdlu-gc" "$OUT" --keep-last 3              # dry-run: lists orphans
"$VDLU/producer/vdlu-gc" "$OUT" --keep-last 3 --apply      # delete them
```

Retention is by REFERENCE, not age: GC keeps the union of sha256 over the current manifest plus the last 3
archived versions, and never removes a blob a retained release still needs (fail-safe: it refuses to run
with no retained manifest). Deleting a blob frees the Pages site but not git history - keep the public feed
on a dedicated, squashable/orphan branch; blobs are reproducible from the tagged commit by `vdlu-pack`, so
resetting the feed branch loses nothing.

## Publish (batch, spaced - GitHub is hostile/suspended)

Push `manifest.json` + `blobs/` to `vd171.github.io/VD-Modules/COPG-VD/` in a spaced batch (never a write
burst). The owner pushes; this repo's commits stay local.

## Provenance

The release already publishes `SHA256SUMS.txt` (the `.zip` + each `.so`). The VDLU feed derives from the
same packaged tree, so anyone can re-pack the published tree and reproduce `manifest.json`'s per-file
sha256 - the manifest IS the provenance of the incremental payload, and its signature is the root of trust.

---

_Generated with Claude._
