import { describe, expect, it } from 'vitest';
import { score } from './f02-metrics';

describe('simulated metrics', () => {
  const oracle = { facts: [{ fieldId: 'income', value: 10, scope: 'participant', precision: 'explicit', unit: 'EUR', period: 'month', incomeBasis: 'net', messageId: 'm1' }], protected: ['TRUST'], forbidden: ['OPT_OUT'] };
  it('distinguishes attribute mismatches, invented evidence and false signals', () => {
    const result = score(oracle, { status: 'complete', facts: [{ fieldId: 'income', value: 10, scope: 'buying_unit', precision: 'explicit', unit: 'EUR', period: 'month', incomeBasis: 'net', evidence: ['m2'] }], signals: ['OPT_OUT'] });
    expect(result.scope).toEqual({ numerator: 0, denominator: 1, notEvaluable: 0 });
    expect(result.value.numerator).toBe(1);
    expect(result.evidence.numerator).toBe(0);
    expect(result.protectedRecall.numerator).toBe(0);
    expect(result.falseSignals.OPT_OUT.numerator).toBe(1);
  });
  it('does not score abstentions as correct or errors as missing safety', () => {
    const abstained = score(oracle, { status: 'abstained', facts: [], signals: [] });
    expect(abstained.coverage.numerator).toBe(0);
    expect(abstained.value.numerator).toBe(0);
    const failed = score(oracle, { status: 'error', facts: [], signals: [] });
    expect(failed.protectedRecall).toEqual({ numerator: 0, denominator: 0, notEvaluable: 1 });
  });
});

it('matches multiple occurrences and flags extra assertions and fabricated textual evidence', () => {
  const oracle = { facts: [
    {fieldId:'income',value:10,scope:'participant',messageId:'m1'},
    {fieldId:'income',value:20,scope:'participant',messageId:'m2'},
  ], protected:[], forbidden:[] };
  const metrics = score(oracle, { status:'complete', facts:[
    {fieldId:'income',value:20,scope:'participant',evidence:[{messageId:'m2',quote:'20'}]},
    {fieldId:'income',value:10,scope:'participant',evidence:[{messageId:'m1',quote:'invented'}]},
    {fieldId:'other',value:3,scope:'case',evidence:[{messageId:'m1',quote:'10'}]},
  ], signals:[], messages:[{messageId:'m1',role:'customer',text:'10'}, {messageId:'m2',role:'customer',text:'20'}] });
  expect(metrics.value).toMatchObject({numerator:2,denominator:2});
  expect(metrics.additional.numerator).toBe(1);
  expect(metrics.invalidEvidence.numerator).toBe(1);
});

it('reports a paired regression and avoids comparing unavailable outcomes', async () => {
  const { compareMetrics } = await import('./f02-metrics');
  const truth={facts:[{fieldId:'income',value:10,scope:'participant',messageId:'m1'}],protected:[],forbidden:[]};
  const good=score(truth,{status:'complete',facts:[{fieldId:'income',value:10,scope:'participant',evidence:['m1']}],signals:[]});
  const bad=score(truth,{status:'complete',facts:[{fieldId:'income',value:9,scope:'participant',evidence:['m1']}],signals:[]});
  const error=score(truth,{status:'error',facts:[],signals:[]});
  expect(compareMetrics(good,bad).value).toEqual({delta:-1,comparable:true});
  expect(compareMetrics(good,error).value).toEqual({delta:null,comparable:false});
});
