# VDLU feed - COPG-VD release step (hardened profile)

COPG-VD ships the VDLU engine (`vdlu/update.sh` + `vdlu/vdlu-verify`) and the public keyring
(`vdlu/keyring/vd-2026.pub`). The `.zip` install is unchanged; VDLU is additive (flashless incremental
updates between releases). This file documents the producer step that turns a release tree into a signed
feed. The engine, packer and signer are canonical and live in `VD/Sources/VDLiveUpdate`.

## What the feed is

A VDLU feed is `manifest.json` + `blobs/<sha256>` served under the module's `source` URL. COPG's seeded
`source` is `https://vd171.github.io/VD-Modules/COPG-VD` (Pages of the VD-Modules MMRL repo). The device
engine downloads the manifest, verifies its signature against the embedded keyring, then fetches only the
blobs whose sha256 changed.

## Producing a release (public = hardened, signature MANDATORY)

Run after the module tree is assembled exactly as it ships in the `.zip` (same tree, post-packaging), so
the manifest's hashes match the bytes a device already has:

```sh
VDLU=../../VDLiveUpdate          # VD/Sources/VDLiveUpdate
MODULE_TREE=module               # the packaged tree (zygisk/<abi>.so already built + copied)
OUT=../COPG-VD-vdlu-feed         # staging dir for manifest.json + blobs/
VERSION=61200                    # module.prop versionCode (monotonic; the manifest version)

# 1. pack: per-file sha256/size/mode, enc (zst when it pays), class (reboot/soft/live), blobs/ + manifest.json
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

## Bundled on-device tools (hardened needs them)

Android ships none of the tools the hardened engine needs: `openssl` (ed25519 `-rawin` manifest
verify), `curl` (https manifest/blob fetch) and `zstd` (zst-encoded blobs). They are vendored per ABI
under `module/bin/<abi>/` (binary + its shared-library closure in `bin/<abi>/lib`), fetched from the
official Termux package repository by `.github/scripts/build_bin.sh`. The engine
(`vdlu/update.sh` -> `bundled_bins_on_path`) puts `bin/<abi>` on PATH and `bin/<abi>/lib` on
LD_LIBRARY_PATH itself, so the WebUI's bare-env `ksu.exec` still resolves them. `customize.sh` prunes
all but the device ABI on install. Every `bin/<abi>/` carries `PROVENANCE.json` (upstream source,
version, URL, sha256 of each shipped file); the CI release refuses any ABI without it.

Regenerate (CI or Fedora; needs curl, ar, tar, xz, zstd, readelf):

```sh
bash .github/scripts/build_bin.sh          # repopulates module/bin/<abi>/ + PROVENANCE.json
```

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
