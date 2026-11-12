#!/usr/bin/env python3
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
import json
import re
import runpy
import subprocess
import sys
from pathlib import Path

SCHEDULER = r'''#!/system/bin/sh
# Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0
set -eu
umask 077
D=/data/adb/COPG-VD/tee
M=${0%/*}
[ "$(id -u)" = 0 ] && [ -f "$D/.initialized" ] || exit 1
interval() {
 n=$(cat "$D/keybox.interval" 2>/dev/null || echo 3600)
 case "$n" in ''|*[!0-9]*) n=3600;; esac
 if [ "$n" -lt 60 ] || [ "$n" -gt 604800 ]; then n=3600; fi
 echo "$n"
}
case "${1:-status}" in
configure)
 n=${2:-}; case "$n" in ''|*[!0-9]*) exit 1;; esac
 [ "$n" -ge 1 ] && [ "$n" -le 10080 ] || exit 1
 f=$(mktemp "$D/.interval.XXXXXX"); echo "$((n * 60))" > "$f"; mv "$f" "$D/keybox.interval"
 echo 'Schedule saved'; exit 0 ;;
status)
 echo "interval_minutes=$(( $(interval) / 60 ))"
 last=$(cat "$D/keybox.checked_at" 2>/dev/null || echo 0)
 case "$last" in ''|*[!0-9]*) last=0;; esac
 echo "last_check_epoch=$last"
 echo "next_check_epoch=$((last + $(interval)))"
 echo "last_result=$(cat "$D/keybox.last_result" 2>/dev/null || echo pending)"
 exit 0 ;;
run) ;;
*) exit 1 ;;
esac
exec 8>"$D/.scheduler.lock"
if command -v flock >/dev/null 2>&1; then flock -n 8 || exit 0
else
 bb=''; for b in /data/adb/magisk/busybox /data/adb/ksu/bin/busybox /data/adb/ap/bin/busybox; do [ -x "$b" ] && bb=$b && break; done
 [ -n "$bb" ] && "$bb" flock -n 8 || exit 1
fi
sleep 90
while [ ! -e "$M/../disable" ] && [ ! -e "$M/../remove" ]; do
 now=$(date +%s); last=$(cat "$D/keybox.checked_at" 2>/dev/null || echo 0)
 case "$last" in ''|*[!0-9]*) last=0;; esac
 if [ "$(cat "$D/keybox.mode")" = auto ] && { [ "$now" -lt "$last" ] || [ "$((now-last))" -ge "$(interval)" ]; }; then
  echo "$now" > "$D/keybox.checked_at"
  if sh "$M/tee_manager.sh" update >> "$D/update.log" 2>&1; then echo success > "$D/keybox.last_result"
  else echo failed > "$D/keybox.last_result"; fi
 fi
 sleep 60
done
'''

APPS = r'''/* Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0 */
(function(){
'use strict';
let sequence=0;
const quote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
function root(cmd){return new Promise((resolve,reject)=>{const cb='tee_apps_'+Date.now()+'_'+(++sequence);window[cb]=(code,out,err)=>{delete window[cb];code===0?resolve(out||''):reject(new Error(err||out||String(code)));};try{ksu.exec(cmd,'{}',cb);}catch(e){delete window[cb];reject(e);}});}
function start(){
 const target=document.getElementById('tee-package');if(!target)return;
 const box=document.createElement('section');box.className='card';box.style.padding='12px';
 box.innerHTML='<h3 data-i18n="tee_apps"></h3><button id="tee-app-load" class="action-btn" data-i18n="tee_app_load"></button><input id="tee-app-search" type="search" data-i18n-ph="tee_app_search"><p data-i18n="tee_icon_hint"></p><div id="tee-app-selected"></div><div id="tee-app-list" style="max-height:320px;overflow:auto"></div><p id="tee-app-error" role="status"></p><h3 data-i18n="tee_schedule"></h3><label for="tee-interval" data-i18n="tee_minutes"></label><input id="tee-interval" type="number" min="1" max="10080" value="60"><button id="tee-schedule-save" class="action-btn" data-i18n="tee_save"></button><button id="tee-schedule-status" class="action-btn" data-i18n="tee_refresh"></button><pre id="tee-schedule-output" style="white-space:pre-wrap"></pre>';
 target.parentElement.insertBefore(box,target);
 const get=id=>document.getElementById(id),list=get('tee-app-list'),error=get('tee-app-error');
 let packages=[],info=new Map(),icons=new Map(),loadedTargets=false;
 function icon(pkg){const wrapper=document.createElement('span');wrapper.textContent=pkg[0].toUpperCase();wrapper.style.display='inline-block';wrapper.style.width='44px';const img=document.createElement('img');img.width=36;img.height=36;img.alt='';img.style.verticalAlign='middle';img.onerror=()=>img.remove();img.src=icons.get(pkg)||'ksu://icon/'+encodeURIComponent(pkg);wrapper.append(img);return wrapper;}
 async function select(pkg){
  target.value=pkg;const preview=get('tee-app-selected');preview.replaceChildren(icon(pkg),document.createTextNode((info.get(pkg)||pkg)+' — '+pkg));
  const editor=get('tee-target');
  if(!loadedTargets&&!editor.value){try{editor.value=await root('sh /data/adb/modules/COPG-VD/tee/tee_manager.sh read-target');loadedTargets=true;}catch(e){error.textContent=String(e);}}
  for(const line of editor.value.split('\n')){const v=line.trim();if(v.replace(/[!?]$/,'')===pkg){get('tee-mode').value=v.endsWith('!')?'generate':v.endsWith('?')?'hack':'auto';break;}}
 }
 function paint(){
  const query=get('tee-app-search').value.toLowerCase();const visible=packages.filter(p=>(p+' '+(info.get(p)||'')).toLowerCase().includes(query)).slice(0,60);
  if(typeof ksu!=='undefined'&&typeof ksu.getPackagesIcons==='function'){
   try{const values=JSON.parse(ksu.getPackagesIcons(JSON.stringify(visible),48));for(const v of values){let s=v.icon||'';s=s.replace(/^data:image\/png;base64,/,'');if(/^[A-Za-z0-9+/=]+$/.test(s))icons.set(v.packageName,'data:image/png;base64,'+s);}}catch(e){}
  }
  list.replaceChildren();for(const p of visible){const b=document.createElement('button');b.type='button';b.className='action-btn';b.style.display='flex';b.style.alignItems='center';b.style.width='100%';b.append(icon(p),document.createTextNode((info.get(p)||p)+' — '+p));b.onclick=()=>select(p);list.append(b);}
 }
 get('tee-app-load').onclick=async()=>{get('tee-app-load').disabled=true;try{const out=await root('pm list packages --user 0');packages=[...new Set(out.split('\n').map(x=>x.replace(/^package:/,'').trim()).filter(x=>/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(x)))].sort();if(typeof ksu!=='undefined'&&typeof ksu.getPackagesInfo==='function'){for(let i=0;i<packages.length;i+=50){try{const data=JSON.parse(ksu.getPackagesInfo(JSON.stringify(packages.slice(i,i+50))));for(const x of data)if(x.appLabel)info.set(x.packageName,x.appLabel);}catch(e){}await new Promise(r=>setTimeout(r,0));}}paint();}catch(e){error.textContent=String(e);}finally{get('tee-app-load').disabled=false;}};
 get('tee-app-search').oninput=paint;
 const scheduler='/data/adb/modules/COPG-VD/tee/tee_scheduler.sh';
 async function scheduleStatus(){const s=await root('sh '+quote(scheduler)+' status');get('tee-schedule-output').textContent=s;const m=s.match(/^interval_minutes=(\d+)/m);if(m)get('tee-interval').value=m[1];}
 get('tee-schedule-status').onclick=()=>scheduleStatus().catch(e=>error.textContent=String(e));
 get('tee-schedule-save').onclick=async()=>{try{const n=Number(get('tee-interval').value);if(!Number.isInteger(n)||n<1||n>10080)throw new Error(t('tee_invalid'));await root('sh '+quote(scheduler)+' configure '+quote(n));await scheduleStatus();}catch(e){error.textContent=String(e);}};
 I18N.apply(box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
'''

EN={'tee_apps':'Select an installed application','tee_app_load':'Load installed apps','tee_app_search':'Search by app name or package','tee_icon_hint':'Icons use the manager icon API. Unsupported managers show a fallback. Select an app, choose Auto / Generate / Hack, then add and save targets.','tee_schedule':'Keybox update schedule','tee_minutes':'Interval in minutes (1–10080)','tee_network':'Default mirror: http://evoker.qzz.io (AlwaysWrong). HTTP is unauthenticated. Prefer a trusted HTTPS mirror. Automatic mode uses the configured schedule; personal keyboxes remain protected.'}
FR={'tee_apps':'Sélectionner une application installée','tee_app_load':'Charger les applications','tee_app_search':'Rechercher un nom ou un paquet','tee_icon_hint':'Les icônes utilisent l’API du manager ; un affichage de secours apparaît si elle n’est pas disponible. Choisissez une application et son mode, puis ajoutez et enregistrez les cibles.','tee_schedule':'Planification de mise à jour de keybox','tee_minutes':'Intervalle en minutes (1–10080)','tee_network':'Miroir par défaut : http://evoker.qzz.io (AlwaysWrong). HTTP n’est pas authentifié. Privilégiez un miroir HTTPS fiable. Le mode automatique suit la planification ; les keybox personnelles restent protégées.'}

def replace(path,old,new):
 s=path.read_text()
 if s.count(old)!=1: raise RuntimeError('Feature integration anchor changed: '+str(path))
 path.write_text(s.replace(old,new,1))

def main(upstream,expected):
 actual=subprocess.check_output(['git','-C',str(upstream),'rev-parse','HEAD'],text=True).strip()
 if not re.fullmatch('[0-9a-f]{40}',expected) or actual!=expected: raise RuntimeError('Unexpected upstream revision')
 # The selected immutable commit is validated before the original relocation adapter runs.
 ns=runpy.run_path('tools/tee/relocate_engine.py')
 ns['relocate'].__globals__['REVISION']=expected
 ns['relocate'](upstream)
 root=Path('.')
 manager=root/'module/tee/tee_manager.sh'
 replace(manager,'echo personal > "$T/data/keybox.mode"; touch "$T/data/.initialized"','if [ "$(cat "$T/data/migration.state")" = clean ]; then echo auto; else echo personal; fi > "$T/data/keybox.mode"; touch "$T/data/.initialized"')
 replace(manager,'conflicts check; init_data','conflicts check; init_data\n [ -s "$D/keybox.endpoint" ] || echo http://evoker.qzz.io > "$D/keybox.endpoint"\n [ -s "$D/keybox.interval" ] || echo 3600 > "$D/keybox.interval"')
 old=' (exec 9>&-; sleep 90; while true; do\n  if [ "$(cat "$D/keybox.mode")" = auto ]; then sh "$M/tee_manager.sh" update >> "$D/update.log" 2>&1 || true; fi\n  sleep 21600\n done) >/dev/null 2>&1 & ;;'
 replace(manager,old,' (exec 9>&-; exec sh "$M/tee_scheduler.sh" run) >/dev/null 2>&1 & ;;')
 (root/'module/tee/tee_scheduler.sh').write_text(SCHEDULER)
 (root/'module/webroot/tee/tee_apps.js').write_text(APPS)
 replace(root/'module/webroot/index.html',"img-src 'self' data:;","img-src 'self' data: ksu:;")
 assembler=root/'tools/tee/assemble_topg.py'
 replace(assembler,'def once(path, old, new):','EN.update('+repr(EN)+')\nFR.update('+repr(FR)+')\n\ndef once(path, old, new):')
 replace(assembler,'<script src="tee/tee.js" defer></script>\\n</body>','<script src="tee/tee.js" defer></script>\\n<script src="tee/tee_apps.js" defer></script>\\n</body>')
 readme=root/'module/tee/README.md'
 text=readme.read_text().replace('Updates run after boot and every six hours.','Updates use a persistent configurable scheduler (one hour by default).')
 readme.write_text(text+'\n## Release tracking\n\nThe scheduled build checks the latest published release of wfire06100/TEESimulator-RS, resolves its immutable commit and recompiles when the successful-build cache does not contain this TOPG/engine pair. Changed source anchors fail closed. The schedule becomes active only when the workflow is present on the default branch. Artifacts are not installed automatically on devices. Existing personal keyboxes remain protected; clean installations default to automatic mode using the AlwaysWrong mirror. Installed-app selection currently lists Android user 0. Icon support depends on the host manager.\n')
 for path in (manager,root/'module/tee/tee_scheduler.sh'): subprocess.run(['sh','-n',str(path)],check=True)
 subprocess.run(['node','--check',str(root/'module/webroot/tee/tee_apps.js')],check=True)

if __name__=='__main__':
 if len(sys.argv)!=3: raise SystemExit('Usage: update_features.py UPSTREAM EXPECTED_SHA')
 main(Path(sys.argv[1]).resolve(),sys.argv[2])
