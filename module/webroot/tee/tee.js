/* Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0 */
(function(){
'use strict';
const cli='/data/adb/modules/COPG-VD/tee/tee_manager.sh';
const enc=s=>{let x='';for(const c of new TextEncoder().encode(s))x+=String.fromCharCode(c);return btoa(x);};
const quote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
let sequence=0,pending=Promise.resolve();
function execute(command){return new Promise((resolve,reject)=>{const callback='topg_tee_'+Date.now()+'_'+(++sequence);window[callback]=(code,stdout,stderr)=>{delete window[callback];if(code===0||code==='0')resolve(stdout||'');else reject(new Error([stdout,stderr].filter(Boolean).join('\n')||'Command failed: '+code));};try{if(typeof ksu==='undefined'||typeof ksu.exec!=='function')throw new Error('Root bridge unavailable');ksu.exec(command,'{}',callback);}catch(e){delete window[callback];reject(e);}});}
function run(action,...args){const next=pending.then(()=>execute('sh '+quote(cli)+' '+[action,...args].map(quote).join(' ')));pending=next.catch(()=>undefined);return next;}
function normalizeEndpoint(value){let u=String(value).trim().split('#')[0].replace(/\/$/,'');if(!u)u='http://evoker.qzz.io/key';if(/^https?:\/\/evoker\.qzz\.io(?:\/keys)?$/.test(u))u=u.replace(/\/keys$/,'')+'/key';return u;}
function parseSettings(raw){const values={};for(const line of String(raw).split(/\r?\n/)){const i=line.indexOf('=');if(i>0)values[line.slice(0,i).trim()]=line.slice(i+1).trim();}if(!['auto','personal'].includes(values.mode)||values.endpoint===undefined)throw new Error('Invalid persisted keybox settings');return {mode:values.mode,endpoint:values.endpoint};}
function init(){
 const nav=document.getElementById('tab-tools')?.parentElement,box=document.getElementById('tab-container');if(!nav||!box)return;
 const panel=document.createElement('div');panel.id='tee-tab';panel.className='tab-content';panel.style.overflowY='auto';
 panel.innerHTML=`<section class="card" style="padding:16px"><h2 data-i18n="tee_title"></h2><p data-i18n="tee_policy"></p><button id="tee-refresh" class="action-btn" data-i18n="tee_refresh"></button><h3 data-i18n="tee_keybox"></h3><select id="tee-source"><option value="personal" data-i18n="tee_personal"></option><option value="auto" data-i18n="tee_auto_update"></option></select><label for="tee-endpoint" data-i18n="tee_endpoint"></label><input id="tee-endpoint" type="url" style="width:100%;box-sizing:border-box"><p data-i18n="tee_network"></p><button id="tee-configure" class="action-btn" data-i18n="tee_configure"></button><button id="tee-update" class="action-btn" data-i18n="tee_update"></button><input id="tee-file" type="file" accept=".xml,text/xml,application/xml"><button id="tee-import" class="action-btn" data-i18n="tee_import"></button><h3>target.txt</h3><p data-i18n="tee_modes"></p><input id="tee-package" placeholder="com.example.app"><select id="tee-mode"><option value="auto">Auto</option><option value="generate">Generate (!)</option><option value="hack">Hack (?)</option></select><button id="tee-add" class="action-btn" data-i18n="tee_add"></button><textarea id="tee-target" rows="12" spellcheck="false" aria-label="target.txt" style="width:100%;box-sizing:border-box"></textarea><button id="tee-load" class="action-btn" data-i18n="tee_load"></button><button id="tee-save" class="action-btn" data-i18n="tee_save"></button><button id="tee-logs" class="action-btn" data-i18n="tee_logs"></button><button id="tee-reset" class="action-btn" data-i18n="tee_reset"></button><pre id="tee-output" role="status" aria-live="polite" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></section>`;
 box.append(panel);const btn=document.createElement('button');btn.id='tab-tee';btn.className='tab-btn';btn.dataset.i18n='tee_title';btn.textContent='TEE';nav.append(btn);
 const el=id=>document.getElementById(id),out=el('tee-output');let busy=false,settingsLoaded=false,lastSettings=null;
 function guard(){el('tee-source').disabled=busy||!settingsLoaded;el('tee-endpoint').disabled=busy||!settingsLoaded;el('tee-configure').disabled=busy||!settingsLoaded;el('tee-update').disabled=busy||!settingsLoaded||el('tee-source').value!=='auto';}
 function applySettings(s){lastSettings=s;settingsLoaded=true;el('tee-source').value=s.mode;el('tee-endpoint').value=s.endpoint;guard();}
 async function readSettings(){const s=parseSettings(await run('config'));applySettings(s);return s;}
 async function saveSettings(){
  const mode=el('tee-source').value;const endpoint=normalizeEndpoint(el('tee-endpoint').value);
  if(!['auto','personal'].includes(mode))throw new Error('Invalid keybox mode');
  let wrote=false;
  try{await run('configure',mode,enc(endpoint));wrote=true;const s=await readSettings();if(s.mode!==mode||s.endpoint!==endpoint)throw new Error('Keybox settings verification failed');return t('tee_done');}
  catch(e){if(!wrote&&lastSettings)applySettings(lastSettings);else{settingsLoaded=false;lastSettings=null;el('tee-source').selectedIndex=-1;guard();}throw e;}
 }
 async function act(fn){if(busy)return;busy=true;const prior=Array.from(panel.querySelectorAll('button')).map(b=>[b,b.disabled]);prior.forEach(([b])=>b.disabled=true);guard();out.textContent=t('ui_019');try{out.textContent=await fn()||t('tee_done');}catch(e){out.textContent=String(e);}finally{busy=false;prior.forEach(([b,disabled])=>b.disabled=disabled);guard();}}
 async function status(){await readSettings();return run('status');}
 btn.addEventListener('click',e=>{e.stopImmediatePropagation();box.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));nav.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));panel.classList.add('active');btn.classList.add('active');const bar=el('device-savebar');if(bar)bar.style.display='none';act(status);},true);
 el('tee-refresh').onclick=()=>act(status);
 el('tee-source').addEventListener('change',()=>act(saveSettings));
 el('tee-load').onclick=()=>act(async()=>{el('tee-target').value=await run('read-target');});
 el('tee-save').onclick=()=>act(()=>run('save-target',enc(el('tee-target').value.replace(/\r\n/g,'\n'))));
 el('tee-add').onclick=()=>{const p=el('tee-package').value.trim();if(!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(p)){out.textContent=t('tee_invalid');return;}const suffix={auto:'',generate:'!',hack:'?'}[el('tee-mode').value],lines=el('tee-target').value.split('\n');let found=false;for(let i=0;i<lines.length;i++)if(lines[i].replace(/[!?]$/,'')===p){lines[i]=p+suffix;found=true;}if(!found)lines.push(p+suffix);el('tee-target').value=lines.join('\n');};
 el('tee-import').onclick=()=>act(async()=>{const f=el('tee-file').files[0];if(!f||f.size>49152)throw new Error(t('tee_invalid'));const result=await run('import',enc(await f.text()));await readSettings();return result;});
 el('tee-configure').onclick=()=>act(saveSettings);
 el('tee-update').onclick=()=>act(async()=>{if(el('tee-source').value!=='auto')throw new Error('Personal keybox protected');await saveSettings();return run('update');});
 el('tee-logs').onclick=()=>act(()=>run('logs'));
 el('tee-reset').onclick=()=>{if(confirm(t('tee_reset_confirm')))act(()=>run('reset','CONFIRM'));};
 el('tee-source').selectedIndex=-1;guard();
 I18N.apply(panel);I18N.apply(nav);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
(function(){
'use strict';
const script=document.createElement('script');script.src='tee/tee_layout.js';document.head.append(script);
})();
