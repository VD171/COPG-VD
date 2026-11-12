# Standalone keybox adapter

TOPG integration: wfire06100. The adapter is implemented in TOPG and does not clone, compile, install or require AlwaysStrong, alwayswrong or asfetch. It uses curl, system wget or the root manager's existing BusyBox wget. Rust remains part of the TEESimulator-RS engine build, not of keybox retrieval.

Default endpoint: http://evoker.qzz.io/key. Existing Evoker base or /keys guide addresses are normalized to /key for compatibility. Other providers must supply a direct XML or base64 download URL. No repository webpage scraping or interactive KOWX712 integration is performed.

The downloader accepts raw AndroidAttestation XML or base64-encoded XML, rejects HTML and XML entities, limits payload size and request duration, and preserves the active keybox on failure. Validation checks structure only, not cryptographic signatures, revocation or service acceptance. HTTP does not authenticate the source.

Personal mode remains protected. Automatic mode and the endpoint are saved under /data/adb/COPG-VD/tee and read back by the WebUI. Download failures do not reset the mode. The scheduler uses this same adapter. Unchanged data is a successful no-op. Existing private keys and persistent engine keys are not reset by this change.
