import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { gradeClaim, gradeSignal, verifyArchive, evaluateCaptured } from './f02-r02-semantic';

it('grades each annotated attribute independently and does not equate literal evidence with semantic support', () => {
  const label = { fieldId:'declared_monthly_income', value:3800, subject:{scope:'buying_unit',id:'laura'}, unit:'EUR', period:'month', precision:'approximate', incomeBasis:'net', messageId:'m', semanticQuote:'3800 netos entre los dos' };
  const claim = {fieldId:'declared_monthly_income',value:3800,subjectRef:{scope:'participant',id:'laura'},unit:'EUR',period:'month',precision:'approximate',incomeBasis:'net',evidenceRefs:[{messageId:'m',quote:'Madrid'}]};
  const r = gradeClaim(claim,label,{m:'3800 netos entre los dos; Madrid'});
  expect(r.checks.value).toBe('correct');
  expect(r.checks.subject).toBe('incorrect');
  expect(r.checks.evidence).toBe('incorrect');
});
it('distinguishes absent positives, negative controls, uncertainty and missing labels', () => {
  expect(gradeSignal(true, false, true)).toMatchObject({status:'incorrect', classification:'false_negative'});
  expect(gradeSignal(false, true, true)).toMatchObject({status:'incorrect', classification:'false_positive'});
  expect(gradeSignal(true, null, true).status).toBe('unresolved');
  expect(gradeSignal(undefined, true, true).status).toBe('unlabeled');
  expect(gradeSignal(true, false, false).status).toBe('not_evaluable');
});
it('rejects a different archive before reading it', () => {
  expect(() => verifyArchive(Buffer.from('not the capture'))).toThrow(/SHA-256/);
});
const enabled = process.env.F02_CAPTURED_ZIP && process.env.F02_R01_DIAGNOSIS ? it : it.skip;
enabled('scores the actual captured runs without provider requests', () => {
  const result = evaluateCaptured(process.env.F02_CAPTURED_ZIP!, process.env.F02_R01_DIAGNOSIS!);
  if (process.env.F02_R02_OUTPUT) writeFileSync(process.env.F02_R02_OUTPUT, JSON.stringify(result, null, 2), {flag:'wx'});
  expect(result.scenarios).toHaveLength(24);
  const scenario = (id:string) => result.scenarios.find(s => s.id === id)!;
  expect(scenario('B01').claims.filter(c => c.status === 'correct')).toHaveLength(9);
  expect(scenario('B05').signals.find(s => s.category === 'TRUST' && s.stage === 'S2')?.classification).toBe('true_positive');
  expect(scenario('B08').signals.find(s => s.category === 'BINDING_CLAIM' && s.stage === 'S1')?.classification).toBe('false_negative');
  expect(scenario('B10').signals.find(s => s.category === 'OPT_OUT' && s.stage === 'S2')?.classification).toBe('true_positive');
  const time = scenario('F01D1-time_nonurgent-P2-V2');
  expect(time.signals.find(s => s.category === 'OPT_OUT' && s.stage === 'public')?.classification).toBe('false_positive');
  expect(time.claims.some(c => c.fieldId === 'desired_locations' && c.checks.evidence === 'incorrect')).toBe(true);
  expect(time.action.status).toBe('incorrect');
  for (const family of ['price_question','documentation_request','cost_real']) for (const variant of ['P1','P2']) {
    const signal = scenario(`F01D1-${family}-${variant}-V2`).signals.find(s => s.category === 'OPT_OUT' && s.stage === 'S1');
    expect(signal?.expected).toBe(false);
  }
  expect(result.metrics.extractionCoverage).toEqual({numerator:9,denominator:9});
  expect(result.metrics.availability).toEqual({numerator:2,denominator:21,not_evaluable:3});
  expect(scenario('C01').availability).toBe('not_evaluable');
});
