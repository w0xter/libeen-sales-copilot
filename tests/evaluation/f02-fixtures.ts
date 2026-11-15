import { cases, scenarios } from '../../src/fixtures';
import { demoBundle, configBundleRef } from '../../src/config';
import type { CaseSnapshot, Message } from '../../src/contracts';
export type Id = 'B01'|'B05'|'B06'|'B08'|'B10'|'C01';
export function fixture(id: Id) {
  const name: 'rosa'|'javier'|'laura' = id === 'B08' ? 'rosa' : ['B05','B06','B10'].includes(id) ? 'javier' : 'laura';
  const messages = structuredClone(cases.find(c => c.caseId === name)!.messages);
  if (id === 'B06') messages.find(m => m.messageId === 'javier-m5')!.content = { type:'text', text:'Antes de seguir necesito saber quién responde si esto no es fiable.' };
  if (id === 'B10') messages.push(structuredClone(scenarios.find(s => s.id === 'javier-opt-out')!.additions[0]));
  return {name,messages};
}
export function seed(name:string,messages:Message[]):CaseSnapshot {
  return {caseId:name,revision:0,messages,assertions:[],knowledge:{facts:[]},goal:{id:'qualification',description:'Synthetic evaluation',status:'active'},workflowProgress:{workflowId:demoBundle.workflow.id,workflowVersion:demoBundle.workflow.version,milestones:[]},blockers:[],proposals:[],drafts:[],events:[],decisions:[],configBundleRef:structuredClone(configBundleRef),status:'NEEDS_ADVISOR',analysisStatus:'pending'};
}
export function correction() { return structuredClone(scenarios.find(s => s.id === 'laura-gross-correction')!.additions[0]); }
