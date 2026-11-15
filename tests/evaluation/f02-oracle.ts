/** Projection of the existing frozen F-01 fixture oracle, not independently reviewed. */
import { expectedFacts } from '../../src/fixtures';
import type { Id } from './f02-fixtures';
export function oracle(id:Id, name:'laura'|'javier'|'rosa') {
  const facts = id === 'C01' ? [] : expectedFacts[name].filter(f => 'value' in f).map(f => ({fieldId:f.fieldId,value:'value' in f ? f.value : undefined,scope:f.subject,unit:'unit' in f ? f.unit : undefined,period:'period' in f ? f.period : undefined,incomeBasis:'incomeBasis' in f ? f.incomeBasis : undefined,precision:f.status === 'approximate' ? 'approximate' : 'explicit',messageId:f.evidenceRefs[0]?.messageId}));
  return {facts,factsEvaluable:id !== 'C01',protected:id === 'B08' ? ['URGENT','BINDING_CLAIM'] : id === 'B10' ? ['TRUST','OPT_OUT'] : ['B05','B06'].includes(id) ? ['TRUST'] : [],forbidden:id === 'B01' ? ['TRUST','COST','OPT_OUT'] : ['B05','B06'].includes(id) ? ['COST','OPT_OUT'] : id === 'B08' ? ['OPT_OUT'] : []};
}
