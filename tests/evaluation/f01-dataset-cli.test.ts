import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { OpenAIInterpreter, OpenAIDraftGenerator, openAITransport, classifyModelError, type ModelTransport } from '../../src/adapters/ai/openai';
import { CaseOrchestrator } from '../../src/application/cases/orchestrator';
import { MemoryCaseRepository } from '../../src/adapters/persistence/memory-case-repository';
import { evaluate } from '../../src/application/cases/evaluate';
import { demoBundle, configBundleRef } from '../../src/config';
import type { CaseEvent, CaseSnapshot, CaseView, Message } from '../../src/contracts';

// The normal test suite skips real, billable model evaluation.
const enabled = process.env.F01_DATASET_EVAL === '1' ? it : it.skip;
type Config = {
  datasetVersion: string; split: string; recordIds: string[]; mode: 'interpreter' | 'end-to-end';
  repeat: number; maxRequests: number; seed: number; allowFailures: boolean; manifestHash: string;
};
type GoldFact = {
  fieldId: string; scope: string; value: unknown; status: string; sourceMessageId: string;
  unit?: string; period?: string; incomeBasis?: string; additionalEvidenceMessageIds?: string[];
  subjectLabel?: string; historyMessageIds?: string[];
};
type NegativeFact = { fieldId: string; scope: string; reason: string; disallowedValue?: unknown; disallowedIncomeBasis?: string };
type Transition = { kind: string; initialMessageId: string; correctionMessageId: string; previousValue?: number; correctedValue?: number };
type RecordData = {
  id: string; datasetVersion: string; split: string; category: string; clusterId: string;
  reviewStatus: string; messages: Message[];
  gold: {
    requiredFacts: GoldFact[];
    forbiddenFacts: NegativeFact[];
    requiredBlockers: { type: string; sourceMessageId: string }[];
    forbiddenBlockers: string[];
    expectedAction: string | null;
    expectedMilestones?: Record<string,string>;
    forbiddenEvidenceMessageIds?: string[];
    transitions?: Transition[];
    invariants?: string[];
  }
};
type Check = { name: string; pass: boolean; expected: unknown; actual: unknown };
type State = { snapshot: CaseSnapshot; action: string|null; draft: string|null; errors: {code:string;message:string}[] };
type Call = {
  index: number; kind: string; status: 'response'|'error'; latencyMs: number; output?: unknown;
  diagnostic?: ReturnType<typeof classifyModelError>;
};
type Verdict = 'PASS'|'PARTIAL'|'FAIL'|'BLOCKED';

function newCase(record: RecordData, messages: Message[]): CaseSnapshot {
  return {
    caseId:record.id,revision:0,messages:structuredClone(messages),
    assertions:[],knowledge:{facts:[]},
    goal:{id:'qualification',description:'Synthetic model evaluation',status:'active'},
    workflowProgress:{workflowId:demoBundle.workflow.id,workflowVersion:demoBundle.workflow.version,milestones:[]},
    blockers:[],proposals:[],drafts:[],events:[],decisions:[],
    configBundleRef:structuredClone(configBundleRef),
    status:'NEEDS_ADVISOR',analysisStatus:'pending'
  };
}
function project(view: CaseView): State {
  return {snapshot:view.snapshot,action:view.activeProposal?.actionType??null,draft:view.draft?.status??null,
    errors:view.errors.map(e=>({code:e.code,message:e.message}))};
}
async function runRecord(record: RecordData, iteration: number, mode: Config['mode'], transport: ModelTransport): Promise<State> {
  const correction=record.gold.transitions?.[0];
  if(correction && mode!=='end-to-end') throw new Error('Corrections require the orchestrator');
  const seedMessages=correction?record.messages.filter(m=>m.messageId!==correction.correctionMessageId):record.messages;
  const initial=newCase(record,seedMessages);
  const interpreter=new OpenAIInterpreter(transport);
  if(mode==='interpreter'){
    const result=await interpreter.interpret({caseSnapshot:initial,messages:initial.messages,factSchema:demoBundle.factSchema,agentProfile:demoBundle.agentProfile});
    if(!result.ok)return {snapshot:{...initial,analysisStatus:'analysis_failed'},action:null,draft:null,errors:[{code:result.error.code,message:result.error.message}]};
    const domain=evaluate({...initial,assertions:result.value.assertions,blockers:result.value.blockers,analysisStatus:'complete'},demoBundle,`dataset-${record.id}-${iteration}`,'openai');
    if(!domain.ok)return {snapshot:{...initial,analysisStatus:'analysis_failed'},action:null,draft:null,errors:[{code:domain.error.code,message:domain.error.message}]};
    return {snapshot:domain.value.snapshot,action:domain.value.snapshot.proposals.at(-1)?.actionType??null,draft:null,errors:[]};
  }
  const repository=new MemoryCaseRepository([initial]);
  const orchestrator=new CaseOrchestrator({repository,interpreter,draftGenerator:new OpenAIDraftGenerator(transport),mode:'openai',getConfig:()=>demoBundle});
  const initialEvent:CaseEvent={
    type:'CASE_ANALYSIS_REQUESTED',eventId:`eval-${record.id}-${iteration}-init`,caseId:record.id,actor:'advisor',
    expectedRevision:0,occurredAt:correction?'2026-11-14T10:02:30Z':'2026-11-15T10:00:00Z',payload:{}
  };
  let result=await orchestrator.handleEvent(initialEvent);
  if(correction){
    const stored=await repository.get(record.id);
    if(!stored.ok)throw new Error('Evaluation cannot load stored case');
    const message=record.messages.find(m=>m.messageId===correction.correctionMessageId);
    if(!message||message.role!=='customer')throw new Error('Invalid correction message');
    const event:CaseEvent={
      type:'MESSAGE_RECEIVED',eventId:`eval-${record.id}-${iteration}-followup`,caseId:record.id,actor:'customer',
      expectedRevision:stored.value.revision,occurredAt:message.occurredAt,simulated:true,payload:{message:structuredClone(message)}
    };
    result=await orchestrator.handleEvent(event);
  }
  if(result.ok)return project(result.value);
  const stored=await repository.get(record.id);
  return {snapshot:stored.ok?stored.value:initial,action:null,draft:null,errors:[{code:result.error.code,message:result.error.message}]};
}
function comparable(a: unknown,b: unknown): boolean {
  if(typeof a==='string'&&typeof b==='string')return a.trim().toLocaleLowerCase('es-ES')===b.trim().toLocaleLowerCase('es-ES');
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>comparable(v,b[i]));
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    const aa=a as Record<string,unknown>,bb=b as Record<string,unknown>;
    return Object.keys(aa).length===Object.keys(bb).length&&Object.keys(aa).every(k=>k in bb&&comparable(aa[k],bb[k]));
  }
  return Object.is(a,b);
}
function checksFor(record: RecordData, state: State): Check[] {
  const checks: Check[]=[];
  const push=(name:string,pass:boolean,expected:unknown,actual:unknown)=>checks.push({name,pass,expected,actual});
  const facts=state.snapshot.knowledge.facts;
  const blockers=state.snapshot.blockers.filter(b=>b.status==='open');
  const msgById=new Map(record.messages.map(m=>[m.messageId,m]));
  const supported=(refs:{messageId:string;quote?:string}[])=>refs.every(ref=>{
    const m=msgById.get(ref.messageId);
    return m?.role==='customer'&&m.content.type==='text'&&(!ref.quote||m.content.text.includes(ref.quote));
  });
  push('analysis_complete',state.snapshot.analysisStatus==='complete','complete',state.snapshot.analysisStatus??null);
  if(record.gold.expectedAction!==null){
    push('expected_action',state.action===record.gold.expectedAction,record.gold.expectedAction,state.action);
  }
  else push('no_unjustified_call',state.action!=='PROPOSE_CALL','not PROPOSE_CALL without demonstrated full context',state.action);
  push('all_evidence_customer_text',state.snapshot.assertions.every(a=>supported(a.evidenceRefs))&&state.snapshot.blockers.every(b=>supported(b.evidenceRefs)),true,'assertions/blockers source check');
  const audioIds=new Set(record.messages.filter(m=>m.content.type==='audio_unavailable').map(m=>m.messageId));
  const unsupported=[...audioIds,...(record.gold.forbiddenEvidenceMessageIds??[])];
  push('no_forbidden_evidence',!state.snapshot.assertions.some(a=>a.evidenceRefs.some(e=>unsupported.includes(e.messageId)))&&!blockers.some(b=>b.evidenceRefs.some(e=>unsupported.includes(e.messageId))),[],unsupported);
  const factMatching=(g:GoldFact)=>{
    const candidates=facts.filter(f=>f.fieldId===g.fieldId&&f.subjectRef.scope===g.scope);
    return candidates.find(f=>f.status===g.status &&
      (g.value===undefined||('value' in f&&comparable(f.value,g.value))) &&
      (g.unit===undefined||f.unit===g.unit) &&
      (g.period===undefined||f.period===g.period) &&
      (g.incomeBasis===undefined||f.incomeBasis===g.incomeBasis) &&
      f.evidenceRefs.some(e=>e.messageId===g.sourceMessageId) &&
      (g.additionalEvidenceMessageIds??[]).every(id=>f.evidenceRefs.some(e=>e.messageId===id)));
  };
  for(let index=0;index<record.gold.requiredFacts.length;index++){
    const g=record.gold.requiredFacts[index];
    const f=factMatching(g);
    push(`fact_${index}_${g.fieldId}_${g.scope}`,Boolean(f),g,facts.filter(x=>x.fieldId===g.fieldId&&x.subjectRef.scope===g.scope));
  }
  for(let index=0;index<record.gold.forbiddenFacts.length;index++){
    const g=record.gold.forbiddenFacts[index];
    const entries=facts.filter(f=>f.fieldId===g.fieldId&&f.subjectRef.scope===g.scope);
    const disallowed=entries.filter(f=>
      (g.disallowedValue!==undefined?('value' in f&&f.status==='known'&&comparable(f.value,g.disallowedValue)):
      g.disallowedIncomeBasis!==undefined?f.incomeBasis===g.disallowedIncomeBasis:true));
    push(`negative_fact_${index}_${g.fieldId}`,disallowed.length===0,g.reason,disallowed);
  }
  for(const [index,g] of record.gold.requiredBlockers.entries()){
    const matching=blockers.filter(b=>b.type===g.type&&b.evidenceRefs.some(e=>e.messageId===g.sourceMessageId));
    push(`blocker_required_${index}_${g.type}`,matching.length>0,g,blockers.map(b=>({type:b.type,evidenceRefs:b.evidenceRefs})));
  }
  for(const type of record.gold.forbiddenBlockers)push(`blocker_forbidden_${type}`,!blockers.some(b=>b.type===type),'absent',blockers.map(b=>b.type));
  if(record.category==='ready_call'){
    const intent=facts.find(f=>f.fieldId==='initial_intent'&&f.subjectRef.scope==='case');
    push('meaningful_initial_intent',intent?.status==='known'&&'value' in intent&&typeof intent.value==='string'&&intent.value.trim().toLocaleLowerCase('es-ES')!=='undetermined','explicit informative intent',intent??null);
  }
  if(record.category==='multiple_subjects'){
    const income=facts.filter(f=>f.fieldId==='declared_monthly_income'&&f.subjectRef.scope==='participant');
    push('distinct_income_subjects',new Set(income.map(f=>f.subjectRef.id)).size>=2,'two distinct participant IDs',income.map(f=>f.subjectRef));
  }
  for(const tr of record.gold.transitions??[]){
    const prev=state.snapshot.assertions.filter(a=>a.fieldId==='declared_monthly_income'&&a.evidenceRefs.some(e=>e.messageId===tr.initialMessageId));
    const later=state.snapshot.assertions.filter(a=>a.fieldId==='declared_monthly_income'&&a.evidenceRefs.some(e=>e.messageId===tr.correctionMessageId));
    push('correction_history_preserved',prev.length>0&&later.length>0,{initial:tr.initialMessageId,followup:tr.correctionMessageId},{previous:prev.length,latest:later.length});
    if(tr.kind==='basis_only_correction'){
      push('no_copied_amount_into_correction',later.length>0&&later.every(a=>a.value===undefined),'no amount in correction assertion',later.map(a=>a.value));
    }
    if(tr.kind==='amount_correction'){
      push('revised_amount_preserved',later.some(a=>a.value===tr.correctedValue),tr.correctedValue,later.map(a=>a.value));
    }
  }
  for(const [milestone,status] of Object.entries(record.gold.expectedMilestones??{})){
    const actual=state.snapshot.workflowProgress.milestones.find(m=>m.milestoneId===milestone)?.status;
    push(`milestone_${milestone}`,actual===status,status,actual??null);
  }
  if(state.action!==null&&record.gold.expectedAction!==null&&state.action==='CLARIFY'&&state.draft!==null){
    push('draft_reviewable',state.draft==='generated','generated',state.draft);
  }
  return checks;
}
enabled('evaluates frozen F01 dataset against provisional expectations',async()=>{
  const cfg=JSON.parse(process.env.F01_DATASET_CONFIG??'{}') as Config;
  const outputFile=process.env.F01_EVAL_OUTPUT_FILE;
  const key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;
  if(!outputFile||!key||!model||!cfg.split||!Array.isArray(cfg.recordIds))throw new Error('Missing F01 dataset configuration');
  const manifest=JSON.parse(readFileSync('datasets/f01/v1/FREEZE_MANIFEST.json','utf8'));
  if(manifest.version!==cfg.datasetVersion||manifest.independentHumanSignOff!==false)throw new Error('Dataset manifest/provenance mismatch');
  const records:RecordData[]=readFileSync(`datasets/f01/v1/${cfg.split}.jsonl`,'utf8').trim().split(String.fromCharCode(10)).map((x:string)=>JSON.parse(x) as RecordData);
  const byId=new Map(records.map(r=>[r.id,r]));
  const provider=openAITransport(key,model,25000);
  const report={
    generatedAt:new Date().toISOString(),datasetVersion:cfg.datasetVersion,split:cfg.split,model,mode:cfg.mode,
    seed:cfg.seed,source:'frozen but provisional controlled-synthetic annotations',
    labelStatus:manifest.labelStatus,independentHumanSignOff:manifest.independentHumanSignOff,
    methodologicalLimits:['A semantic check passes only on explicitly annotated properties','The annotations have not been independently verified','Repeated numeric variants of the same template are correlated','Not a real-world customer accuracy estimate','Token usage is unavailable at the ModelTransport interface'],
    requestCount:0,maxRequests:cfg.maxRequests,
    runs:[] as Array<{
      id:string;category:string;clusterId:string;iteration:number;verdict:Verdict;checks:Check[];
      observed:{action:string|null;analysisStatus:string|null;errors:State['errors'];facts:CaseSnapshot['knowledge']['facts'];assertions:CaseSnapshot['assertions'];blockers:CaseSnapshot['blockers'];milestones:CaseSnapshot['workflowProgress']['milestones'];draft:string|null};
      calls:Call[];manualInvariants:string[];
    }>,
    summary:{PASS:0,PARTIAL:0,FAIL:0,BLOCKED:0},
    byCategory:{} as Record<string,{PASS:number;PARTIAL:number;FAIL:number;BLOCKED:number}>
  };
  const save=()=>writeFileSync(outputFile,JSON.stringify(report,null,2)+String.fromCharCode(10),{mode:0o600});
  try{
    for(const id of cfg.recordIds)for(let iteration=1;iteration<=cfg.repeat;iteration++){
      const record=byId.get(id);if(!record)throw new Error(`Selected record not found: ${id}`);
      if(record.datasetVersion!==cfg.datasetVersion||record.reviewStatus!=='internally_audited_pending_external_review')throw new Error('Record provenance mismatch');
      const calls:Call[]=[];let budgetExhausted=false;
      const transport:ModelTransport={complete:async(instructions,input,kind,signal)=>{
        if(report.requestCount>=cfg.maxRequests){budgetExhausted=true;throw new Error('Evaluation request budget exhausted');}
        const index=++report.requestCount,started=Date.now();
        try{
          const output=await provider.complete(instructions,input,kind,signal);
          calls.push({index,kind:kind??'interpretation',status:'response',latencyMs:Date.now()-started,output});
          return output;
        }catch(error){
          calls.push({index,kind:kind??'interpretation',status:'error',latencyMs:Date.now()-started,diagnostic:classifyModelError(error)});
          throw error;
        }
      }};
      const state=await runRecord(record,iteration,cfg.mode,transport);
      const checks=checksFor(record,state);
      const relevantFailure=calls.some(c=>c.status==='error'&&['network','authentication','rate_limit','provider','timeout'].includes(c.diagnostic?.category??''));
      const blocked=budgetExhausted||relevantFailure||state.errors.some(e=>e.code==='MODEL_UNAVAILABLE');
      const expectedActionCheck=checks.find(c=>c.name==='expected_action');
      const verdict:Verdict=blocked?'BLOCKED':checks.every(c=>c.pass)?'PASS':expectedActionCheck?.pass?'PARTIAL':'FAIL';
      report.summary[verdict]++;
      const cat=report.byCategory[record.category]??={PASS:0,PARTIAL:0,FAIL:0,BLOCKED:0};
      cat[verdict]++;
      report.runs.push({
        id,category:record.category,clusterId:record.clusterId,iteration,verdict,checks,calls,
        manualInvariants:record.gold.invariants??[],
        observed:{action:state.action,analysisStatus:state.snapshot.analysisStatus??null,errors:state.errors,
          facts:state.snapshot.knowledge.facts,assertions:state.snapshot.assertions,blockers:state.snapshot.blockers,
          milestones:state.snapshot.workflowProgress.milestones,draft:state.draft}
      });
      save();
      console.log(`${id} #${iteration}: ${verdict} action=${state.action??'none'} calls=${calls.length}`);
    }
  }finally{save();}
  if(!cfg.allowFailures&&report.runs.some(r=>r.verdict!=='PASS'))throw new Error('Dataset evaluation failed its provisional checks. See JSON report.');
},600_000);
