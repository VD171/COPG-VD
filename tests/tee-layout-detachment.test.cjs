// Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0
// Targeted detached-node regression test; not a browser rendering test.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../module/webroot/tee/tee_layout.js'),'utf8');
const start=source.indexOf(" const diagnostics=card(");
const end=source.indexOf(' root.replaceChildren(',start);
assert.ok(start>=0&&end>start,'Diagnostics block must exist');
const block=source.slice(start,end);
function execute(code,present=true){
 const nodes=new Map();
 for(const id of ['tee-logs',...(present?['tee-reset']:[])]){
  const classes=new Set();nodes.set(id,{connected:true,classes,classList:{add:c=>classes.add(c)},onclick:()=>id});
 }
 const context={
  get:id=>{const n=nodes.get(id);return n&&n.connected?n:null;},
  card:()=>({rows:[],append(row){this.rows.push(row);}}),
  actions:(...items)=>{const controls=items.filter(Boolean);controls.forEach(n=>n.connected=false);return {controls};}
 };
 vm.runInNewContext(code+'\nglobalThis.result=diagnostics;',context);
 return {nodes,result:context.result};
}
const broken="const diagnostics=card('ui_tool_diag','Diagnostics');diagnostics.append(actions(get('tee-logs'),get('tee-reset')));get('tee-reset').classList.add('tee-danger');";
assert.throws(()=>execute(broken),/classList/,'The model must reproduce the original null lookup');
const fixed=execute(block);
const reset=fixed.nodes.get('tee-reset');
assert.ok(reset.classes.has('tee-danger'),'Danger style must be applied before detachment');
assert.ok(fixed.result.rows[0].controls.includes(reset),'The same reset button must be retained');
assert.equal(reset.onclick(),'tee-reset','Existing control handler must remain intact');
assert.equal(execute(block,false).result.rows[0].controls.length,1,'An absent reset control must not crash diagnostics');
assert.ok(source.lastIndexOf("panel.dataset.layoutReady='1'")>source.indexOf(' root.replaceChildren('),'Layout readiness must not be marked before the rebuild succeeds');
console.log('PASS: detached lookup reproduced; fixed block preserves the control and handler; absent control guarded; readiness deferred.');
