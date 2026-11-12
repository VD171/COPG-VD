# TOPG TEE integration

Integration author: wfire06100.

## Status

This initial commit provides path constants and a target-entry formatter only. It does not install, start, migrate or disable any engine. Full integration is not yet implemented or device-tested.

## Layout

The repository module/ directory is the module package root. Its existing module ID is COPG-VD. Therefore module/tee/ is installed as /data/adb/modules/COPG-VD/tee/, not as an additional nested module/copg-vd directory.

Mutable TEE data belongs in /data/adb/COPG-VD/tee/. Existing COPG-VD paths remain unchanged. /data/adb/tricky_store/ is a potential migration source only, not the intended runtime dependency. Engine source paths and SELinux access still require adaptation and verification.

## Approved implementation requirements

- Preserve the existing WebUI; add an isolated TEE tab using its existing translations and language selector, with English fallback.
- Integrate the engine from wfire06100/TEESimulator-RS and the keybox update mechanism from wfire06100/alwayswrong after source and license review.
- Support automatic keybox updates and personal keybox import without silently overwriting personal keys. Never commit private keybox data or persistent keys.
- Support target modes auto (no suffix), generate (!) and hack (?), preserving multi-keybox sections.
- Keep COPG-VD authoritative for security patches and boot-property policy. Verify actual boot_props_mode code before adapting it; do not add a duplicate UI setting.
- If legacy data exists, offer Migrate existing data or Clean installation. Otherwise perform normal initialization. Existing TOPG data takes priority on updates.
- Preserve persistent_keys, hbk, boot_key.bin, boot_hash.bin, keyboxes, targets and additional required state after verifying their relationships in source.
- Back up and verify migration; do not mix key stores, delete source data, regenerate migrated keys or fall back silently to a clean installation.
- Detect conflicting TEE modules by metadata, display them and disable them before integrated-engine activation. Show English instructions to uninstall PIF / Play Integrity Fix modules and other conflicting TEE managers, and reboot. Do not automatically uninstall modules or delete their data.
- Keep all new installer text, code comments and integration documentation in English.
- Preserve original author credits and license notices; add wfire06100 credits. Review component license obligations before importing code; do not blanket-relicense COPG-VD.
- Pin upstream revisions, isolate adapters and document update procedures and diagnostics.

## Helper

Source tee_common.sh and call tee_target_entry with a package name and auto, generate or hack. The helper prints one entry only; it does not rewrite target.txt or remove section headers. Callers must handle file locking, atomic updates and permissions. Path constants alone do not relocate the upstream engine.
