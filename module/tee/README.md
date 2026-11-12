# TOPG TEE integration

Integration: wfire06100. COPG-VD: AlirezaParsi and VD171 (Apache-2.0). TEESimulator: JingMatrix and TEESimulator-RS contributors (GPL-3.0; original NOTICE retained). AlwaysWrong's BASE/key protocol is reimplemented here; its shell code is not copied. The combined ZIP includes the modified engine and adapter sources and upstream notices.

The TOPG integrated workflow compiles the pinned engine, runs upstream JVM tests, builds COPG Zygisk libraries and assembles one module. Core hooks are applied only in a checked staging tree. The existing module ID remains COPG-VD. The generated package does not use the upstream COPG updateJson URL. No release is published automatically.

Installation offers migration or clean setup if legacy data exists. Updates preserve initialized TOPG data. Migration occurs after reboot, with snapshot hashes and full backup under /data/adb/COPG-VD/tee-backups. The legacy source is never deleted. Links, special files or invalid identity-file lengths fail closed. Migration errors never trigger clean initialization. Conflicting TEE modules are disabled, PIF conflicts are reported, and reboot is mandatory.

Runtime data is /data/adb/COPG-VD/tee. COPG owns security patches and boot policy. boot_props_mode=disable is internal, not another UI setting. Existing persisted boot identity is preferred over live properties. Personal keyboxes are protected by default. Auto mode requires an explicit mirror base URL: BASE/key returns base64 XML. HTTPS is recommended; HTTP is unauthenticated. Structural checks do not establish cryptographic validity or revocation status. Updates run after boot and every six hours. Backups contain sensitive material and must remain private.

The TEE panel uses existing COPG I18N. English and French are provided; other languages use English fallback until translated. Target sections/comments remain editable. New packages inherit the last keybox section. Auto has no suffix, Generate uses !, Hack uses ?. Reset is deferred to reboot with backup and may break applications using old keys.

Build-time syntax checks and upstream JVM tests are not real-device validation. Migration, SELinux access, app behavior and rollback need device testing before release. No Strong Integrity, Wallet or hardware-backed security guarantee is made. Do not install intermediate engine-only ZIPs.
