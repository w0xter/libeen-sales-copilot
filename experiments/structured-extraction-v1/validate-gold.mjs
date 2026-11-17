#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const rows=readFileSync(join(root,'datasets/gold.v0.1.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const fields=['interest','location','horizon','buyers','income','savings','debts'];
assert.equal(rows.length,48);
assert.equal(new Set(rows.map(r=>r.caseId)).size,48);
for(let i=1;i<=6;i++)assert.equal(rows.filter(r=>r.family==='F'+i).length,8);
let facts=0;
for(const row of rows){
 const m=row.input.messages[0];assert.equal(m.messageId,row.caseId);
 assert.equal(row.split,'unassigned'); assert.equal(row.annotation.status,'proposed_needs_independent_review');
 let actual=new Set();
 for(const a of row.gold.assertions){
  assert.ok(fields.includes(a.field));
  assert.equal(m.role,'customer');
  assert.equal(a.evidence.messageId,m.messageId);
  assert.ok(m.text.includes(a.evidence.exactQuote),row.caseId+' quote invalid');
  if(a.value.relationEvidence)assert.ok(m.text.includes(a.value.relationEvidence),row.caseId+' relation invalid');
  actual.add(a.field);facts++;
 }
 assert.deepEqual(row.gold.absentFields.slice().sort(),fields.filter(x=>!actual.has(x)).sort());
}
assert.equal(rows.find(r=>r.caseId==='F2-09').gold.absentFields.includes('buyers'),true);
assert.equal(rows.find(r=>r.caseId==='F3-23').gold.assertions[0].value.state,'none_declared');
assert.equal(rows.find(r=>r.caseId==='F4-27').gold.assertions.length,0);
assert.equal(rows.find(r=>r.caseId==='F6-45').gold.assertions[0].value.availableAmount,null);
for(const id of ['F5-33','F5-40'])assert.equal(rows.find(r=>r.caseId===id).gold.assertions.length,0);
const interests=rows.flatMap(r=>r.gold.assertions.filter(a=>a.field==='interest').map(a=>r.caseId+':'+a.value.polarity));
assert.deepEqual(interests,['F1-01:positive','F1-08:negative','F2-11:positive','F2-15:positive','F3-19:negative']);
console.log('OK:',rows.length,'cases;',facts,'atomic assertions; all quotes and absent fields consistent');
