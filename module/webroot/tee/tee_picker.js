/* Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0 */
(function(){
'use strict';
const get=id=>document.getElementById(id);
const pkgPattern=/^([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)([!?]?)$/;
function entries(text){const map=new Map();for(const line of text.split(/\r?\n/)){const m=line.trim().match(pkgPattern);if(m)map.set(m[1],m[2]==='!'?'generate':m[2]==='?'?'hack':'auto');}return map;}
function updateEntry(text,pkg,mode){
 if(!pkgPattern.test(pkg)||/[!?]$/.test(pkg))throw new Error('Invalid package');
 if(mode!==null&&!['auto','generate','hack'].includes(mode))throw new Error('Invalid mode');
 const lines=text.replace(/\r\n/g,'\n').split('\n');
 const positions=[];lines.forEach((line,i)=>{const m=line.trim().match(pkgPattern);if(m&&m[1]===pkg)positions.push(i);});
 if(mode===null)return lines.filter((line,i)=>!positions.includes(i)).join('\n');
 const entry=pkg+({auto:'',generate:'!',hack:'?'}[mode]);
 if(positions.length)lines[positions[positions.length-1]]=entry;
 else{const section=lines.findIndex(line=>/^\[[A-Za-z0-9_.-]+\.xml\]$/.test(line.trim()));lines.splice(section<0?lines.length:section,0,entry);}
 return lines.join('\n');
}
window.TOPGTeeTargetDraft=Object.freeze({entries,updateEntry});
let serial=0;
const quote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
const encode=s=>{let binary='';for(const n of new TextEncoder().encode(s))binary+=String.fromCharCode(n);return btoa(binary);};
function root(cmd){return new Promise((resolve,reject)=>{const cb='tee_picker_'+Date.now()+'_'+(++serial);window[cb]=(code,out,err)=>{delete window[cb];code===0?resolve(out||''):reject(new Error(err||out||String(code)));};try{ksu.exec(cmd,'{}',cb);}catch(e){delete window[cb];reject(e);}});}
function mount(){
 const open=get('tee-app-load'),panel=get('tee-tab');if(!open||!panel?.dataset.layoutReady||open.dataset.newPicker)return false;
 open.dataset.newPicker='1';open.dataset.i18n='tee_picker_open';
 for(const id of ['tee-app-search','tee-app-list','tee-app-selected','tee-app-error']){const el=get(id);if(el)el.dataset.teeLegacy='1';}
 const oldHelp=panel.querySelector('[data-i18n="tee_icon_hint"]')?.closest('details');if(oldHelp)oldHelp.dataset.teeLegacy='1';
 const editor=get('tee-target');let dirty=false;editor.addEventListener('input',()=>dirty=true);
 const state={user:new Set(),system:new Set(),info:new Map(),icons:new Map(),loaded:false,loading:false,filter:'user',limit:50,draft:'',modePkg:null,saving:false,suppress:0,session:0,targetReady:false};
 const dialog=document.createElement('dialog');dialog.className='tee-app-dialog';
 dialog.innerHTML='<div class="tee-picker-head"><h2 data-i18n="tee_apps"></h2><button type="button" data-i18n="ui_009" data-close></button></div><div class="tee-picker-tools"><input type="search" data-search data-i18n-ph="tee_app_search"><div class="tee-picker-filters" role="group"><button type="button" data-filter="user" data-i18n="tee_filter_user"></button><button type="button" data-filter="system" data-i18n="tee_filter_system"></button><button type="button" data-filter="all" data-i18n="tee_filter_all"></button></div><p data-i18n="tee_picker_help"></p></div><div class="tee-picker-results"><div data-list></div><button type="button" data-more data-i18n="tee_picker_more"></button></div><p class="tee-picker-status" role="status" data-message></p><div class="tee-picker-footer"><button type="button" data-close data-i18n="ui_006"></button><button type="button" data-save data-i18n="ui_029"></button></div>';
 const modeDialog=document.createElement('dialog');modeDialog.className='tee-mode-dialog';
 modeDialog.innerHTML='<h3 data-mode-title></h3><div class="tee-mode-options"><button type="button" data-mode="auto">Auto</button><button type="button" data-mode="generate">Generate (!)</button><button type="button" data-mode="hack">Hack (?)</button></div><button type="button" data-mode-close data-i18n="ui_006"></button>';
 document.body.append(dialog,modeDialog);
 const q=s=>dialog.querySelector(s),list=q('[data-list]'),message=q('[data-message]');
 function show(d){if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');}
 function shut(d){if(typeof d.close==='function')d.close();else d.removeAttribute('open');}
 function closeMode(){state.modePkg=null;shut(modeDialog);}
 function close(){if(modeDialog.open||modeDialog.hasAttribute('open'))closeMode();document.activeElement?.blur();shut(dialog);state.session++;state.targetReady=false;state.draft='';open.focus({preventScroll:true});}
 function modeName(mode){return {auto:'Auto',generate:'Generate',hack:'Hack'}[mode]||'Auto';}
 function icon(pkg){const wrap=document.createElement('span');wrap.className='tee-picker-icon';const fallback=document.createElement('span');fallback.textContent=(state.info.get(pkg)||pkg)[0].toUpperCase();const image=document.createElement('img');image.width=36;image.height=36;image.alt='';image.onload=()=>fallback.hidden=true;image.onerror=()=>image.remove();image.src=state.icons.get(pkg)||'ksu://icon/'+encodeURIComponent(pkg);wrap.append(fallback,image);return wrap;}
 function metadata(visible){
  if(typeof ksu==='undefined')return;
  const parse=x=>typeof x==='string'?JSON.parse(x):x;
  if(typeof ksu.getPackagesInfo==='function')try{const data=parse(ksu.getPackagesInfo(JSON.stringify(visible)));for(const x of Array.isArray(data)?data:Object.values(data||{}))if(x.packageName&&(x.appLabel||x.label))state.info.set(x.packageName,x.appLabel||x.label);}catch(e){}
  if(typeof ksu.getPackagesIcons==='function')try{const data=parse(ksu.getPackagesIcons(JSON.stringify(visible),48));for(const x of Array.isArray(data)?data:Object.values(data||{})){const raw=String(x.icon||'').replace(/^data:image\/png;base64,/,'');if(x.packageName&&/^[A-Za-z0-9+/=]+$/.test(raw))state.icons.set(x.packageName,'data:image/png;base64,'+raw);}}catch(e){}
 }
 function openMode(pkg){if(!state.targetReady||state.saving)return;state.modePkg=pkg;modeDialog.querySelector('[data-mode-title]').textContent=state.info.get(pkg)||pkg;for(const b of modeDialog.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===(entries(state.draft).get(pkg)||'auto')));if(!modeDialog.open&&!modeDialog.hasAttribute('open'))show(modeDialog);}
 function render(){
  if(!dialog.open&&!dialog.hasAttribute('open'))return;
  const pool=state.filter==='user'?state.user:state.filter==='system'?state.system:new Set([...state.user,...state.system]);
  const search=q('[data-search]').value.toLowerCase();const all=[...pool].sort().filter(pkg=>(pkg+' '+(state.info.get(pkg)||'')).toLowerCase().includes(search));
  const visible=all.slice(0,state.limit);metadata(visible);const selected=entries(state.draft);list.replaceChildren();
  for(const pkg of visible){
   const row=document.createElement('div');row.className='tee-picker-row';
   const button=document.createElement('button');button.type='button';button.className='tee-picker-app';button.setAttribute('aria-pressed',String(selected.has(pkg)));button.disabled=!state.targetReady||state.saving;
   const text=document.createElement('span');text.className='tee-picker-copy';const label=document.createElement('span');label.textContent=state.info.get(pkg)||pkg;text.append(label);if(label.textContent!==pkg){const sub=document.createElement('small');sub.textContent=pkg;text.append(sub);}
   const check=document.createElement('span');check.className='tee-picker-check';check.textContent=selected.has(pkg)?'✓':'';button.append(icon(pkg),text,check);
   let timer=null,start=null;const cancel=()=>{clearTimeout(timer);timer=null;};
   button.addEventListener('pointerdown',e=>{if(e.button!==0)return;start=[e.clientX,e.clientY];cancel();timer=setTimeout(()=>{timer=null;state.suppress=Date.now()+900;openMode(pkg);},500);});
   button.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>12)cancel();});
   for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,cancel);
   button.addEventListener('contextmenu',e=>{e.preventDefault();cancel();state.suppress=Date.now()+900;openMode(pkg);});
   button.addEventListener('keydown',e=>{if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();openMode(pkg);}});
   button.onclick=()=>{if(Date.now()<state.suppress)return;state.draft=updateEntry(state.draft,pkg,selected.has(pkg)?null:'auto');render();};
   const mode=document.createElement('button');mode.type='button';mode.className='tee-picker-mode';mode.disabled=!state.targetReady||state.saving;mode.textContent=selected.has(pkg)?modeName(selected.get(pkg)):t('tee_picker_mode');mode.setAttribute('aria-label',pkg+' — Auto / Generate / Hack');mode.onclick=()=>openMode(pkg);
   row.append(button,mode);list.append(row);
  }
  for(const b of dialog.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter));
  q('[data-more]').hidden=visible.length>=all.length;
 }
 async function load(){
  if(state.loaded||state.loading)return;
  state.loading=true;message.textContent=t('tee_picker_loading');
  try{const out=await root("set -e; printf '__USER__\\n'; pm list packages -3 --user 0; printf '__SYSTEM__\\n'; pm list packages -s --user 0");let group=null;for(const line of out.split('\n')){if(line==='__USER__'){group=state.user;continue;}if(line==='__SYSTEM__'){group=state.system;continue;}const pkg=line.replace(/^package:/,'').trim();if(group&&pkgPattern.test(pkg)&&!/[!?]$/.test(pkg))group.add(pkg);}state.loaded=true;message.textContent='';render();}catch(e){message.textContent=String(e);}finally{state.loading=false;}
 }
 open.onclick=async()=>{if(state.saving)return;const session=++state.session;state.targetReady=false;state.draft=editor.value;q('[data-save]').disabled=true;q('[data-search]').value='';state.limit=50;message.textContent='';I18N.apply(dialog);I18N.apply(modeDialog);show(dialog);render();if(!state.draft&&!dirty){try{const text=await root('sh /data/adb/modules/COPG-VD/tee/tee_manager.sh read-target');if(session!==state.session)return;state.draft=text;state.targetReady=true;}catch(e){if(session!==state.session)return;message.textContent=String(e);}}else state.targetReady=true;if(session!==state.session)return;q('[data-save]').disabled=!state.targetReady;render();await load();};
 for(const b of dialog.querySelectorAll('[data-close]'))b.onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 modeDialog.addEventListener('cancel',e=>{e.preventDefault();closeMode();});
 for(const d of [dialog,modeDialog])d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(d===modeDialog)closeMode();else close();}});
 modeDialog.querySelector('[data-mode-close]').onclick=closeMode;
 for(const b of modeDialog.querySelectorAll('[data-mode]'))b.onclick=()=>{if(state.modePkg)state.draft=updateEntry(state.draft,state.modePkg,b.dataset.mode);closeMode();render();};
 for(const b of dialog.querySelectorAll('[data-filter]'))b.onclick=()=>{state.filter=b.dataset.filter;state.limit=50;render();};
 q('[data-search]').oninput=()=>{state.limit=50;render();};q('[data-more]').onclick=()=>{state.limit+=50;render();};
 q('[data-save]').onclick=async()=>{if(state.saving||!state.targetReady)return;state.saving=true;open.disabled=true;q('[data-save]').disabled=true;const draft=state.draft;try{await root('sh /data/adb/modules/COPG-VD/tee/tee_manager.sh save-target '+quote(encode(draft)));editor.value=draft;dirty=true;editor.dispatchEvent(new Event('input',{bubbles:true}));get('tee-output').textContent=t('tee_done');close();}catch(e){message.textContent=String(e);}finally{state.saving=false;open.disabled=false;q('[data-save]').disabled=false;}};
 I18N.apply(panel);return true;
}
const style=document.createElement('link');style.rel='stylesheet';style.href='tee/tee_picker.css';document.head.append(style);
function ready(){if(mount())return;const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-layout-ready']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
