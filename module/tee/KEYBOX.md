# Keybox adapter

TOPG integration: wfire06100. The optional native asfetch downloader is built from AlwaysStrong / Evokerr and contributors, via wfire06100/alwayswrong commit 0f6657a39bd066f6afe5a1c40c0bcaa4dcad629c. Its original GPL-3.0 license and source archive are shipped beside it. TOPG's shell and UI adapter is separately implemented.

The verified AlwaysStrong automatic protocol is http://evoker.qzz.io/key returning base64 XML. The adapter maps Evoker's base address and /keys guide address to that API; it does not scrape the guide. Other endpoints must be direct XML or base64 download URLs. Repository HTML pages are rejected. KOWX712 interactive repository selection is not implemented by this adapter.

The working downloader is tried first; fallback order is asfetch, BusyBox wget, curl, system wget. Attempts are bounded, payloads are capped, personal mode is protected, and the active keybox is kept when decoding or validation fails. Unchanged content returns success with the text unchanged, to remain compatible with the existing TOPG scheduler. Validation checks structure only, not signatures, revocation or service acceptance. HTTP does not authenticate the mirror.

Keybox mode and endpoint are stored under /data/adb/COPG-VD/tee. Mode changes are saved and read back by the WebUI. Switching to auto authorizes scheduled replacement; importing a personal keybox returns to protected mode. Invalid or unreadable settings are shown as an error rather than silently displayed as personal.
