import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fixture, type Id } from './f02-fixtures';

type Status = 'correct'|'incorrect'|'unresolved'|'not_evaluable'|'unlabeled';
type Ref = {messageId:string; quote?:string};
type Claim = {fieldId:string; value?:unknown; subjectRef?:{scope:string;id:string}; unit?:string; period?:string; precision?:string; incomeBasis?:string; evidenceRefs?:Ref[]};
type Label = {fieldId:string; value?:unknown; subject?:{scope:string;id:string}; unit?:string; period?:string; precision?:string; incomeBasis?:string; messageId:string; semanticQuote:string; semanticSupport?:boolean};
type Signal = {signalId:string; category:string; evidenceRefs?:Ref[]};
type Call = {index:number;kind:string;status:string;output?:{claims?:Claim[];candidates?:Signal[];verdicts?:{signalId:string;status:string}[]}};
type Run = {id?:string;scenario?:string;calls:Call[];observed:{action:string|null;blockers?:{type:string}[]}};
type Replay = {id:string; replay?:string; result?:{status:string;action?:string|null;blockers?:{type:string}[]};diagnostic?:{finalStatus:string;failureCode:string|null;groupingCounts?:unknown;reviewCounts?:unknown;reviewReasonCategories?:string[]}};
const hash = 'd28d6f8bb31b4fc0d1cdb809256677e4e6a85a26cce1e6c84e8257ac9823380f';
const files = ['B01','B05','B06','B08','B10','C01','binding_request','cost_real','basis_correction','amount_correction','documentation_request','price_question','time_nonurgent','trust_false_friend','trust_real','urgent_real'];
const categories = ['OPT_OUT','TRUST','URGENT','BINDING_CLAIM'] as const;
const provenance = 'F02-R02 provisional manual annotation based on F02 R01 and synthetic source; not independently adjudicated';
export function verifyArchive(bytes:Buffer) { if (createHash('sha256').update(bytes).digest('hex') !== hash) throw Error('SHA-256 mismatch for captured archive'); }
const equal = (a:unknown,b:unknown) => JSON.stringify(a) === JSON.stringify(b);
export function gradeClaim(claim:Claim, label:Label|undefined, messages:Record<string,string>) {
  const keys = ['fieldId','value','subject','unit','period','precision','incomeBasis','evidence'] as const;
  const checks = Object.fromEntries(keys.map(k => [k,'unlabeled'])) as Record<typeof keys[number],Status>;
  if (label) {
    checks.fieldId = claim.fieldId === label.fieldId ? 'correct' : 'incorrect';
    for (const key of ['value','unit','period','precision','incomeBasis'] as const) if (label[key] !== undefined) checks[key] = claim[key] === undefined ? 'unresolved' : equal(claim[key],label[key]) ? 'correct' : 'incorrect';
    if (label.subject) checks.subject = !claim.subjectRef ? 'unresolved' : equal(claim.subjectRef,label.subject) ? 'correct' : 'incorrect';
    const refs = claim.evidenceRefs ?? [];
    const anchored = refs.some(ref => ref.messageId === label.messageId && !!ref.quote && !!messages[ref.messageId]?.includes(ref.quote) && ref.quote.includes(label.semanticQuote));
    checks.evidence = !refs.length ? 'unresolved' : anchored && label.semanticSupport !== false ? 'correct' : 'incorrect';
  }
  const values = Object.values(checks);
  const status:Status = !label ? 'unlabeled' : values.includes('incorrect') ? 'incorrect' : values.includes('unresolved') ? 'unresolved' : 'correct';
  return {status,checks};
}
export function gradeSignal(expected:boolean|undefined, observed:boolean|null, evaluable:boolean) {
  if (!evaluable) return {status:'not_evaluable' as Status, classification:'not_evaluable'};
  if (expected === undefined) return {status:'unlabeled' as Status, classification:'unlabeled'};
  if (observed === null) return {status:'unresolved' as Status, classification:'unresolved'};
  return {status:(expected === observed ? 'correct' : 'incorrect') as Status, classification: expected ? observed ? 'true_positive' : 'false_negative' : observed ? 'false_positive' : 'true_negative'};
}
const b01:Label[] = [
 {fieldId:'declared_monthly_income',value:3800,subject:{scope:'buying_unit',id:'laura'},unit:'EUR',period:'month',precision:'approximate',incomeBasis:'net',messageId:'laura-m3',semanticQuote:'3.800 € netos entre los dos'},
 {fieldId:'available_savings',value:18000,subject:{scope:'buying_unit',id:'laura'},unit:'EUR',precision:'approximate',messageId:'laura-m3',semanticQuote:'18.000 más o menos'},
 {fieldId:'monthly_debt',value:250,subject:{scope:'buying_unit',id:'laura'},unit:'EUR',period:'month',precision:'explicit',messageId:'laura-m4',semanticQuote:'préstamo del coche de 250 € al mes'}
];
function positiveAnchor(id:string, category:string): {messageId:string; text:string}|undefined {
  if ((id==='B05' || id==='B10') && category==='TRUST') return {messageId:'javier-m5',text:'fiable'};
  if (id==='B10' && category==='OPT_OUT') return {messageId:'javier-opt-out-addition',text:'No quiero que me contactéis más'};
  if (id==='B08' && category==='URGENT') return {messageId:'rosa-m1',text:'salir del piso en dos semanas'};
  if (id==='B08' && category==='BINDING_CLAIM') return {messageId:'rosa-m3',text:'aprobados'};
}
function signalLabels(id:string):Partial<Record<typeof categories[number],boolean>> {
  if (id==='B05') return {TRUST:true};
  if (id==='B08') return {URGENT:true,BINDING_CLAIM:true};
  if (id==='B10') return {OPT_OUT:true,TRUST:true};
  if (/^F01D1-(time_nonurgent|price_question|documentation_request|cost_real)-P[12]-V2$/.test(id)) return {OPT_OUT:false};
  return {};
}
export function evaluateCaptured(zip:string, replayFile:string) {
  verifyArchive(readFileSync(zip));
  const replay = JSON.parse(readFileSync(replayFile,'utf8')) as Replay[];
  if (replay.length !== 24 || new Set(replay.map(r=>r.id)).size !== 24) throw Error('R01 replay inventory invalid');
  const records = readFileSync('datasets/f01/v1/development.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line)) as {id:string;messages:{messageId:string;role:string;content:{type:string;text?:string}}[]}[];
  const scenarios = files.flatMap(file => {
    const report = JSON.parse(execFileSync('unzip',['-p',zip,`f02-24-20261115-multipass/${file}.json`],{encoding:'utf8',maxBuffer:4_000_000})) as {runs:Run[]};
    return report.runs.map(run => {
      const id = run.scenario ?? run.id!;
      const prior = replay.find(r=>r.id===id); if (!prior) throw Error(`Missing R01 replay ${id}`);
      const multi = !!prior.replay;
      const source = records.find(r=>r.id===id)?.messages ?? (id.startsWith('B') || id==='C01' ? fixture(id as Id).messages : []);
      const messages = Object.fromEntries(source.filter(m=>m.role==='customer' && m.content.type==='text').map(m=>[m.messageId, ('text' in m.content ? m.content.text : '') ?? '']));
      const calls = run.calls.filter(c=>c.kind.startsWith('multipass_')).sort((a,b)=>a.index-b.index);
      const claims = calls.filter(c=>/^multipass_E[123]$/.test(c.kind)).flatMap(call => (call.output?.claims ?? []).map((claim,index) => {
        let label = id==='B01' ? b01.find(l=>l.fieldId===claim.fieldId) : undefined;
        const unsupportedLocation = id==='F01D1-time_nonurgent-P2-V2' && claim.fieldId==='desired_locations';
        if (unsupportedLocation) label = {fieldId:'desired_locations',messageId:`${id}-m1`,semanticQuote:'ciudad de referencia',semanticSupport:false};
        const graded = multi ? {status:'not_evaluable' as Status,checks:Object.fromEntries(['fieldId','value','subject','unit','period','precision','incomeBasis','evidence'].map(k=>[k,'not_evaluable' as Status]))} : gradeClaim(claim,label,messages);
        return {stage:call.kind.replace('multipass_',''),callIndex:call.index,claimIndex:index,fieldId:claim.fieldId,actual:claim,expected:label ?? null,...graded,annotation:label ? provenance : null};
      }));
      const expectedClaims = id === 'B01' && !multi ? ['E1','E2','E3'].flatMap(stage => b01.map(label => ({ stage, fieldId:label.fieldId, present:claims.some(c => c.stage===stage && c.fieldId===label.fieldId), annotation:provenance }))) : [];
      const s1 = calls.find(c=>c.kind==='multipass_S1'); const s2 = calls.find(c=>c.kind==='multipass_S2');
      const candidates = [...(s1?.output?.candidates ?? []),...(s2?.output?.candidates ?? [])];
      const signals = categories.flatMap(category => (['S1','S2','public'] as const).map(stage=>{
        const expected = signalLabels(id)[category];
        let observed:boolean|null = null;
        const available = !multi && (stage==='S1' ? s1?.status==='response' : stage==='S2' ? s2?.status==='response' : prior.result?.status==='complete');
        const matching = candidates.filter(c=>c.category===category);
        if (available) {
          if (stage==='S1') observed = (s1?.output?.candidates ?? []).some(c=>c.category===category);
          else if (stage==='public') observed = (prior.result?.blockers ?? []).some(b=>b.type===category);
          else {
            const ids = new Set(matching.map(c=>c.signalId));
            const ambiguous = [...ids].some(signalId=>new Set(candidates.filter(c=>c.signalId===signalId).map(c=>c.category)).size>1);
            const verdicts = (s2?.output?.verdicts ?? []).filter(v=>ids.has(v.signalId));
            observed = ambiguous || (matching.length>0 && (!verdicts.length || verdicts.some(v=>v.status==='uncertain'))) ? null : verdicts.some(v=>v.status==='confirmed');
          }
        }
        const anchor = positiveAnchor(id,category);
        const stageCandidates = stage==='S1' ? (s1?.output?.candidates ?? []).filter(c=>c.category===category) : matching;
        const supported = !anchor || stage==='public' || stageCandidates.some(c=>(c.evidenceRefs??[]).some(ref=>ref.messageId===anchor.messageId && !!ref.quote && !!messages[ref.messageId]?.includes(ref.quote) && ref.quote.includes(anchor.text)));
        if (observed === true && !supported) observed = null;
        return {category,stage,expected:expected??null,observed,semanticEvidence:anchor??null,...gradeSignal(expected,observed,!!available),evidence:matching.flatMap(c=>c.evidenceRefs??[]),annotation:expected===undefined?null:provenance};
      }));
      const isTime = id==='F01D1-time_nonurgent-P2-V2';
      const action = {actual:run.observed.action,status: multi || prior.result?.status!=='complete' ? 'not_evaluable' as Status : isTime && run.observed.action==='STOP_CONTACT' ? 'incorrect' as Status : 'unlabeled' as Status,annotation:isTime?provenance:null};
      return {id,sourceFile:file,expectedClaims,availability:multi?'not_evaluable':prior.result?.status==='complete'?'complete':'unavailable',validation:multi?null:{status:prior.diagnostic?.finalStatus, failureCode:prior.diagnostic?.failureCode, grouping:prior.diagnostic?.groupingCounts,review:prior.diagnostic?.reviewCounts},reconciliation:multi?'not_evaluable':prior.diagnostic?.finalStatus??'not_evaluable',claims,signals,action};
    });
  });
  if (scenarios.length!==24 || new Set(scenarios.map(s=>s.id)).size!==24) throw Error('Captured inventory invalid');
  const counts = (statuses:Status[]) => ({numerator:statuses.filter(s=>s==='correct').length,denominator:statuses.filter(s=>s==='correct'||s==='incorrect').length,unresolved:statuses.filter(s=>s==='unresolved').length,not_evaluable:statuses.filter(s=>s==='not_evaluable').length,unlabeled:statuses.filter(s=>s==='unlabeled').length});
  const attributeNames = ['fieldId','value','subject','unit','period','precision','incomeBasis','evidence'] as const;
  const metrics = {extractionCoverage:{numerator:scenarios.flatMap(s=>s.expectedClaims).filter(c=>c.present).length,denominator:scenarios.flatMap(s=>s.expectedClaims).length},attributes:Object.fromEntries(attributeNames.map(key=>[key,counts(scenarios.flatMap(s=>s.claims.map(c=>c.checks[key])))])), signals:Object.fromEntries(categories.map(category=>[category,Object.fromEntries(['S1','S2','public'].map(stage=>{const items=scenarios.flatMap(s=>s.signals.filter(x=>x.category===category&&x.stage===stage));return [stage,{...counts(items.map(i=>i.status)), classifications:Object.fromEntries(['true_positive','true_negative','false_positive','false_negative','unresolved','not_evaluable','unlabeled'].map(k=>[k,items.filter(i=>i.classification===k).length]))}];}))])),availability:{numerator:scenarios.filter(s=>s.availability==='complete').length,denominator:scenarios.filter(s=>s.availability!=='not_evaluable').length,not_evaluable:scenarios.filter(s=>s.availability==='not_evaluable').length},action:counts(scenarios.map(s=>s.action.status))};
  return {archiveSha256:hash,annotationProvenance:provenance,scenarios,metrics};
}
