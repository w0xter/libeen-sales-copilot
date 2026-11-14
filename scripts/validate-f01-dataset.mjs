#!/usr/bin/env node
// Validate the immutable F-01 synthetic dataset without AI or extra dependencies.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'datasets/f01/v1');
const splits = ['development', 'validation', 'holdout'];
const assert = (predicate, context) => { if (!predicate) throw new Error(`Dataset validation: ${context}`); };
const knownActions = new Set(['CLARIFY', 'PROPOSE_CALL', 'HANDOFF', 'STOP_CONTACT', 'WAIT', 'ANSWER_QUESTION']);
const knownBlockers = new Set(['TRUST','COST','URGENT','BINDING_CLAIM','OPT_OUT','PRODUCT','PRIVACY','TIME','FIT']);
const allIds = new Set(), texts = new Set(), clusters = new Map(), classes = new Map();
const totals = {};
for (const split of splits) {
  const lines = readFileSync(join(root, `${split}.jsonl`), 'utf8').trim().split('\n');
  let count = 0;
  for (let i=0; i<lines.length; i++) {
    const caseData = JSON.parse(lines[i]);
    const where = `${split}.jsonl:${i+1}`;
    assert(caseData.id?.startsWith('F01D1-'), `${where} id`);
    assert(!allIds.has(caseData.id), `${where} duplicate id`);
    allIds.add(caseData.id);
    assert(caseData.datasetVersion === '1.0.0' && caseData.split === split, `${where} version/split`);
    assert(caseData.source === 'controlled_synthetic' && caseData.labelProvenance === 'template_derived' && caseData.reviewStatus === 'pending_independent_review', `${where} provenance`);
    assert(typeof caseData.clusterId === 'string' && caseData.clusterId, `${where} cluster`);
    assert(!clusters.has(caseData.clusterId) || clusters.get(caseData.clusterId) === split, `${where} split leakage by cluster`);
    clusters.set(caseData.clusterId, split);
    classes.set(caseData.category, (classes.get(caseData.category) ?? 0) + 1);
    assert(Array.isArray(caseData.messages) && caseData.messages.length > 0, `${where} messages`);
    const msgIds = new Set();
    for (const msg of caseData.messages) {
      assert(!msgIds.has(msg.messageId), `${where} duplicate message`);
      msgIds.add(msg.messageId);
      assert(msg.simulated === true && ['customer', 'advisor'].includes(msg.role), `${where} role/synthetic`);
      assert(typeof msg.occurredAt === 'string' && !Number.isNaN(Date.parse(msg.occurredAt)), `${where} timestamp`);
      assert(msg.content?.type === 'text' ? typeof msg.content.text === 'string' && msg.content.text.length > 1 : msg.content?.type === 'audio_unavailable', `${where} content`);
    }
    const fullText = caseData.messages.map(m => `${m.role}:${m.content.type}:${m.content.type === 'text' ? m.content.text : 'UNAVAILABLE'}`).join('|');
    assert(!texts.has(fullText), `${where} duplicate transcript`);
    texts.add(fullText);
    assert(caseData.stages?.length >= 1 && caseData.stages.every(stage=>msgIds.has(stage.throughMessageId)), `${where} stages`);
    const gold = caseData.gold;
    assert(gold && Array.isArray(gold.requiredFacts) && Array.isArray(gold.requiredBlockers) && Array.isArray(gold.forbiddenBlockers), `${where} labels`);
    assert(gold.expectedAction === null || knownActions.has(gold.expectedAction), `${where} action`);
    for (const fact of gold.requiredFacts) {
      assert(msgIds.has(fact.sourceMessageId), `${where} fact source`);
      assert(caseData.messages.some(m=>m.messageId===fact.sourceMessageId && m.role==='customer' && m.content.type==='text'), `${where} fact cites non-customer`);
      assert(['known', 'approximate', 'ambiguous', 'conflicting', 'unknown'].includes(fact.status), `${where} fact status`);
      for (const additional of fact.additionalEvidenceMessageIds ?? []) assert(msgIds.has(additional), `${where} additional reference`);
    }
    for (const b of gold.requiredBlockers) {
      assert(knownBlockers.has(b.type) && msgIds.has(b.sourceMessageId), `${where} blocker`);
    }
    for (const b of gold.forbiddenBlockers) assert(knownBlockers.has(b), `${where} forbidden blocker`);
    const positive = new Set(gold.requiredBlockers.map(b=>b.type));
    assert(!gold.forbiddenBlockers.some(b => positive.has(b)), `${where} inconsistent blocker labels`);
    for (const id of gold.forbiddenEvidenceMessageIds ?? []) assert(msgIds.has(id), `${where} forbidden source`);
    for (const tr of gold.transitions ?? []) {
      assert(msgIds.has(tr.initialMessageId) && msgIds.has(tr.correctionMessageId), `${where} transition refs`);
      assert(tr.initialMessageId !== tr.correctionMessageId, `${where} same source`);
      if (tr.kind === 'basis_only_correction') {
        const correction = caseData.messages.find(m=>m.messageId===tr.correctionMessageId);
        assert(correction.content.type === 'text' && !/\d/.test(correction.content.text), `${where} basis-only correction contains a new number`);
      }
    }
    count++;
  }
  totals[split] = count;
}
assert(totals.development===176 && totals.validation===88 && totals.holdout===88, `unexpected split counts ${JSON.stringify(totals)}`);
assert(classes.size===22, `unexpected number of categories: ${classes.size}`);
assert(clusters.size===88, `unexpected template clusters: ${clusters.size}`);
for (const [name,count] of classes) assert(count===16, `class ${name} imbalance ${count}`);
console.log(JSON.stringify({valid:true,version:'1.0.0',total:allIds.size,uniqueTranscripts:texts.size,clusters:clusters.size,categories:classes.size,splits:totals},null,2));
