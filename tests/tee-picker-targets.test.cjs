// Copyright (C) 2026 wfire06100; SPDX-License-Identifier: Apache-2.0
// Pure target-draft tests, not Android gesture or rendering tests.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={window:{},document:{readyState:'loading',createElement:()=>({}),head:{append(){}},addEventListener(){}}};
vm.runInNewContext(fs.readFileSync(process.argv[2],'utf8'),context);
const api=context.window.TOPGTeeTargetDraft;
const original='# keep this comment\ncom.user.app\n\n[work.xml]\ncom.work.app?\n';
assert.equal(api.entries(original).get('com.user.app'),'auto');
assert.equal(api.entries(original).get('com.work.app'),'hack');
const generated=api.updateEntry(original,'com.work.app','generate');
assert.ok(generated.includes('[work.xml]\ncom.work.app!\n'));
assert.ok(generated.startsWith('# keep this comment\ncom.user.app\n'));
const added=api.updateEntry(original,'com.new.app','hack');
assert.ok(added.indexOf('com.new.app?')<added.indexOf('[work.xml]'));
assert.ok(added.includes('com.work.app?'));
const removed=api.updateEntry(original,'com.user.app',null);
assert.ok(!removed.includes('com.user.app'));
assert.ok(removed.includes('# keep this comment')&&removed.includes('[work.xml]'));
assert.equal(api.entries(api.updateEntry(original,'com.work.app','auto')).get('com.work.app'),'auto');
assert.throws(()=>api.updateEntry(original,'bad;command','auto'));
assert.throws(()=>api.updateEntry(original,'com.work.app','invalid'));
console.log('PASS: modes, removal, keybox sections, comments, default-keybox insertion and input validation.');
