import { readFileSync, writeFileSync } from 'node:fs';
import { evaluateR07a } from './f02-r07a-evaluate';
import { expect, it } from 'vitest';
import { evaluateCaptured, gradeSignal, verifyArchive } from './f02-r02-semantic';
import corpus from './f02-r07a-annotations.v1.json';
import { fixture } from './f02-fixtures';

const annotations = corpus.annotations;
it('keeps occurrence-level, provisional annotations and adversarial controls distinct', () => {
  expect(new Set(annotations.map(a => `${a.id}/${a.occurrence}/${a.category}`)).size).toBe(annotations.length);
  for (const a of annotations) {
    expect(a.quote && a.intent && a.rationale && a.certainty).toBeTruthy();
    expect(a.review).toBe('provisional_not_independent');
  }
  for (const category of ['OPT_OUT', 'BINDING_CLAIM']) {
    const items = annotations.filter(a => a.category === category && a.source === 'synthetic_r07a');
    expect(items.some(a => a.expected === true)).toBe(true);
    expect(items.some(a => a.expected === false)).toBe(true);
    expect(items.some(a => a.expected === null)).toBe(true);
  }
});

it('demonstrates why literal words are not semantic verification', () => {
  const byId = (id:string) => annotations.find(a => a.id === id)!;
  // Experimental straw man: contact-related literal trigger. Not a runtime rule.
  const literalTrigger = (s:string) => /contact/i.test(s);
  expect(literalTrigger(byId('o3').quote)).toBe(true); // negated: false positive
  expect(literalTrigger(byId('o4').quote)).toBe(true); // third party: false positive
  expect(literalTrigger(byId('o6').quote)).toBe(true); // hypothetical: false positive
  expect(literalTrigger(byId('o1').quote)).toBe(false); // paraphrase: false negative
  expect(literalTrigger(byId('o2').quote)).toBe(false); // paraphrase: false negative
  expect(byId('o7').expected).toBeNull();
  expect(byId('b6').expected).toBeNull();
});

it('preserves all seven classifications without confusing unavailable with negative', () => {
  expect(gradeSignal(true,true,true).classification).toBe('true_positive');
  expect(gradeSignal(false,false,true).classification).toBe('true_negative');
  expect(gradeSignal(false,true,true).classification).toBe('false_positive');
  expect(gradeSignal(true,false,true).classification).toBe('false_negative');
  expect(gradeSignal(true,null,true).classification).toBe('unresolved');
  expect(gradeSignal(undefined,true,true).classification).toBe('unlabeled');
  expect(gradeSignal(true,false,false).classification).toBe('not_evaluable');
  expect(() => verifyArchive(Buffer.from('wrong zip'))).toThrow(/SHA-256/);
});

const enabled = process.env.F02_CAPTURED_ZIP && process.env.F02_R01_DIAGNOSIS ? it : it.skip;
enabled('scores captured stages separately, validates labeled source quotes and excludes missing history', () => {
  const zip = process.env.F02_CAPTURED_ZIP!;
  verifyArchive(readFileSync(zip));
  const result = evaluateCaptured(zip, process.env.F02_R01_DIAGNOSIS!);
  const r07 = evaluateR07a(zip, process.env.F02_R01_DIAGNOSIS!);
  if (process.env.F02_R07A_OUTPUT) writeFileSync(process.env.F02_R07A_OUTPUT, JSON.stringify(r07, null, 2) + '\n', {flag:'wx'});
  expect(r07.records.filter(r => r.annotation.source === 'synthetic_r07a').every(r => Object.values(r.stages).every(s => s.classification === 'not_evaluable'))).toBe(true);
  const signal = (id:string, category:string, stage:string) => result.scenarios.find(s => s.id === id)!.signals.find(s => s.category === category && s.stage === stage)!;
  expect(signal('B10','OPT_OUT','S1').classification).toBe('true_positive');
  expect(signal('B10','OPT_OUT','S2').classification).toBe('true_positive');
  expect(signal('B10','OPT_OUT','public').classification).toBe('not_evaluable');
  expect(signal('B08','BINDING_CLAIM','S1').classification).toBe('false_negative');
  expect(signal('B08','BINDING_CLAIM','S2').classification).toBe('false_negative');
  expect(signal('B08','BINDING_CLAIM','public').classification).toBe('not_evaluable');
  for (const stage of ['S1','S2','public']) expect(signal('F01D1-time_nonurgent-P2-V2','OPT_OUT',stage).classification).toBe('false_positive');
  for (const id of ['C01','F01D1-basis_correction-P2-V2','F01D1-amount_correction-P2-V2']) {
    expect(result.scenarios.find(s => s.id === id)!.signals.every(s => s.classification === 'not_evaluable')).toBe(true);
  }
  for (const id of ['B08','B10'] as const) {
    const annotation = annotations.find(a => a.id === id)!;
    const message = fixture(id).messages.find(m => m.messageId === annotation.occurrence);
    expect(message?.content.type === 'text' && message.content.text.includes(annotation.quote)).toBe(true);
  }
  const dataset = readFileSync('datasets/f01/v1/development.jsonl','utf8').trim().split('\n').map(line => JSON.parse(line) as {id:string;messages:{messageId:string;content:{text?:string}}[]});
  for (const a of annotations.filter(a => a.source === 'R01_capture' && a.id.startsWith('F01D1-'))) {
    expect(dataset.find(d => d.id === a.id)?.messages.find(m => m.messageId === a.occurrence)?.content.text).toContain(a.quote);
  }
});
