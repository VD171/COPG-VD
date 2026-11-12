/* Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0 */
(function(){
'use strict';
const cli='/data/adb/modules/COPG-VD/tee/tee_manager.sh';
const enc=s=>{let x='';for(const c of new TextEncoder().encode(s))x+=String.fromCharCode(c);return btoa(x);};
const run=(a,...v)=>execCommand('sh '+shq(cli)+' '+[a,...v].map(shq).join(' '));
function init(){
 const nav=document.getElementById('tab-tools')?.parentElement,box=document.getElementById('tab-container');if(!nav||!box)return;
 const panel=document.createElement('div');panel.id='tee-tab';panel.className='tab-content';panel.style.overflowY='auto';
 panel.innerHTML=`<section class="card" style="padding:16px"><h2 data-i18n="tee_title"></h2><p data-i18n="tee_policy"></p><button id="tee-refresh" class="action-btn" data-i18n="tee_refresh"></button><h3 data-i18n="tee_keybox"></h3><select id="tee-source"><option value="personal" data-i18n="tee_personal"></option><option value="auto" data-i18n="tee_auto_update"></option></select><label for="tee-endpoint" data-i18n="tee_endpoint"></label><input id="tee-endpoint" type="url" style="width:100%;box-sizing:border-box"><p data-i18n="tee_network"></p><button id="tee-configure" class="action-btn" data-i18n="tee_configure"></button><button id="tee-update" class="action-btn" data-i18n="tee_update"></button><input id="tee-file" type="file" accept=".xml,text/xml,application/xml"><button id="tee-import" class="action-btn" data-i18n="tee_import"></button><h3>target.txt</h3><p data-i18n="tee_modes"></p><input id="tee-package" placeholder="com.example.app"><select id="tee-mode"><option value="auto">Auto</option><option value="generate">Generate (!)</option><option value="hack">Hack (?)</option></select><button id="tee-add" class="action-btn" data-i18n="tee_add"></button><textarea id="tee-target" rows="12" spellcheck="false" aria-label="target.txt" style="width:100%;box-sizing:border-box"></textarea><button id="tee-load" class="action-btn" data-i18n="tee_load"></button><button id="tee-save" class="action-btn" data-i18n="tee_save"></button><button id="tee-logs" class="action-btn" data-i18n="tee_logs"></button><button id="tee-reset" class="action-btn" data-i18n="tee_reset"></button><pre id="tee-output" role="status" aria-live="polite" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></section>`;
 box.append(panel);const btn=document.createElement('button');btn.id='tab-tee';btn.className='tab-btn';btn.dataset.i18n='tee_title';btn.textContent='TEE';nav.append(btn);
 const el=id=>document.getElementById(id),out=el('tee-output');let busy=false;
 async function act(fn){if(busy)return;busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);try{out.textContent=await fn()||t('tee_done');}catch(e){out.textContent=String(e);}finally{busy=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 async function status(){const s=await run('status'),m=s.match(/^mode=(.+)$/m),u=s.match(/^endpoint=(.*)$/m);if(m)el('tee-source').value=m[1];if(u)el('tee-endpoint').value=u[1];return s;}
 btn.addEventListener('click',e=>{e.stopImmediatePropagation();box.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));nav.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));panel.classList.add('active');btn.classList.add('active');const bar=el('device-savebar');if(bar)bar.style.display='none';act(status);},true);
 el('tee-refresh').onclick=()=>act(status);
 el('tee-load').onclick=()=>act(async()=>{el('tee-target').value=await run('read-target');});
 el('tee-save').onclick=()=>act(()=>run('save-target',enc(el('tee-target').value.replace(/\r\n/g,'\n'))));
 el('tee-add').onclick=()=>{const p=el('tee-package').value.trim();if(!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(p)){out.textContent=t('tee_invalid');return;}const suffix={auto:'',generate:'!',hack:'?'}[el('tee-mode').value],lines=el('tee-target').value.split('\n');let found=false;for(let i=0;i<lines.length;i++)if(lines[i].replace(/[!?]$/,'')===p){lines[i]=p+suffix;found=true;}if(!found)lines.push(p+suffix);el('tee-target').value=lines.join('\n');};
 el('tee-import').onclick=()=>act(async()=>{const f=el('tee-file').files[0];if(!f||f.size>49152)throw new Error(t('tee_invalid'));return run('import',enc(await f.text()));});
 el('tee-configure').onclick=()=>act(()=>run('configure',el('tee-source').value,enc(el('tee-endpoint').value.trim().replace(/\/$/,''))));
 el('tee-update').onclick=()=>act(()=>run('update'));
 el('tee-logs').onclick=()=>act(()=>run('logs'));
 el('tee-reset').onclick=()=>{if(confirm(t('tee_reset_confirm')))act(()=>run('reset','CONFIRM'));};
 I18N.apply(panel);I18N.apply(nav);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
