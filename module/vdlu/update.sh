#!/system/bin/sh
# VDLU engine - flashless incremental module updater (DIFF->FETCH->APPLY->COMMIT).
# POSIX sh (mksh/busybox/toybox). Env in: VDLU_DIR, MODULE_DIR, MODID.
# Contract: INTERFACES.md (CLI/layout/JSON keys = immutable) + MODULO_VDLU.md.

ENGINE_VERSION=2
MAX_FILE_BYTES=268435456     # 256 MiB per-file ceiling: anti zstd-bomb / disk DoS
MAX_MANIFEST_BYTES=4194304   # 4 MiB manifest ceiling: anti OOM
TAB=$(printf '\t')
LOCKDIR=""

die() { echo "VDLU: $*" >&2; exit 1; }

# ---- tool discovery -------------------------------------------------------
# A module that bundles its own binaries (public modules ship curl/zstd/openssl under
# bin/<abi>/) may be launched with a bare env (the WebUI's ksu.exec sets no PATH). Put
# the host module's bin dir on PATH/LD_LIBRARY_PATH so those tools resolve; a file://
# module that bundles nothing is unaffected. Prefer the device ABI, else the one bin dir
# the installer kept. No-op when MODULE_DIR has no bin/ (the engine's own test harness).
bundled_bins_on_path() {
	local abi bd d ld
	[ -n "${MODULE_DIR:-}" ] && [ -d "$MODULE_DIR/bin" ] || return 0
	abi=$(getprop ro.product.cpu.abi 2>/dev/null)
	bd="$MODULE_DIR/bin/$abi"
	[ -n "$abi" ] && [ -d "$bd" ] || { bd=""; for d in "$MODULE_DIR"/bin/*/; do [ -d "$d" ] && { bd=${d%/}; abi=${bd##*/}; break; }; done; }
	[ -n "$bd" ] && [ -d "$bd" ] || return 0
	case ":$PATH:" in *":$bd:"*) : ;; *) PATH="$bd:$PATH"; export PATH ;; esac
	# dynamic bins need their .so: public modules keep them in bin/<abi>/lib; vdantiroot in lib/<abi> (+ lib)
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
	ZSTD=$(command -v zstd 2>/dev/null) || ZSTD=""
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
	SOURCE=$(cfg source "")
	TGTVER=0
	FROMVER=0
}

# ---- lock -----------------------------------------------------------------
# mkdir-based lock (portable: toybox `flock` only takes the fd-form and its fd handling is
# unreliable on Android, so flock is NOT used). mkdir is atomic; stale-lock recovery by PID.
acquire_lock() {
	local opid
	if ! mkdir "$VDLU_DIR/lock.d" 2>/dev/null; then
		opid=$(cat "$VDLU_DIR/lock.d/pid" 2>/dev/null)
		if [ -z "$opid" ] || ! kill -0 "$opid" 2>/dev/null; then
			rm -rf "$VDLU_DIR/lock.d" 2>/dev/null
			mkdir "$VDLU_DIR/lock.d" 2>/dev/null || { echo "VDLU: busy (another run holds the lock)" >&2; exit 4; }
		else
			echo "VDLU: busy (another run holds the lock)" >&2; exit 4
		fi
	fi
	echo $$ >"$VDLU_DIR/lock.d/pid" 2>/dev/null
	LOCKDIR="$VDLU_DIR/lock.d"
	trap release_lock EXIT INT TERM
}
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
fetch_url() { # url dest
	local url="$1" dest="$2" src
	case "$url" in
		file://*) src=${url#file://}; cp -f "$src" "$dest" 2>/dev/null ;;
		http://*|https://*)
			if [ -n "$CURL" ]; then "$CURL" -fsSL --max-filesize "$MAX_FILE_BYTES" -o "$dest" "$url"
			elif [ -n "$WGET" ]; then "$WGET" -q -O "$dest" "$url"
			else echo "VDLU: no curl/wget available" >&2; return 1; fi ;;
		*) echo "VDLU: unsupported source url: $url" >&2; return 1 ;;
	esac
}

dl_manifest() {
	[ -n "$SOURCE" ] || { echo "VDLU: no source configured" >&2; return 1; }
	fetch_url "${SOURCE%/}/manifest.json" "$WORK/manifest.json" || return 1
	local sz; sz=$(wc -c <"$WORK/manifest.json" 2>/dev/null)
	[ "${sz:-0}" -le "$MAX_MANIFEST_BYTES" ] || { echo "VDLU: manifest too large ($sz)" >&2; return 1; }
}

# ---- signature / meta -----------------------------------------------------
verify_manifest() {
	local prof keyring v pd
	prof=$(cfg profile trusted)
	pd=$(cfg pubkey_dir keyring); case "$pd" in ''|*/*|*..*) pd=keyring ;; esac
	keyring="$MODULE_DIR/vdlu/$pd"
	v="$MODULE_DIR/vdlu/vdlu-verify"
	if [ -f "$v" ]; then
		sh "$v" "$WORK/manifest.json" "$keyring"
		if [ $? = 0 ]; then return 0; fi
		if [ "$prof" = hardened ]; then
			echo "VDLU: manifest signature rejected (hardened)" >&2; return 1
		fi
		echo "VDLU: signature not verified (trusted, continuing on hash-trust)" >&2; return 0
	fi
	[ "$prof" = hardened ] && { echo "VDLU: vdlu-verify missing but profile=hardened" >&2; return 1; }
	return 0
}

validate_meta() {
	local sc em ver ch wantch prof
	sc=$(flat_get schema); em=$(flat_get engine_min); ver=$(flat_get version); ch=$(flat_get channel)
	[ "$sc" = 1 ] || { echo "VDLU: unsupported manifest schema '$sc'" >&2; return 1; }
	if [ -n "$em" ]; then
		isnum "$em" || { echo "VDLU: invalid engine_min '$em'" >&2; return 1; }
		[ "$em" -le "$ENGINE_VERSION" ] || { echo "VDLU: manifest needs engine>=$em (have $ENGINE_VERSION); use the full .zip" >&2; return 1; }
	fi
	isnum "$ver" || { echo "VDLU: manifest version not numeric" >&2; return 1; }
	wantch=$(cfg channel stable)
	[ -z "$ch" ] || [ "$ch" = "$wantch" ] || { echo "VDLU: channel mismatch ($ch != $wantch)" >&2; return 1; }
	prof=$(cfg profile trusted)
	if [ "$prof" = hardened ] && [ -f "$CURRENT" ] && isnum "$FROMVER"; then
		[ "$ver" -ge "$FROMVER" ] || { echo "VDLU: downgrade blocked ($ver < $FROMVER)" >&2; return 1; }
	fi
	return 0
}

# ---- manifest structure validation (SECURITY: paths/shas are untrusted input) ----
# A path must stay inside MODULE_DIR: no absolute, no '..' component, no empty, no control char.
path_unsafe() { # returns 0 (true) if the path is UNSAFE
	case "$1" in
		''|/*) return 0 ;;
		..|../*|*/..|*/../*) return 0 ;;
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
		case "$enc" in raw|zst) ;; *) echo "VDLU: invalid enc rejected for: $path" >&2; return 1 ;; esac
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
	local class mode enc sha size path dc nst live
	while IFS="$TAB" read -r class mode enc sha size path; do
		[ -n "$path" ] || continue
		dc=$(derive_class "$path")
		[ -n "$class" ] || class="$dc"
		[ "$dc" = reboot ] && [ "$class" != reboot ] && class=reboot
		[ -n "$mode" ] || mode=0644
		[ -n "$enc" ] || enc=raw
		nst=pending
		live="$MODULE_DIR/$path"
		[ -f "$live" ] && [ "$(sha256f "$live")" = "$sha" ] && nst=skipped
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
		if(cls=="reboot" && st!="applied" && st!="skipped") rp=1
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
	if [ "$enc" = zst ] && [ -z "$ZSTD" ]; then echo "VDLU: zstd needed but missing" >&2; return 1; fi
	part="$cache.part"
	n=0
	while [ "$n" -lt 3 ]; do
		n=$((n+1))
		url="${SOURCE%/}/blobs/$sha"; [ "$enc" = zst ] && url="$url.zst"
		rm -f "$part" "$part.raw"
		if fetch_url "$url" "$part"; then
			if [ "$enc" = zst ]; then
				if "$ZSTD" -d -c "$part" 2>/dev/null | head -c "$cap" >"$part.raw" && [ "$(sha256f "$part.raw")" = "$sha" ]; then
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
	command -v realpath >/dev/null 2>&1 || return 1
	mp=$(realpath -m "$2" 2>/dev/null) || return 1
	rp=$(realpath -m "$1" 2>/dev/null) || return 1
	case "$rp/" in "$mp"/*) return 0 ;; *) return 1 ;; esac
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
		case "$st" in applied|skipped) ;; *) continue ;; esac
		live="$MODULE_DIR/$path"
		if [ ! -f "$live" ] || [ "$(sha256f "$live")" != "$sha" ]; then
			rollback_tx; write_journal commit ERROR "$path" "commit verify failed: $path (rolled back)"; return 1
		fi
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

run_pipeline() { # allow_swap
	local allow_swap="$1"
	load_target
	do_fetch || return 1
	do_apply || return 1
	do_commit "$allow_swap" || return 1
	return 0
}

# ---- diff -----------------------------------------------------------------
do_diff() { # persist(0|1)
	local persist="$1"
	rm -rf "$WORK"; mkdir -p "$WORK"
	dl_manifest || { echo "VDLU: manifest download failed" >&2; return 2; }
	json_flatten "$WORK/manifest.json" >"$WORK/manifest.flat" 2>/dev/null || { echo "VDLU: manifest parse failed" >&2; return 2; }
	grep -q "^schema$TAB" "$WORK/manifest.flat" || { echo "VDLU: not a valid manifest" >&2; return 2; }
	TGTVER=$(flat_get version); isnum "$TGTVER" || TGTVER=0
	FROMVER=0
	if [ -f "$CURRENT" ]; then
		json_flatten "$CURRENT" >"$WORK/current.flat" 2>/dev/null
		FROMVER=$(grep -m1 "^version$TAB" "$WORK/current.flat" | cut -f2)
		isnum "$FROMVER" || FROMVER=0
	fi
	verify_manifest || return 3
	validate_meta || return 3
	build_plan "$WORK/manifest.flat" >"$WORK/plan.raw"
	finalize_plan "$WORK/plan.raw" >"$WORK/plan.work"
	grep "^delete/[0-9]" "$WORK/manifest.flat" 2>/dev/null | cut -f2 >"$WORK/plan.del"
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
	do_diff 0 || exit $?
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
	if [ -f "$TARGET" ]; then
		run_pipeline 1; local rc=$?; release_lock; return $rc
	fi
	do_diff 1 || { local rc=$?; release_lock; return $rc; }
	if ! work_to_do; then
		write_current "$WORK/manifest.json"
		write_journal diff DONE ""
		rm -f "$PLAN" "$PLANDEL" "$TARGET"
		release_lock; return 0
	fi
	write_journal diff PLANNED ""
	run_pipeline 1; local rc=$?; release_lock; return $rc
}

cmd_status() {
	if [ -f "$JOURNAL" ]; then cat "$JOURNAL"; else echo '{"state":"idle"}'; fi
}

cmd_cancel() {
	: >"$CANCEL"
	echo "VDLU: cancel requested"
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
	*) echo "usage: update.sh {check|run|resume|boot|status|cancel}" >&2; exit 64 ;;
esac
