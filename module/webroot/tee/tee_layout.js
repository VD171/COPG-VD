/* Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0 */
(function () {
'use strict';
const get = id => document.getElementById(id);
function mount() {
 const panel=get('tee-tab');
 if(!panel || panel.dataset.layoutReady)return;
 panel.dataset.layoutReady='1';
 const existingApps=get('tee-app-load')?.closest('section');
 const root=panel.firstElementChild;
 root.className='tee-layout';root.removeAttribute('style');
 function card(key,text){const s=document.createElement('section');s.className='card tee-card';const h=document.createElement('h2');h.className='tee-heading';if(key)h.dataset.i18n=key;h.textContent=text||'';s.append(h);return s;}
 function actions(...nodes){const d=document.createElement('div');d.className='tee-actions';for(const n of nodes)if(n)d.append(n);return d;}
 function field(control,label,key){const d=document.createElement('div');d.className='tee-field';const l=document.createElement('label');l.htmlFor=control.id;if(key)l.dataset.i18n=key;l.textContent=label||'';d.append(l,control);return d;}
 function help(node){const d=document.createElement('details');d.className='tee-help';const s=document.createElement('summary');s.dataset.i18n='ui_info_btn';s.textContent='Info';d.append(s);if(node)d.append(node);return d;}
 const status=card('tee_title','TEE');
 const policy=root.querySelector('[data-i18n="tee_policy"]');if(policy)status.append(policy);
 status.append(actions(get('tee-refresh')),get('tee-output'));
 const keybox=card('tee_keybox','Keybox');
 keybox.append(field(get('tee-source'),'Keybox','tee_keybox'),field(get('tee-endpoint'),'Mirror URL','tee_endpoint'));
 keybox.append(help(root.querySelector('[data-i18n="tee_network"]')),actions(get('tee-configure'),get('tee-update')));
 keybox.append(field(get('tee-file'),'Keybox XML'),actions(get('tee-import')));
 const targets=card(null,'target.txt');
 targets.append(help(root.querySelector('[data-i18n="tee_modes"]')));
 const appSlot=document.createElement('div');appSlot.id='tee-apps-slot';targets.append(appSlot);
 const manual=document.createElement('div');manual.className='tee-manual';
 manual.append(field(get('tee-package'),'Package'),field(get('tee-mode'),'Auto / Generate / Hack'));
 targets.append(manual,actions(get('tee-add')),field(get('tee-target'),'target.txt'),actions(get('tee-load'),get('tee-save')));
 const schedule=card('tee_schedule','Keybox update schedule');schedule.id='tee-schedule-card';schedule.hidden=true;
 const diagnostics=card('ui_tool_diag','Diagnostics');diagnostics.append(actions(get('tee-logs'),get('tee-reset')));
 get('tee-reset').classList.add('tee-danger');
 root.replaceChildren(status,keybox,targets,schedule,diagnostics);
 if(existingApps)appSlot.append(existingApps);
 get('tee-target').rows=8;
 function avatar(node){
  if(!node || node.dataset.teeAvatar)return;
  node.dataset.teeAvatar='1';node.classList.add('tee-avatar');node.removeAttribute('style');
  const letters=Array.from(node.childNodes).filter(n=>n.nodeType===3);
  const fallback=document.createElement('span');fallback.className='tee-avatar-fallback';fallback.textContent=letters.map(n=>n.textContent).join('').trim()||'?';letters.forEach(n=>n.remove());node.prepend(fallback);
  const img=node.querySelector('img');if(img){img.classList.add('tee-avatar-image');img.removeAttribute('style');const loaded=()=>{fallback.hidden=true;};img.addEventListener('load',loaded);if(img.complete&&img.naturalWidth>0)loaded();}
 }
 function normalizeApps(){
  const load=get('tee-app-load');
  if(load && !load.dataset.teeOrganized){
   load.dataset.teeOrganized='1';
   const appBox=load.closest('section');appBox.className='tee-picker';appBox.removeAttribute('style');appSlot.append(appBox);
   const scheduleTitle=appBox.querySelector('[data-i18n="tee_schedule"]');if(scheduleTitle)scheduleTitle.remove();
   const interval=get('tee-interval'),save=get('tee-schedule-save'),refresh=get('tee-schedule-status'),out=get('tee-schedule-output');
   const oldLabel=appBox.querySelector('label[for="tee-interval"]');if(oldLabel)oldLabel.remove();
   if(interval&&save&&refresh&&out){save.dataset.i18n='ui_029';schedule.append(field(interval,'Interval in minutes','tee_minutes'),actions(save,refresh),out);schedule.hidden=false;}
   const title=appBox.querySelector('h3');if(title)title.classList.add('tee-subheading');
   const hint=appBox.querySelector('[data-i18n="tee_icon_hint"]');if(hint)appBox.append(help(hint));
   const list=get('tee-app-list');if(list)list.removeAttribute('style');
   const search=get('tee-app-search');if(search)search.setAttribute('aria-label',search.placeholder||'Search installed applications');
   I18N.apply(panel);
  }
  const list=get('tee-app-list');
  if(list)for(const b of list.querySelectorAll('button')){
   if(b.dataset.teeRow)continue;
   b.dataset.teeRow='1';b.classList.remove('action-btn');b.classList.add('tee-app-row');b.removeAttribute('style');
   const image=b.firstElementChild;avatar(image);
   const texts=Array.from(b.childNodes).filter(n=>n.nodeType===3),raw=texts.map(n=>n.textContent).join('').trim();texts.forEach(n=>n.remove());
   const split=raw.lastIndexOf(' — '),name=split<0?raw:raw.slice(0,split),pkg=split<0?raw:raw.slice(split+3);
   const copy=document.createElement('span');copy.className='tee-app-copy';const label=document.createElement('span');label.className='tee-app-name';label.textContent=name;copy.append(label);
   if(pkg!==name){const sub=document.createElement('span');sub.className='tee-app-package';sub.textContent=pkg;copy.append(sub);}b.append(copy);
   b.setAttribute('aria-pressed',String(get('tee-package').value===pkg));
   b.addEventListener('click',()=>{list.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');},true);
  }
  const selected=get('tee-app-selected');if(selected){avatar(selected.firstElementChild);for(const n of Array.from(selected.childNodes).filter(x=>x.nodeType===3)){const parts=n.textContent.split(' — ');if(parts.length===2&&parts[0]===parts[1])n.textContent=parts[0];}}
 }
 new MutationObserver(normalizeApps).observe(appSlot,{childList:true,subtree:true});
 // The generated app selector is initially inserted beside the manual package field.
 new MutationObserver(normalizeApps).observe(manual,{childList:true,subtree:true});
 normalizeApps();
 const container=get('tab-container'),nav=get('tab-tee')?.parentElement;let saved=null;
 function expand(){if(!saved){saved={};for(const k of ['height','max-height','overflow','overflow-y'])saved[k]=[container.style.getPropertyValue(k),container.style.getPropertyPriority(k)];}container.style.setProperty('height','auto','important');container.style.setProperty('max-height','none','important');container.style.setProperty('overflow','visible','important');container.style.setProperty('overflow-y','visible','important');}
 function restore(){if(!saved)return;for(const [k,v] of Object.entries(saved)){if(v[0])container.style.setProperty(k,v[0],v[1]);else container.style.removeProperty(k);}saved=null;}
 if(nav)nav.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='tab-tee')expand();else restore();},true);
 window.addEventListener('resize',()=>{if(panel.classList.contains('active'))requestAnimationFrame(expand);});
 if(panel.classList.contains('active'))expand();
 I18N.apply(panel);
}
const link=document.createElement('link');link.rel='stylesheet';link.href='tee/tee.css';document.head.append(link);
function ready(){if(get('tee-tab')){mount();return;}const observer=new MutationObserver(()=>{if(get('tee-tab')){observer.disconnect();mount();}});observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
