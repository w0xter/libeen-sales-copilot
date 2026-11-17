#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const json=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const gold=readFileSync(join(root,'datasets/gold.v1.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const audit=readFileSync(join(root,'audit/gold-v1-audit.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const manifest=json('datasets/split-manifest.v1.json');
const schema=json('datasets/gold.v1.schema.json');
const fields=['interest','location','horizon','buyers','income','savings','debts'];
assert.equal(gold.length,48);assert.equal(audit.length,48);
assert.equal(new Set(gold.map(x=>x.caseId)).size,48);
assert.equal(manifest.blindHoldout,false);
assert.equal(manifest.version,'1.0');
assert.equal(manifest.goldApproval.status,'approved_by_dataset_owner');
assert.equal(manifest.goldApproval.frozen,true);
assert.equal(schema.properties.split.enum.includes('reserved_nonblind'),true);
const seen=new Set(), stats={development:0,evaluation:0,reserved_nonblind:0};
let count=0;
for(const r of gold){
 const m=r.input.messages[0];assert.equal(r.caseId,m.messageId);assert.equal(r.family,r.caseId.slice(0,2));
 assert.equal(r.annotation.status,'user_approved');
 assert.equal(r.annotation.version,'1.0');
 assert.deepEqual(r.annotation.approval,{status:'approved_by_dataset_owner',date:'2026-11-18',scope:'full_case_including_assertions_and_absences'});
 assert.ok(manifest.splits[r.split].includes(r.caseId));
 assert.equal(r.input.messages.length,1);
 const used=new Set();
 for(const a of r.gold.assertions){
  assert.equal(m.role,'customer',r.caseId+' role');
  assert.ok(fields.includes(a.field),r.caseId+' field');
  assert.equal(a.evidence.messageId,m.messageId);
  assert.ok(m.text.includes(a.evidence.exactQuote),r.caseId+' quote');
  if(a.value.relationEvidence)assert.ok(a.evidence.exactQuote.includes(a.value.relationEvidence),r.caseId+' relational quote');
  if(a.field==='buyers')assert.ok(Number.isInteger(a.value.count)&&a.value.count>0);
  used.add(a.field);count++;
 }
 assert.deepEqual([...r.gold.absentFields].sort(),fields.filter(x=>!used.has(x)).sort(),r.caseId+' absences');
 stats[r.split]++;seen.add(r.caseId);
}
assert.deepEqual(stats,{development:12,evaluation:24,reserved_nonblind:12});
for(let i=1;i<=6;i++){
 const fam='F'+i; assert.equal(gold.filter(x=>x.family===fam).length,8);
 for(const [split,n] of [['development',2],['evaluation',4],['reserved_nonblind',2]])
  assert.equal(gold.filter(x=>x.family===fam&&x.split===split).length,n);
}
for(const split of ['development','evaluation'])for(const field of fields){
 const n=gold.filter(r=>r.split===split).flatMap(r=>r.gold.assertions).filter(a=>a.field===field).length;
 assert.ok(n>0,'missing '+field+' coverage in '+split);
}
assert.equal(count,51);
assert.deepEqual(audit.map(x=>x.caseId),gold.map(x=>x.caseId));
for(const a of audit){
 assert.equal(a.review.evidenceValid,true);assert.equal(a.review.sourceTextMatch,true);
 assert.equal(a.review.independentHumanReview,true);
 assert.deepEqual(a.review.humanApproval,{status:'approved_by_dataset_owner',date:'2026-11-18'});
}
assert.equal(gold.find(x=>x.caseId==='F4-28').gold.assertions[0].value.period,'quincena');
assert.equal(gold.find(x=>x.caseId==='F6-46').input.messages[0].text,'[Imagen adjunta no accesible] Ahí aparecen mis ingresos.');
for(const id of ['F4-30','F4-31']){
 const x=gold.find(r=>r.caseId===id).gold.assertions.find(a=>a.field==='debts');
 assert.ok(x.evidence.exactQuote.includes(x.value.relationEvidence));
}
for(const id of ['F5-33','F5-40'])assert.equal(gold.find(x=>x.caseId===id).gold.assertions.length,0);
assert.equal(gold.find(x=>x.caseId==='F3-23').gold.assertions[0].value.state,'none_declared');
assert.equal(gold.find(x=>x.caseId==='F6-45').gold.assertions[0].value.availableAmount,null);
assert.equal(gold.find(x=>x.caseId==='F2-09').gold.absentFields.includes('buyers'),true);
const interest=gold.flatMap(r=>r.gold.assertions.filter(a=>a.field==='interest').map(a=>r.caseId+':'+a.value.polarity));
assert.deepEqual(interest,['F1-01:positive','F1-08:negative','F2-11:positive','F2-15:positive','F3-19:negative']);
console.log('PASS: 48 cases / '+count+' assertions / 48 audits / source quotes / 12-24-12 nonblind split');
