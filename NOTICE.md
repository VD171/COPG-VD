# Third-Party Notices

COPG-VD is distributed under the GNU AGPL-3.0-or-later (see [LICENSE](LICENSE)).
Copyright (C) 2026 AlirezaParsi & VD171. It is a fork by VD171 of the original
COPG by AlirezaParsi (Apache-2.0), relicensed under the GNU AGPL-3.0-or-later;
the upstream COPG code remains available under its own Apache-2.0 license.

COPG-VD bundles or distributes the third-party software below. Each component
remains under its own license.

## COPG (upstream)

COPG-VD is a fork of AlirezaParsi's original COPG, which remains under its own
Apache-2.0 license.

- **Project:** COPG
- **Author:** AlirezaParsi
- **License:** Apache-2.0

## ed25519-mini (TweetNaCl)

The **[VDLiveUpdate](https://github.com/VD171/VDLiveUpdate) (VDLU)** self-updater ships `ed25519-mini`, a tiny verify-only ed25519 signature
checker, so update signatures can be verified on-device without OpenSSL. Its
crypto is TweetNaCl, only a small wrapper (`main.c`) is added.

- **Crypto:** TweetNaCl, version 20140427
- **Authors:** D. J. Bernstein, Bernard van Gastel, Wesley Janssen, Tanja Lange, Peter Schwabe, Sjaak Smetsers
- **License:** public domain
- **Source:** https://tweetnacl.cr.yp.to/
- Per-ABI provenance (sha256) in [module/vdlu/verify/PROVENANCE.json](module/vdlu/verify/PROVENANCE.json).

## curl (fetched at runtime)

The VDLU self-updater needs a static `curl` for its HTTPS blob download. It is
**not** bundled in the flashable zip, it is downloaded once, on first update, from
the shared signed tools feed and cached on-device. It is built from the official
Termux package sources.

- **Project:** curl
- **License:** curl license (MIT/X-style)
- **Source:** https://curl.se/

## Pixel build.prop profiles

The bundled Pixel fingerprint/build.prop profile data comes from a public fork.

- **Project:** [@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop) (a fork of @T3SL4's build.prop)
- **Source:** https://github.com/VictorGabriel7Dev/build.prop
