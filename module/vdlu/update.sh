#!/system/bin/sh
# ======================================================================
#  VDLiveUpdate (VDLU)  ::  flashless, incremental module updates
#  A self-update engine for KernelSU/APatch/Magisk modules.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: Apache-2.0
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/VDLiveUpdate
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
# VDLU engine - flashless incremental module updater (DIFF->FETCH->APPLY->COMMIT).
# POSIX sh (mksh/busybox/toybox). Env in: VDLU_DIR, MODULE_DIR, MODID.
# Contract: docs/INTERFACES.md (CLI/layout/JSON keys = immutable).

ENGINE_VERSION=5             # bumped 4->5 (VDLU#2 trust-anchor exclusion + the 128/2 MiB ceilings); ANY engine logic change (verify/apply/path rules) bumps this - keep engine_min honest
MAX_FILE_BYTES=134217728     # 128 MiB per-file ceiling: anti decompression-bomb / disk DoS
MAX_MANIFEST_BYTES=2097152   # 2 MiB manifest ceiling: anti OOM
TAB=$(printf '\t')
LOCKDIR=""

die() { echo "VDLU: $*" >&2; exit 1; }

# ---- tool discovery -------------------------------------------------------
# Slim distribution: the only on-device tools are the embedded ed25519-mini (verify)
# and the static curl the WebUI bootstraps into Tier-2 ($VDLU_DIR/tools/<abi>). gzip/sha256sum/
# base64 come from toybox. The engine may be launched with a bare env (the WebUI's ksu.exec sets
# no PATH), so put the Tier-2 tools dir (and any legacy module bin/<abi>) on
# PATH/LD_LIBRARY_PATH. No-op when neither exists (the engine's own test harness).
bundled_bins_on_path() {
	local abi bd d ld tt
	abi=$(getprop ro.product.cpu.abi 2>/dev/null)
	# Tier-2 fetched toolchain (slim: the static curl the WebUI bootstrapped) - preferred, survives
	# module updates. Slim modules bundle NO bin/; the tools live in $VDLU_DIR/tools/<abi>.
	if [ -n "${VDLU_DIR:-}" ] && [ -d "$VDLU_DIR/tools" ]; then
		tt=""
		[ -n "$abi" ] && [ -d "$VDLU_DIR/tools/$abi" ] && tt="$VDLU_DIR/tools/$abi"
		[ -z "$tt" ] && for d in "$VDLU_DIR"/tools/*/; do [ -d "$d" ] && { tt=${d%/}; break; }; done
		if [ -n "$tt" ] && [ -d "$tt" ]; then
			case ":$PATH:" in *":$tt:"*) : ;; *) PATH="$tt:$PATH"; export PATH ;; esac
			[ -d "$tt/lib" ] && case ":${LD_LIBRARY_PATH:-}:" in *":$tt/lib:"*) : ;; *) LD_LIBRARY_PATH="$tt/lib:${LD_LIBRARY_PATH:-}"; export LD_LIBRARY_PATH ;; esac
		fi
	fi
	# Legacy: a module that still bundles its own bin/<abi>. Slim modules have none.
	[ -n "${MODULE_DIR:-}" ] && [ -d "$MODULE_DIR/bin" ] || return 0
	bd="$MODULE_DIR/bin/$abi"
	[ -n "$abi" ] && [ -d "$bd" ] || { bd=""; for d in "$MODULE_DIR"/bin/*/; do [ -d "$d" ] && { bd=${d%/}; abi=${bd##*/}; break; }; done; }
	[ -n "$bd" ] && [ -d "$bd" ] || return 0
	case ":$PATH:" in *":$bd:"*) : ;; *) PATH="$bd:$PATH"; export PATH ;; esac
	# dynamic bins need their .so: public modules keep them in bin/<abi>/lib; some legacy modules in lib/<abi> (+ lib)
	for ld in "$bd/lib" "$MODULE_DIR/lib/$abi" "$MODULE_DIR/lib"; do
		[ -d "$ld" ] || continue
		case ":${LD_LIBRARY_PATH:-}:" in *":$ld:"*) : ;; *) LD_LIBRARY_PATH="$ld:${LD_LIBRARY_PATH:-}"; export LD_LIBRARY_PATH ;; esac
	done
}

init_tools() {
	bundled_bins_on_path
	if command -v sha256sum >/dev/null 2>&1; then SHA="sha256sum"
	elif command -v toybox >/dev/null 2>&1 && toybox sha256sum </dev/null >/dev/null 2>&1; then SHA="toybox sha256sum"
	else die "no sha256sum"; fi
	CURL=$(command -v curl 2>/dev/null) || CURL=""
	WGET=$(command -v wget 2>/dev/null) || WGET=""
	GZIP=$(command -v gzip 2>/dev/null) || GZIP=""
	# https cert validation uses the Android trust store (--capath). Some static curl builds also bake
	# in a default CA bundle FILE that is absent on real devices, making curl fail (rc 77) before
	# --capath is read, so build a bundle from the store and pass --cacert too, which overrides it.
	# Config `ca_path`/`ca_cert` override. The ed25519 signature stays the integrity root.
	CAPATH=$(cfg ca_path "")
	if [ -z "$CAPATH" ]; then
		for _p in /system/etc/security/cacerts /apex/com.android.conscrypt/cacerts /etc/security/cacerts; do
			[ -d "$_p" ] && { CAPATH="$_p"; break; }
		done
	fi
	CACERT=$(cfg ca_cert "")
	if [ -z "$CACERT" ]; then
		_cab="$VDLU_DIR/.ca-bundle.pem"
		for _d in /apex/com.android.conscrypt/cacerts /system/etc/security/cacerts /etc/security/cacerts; do
			[ -d "$_d" ] && cat "$_d"/* 2>/dev/null
		done > "$_cab" 2>/dev/null
		if [ -s "$_cab" ]; then CACERT="$_cab"; else rm -f "$_cab"; fi
	fi
	# Diagnostic (VD-Modules#1): log the resolved TLS trust + cert count, so a boot-time curl rc 77
	# (empty store -> curl falls back to a baked-in CA path) is self-explaining in boot.log instead of a
	# mystery. certs=0 at boot means the store was not populated yet when the fetch ran.
	_cn=0; _csz=0; _crd=no
	if [ -n "$CACERT" ]; then
		[ -r "$CACERT" ] && _crd=yes
		_cn=$(grep -c 'BEGIN CERT' "$CACERT" 2>/dev/null); _cn=${_cn:-0}
		_csz=$(wc -c <"$CACERT" 2>/dev/null); _csz=${_csz:-0}
	fi
	# readable=no on a non-empty store points at the boot-time SELinux-context hypothesis: a context that
	# cannot read system_security_cacerts_file leaves an empty/unreadable bundle, so curl falls back to its
	# baked-in CA path and fails (rc 77). curl already runs with -S, so its own error reaches boot.log too.
	_cprd=no; [ -n "$CAPATH" ] && [ -r "$CAPATH" ] && _cprd=yes
	echo "VDLU: tls capath=${CAPATH:-none}(readable=$_cprd) cacert=${CACERT:-none}(readable=$_crd size=$_csz certs=$_cn)" >&2
}

sha256f() { $SHA "$1" 2>/dev/null | cut -d' ' -f1; }
now() { date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u 2>/dev/null || echo ""; }
isnum() { case "$1" in ''|*[!0-9]*) return 1 ;; *) return 0 ;; esac; }

cfg() { # key default
	local v
	v=$(grep -E "^$1=" "$VDLU_DIR/config" 2>/dev/null | tail -n1 | cut -d= -f2-)
	[ -n "$v" ] && printf '%s' "$v" || printf '%s' "$2"
}

# ---- paths ----------------------------------------------------------------
init_paths() {
	: "${VDLU_DIR:?VDLU_DIR not set}"
	: "${MODULE_DIR:?MODULE_DIR not set}"
	: "${MODID:?MODID not set}"
	BLOBS="$VDLU_DIR/blobs"
	ROLLBACK="$VDLU_DIR/rollback"
	STAGED="$VDLU_DIR/staged"
	WORK="$VDLU_DIR/.work"
	TARGET="$VDLU_DIR/target.json"
	CURRENT="$VDLU_DIR/current.json"
	JOURNAL="$VDLU_DIR/journal.json"
	PLAN="$VDLU_DIR/plan.tsv"
	PLANDEL="$VDLU_DIR/plan.del"
	CANCEL="$VDLU_DIR/cancel"
	mkdir -p "$VDLU_DIR" "$BLOBS" "$ROLLBACK" "$STAGED" "$WORK" 2>/dev/null
	# Baseline seed (fix from:0): a fresh install ships the signed manifest of its own version as
	# vdlu/baseline.json; seed current.json from it so the device is born "current" (no self-update,
	# no re-fetch of what it already has). Only when current is absent - never overwrites real state.
	[ -f "$CURRENT" ] || { [ -f "$MODULE_DIR/vdlu/baseline.json" ] && cp -f "$MODULE_DIR/vdlu/baseline.json" "$CURRENT" 2>/dev/null; }
	SOURCE=$(cfg source "")
	TGTVER=0
	FROMVER=0
}

# ---- lock -----------------------------------------------------------------
# mkdir-based lock (portable: toybox `flock` only takes the fd-form and its fd handling is
# unreliable on Android, so flock is NOT used). mkdir is atomic; stale-lock recovery by PID.
acquire_lock_try() {   # non-blocking: 0 = acquired, 1 = busy (NO exit). The patient boot retry backs off on 1.
	local opid
	if ! mkdir "$VDLU_DIR/lock.d" 2>/dev/null; then
		opid=$(cat "$VDLU_DIR/lock.d/pid" 2>/dev/null)
		if [ -z "$opid" ] || ! kill -0 "$opid" 2>/dev/null; then
			rm -rf "$VDLU_DIR/lock.d" 2>/dev/null
			mkdir "$VDLU_DIR/lock.d" 2>/dev/null || return 1
		else
			return 1
		fi
	fi
	echo $$ >"$VDLU_DIR/lock.d/pid" 2>/dev/null
	LOCKDIR="$VDLU_DIR/lock.d"
	trap release_lock EXIT INT TERM
	return 0
}
acquire_lock() { acquire_lock_try || { echo "VDLU: busy (another run holds the lock)" >&2; exit 4; } }
release_lock() {
	[ -n "$LOCKDIR" ] && rm -rf "$LOCKDIR" 2>/dev/null
	LOCKDIR=""
}

# ---- JSON flatten (gron-style; no jq) -------------------------------------
# Emits one "path<TAB>value" line per scalar leaf, e.g. files/0/sha256<TAB>ab..
json_flatten() {
	awk '
	{ data = data $0 "\n" }
	END { N = length(data); P = 1; skipws(); valparse("") }
	function skipws(   c){ while(P<=N){ c=substr(data,P,1); if(c==" "||c=="\t"||c=="\n"||c=="\r") P++; else return } }
	function valparse(pfx,   c){
		skipws(); c=substr(data,P,1)
		if(c=="\""){ emit(pfx, pstr()); return }
		if(c=="{"){ pobj(pfx); return }
		if(c=="["){ parr(pfx); return }
		plit(pfx)
	}
	function pstr(   st,c,seg){
		P++; st=P
		while(P<=N){ c=substr(data,P,1)
			if(c=="\\"){ P+=2; continue }
			if(c=="\""){ seg=substr(data,st,P-st); P++; return unesc(seg) }
			P++
		}
		return unesc(substr(data,st,P-st))
	}
	function unesc(s){
		if(index(s,"\\")==0) return s
		gsub(/\\n/,"\n",s); gsub(/\\t/,"\t",s); gsub(/\\r/,"\r",s)
		gsub(/\\\//,"/",s); gsub(/\\"/,"\"",s); gsub(/\\\\/,"\\",s)
		return s
	}
	function plit(pfx,   st,c){
		st=P
		while(P<=N){ c=substr(data,P,1)
			if(c==","||c=="}"||c=="]"||c==" "||c=="\t"||c=="\n"||c=="\r") break
			P++
		}
		emit(pfx, substr(data,st,P-st))
	}
	function pobj(pfx,   c,k){
		P++; skipws()
		if(substr(data,P,1)=="}"){ P++; return }
		while(P<=N){
			skipws(); k=pstr(); skipws()
			if(substr(data,P,1)==":") P++
			if(pfx=="") valparse(k); else valparse(pfx "/" k)
			skipws(); c=substr(data,P,1)
			if(c==","){ P++; continue }
			if(c=="}"){ P++; return }
			return
		}
	}
	function parr(pfx,   c,i){
		P++; i=0; skipws()
		if(substr(data,P,1)=="]"){ P++; return }
		while(P<=N){
			valparse(pfx "/" i); i++
			skipws(); c=substr(data,P,1)
			if(c==","){ P++; continue }
			if(c=="]"){ P++; return }
			return
		}
	}
	function emit(path,val){ gsub(/\n/,"\\n",val); gsub(/\r/,"",val); gsub(/\t/,"\\t",val); print path "\t" val }
	' "$1"
}

flat_get() { grep -m1 "^$1$TAB" "$WORK/manifest.flat" 2>/dev/null | cut -f2; }

# ---- network --------------------------------------------------------------
fetch_url() { # url dest -> sets FETCH_RC (transport exit code) and returns it
	local url="$1" dest="$2" src T
	FETCH_RC=0
	case "$url" in
		file://*) src=${url#file://}; cp -f "$src" "$dest" 2>/dev/null; FETCH_RC=$? ;;
		http://*|https://*)
			if [ -n "$CURL" ]; then
				# Bounded so a dead/stalled transfer can never hang the run: --connect-timeout bounds the
				# CONNECT (captive portal / dead host); --speed-time/--speed-limit abort a transfer stuck below
				# 1 byte/s for 60s (mid-stream stall). A slow-but-PROGRESSING blob download is NOT affected (no
				# --max-time cap). A partial/corrupt download is caught anyway by the blob's sha256.
				T="--connect-timeout 15 --speed-limit 1 --speed-time 60"
				_ca=""; [ -n "$CACERT" ] && _ca="--cacert $CACERT"; [ -n "$CAPATH" ] && _ca="$_ca --capath $CAPATH"
				"$CURL" -fsSL $T $_ca --max-filesize "$MAX_FILE_BYTES" -o "$dest" "$url"
				FETCH_RC=$?
			elif [ -n "$WGET" ]; then
					# (busybox) wget has no --max-filesize, so bound the bytes WRITTEN with `head -c` (the curl
					# branch's cap equivalent): a hostile/oversized body can never disk-fill a curl-less device.
					# wget's OWN exit (for fetch_offline classification) is preserved via a side rc file, which is
					# NOT in the pipe, so `head` closing the pipe early on an oversized body cannot clobber it.
					_wrc="$dest.wrc"; rm -f "$_wrc" 2>/dev/null
					( "$WGET" -q --connect-timeout=15 --read-timeout=60 -O - "$url" 2>/dev/null; echo $? >"$_wrc" ) | head -c "$MAX_FILE_BYTES" >"$dest"
					FETCH_RC=$(cat "$_wrc" 2>/dev/null); rm -f "$_wrc" 2>/dev/null
					case "$FETCH_RC" in ''|*[!0-9]*) FETCH_RC=1 ;; esac
			else echo "VDLU: no curl/wget available" >&2; FETCH_RC=1; return 1; fi ;;
		*) echo "VDLU: unsupported source url: $url" >&2; FETCH_RC=1; return 1 ;;
	esac
	return "$FETCH_RC"
}

# A failed manifest fetch is worth a boot retry ONLY when it is a transport/connectivity failure (offline),
# never a server that answered with an error or a bad/invalid manifest (deterministic - retry cannot fix it).
# Classify by the fetcher exit captured in FETCH_RC: curl resolve/connect/timeout/ssl/empty-reply/recv.
fetch_offline() {
	case "$FETCH_RC" in
		6|7|28|35|52|56) return 0 ;;
		4) [ -n "$WGET" ] && [ -z "$CURL" ] && return 0 ;;
	esac
	return 1
}

# Egress network CLASS for the default route to a public address: wifi | mobile | none. Kernel routing
# lookup only (`ip route get` respects Android policy routing - per-network default tables, which
# `route show default` on `main` misses) - NO curl, NO packet, NO radio wake. The iface name classifies:
# cellular base ifaces (rmnet/ccmni/ccinet/pdp/wwan) = mobile; anything else with a route (wlan/eth/usb) =
# wifi/unmetered. The 464XLAT clat iface is "v4-<base>", so we strip "v4-" and classify by the BASE: this is
# the fix for IPv6-only Wi-Fi, where IPv4 egress is "v4-wlan0" (wifi), NOT a cellular link.
net_type() {
	command -v ip >/dev/null 2>&1 || { echo wifi; return 0; }    # can't tell -> assume unmetered
	local line dev
	line=$(ip route get 1.1.1.1 2>/dev/null)
	[ -n "$line" ] || line=$(ip route get 2606:4700:4700::1111 2>/dev/null)
	[ -n "$line" ] || { echo none; return 0; }
	dev=$(printf '%s\n' "$line" | sed -n 's/.* dev \([^ ]*\).*/\1/p' | head -1)
	dev=${dev#v4-}    # 464XLAT clat virtual iface "v4-<base>" -> classify by the underlying <base>
	case "$dev" in
		rmnet*|ccmni*|ccinet*|pdp*|wwan*) echo mobile ;;
		*) echo wifi ;;
	esac
}
# Is the current egress allowed by net_policy (any | wifi | mobile)? `none` (no route) is never allowed.
# Default `any` = Wi-Fi + mobile. Gates the patient boot retry (waits for an ALLOWED network) and the blob
# download (do_fetch); the manifest check stays ungated (tiny, so the UI can report updates on any network).
net_allowed() {
	local t p; t=$(net_type); p=$(cfg net_policy any)
	[ "$t" = none ] && return 1
	case "$p" in
		wifi)   [ "$t" = wifi ] ;;
		mobile) [ "$t" = mobile ] ;;
		*)      return 0 ;;
	esac
}

dl_manifest() {
	[ -n "$SOURCE" ] || { echo "VDLU: no source configured" >&2; return 1; }
	fetch_url "${SOURCE%/}/manifest.json" "$WORK/manifest.json" || return 1
	local sz; sz=$(wc -c <"$WORK/manifest.json" 2>/dev/null)
	[ "${sz:-0}" -le "$MAX_MANIFEST_BYTES" ] || { echo "VDLU: manifest too large ($sz)" >&2; return 1; }
}

# ---- module-update signing-key allowlist (VDLU#1 trust root) --------------
# The keyring may ALSO carry a LOWER-trust key (e.g. a fingerprint-feed key - automated, different
# account). Without an allowlist, a module-update manifest signed by that key (key_id=vd-fp-2026) would
# verify against its pubkey and apply a FULL flashless root update = a root-RCE path if the lower-trust
# key leaks. Fail CLOSED: the manifest's key_id must be an accepted MODULE-UPDATE key BEFORE a pubkey is
# selected. Source of the allowlist = config `key_id` (comma-separated, for rotation); UNSET is
# default-safe: a single-key keyring accepts only that one key's id, a MULTI-key keyring is rejected
# (config must pin `key_id`). This forces a multi-key module (one that also ships a fingerprint-feed key)
# to declare its module key; single-key modules keep working unchanged. The fingerprint-feed trust root
# is a SEPARATE path (its own pinned key) and is untouched by this.
keyring_dir() {
	local pd
	pd=$(cfg pubkey_dir keyring); case "$pd" in ''|*/*|*..*) pd=keyring ;; esac
	printf '%s' "$MODULE_DIR/vdlu/$pd"
}
# Resolve the allowlist into KEYID_ALLOW (comma/space separated). rc 1 = ambiguous/misconfigured -> the
# caller fails closed. Also passed to vdlu-verify via VDLU_KEYID_ALLOW so the standalone verifier agrees.
resolve_keyid_allow() {
	local kr cfgv n id f
	kr=$(keyring_dir)
	cfgv=$(cfg key_id "")
	if [ -n "$cfgv" ]; then
		KEYID_ALLOW=$(printf '%s' "$cfgv" | tr -d ' \t\r')     # keep commas; drop whitespace/CR
		[ -n "$(printf '%s' "$KEYID_ALLOW" | tr -d ',')" ] || { echo "VDLU: config key_id is set but empty" >&2; return 1; }
		return 0
	fi
	n=0; id=""
	for f in "$kr"/*.pub; do
		[ -f "$f" ] || continue
		n=$((n+1)); id=${f##*/}; id=${id%.pub}
	done
	[ "$n" -ne 0 ] || { echo "VDLU: no *.pub in keyring ($kr); cannot resolve module-update key" >&2; return 1; }
	[ "$n" -le 1 ] || { echo "VDLU: multiple keys in keyring; config must pin key_id" >&2; return 1; }
	KEYID_ALLOW="$id"
	return 0
}
keyid_allowed() { # id ; membership in $KEYID_ALLOW (comma/space separated)
	local want="$1" k oldifs
	oldifs=$IFS; IFS=', '
	for k in $KEYID_ALLOW; do [ "$k" = "$want" ] && { IFS=$oldifs; return 0; }; done
	IFS=$oldifs; return 1
}

# ---- signature / meta -----------------------------------------------------
verify_manifest() {
	local prof keyring v pd mkid
	# fail-CLOSED by INVERSION: `trusted` is the ONLY opt-in open value (best-effort verify). ANY other
	# profile - the hardened default, a lost line, a typo (`hardend`), a trailing space/CR, a MITM-mangled
	# value - is hardened = signature MANDATORY. A corrupted VALUE must fail closed exactly like a lost line,
	# else an unsigned/MITM manifest is accepted -> .so swap under MITM = root RCE. `tr -d space` normalizes
	# trailing CR/space so a legit `trusted` config with sloppy whitespace is not wrongly rejected.
	# Audited 2026-11-16; corrupted-value fail-open closed 2026-11-17.
	prof=$(cfg profile hardened | tr -d '[:space:]')
	pd=$(cfg pubkey_dir keyring); case "$pd" in ''|*/*|*..*) pd=keyring ;; esac
	keyring="$MODULE_DIR/vdlu/$pd"
	v="$MODULE_DIR/vdlu/vdlu-verify"
	if [ -f "$v" ]; then
		# VDLU#1 trust-root allowlist: restrict WHICH key_id may sign a MODULE-UPDATE, BEFORE vdlu-verify
		# selects the pubkey. A lower-trust key that merely sits in the keyring can never sign an update.
		mkid=$(grep -o '"key_id":"[^"]*"' "$WORK/manifest.json" 2>/dev/null | head -n1 | cut -d'"' -f4)
		resolve_keyid_allow || return 1
		if [ -n "$mkid" ]; then
			keyid_allowed "$mkid" || { echo "VDLU: manifest key_id '$mkid' not in allowed module-update key set ($KEYID_ALLOW)" >&2; return 1; }
		fi
		VDLU_KEYID_ALLOW="$KEYID_ALLOW" sh "$v" "$WORK/manifest.json" "$keyring"
		if [ $? = 0 ]; then return 0; fi
		if [ "$prof" != trusted ]; then
			echo "VDLU: manifest signature rejected (profile!=trusted)" >&2; return 1
		fi
		echo "VDLU: signature not verified (trusted, continuing on hash-trust)" >&2; return 0
	fi
	[ "$prof" != trusted ] && { echo "VDLU: vdlu-verify missing and profile!=trusted" >&2; return 1; }
	return 0
}

validate_meta() {
	local sc em ver ch wantch prof
	sc=$(flat_get schema); em=$(flat_get engine_min); ver=$(flat_get version); ch=$(flat_get channel)
	[ "$sc" = 1 ] || { echo "VDLU: unsupported manifest schema '$sc'" >&2; return 1; }
	# Bind the manifest to THIS module: a shared release key may sign many modules, so a validly
	# signed manifest for module B, served to module A (feed misconfig / MITM / source swap), would otherwise
	# pass sig+schema+channel and write B's files into A's MODULE_DIR. The signed `module` field is the bind.
	[ "$(flat_get module)" = "$MODID" ] || { echo "VDLU: manifest module '$(flat_get module)' != MODID '$MODID' (cross-module feed)" >&2; return 1; }
	if [ -n "$em" ]; then
		isnum "$em" || { echo "VDLU: invalid engine_min '$em'" >&2; return 1; }
		[ "$em" -le "$ENGINE_VERSION" ] || { echo "VDLU: manifest needs engine>=$em (have $ENGINE_VERSION); use the full .zip" >&2; return 1; }
	fi
	isnum "$ver" || { echo "VDLU: manifest version not numeric" >&2; return 1; }
	wantch=$(cfg channel stable)
	[ -z "$ch" ] || [ "$ch" = "$wantch" ] || { echo "VDLU: channel mismatch ($ch != $wantch)" >&2; return 1; }
	prof=$(cfg profile hardened | tr -d '[:space:]')   # fail-closed (see verify_manifest): anything != trusted = hardened
	if [ "$prof" != trusted ] && [ -f "$CURRENT" ] && isnum "$FROMVER"; then
		[ "$ver" -ge "$FROMVER" ] || { echo "VDLU: downgrade blocked ($ver < $FROMVER)" >&2; return 4; }
	fi
	return 0
}

# ---- manifest structure validation (SECURITY: paths/shas are untrusted input) ----
# A path must stay inside MODULE_DIR: no absolute, no '..' component, no empty, no control char, no '.'
# component (dot-only, leading './', embedded '/./', trailing '/.') and no trailing slash.
path_unsafe() { # returns 0 (true) if the path is UNSAFE
	case "$1" in
		''|/*) return 0 ;;
		..|../*|*/..|*/../*) return 0 ;;
		.|./*|*/./*|*/.|*/) return 0 ;;
	esac
	case "$1" in *"$TAB"*|*'
'*) return 0 ;; esac
	return 1
}
sha_ok() { case "$1" in ''|*[!0-9a-f]*) return 1 ;; esac; [ "${#1}" -eq 64 ]; }
# Reject the WHOLE manifest (fail closed) if ANY file/delete entry is malformed. Runs before
# anything is fetched/applied, so a poisoned manifest can never write/delete outside the module
# or inject a non-hex sha into a shell path.
validate_plan() {
	local class st mode enc sha size path p
	while IFS="$TAB" read -r class st mode enc sha size path; do
		[ -n "$path" ] || continue
		path_unsafe "$path" && { echo "VDLU: unsafe file path rejected: $path" >&2; return 1; }
		sha_ok "$sha" || { echo "VDLU: invalid sha256 rejected for: $path" >&2; return 1; }
		case "$mode" in ''|*[!0-7]*) echo "VDLU: invalid mode rejected for: $path" >&2; return 1 ;; esac
		case "$size" in *[!0-9]*) echo "VDLU: invalid size rejected for: $path" >&2; return 1 ;; esac
		[ "${size:-0}" -le "$MAX_FILE_BYTES" ] || { echo "VDLU: file too large rejected for: $path" >&2; return 1; }
		case "$class" in live|soft|reboot) ;; *) echo "VDLU: invalid class rejected for: $path" >&2; return 1 ;; esac
		case "$enc" in raw|gz) ;; *) echo "VDLU: invalid enc rejected for: $path" >&2; return 1 ;; esac
	done <"$WORK/plan.work"
	if [ -s "$WORK/plan.del" ]; then
		while IFS= read -r p; do
			[ -n "$p" ] || continue
			path_unsafe "$p" && { echo "VDLU: unsafe delete path rejected: $p" >&2; return 1; }
		done <"$WORK/plan.del"
	fi
	return 0
}

# ---- plan build -----------------------------------------------------------
derive_class() {
	case "$1" in
		zygisk/*|*/zygisk/*|system/*|*.rule) echo reboot ;;
		service.sh|post-fs-data.sh|boot-completed.sh|*/service.sh|*/post-fs-data.sh|*/boot-completed.sh) echo soft ;;
		*) echo live ;;
	esac
}

build_plan() { # manifest.flat -> class<TAB>mode<TAB>enc<TAB>sha<TAB>size<TAB>path
	awk -F'\t' '
	function idx(s,  a){ split(s,a,"/"); return a[2]+0 }
	$1 ~ /^files\/[0-9]+\/path$/   { i=idx($1); P[i]=$2; seen[i]=1; if(i>mx)mx=i }
	$1 ~ /^files\/[0-9]+\/sha256$/ { S[idx($1)]=$2 }
	$1 ~ /^files\/[0-9]+\/size$/   { Z[idx($1)]=$2 }
	$1 ~ /^files\/[0-9]+\/mode$/   { M[idx($1)]=$2 }
	$1 ~ /^files\/[0-9]+\/enc$/    { E[idx($1)]=$2 }
	$1 ~ /^files\/[0-9]+\/class$/  { C[idx($1)]=$2 }
	END{ for(i=0;i<=mx;i++) if(i in seen)
		printf "%s\t%s\t%s\t%s\t%s\t%s\n", C[i], ((i in M)?M[i]:"0644"), ((i in E)?E[i]:"raw"), S[i], ((i in Z)?Z[i]:"0"), P[i]
	}' "$1"
}

finalize_plan() { # raw -> class<TAB>st<TAB>mode<TAB>enc<TAB>sha<TAB>size<TAB>path
	local class mode enc sha size path dc nst live csha
	# path->sha of the CURRENT (installed) manifest. A target file that is ABSENT on disk but UNCHANGED
	# from current is not a live file the device is missing: it is installer scaffolding (META-INF/*,
	# customize.sh) that ksud consumes at flash, or content the installer prunes per-device. Those must
	# NOT be fetched - the device already IS at this version for them, so re-fetching = phantom update.
	if [ -f "$WORK/current.flat" ]; then
		awk -F'\t' '
			$1 ~ /^files\/[0-9]+\/path$/   { k=$1; sub(/\/path$/,"",k); P[k]=$2 }
			$1 ~ /^files\/[0-9]+\/sha256$/ { k=$1; sub(/\/sha256$/,"",k); if (k in P) print P[k] "\t" $2 }
		' "$WORK/current.flat" >"$WORK/current.paths" 2>/dev/null
	else
		: >"$WORK/current.paths"
	fi
	while IFS="$TAB" read -r class mode enc sha size path; do
		[ -n "$path" ] || continue
		dc=$(derive_class "$path")
		[ -n "$class" ] || class="$dc"
		[ "$dc" = reboot ] && [ "$class" != reboot ] && class=reboot
		[ -n "$mode" ] || mode=0644
		[ -n "$enc" ] || enc=raw
		nst=pending
		live="$MODULE_DIR/$path"
		if [ -f "$live" ] && [ "$(sha256f "$live")" = "$sha" ]; then
			nst=skipped
		elif [ ! -f "$live" ]; then
			csha=$(awk -F'\t' -v p="$path" '$1==p{print $2; exit}' "$WORK/current.paths" 2>/dev/null)
			[ "$csha" = "$sha" ] && nst=skipped
		fi
		printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$class" "$nst" "$mode" "$enc" "$sha" "$size" "$path"
	done < "$1"
}

# ---- journal --------------------------------------------------------------
write_journal() { # phase state current [error]
	local phase="$1" state="$2" current="$3" error="$4" upd src
	upd=$(now)
	src="$PLAN"
	[ -f "$src" ] || { : >"$WORK/empty.tsv"; src="$WORK/empty.tsv"; }
	awk -F'\t' \
		-v module="$MODID" -v target="$TGTVER" -v from="$FROMVER" \
		-v phase="$phase" -v state="$state" -v current="$current" \
		-v error="$error" -v updated="$upd" -v canceled="${CANCELED:-0}" '
	function js(s){ gsub(/\\/,"\\\\",s); gsub(/"/,"\\\"",s); gsub(/\t/,"\\t",s); gsub(/\n/,"\\n",s); return s }
	{ total++; st=$2; cls=$1
		if(st=="fetched"||st=="applied"||st=="staged"||st=="skipped") done++
		if(st=="fetched"||st=="applied"||st=="staged") bytes+=$6
		if(cls=="reboot" && st=="staged") rp=1
		items=items sep "{\"path\":\"" js($7) "\",\"sha256\":\"" js($5) "\",\"class\":\"" js(cls) "\",\"st\":\"" js(st) "\"}"
		sep=","
	}
	END{
		errj=(error=="")?"null":("\"" js(error) "\"")
		printf "{\"schema\":1,\"module\":\"%s\",\"target\":%s,\"from\":%s,\"phase\":\"%s\",\"state\":\"%s\",\"total\":%d,\"done\":%d,\"current\":\"%s\",\"bytes\":%d,\"reboot_pending\":%s,\"cancelled\":%s,\"error\":%s,\"updated\":\"%s\",\"items\":[%s]}\n", \
			module, (target==""?"0":target), (from==""?"0":from), phase, state, total+0, done+0, js(current), bytes+0, (rp?"true":"false"), (canceled=="1"?"true":"false"), errj, updated, items
	}' "$src" >"$JOURNAL.tmp" 2>/dev/null && mv -f "$JOURNAL.tmp" "$JOURNAL"
}

journal_state() { grep -o '"state":"[^"]*"' "$JOURNAL" 2>/dev/null | head -n1 | cut -d'"' -f4; }

set_st() { # path newst
	awk -F'\t' -v p="$1" -v ns="$2" 'BEGIN{OFS="\t"} { if($7==p)$2=ns; print }' "$PLAN" >"$PLAN.n" 2>/dev/null && mv -f "$PLAN.n" "$PLAN"
}

# ---- blobs ----------------------------------------------------------------
seed_local() { # sha : populate blob from an unchanged local file (dedup/offline)
	local sha="$1" key p live
	[ -f "$WORK/current.flat" ] || return 1
	key=$(awk -F'\t' -v s="$sha" '$1 ~ /^files\/[0-9]+\/sha256$/ && $2==s { split($1,a,"/"); print "files/"a[2]"/path"; exit }' "$WORK/current.flat")
	[ -n "$key" ] || return 1
	p=$(grep -m1 "^$key$TAB" "$WORK/current.flat" | cut -f2)
	[ -n "$p" ] || return 1
	live="$MODULE_DIR/$p"
	[ -f "$live" ] && [ "$(sha256f "$live")" = "$sha" ] && cp -f "$live" "$BLOBS/$sha" 2>/dev/null && return 0
	return 1
}

dl_blob() { # sha enc size
	local sha="$1" enc="$2" cache="$BLOBS/$sha" part n url cap="$3"
	case "$cap" in ''|0) cap=$MAX_FILE_BYTES ;; esac
	[ -f "$cache" ] && [ "$(sha256f "$cache")" = "$sha" ] && return 0
	rm -f "$cache"
	seed_local "$sha" && return 0
	if [ "$enc" = gz ] && [ -z "$GZIP" ]; then echo "VDLU: gzip needed but missing" >&2; return 1; fi
	part="$cache.part"
	n=0
	while [ "$n" -lt 3 ]; do
		n=$((n+1))
		url="${SOURCE%/}/blobs/$sha"; [ "$enc" = gz ] && url="$url.gz"
		rm -f "$part" "$part.raw"
		if fetch_url "$url" "$part"; then
			if [ "$enc" = gz ]; then
				if "$GZIP" -d -c "$part" 2>/dev/null | head -c "$cap" >"$part.raw" && [ "$(sha256f "$part.raw")" = "$sha" ]; then
					mv -f "$part.raw" "$cache"; rm -f "$part"; return 0
				fi
			else
				[ "$(sha256f "$part")" = "$sha" ] && { mv -f "$part" "$cache"; return 0; }
			fi
		fi
		rm -f "$part" "$part.raw"
	done
	echo "VDLU: blob fetch/verify failed after 3 tries: $sha" >&2
	return 1
}

# ---- apply primitives -----------------------------------------------------
# SECURITY: validate_plan already blocks '..' lexically, but a pre-existing symlink inside the tree
# could still redirect a write outside. Resolve the target and confine it to its base. Fail CLOSED:
# if realpath is missing or cannot resolve, refuse rather than assume contained - a write/delete/swap
# must not proceed on a path we cannot verify. The lexical path_unsafe() already ran as first defense.
contained() { # target base
	local rp mp
	if command -v realpath >/dev/null 2>&1 && realpath -m / >/dev/null 2>&1; then
		mp=$(realpath -m "$2" 2>/dev/null) || return 1
		rp=$(realpath -m "$1" 2>/dev/null) || return 1
		case "$rp/" in "$mp"/*) return 0 ;; *) return 1 ;; esac
	fi
	# Fallback for a toybox without `realpath -m`: WITHOUT it, failing closed (return 1) would refuse EVERY
	# apply on that device. path_unsafe already rejected absolute paths and any `..` component before here, so
	# `$base/$path` cannot lexically escape `$base`; confirm it literally. Loses only SYMLINK resolution - but
	# the signed manifest carries no symlink type and vdlu-pack skips symlinks, so an escape would need a
	# pre-existing malicious symlink under MODULE_DIR (root-only to plant = already game over).
	case "$1/" in "$2"/*) return 0 ;; *) return 1 ;; esac
}

backup_live() { # path
	local live="$MODULE_DIR/$1" rb="$ROLLBACK/$TGTVER/$1"
	[ -e "$live" ] || return 0
	mkdir -p "$(dirname "$rb")" 2>/dev/null
	[ -e "$rb" ] || cp -af "$live" "$rb" 2>/dev/null
}

apply_live() { # path sha mode
	local live="$MODULE_DIR/$1" tmp
	contained "$live" "$MODULE_DIR" || { echo "VDLU: path escapes module dir: $1" >&2; return 1; }
	if [ -f "$live" ] && [ "$(sha256f "$live")" = "$2" ]; then chmod "$3" "$live" 2>/dev/null; return 0; fi
	backup_live "$1" || { echo "VDLU: backup failed, refusing to overwrite: $1" >&2; return 1; }
	mkdir -p "$(dirname "$live")" 2>/dev/null
	tmp="$live.vdlu-tmp"
	cp -f "$BLOBS/$2" "$tmp" 2>/dev/null || { echo "VDLU: write failed: $1" >&2; return 1; }
	chmod "$3" "$tmp" 2>/dev/null
	[ "$(sha256f "$tmp")" = "$2" ] || { rm -f "$tmp"; echo "VDLU: tmp verify failed: $1" >&2; return 1; }
	mv -f "$tmp" "$live" 2>/dev/null || { rm -f "$tmp"; echo "VDLU: rename failed: $1" >&2; return 1; }
	return 0
}

stage_file() { # path sha mode
	local sf="$STAGED/$1.vdlu-new"
	# containment parity with apply_live/do_delete/swap_staged: a pre-existing symlink under STAGED must
	# not redirect the write outside it (path_unsafe already blocked '..'/absolute lexically; fail closed).
	contained "$sf" "$STAGED" || { echo "VDLU: staged path escapes staged dir: $1" >&2; return 1; }
	if [ -f "$sf" ] && [ "$(sha256f "$sf")" = "$2" ]; then return 0; fi
	mkdir -p "$(dirname "$sf")" 2>/dev/null
	cp -f "$BLOBS/$2" "$sf.tmp" 2>/dev/null || { echo "VDLU: stage write failed: $1" >&2; return 1; }
	chmod "$3" "$sf.tmp" 2>/dev/null
	[ "$(sha256f "$sf.tmp")" = "$2" ] || { rm -f "$sf.tmp"; echo "VDLU: stage verify failed: $1" >&2; return 1; }
	mv -f "$sf.tmp" "$sf" 2>/dev/null
}

rollback_tx() {
	local class st mode enc sha size path rb live
	while IFS="$TAB" read -r class st mode enc sha size path; do
		[ "$st" = applied ] || continue
		rb="$ROLLBACK/$TGTVER/$path"; live="$MODULE_DIR/$path"
		if [ -e "$rb" ]; then cp -af "$rb" "$live" 2>/dev/null; else rm -f "$live"; fi
		set_st "$path" pending
	done <"$PLAN"
}

# ---- cancel ---------------------------------------------------------------
handle_cancel() { # phase sha path
	[ -n "$2" ] && rm -f "$BLOBS/$2.part" "$BLOBS/$2.part.raw"
	[ -n "$3" ] && rm -f "$MODULE_DIR/$3.vdlu-tmp"
	rm -f "$CANCEL"
	CANCELED=1
	case "$1" in
		fetch) write_journal fetch FETCHING "" "" ;;
		apply) write_journal apply APPLYING "" "" ;;
	esac
	echo "VDLU: canceled at safe point (resumable)" >&2
	release_lock
	exit 0
}

# ---- phases ---------------------------------------------------------------
load_target() {
	json_flatten "$TARGET" >"$WORK/manifest.flat" 2>/dev/null
	TGTVER=$(flat_get version); isnum "$TGTVER" || TGTVER=0
	if [ -f "$CURRENT" ]; then
		json_flatten "$CURRENT" >"$WORK/current.flat" 2>/dev/null
		FROMVER=$(grep -m1 "^version$TAB" "$WORK/current.flat" | cut -f2)
	fi
	isnum "$FROMVER" || FROMVER=0
}

do_fetch() {
	# net_policy gate: the blob download (the real data cost) only runs on an ALLOWED network. The manifest
	# check (do_diff) stays ungated, so the UI still reports updates on any network; only the download waits.
	# Resumable: the plan/target persist, so the next trigger on an allowed network finishes it.
	case "$SOURCE" in http://*|https://*)   # only a network source is gated; file:// (local staging) never is
		net_allowed || { write_journal fetch DEFERRED "waiting for $(cfg net_policy any) network" ""; echo "VDLU: download deferred - net_policy=$(cfg net_policy any), egress=$(net_type)" >&2; return 1; } ;;
	esac
	write_journal fetch FETCHING ""
	local class st mode enc sha size path
	while IFS="$TAB" read -r class st mode enc sha size path; do
		[ -f "$CANCEL" ] && handle_cancel fetch "$sha" ""
		case "$st" in skipped|fetched|applied|staged) continue ;; esac
		write_journal fetch FETCHING "$path"
		if dl_blob "$sha" "$enc" "$size"; then set_st "$path" fetched
		else write_journal fetch ERROR "$path" "fetch failed: $path"; return 1; fi
	done <"$PLAN"
	write_journal fetch FETCHED ""
	return 0
}

do_apply() {
	write_journal apply APPLYING ""
	local class st mode enc sha size path
	while IFS="$TAB" read -r class st mode enc sha size path; do
		[ -f "$CANCEL" ] && handle_cancel apply "" "$path"
		case "$st" in skipped|applied|staged) continue ;; esac
		write_journal apply APPLYING "$path"
		if [ "$class" = reboot ]; then
			stage_file "$path" "$sha" "$mode" || { write_journal apply ERROR "$path" "stage failed: $path"; return 1; }
			set_st "$path" staged
		else
			if apply_live "$path" "$sha" "$mode"; then set_st "$path" applied
			else rollback_tx; write_journal apply ERROR "$path" "apply failed: $path (rolled back)"; return 1; fi
		fi
	done <"$PLAN"
	write_journal apply APPLIED_LIVE ""
	return 0
}

do_delete() {
	[ -s "$PLANDEL" ] || return 0
	local p f rb
	while IFS= read -r p; do
		[ -n "$p" ] || continue
		f="$MODULE_DIR/$p"
		[ -e "$f" ] || continue
		contained "$f" "$MODULE_DIR" || { echo "VDLU: delete path escapes module dir: $p" >&2; continue; }
		rb="$ROLLBACK/$TGTVER/$p"; mkdir -p "$(dirname "$rb")" 2>/dev/null
		[ -e "$rb" ] || cp -af "$f" "$rb" 2>/dev/null
		rm -rf "$f"
	done <"$PLANDEL"
	return 0
}

has_staged() { awk -F'\t' '$1=="reboot" && $2=="staged"{f=1} END{exit f?0:1}' "$PLAN" 2>/dev/null; }

swap_staged() {
	sync 2>/dev/null
	local class st mode enc sha size path sf live
	while IFS="$TAB" read -r class st mode enc sha size path; do
		[ "$class" = reboot ] || continue
		[ "$st" = staged ] || continue
		sf="$STAGED/$path.vdlu-new"; live="$MODULE_DIR/$path"
		contained "$live" "$MODULE_DIR" || { echo "VDLU: staged path escapes module dir: $path" >&2; return 1; }
		[ "$(sha256f "$sf")" = "$sha" ] || { echo "VDLU: staged verify failed: $path" >&2; return 1; }
		backup_live "$path"
		mkdir -p "$(dirname "$live")" 2>/dev/null
		mv -f "$sf" "$live" 2>/dev/null || { echo "VDLU: swap rename failed: $path" >&2; return 1; }
		chmod "$mode" "$live" 2>/dev/null
		[ "$(sha256f "$live")" = "$sha" ] || { echo "VDLU: post-swap verify failed: $path" >&2; return 1; }
		set_st "$path" applied
	done <"$PLAN"
	return 0
}

prune_rollback() {
	[ -d "$ROLLBACK" ] || return 0
	local keep=3 total
	total=$(ls -1 "$ROLLBACK" 2>/dev/null | wc -l)
	[ "$total" -gt "$keep" ] || return 0
	ls -1 "$ROLLBACK" | sort -n | head -n $((total - keep)) | while IFS= read -r d; do
		[ -n "$d" ] && rm -rf "$ROLLBACK/$d"
	done
}

write_current() { cp -f "$1" "$CURRENT.tmp" 2>/dev/null && mv -f "$CURRENT.tmp" "$CURRENT" 2>/dev/null; }

finalize_done() {
	do_delete
	write_current "$TARGET"
	write_journal commit DONE ""
	rm -f "$PLAN" "$PLANDEL" "$TARGET"
	prune_rollback
}

do_commit() { # allow_swap
	local allow_swap="$1" class st mode enc sha size path live
	sync 2>/dev/null
	while IFS="$TAB" read -r class st mode enc sha size path; do
		[ "$class" = reboot ] && continue
		live="$MODULE_DIR/$path"
		case "$st" in
			applied)   # a LIVE write: must be present with the target sha
				if [ ! -f "$live" ] || [ "$(sha256f "$live")" != "$sha" ]; then
					rollback_tx; write_journal commit ERROR "$path" "commit verify failed: $path (rolled back)"; return 1
				fi ;;
			skipped)   # unchanged: present-with-target-sha OK, OR absent-by-design (installer-pruned / per-device
				# content that finalize_plan marks skipped). Only a PRESENT file with the WRONG sha is an error.
				if [ -f "$live" ] && [ "$(sha256f "$live")" != "$sha" ]; then
					rollback_tx; write_journal commit ERROR "$path" "commit verify failed: $path (rolled back)"; return 1
				fi ;;
		esac
	done <"$PLAN"
	if has_staged; then
		if [ "$allow_swap" = 1 ]; then
			swap_staged || { write_journal commit ERROR "" "staged swap failed"; return 1; }
			finalize_done
		else
			write_journal commit PENDING_REBOOT ""
		fi
	else
		finalize_done
	fi
	return 0
}

# VDLU: defer APPLY while the module signals it is busy (e.g. a backup in flight), so an update never swaps
# module files mid-operation (VD-Modules#1). Opt-in: the module sets `apply_busy_file` (an absolute path) in
# config and touches it for the duration of its own operations. Absent config = never held (no behavior
# change). The blobs are already fetched, so the next trigger (boot / WebUI open) applies without a re-download.
apply_held() { local f; f=$(cfg apply_busy_file ""); [ -n "$f" ] && [ -e "$f" ]; }

run_pipeline() { # allow_swap
	local allow_swap="$1"
	load_target
	do_fetch || return 1
	if apply_held; then echo "VDLU: module busy (apply_busy_file present); deferring apply to the next trigger" >&2; return 0; fi
	do_apply || return 1
	do_commit "$allow_swap" || return 1
	return 0
}

# ---- diff -----------------------------------------------------------------
do_diff() { # persist(0|1); rc: 2 fetch/parse, 3 verify/meta fail, 4 device AHEAD of feed (benign)
	local persist="$1" _vr
	rm -rf "$WORK"; mkdir -p "$WORK"
	# Early liveness journal (real runs only, persist=1 - NOT a read-only `check`): the WebUI poller would
	# otherwise see NO journal through the whole pre-plan window (manifest fetch + finalize_plan re-hashing
	# every target on a large module / slow link) and after ~8 empty ticks declare a false "No response".
	# Writing a `diff` phase here feeds the poller liveness (and the stale-but-alive lock arbiter) at once;
	# it is transient - do_fetch/do_apply/commit overwrite it, so the state machine is unchanged.
	[ "$persist" = 1 ] && write_journal diff DIFFING ""
	dl_manifest || { echo "VDLU: manifest download failed" >&2; return 2; }
	verify_manifest || return 3   # SIGNATURE first, before the O(n²) json_flatten: a hostile/unsigned manifest (e.g. 4 MiB of newlines = quadratic flatten) is rejected by one cheap linear sha256, never flattened
	json_flatten "$WORK/manifest.json" >"$WORK/manifest.flat" 2>/dev/null || { echo "VDLU: manifest parse failed" >&2; return 2; }
	grep -q "^schema$TAB" "$WORK/manifest.flat" || { echo "VDLU: not a valid manifest" >&2; return 2; }
	TGTVER=$(flat_get version); isnum "$TGTVER" || TGTVER=0
	FROMVER=0
	if [ -f "$CURRENT" ]; then
		json_flatten "$CURRENT" >"$WORK/current.flat" 2>/dev/null
		FROMVER=$(grep -m1 "^version$TAB" "$WORK/current.flat" | cut -f2)
		isnum "$FROMVER" || FROMVER=0
	fi
	validate_meta || { _vr=$?; [ "$_vr" = 4 ] && return 4; return 3; }
	build_plan "$WORK/manifest.flat" >"$WORK/plan.raw"
	finalize_plan "$WORK/plan.raw" >"$WORK/plan.work"
	grep "^delete/[0-9]" "$WORK/manifest.flat" 2>/dev/null | cut -f2 >"$WORK/plan.del"
	# VDLU#2: the trust anchor - the engine's own vdlu/ dir (update.sh, vdlu-verify, verify/*, keyring/*,
	# config) - is RE-FLASH ONLY. A published feed carries the WHOLE module tree, vdlu/ included, so
	# EXCLUDE those paths from the plan: never fetch, apply or delete them over the feed. The module still
	# updates; the trust anchor changes only by a full signed re-flash; a feed that tries to swap it is
	# silently ignored (not a whole-manifest rejection, so a legit feed carrying vdlu/ is never blocked).
	# path is the last tab field of plan.work and the whole line of plan.del.
	awk -F'\t' '$NF !~ /^vdlu\// && $NF != "vdlu"' "$WORK/plan.work" >"$WORK/plan.work.f" 2>/dev/null && mv -f "$WORK/plan.work.f" "$WORK/plan.work"
	awk '$0 !~ /^vdlu\// && $0 != "vdlu"' "$WORK/plan.del" >"$WORK/plan.del.f" 2>/dev/null && mv -f "$WORK/plan.del.f" "$WORK/plan.del"
	validate_plan || return 3
	if [ "$persist" = 1 ]; then
		cp -f "$WORK/manifest.json" "$TARGET"
		cp -f "$WORK/plan.work" "$PLAN"
		cp -f "$WORK/plan.del" "$PLANDEL"
	fi
	return 0
}

work_to_do() { # uses $WORK/plan.work + $WORK/plan.del
	awk -F'\t' '$2=="pending"{f=1} END{exit f?0:1}' "$WORK/plan.work" 2>/dev/null && return 0
	if [ -s "$WORK/plan.del" ]; then
		local p
		while IFS= read -r p; do [ -n "$p" ] && [ -e "$MODULE_DIR/$p" ] && return 0; done <"$WORK/plan.del"
	fi
	return 1
}

# ---- commands -------------------------------------------------------------
cmd_check() {
	# do_diff wipes+rebuilds $WORK; take the lock so a concurrent locked run can't have $WORK pulled out
	# from under it (acquire_lock arms an EXIT trap -> release_lock fires on every exit path below).
	acquire_lock
	do_diff 0 || { _dr=$?; [ "$_dr" = 4 ] && { printf '{"update":false,"ahead":true,"from":%s,"to":%s}\n' "$FROMVER" "$TGTVER"; exit 0; }; exit "$_dr"; }
	local pend reb del fetchc upd rb
	pend=$(awk -F'\t' '$2=="pending"{n++}END{print n+0}' "$WORK/plan.work")
	reb=$(awk -F'\t' '$2=="pending" && $1=="reboot"{n++}END{print n+0}' "$WORK/plan.work")
	del=0
	if [ -s "$WORK/plan.del" ]; then
		local p
		while IFS= read -r p; do [ -n "$p" ] && [ -e "$MODULE_DIR/$p" ] && del=$((del + 1)); done <"$WORK/plan.del"
	fi
	fetchc=$(awk -F'\t' '$2=="pending" && !($5 in s){s[$5]=1; print $5}' "$WORK/plan.work" | while IFS= read -r h; do [ -f "$BLOBS/$h" ] || echo x; done | wc -l | tr -d ' ')
	upd=false; { [ "$pend" -gt 0 ] || [ "$del" -gt 0 ]; } && upd=true
	rb=false; [ "$reb" -gt 0 ] && rb=true
	printf '{"update":%s,"from":%s,"to":%s,"fetch":%s,"reboot":%s}\n' "$upd" "$FROMVER" "$TGTVER" "$fetchc" "$rb"
	release_lock
}

cmd_run() {
	acquire_lock
	if [ -f "$TARGET" ]; then
		local s
		s=$(journal_state)
		if [ "$s" = PENDING_REBOOT ]; then
			echo "VDLU: transaction pending reboot; run 'boot' to finish" >&2
			release_lock; return 0
		fi
		run_pipeline 0; local rc=$?; release_lock; return $rc
	fi
	do_diff 1 || { local rc=$?; release_lock; return $rc; }
	if ! work_to_do; then
		write_current "$WORK/manifest.json"
		write_journal diff DONE ""
		rm -f "$PLAN" "$PLANDEL" "$TARGET"
		echo '{"update":false}'
		release_lock; return 0
	fi
	write_journal diff PLANNED ""
	run_pipeline 0; local rc=$?; release_lock; return $rc
}

cmd_resume() {
	acquire_lock
	if [ -f "$TARGET" ]; then
		run_pipeline 0; local rc=$?; release_lock; return $rc
	fi
	release_lock
	echo '{"state":"idle"}'
	return 0
}

cmd_boot() {
	acquire_lock
	local rc interval cap tries
	if [ -f "$TARGET" ]; then
		run_pipeline 1; rc=$?; release_lock; return "$rc"
	fi
	# Patient, NON-HOLDING boot retry (device booted offline). While waiting it HOLDS NOTHING: no lock (a
	# manual run/check stays unblocked) and no wakelock (the `sleep` freezes during deep-sleep, so ~zero
	# battery - it just waits for the user to eventually connect; no hurry, no force, nothing pinned). Only
	# when the network actually appears (cheap route probe `net_allowed` - reads the routing table, NO curl, NO
	# radio wake) does it re-acquire the lock briefly and try a real fetch. Never retries a deterministic
	# failure (bad manifest/sig/downgrade: fetch_offline gates on the transport exit). Bounded by
	# boot_retry_minutes of AWAKE-time (0 = off = one-shot). NOTE: `boot` runs SYNCHRONOUSLY in post-fs-data
	# (pre-zygote - required so the .so swap lands before any process maps it). This patient retry-loop only
	# engages when fetch_offline is true (a non-file/http source hitting a transport error) AND
	# boot_retry_minutes>0, so a latent boot stall exists ONLY in that config.
	interval=$(cfg boot_retry_interval 30); isnum "$interval" || interval=30
	[ "$interval" -ge 5 ] || interval=5
	cap=$(cfg boot_retry_minutes 0); isnum "$cap" || cap=0
	do_diff 1; rc=$?
	if [ "$rc" != 0 ] && [ "$cap" -gt 0 ] && fetch_offline; then
		release_lock                                   # hold NOTHING while we wait
		# AWAKE-time budget: count attempts (cap*60/interval), NOT wall-clock. Each `sleep` freezes during
		# deep-sleep (CLOCK_MONOTONIC), so N sleeps = N*interval of AWAKE time regardless of how long the
		# device slept - the window is spent retrying, not burned down while suspended.
		tries=$(( cap * 60 / interval )); [ "$tries" -ge 1 ] || tries=1; rc=1
		while [ "$tries" -gt 0 ]; do
			tries=$(( tries - 1 ))
			sleep "$interval"                          # no lock, no wakelock; frozen during deep-sleep
			net_allowed || continue                    # offline or a disallowed net (net_policy): wake nothing, hold nothing
			acquire_lock_try || continue               # a manual run is working: back off, try later
			if [ -f "$TARGET" ]; then release_lock; return 0; fi   # a run staged one meanwhile: defer to it
			do_diff 1; rc=$?
			[ "$rc" = 0 ] && break                     # got it: keep the lock, fall through to apply
			release_lock                               # drop the lock before waiting again
			fetch_offline || return "$rc"              # reachable now but a deterministic failure: stop
		done
		if [ "$rc" != 0 ]; then echo "VDLU: still offline, will retry next boot" >&2; return 0; fi
	fi
	[ "$rc" = 0 ] || { release_lock; return "$rc"; }
	if ! work_to_do; then
		write_current "$WORK/manifest.json"
		write_journal diff DONE ""
		rm -f "$PLAN" "$PLANDEL" "$TARGET"
		release_lock; return 0
	fi
	write_journal diff PLANNED ""
	run_pipeline 1; rc=$?; release_lock; return "$rc"
}

cmd_status() {
	if [ -f "$JOURNAL" ]; then cat "$JOURNAL"; else echo '{"state":"idle"}'; fi
}

cmd_cancel() {
	: >"$CANCEL"
	echo "VDLU: cancel requested"
}

# extract the sha256 of an exact path from a compact sorted-keys manifest (vdlu-pack form:
# ...,"path":"<p>","sha256":"<64hex>",...). Returns 1 if the path is absent.
tool_sha() { # manifest_content path
	_c=$1; _p=$2
	case "$_c" in *"\"path\":\"$_p\",\"sha256\":\""*) : ;; *) return 1;; esac
	_r=${_c#*\"path\":\"$_p\",\"sha256\":\"}
	printf '%s' "${_r%%\"*}"
}

# install-tool <abi>: adopt a fetched toolchain binary (the static curl) into Tier-2, but ONLY
# after the embedded ed25519-mini verifies the SIGNED tools-manifest and the binary's hash matches
# it. The tool runs as root, so this guard is MANDATORY regardless of profile (closes root RCE from
# an untrusted downloader). The WebUI fetches <WORK>/tools-manifest.json + <WORK>/tool.<abi> first.
cmd_install_tool() { # <abi>
	local abi tm toolf keyring pd c sha dst
	abi=$2
	[ -n "$abi" ] || { echo "VDLU: install-tool needs an abi" >&2; exit 64; }
	case "$abi" in */*|..|.|*"$TAB"*|'') echo "VDLU: unsafe abi: $abi" >&2; exit 2 ;; esac
	tm="$WORK/tools-manifest.json"; toolf="$WORK/tool.$abi"
	[ -f "$tm" ] && [ -f "$toolf" ] || { echo "VDLU: install-tool: fetch $tm and $toolf first" >&2; exit 2; }
	pd=$(cfg pubkey_dir keyring); case "$pd" in ''|*/*|*..*) pd=keyring ;; esac
	keyring="$MODULE_DIR/vdlu/$pd"
	# Cap the tools-manifest before reading it (anti-OOM): a MITM'd tools feed could serve a huge body
	# before the signature check runs. Same ceiling dl_manifest enforces on the module manifest.
	tmsz=$(wc -c <"$tm" 2>/dev/null)
	[ "${tmsz:-0}" -le "$MAX_MANIFEST_BYTES" ] || { echo "VDLU: tools-manifest too large ($tmsz)" >&2; exit 1; }
	# VDLU#1 allowlist (same trust root as the module update): the tools-manifest is signed by the module
	# key, so pin its key_id too. vdlu-verify enforces it via VDLU_KEYID_ALLOW.
	resolve_keyid_allow || exit 1
	VDLU_KEYID_ALLOW="$KEYID_ALLOW" sh "$MODULE_DIR/vdlu/vdlu-verify" "$tm" "$keyring" || { echo "VDLU: tools-manifest signature rejected" >&2; exit 1; }
	c=$(cat "$tm")
	sha=$(tool_sha "$c" "$abi/curl") || { echo "VDLU: no curl entry for $abi in tools-manifest" >&2; exit 1; }
	sha_ok "$sha" || { echo "VDLU: malformed curl sha in tools-manifest" >&2; exit 1; }
	[ "$(sha256f "$toolf")" = "$sha" ] || { echo "VDLU: fetched curl hash != tools-manifest; refusing" >&2; exit 1; }
	dst="$VDLU_DIR/tools/$abi"
	mkdir -p "$dst" 2>/dev/null
	contained "$dst/curl" "$VDLU_DIR/tools" || { echo "VDLU: tool path escapes tools dir" >&2; exit 1; }
	if cp -f "$toolf" "$dst/curl.tmp" 2>/dev/null && chmod 0755 "$dst/curl.tmp" 2>/dev/null \
		&& [ "$(sha256f "$dst/curl.tmp")" = "$sha" ] && mv -f "$dst/curl.tmp" "$dst/curl" 2>/dev/null; then
		rm -f "$tm" "$toolf" "$dst/curl.tmp" 2>/dev/null
		echo "VDLU: installed verified curl for $abi" >&2
		exit 0
	fi
	rm -f "$dst/curl.tmp"; echo "VDLU: tool install failed" >&2; exit 1
}

# ---- main -----------------------------------------------------------------
init_tools
init_paths

case "$1" in
	check)  cmd_check ;;
	run)    cmd_run ;;
	resume) cmd_resume ;;
	boot)   cmd_boot ;;
	status) cmd_status ;;
	cancel) cmd_cancel ;;
	install-tool) cmd_install_tool "$@" ;;
	*) echo "usage: update.sh {check|run|resume|boot|status|cancel|install-tool <abi>}" >&2; exit 64 ;;
esac
