/** Independent scripted model responses, based on existing synthetic utterances, not the scoring oracle. */
import type { Message, FactAssertion } from '../../src/contracts';

type Spec = { fieldId: string; messageId: string; focus: string; value: string | number | string[] | { min: number; max: number }; scope: 'case'|'buying_unit'|'participant'; attribution: string; unit?: string; period?: string; incomeBasis?: 'net'|'gross'|'unknown'; precision?: 'explicit'|'approximate' };
const scripts: Record<string, Spec[]> = {
  laura: [
    { fieldId:'desired_locations', messageId:'laura-m1', focus:'Valencia', value:['Valencia'], scope:'case', attribution:'buscamos piso en Valencia' },
    { fieldId:'declared_monthly_income', messageId:'laura-m3', focus:'3.800 €', value:3800, scope:'buying_unit', attribution:'entre los dos', unit:'EUR', period:'month', incomeBasis:'net', precision:'approximate' },
    { fieldId:'available_savings', messageId:'laura-m3', focus:'18.000', value:18000, scope:'buying_unit', attribution:'Ahorrado tenemos', unit:'EUR', precision:'approximate' },
    { fieldId:'monthly_debt', messageId:'laura-m4', focus:'250 €', value:250, scope:'buying_unit', attribution:'pagamos un préstamo del coche', unit:'EUR', period:'month' },
  ],
  javier: [
    { fieldId:'buyer_count', messageId:'javier-m3', focus:'solo', value:1, scope:'buying_unit', attribution:'solo' },
    { fieldId:'employment_context', messageId:'javier-m3', focus:'autonomo', value:'autónomo', scope:'participant', attribution:'soy autonomo' },
    { fieldId:'declared_monthly_income', messageId:'javier-m3', focus:'entre 2000 y 3000', value:{min:2000,max:3000}, scope:'participant', attribution:'soy autonomo, depende del mes', unit:'EUR', period:'month', incomeBasis:'unknown', precision:'approximate' },
  ],
  rosa: [
    { fieldId:'declared_monthly_income', messageId:'rosa-m1', focus:'1.400 €', value:1400, scope:'buying_unit', attribution:'Entre los dos', unit:'EUR', incomeBasis:'unknown' },
    { fieldId:'available_savings', messageId:'rosa-m1', focus:'Ahorros no tenemos', value:0, scope:'buying_unit', attribution:'Ahorros no tenemos', unit:'EUR' },
    { fieldId:'moving_horizon', messageId:'rosa-m1', focus:'dos semanas', value:'dos semanas', scope:'case', attribution:'necesitamos salir del piso en dos semanas' },
  ],
};
const textOf = (messages: Message[], id: string) => { const m = messages.find(m => m.messageId === id); if (!m || m.content.type !== 'text') throw Error('Missing scripted source'); return m.content.text; };
export function scripted(name: string, messages: Message[], history: FactAssertion[] = []) {
  const correction = messages.some(m => m.messageId === 'laura-gross-correction-addition');
  const specs = scripts[name];
  const claims = specs.map(s => {
    const text = textOf(messages, s.messageId), start = text.indexOf(s.focus);
    if (start < 0) throw Error('Missing scripted span');
    return { fieldId:s.fieldId, subjectRef:{ scope:s.scope, id:s.scope === 'case' ? name : s.scope === 'participant' ? 'speaker' : 'unit' }, value:s.value, precision:s.precision ?? 'explicit', ...(s.unit ? {unit:s.unit} : {}), ...(s.period ? {period:s.period} : {}), ...(s.incomeBasis ? {incomeBasis:s.incomeBasis} : {}), occurrence:{messageId:s.messageId, statementSpan:{start:0,end:text.length,text},focusSpan:{start,end:start+s.focus.length,text:s.focus}}, evidenceRefs:[{messageId:s.messageId,quote:text}] };
  });
  const signals = name === 'javier' ? [{signalId:'trust',category:'TRUST',evidenceRefs:[{messageId:'javier-m5',quote:textOf(messages,'javier-m5')}]}] : name === 'rosa' ? [{signalId:'urgent',category:'URGENT',evidenceRefs:[{messageId:'rosa-m1',quote:'necesitamos salir del piso en dos semanas'}]},{signalId:'binding',category:'BINDING_CLAIM',evidenceRefs:[{messageId:'rosa-m3',quote:textOf(messages,'rosa-m3')}]}] : [];
  if (messages.some(m => m.messageId === 'javier-opt-out-addition')) signals.push({signalId:'opt',category:'OPT_OUT',evidenceRefs:[{messageId:'javier-opt-out-addition',quote:textOf(messages,'javier-opt-out-addition')}]});
  const singleAssertions = claims.map(c => ({fieldId:c.fieldId,scope:c.subjectRef.scope,subjectId:c.subjectRef.id,value:c.value,unit:'unit' in c ? c.unit : null,period:'period' in c ? c.period : null,incomeBasis:'incomeBasis' in c ? c.incomeBasis : null,precision:c.precision,messageId:c.occurrence.messageId,quote:c.evidenceRefs[0].quote}));
  if (correction) {
    const prior = history.find(a => a.fieldId === 'declared_monthly_income');
    if (!prior) throw Error('Correction requires prior income assertion');
    const messageId = 'laura-gross-correction-addition', text = textOf(messages,messageId), start = text.indexOf('brutos');
    singleAssertions.push({fieldId:'declared_monthly_income',scope:'buying_unit',subjectId:prior.subjectRef.id,value:null as never,unit:null,period:null,incomeBasis:'gross',precision:'ambiguous' as never,messageId,quote:text});
    // Focused correction is sent without inventing a new amount.
    const c = {fieldId:'declared_monthly_income',subjectRef:prior.subjectRef,incomeBasis:'gross',precision:'ambiguous',correction:{dimension:'incomeBasis',previousAssertionId:prior.assertionId},occurrence:{messageId,statementSpan:{start:0,end:text.length,text},focusSpan:{start,end:start+6,text:'brutos'},previousAssertionId:prior.assertionId},evidenceRefs:[{messageId,quote:text}]};
    return { specs, claims:[c], singleAssertions, signals, correction:true };
  }
  return { specs, claims, singleAssertions, signals, correction:false };
}
export function singleResponse(kind: string | undefined, data: ReturnType<typeof scripted>) {
  if (kind === 'verification') return { findings:[...data.signals.map(s => ({type:s.category,messageId:s.evidenceRefs[0].messageId,quote:s.evidenceRefs[0].quote})), ...data.specs.filter(s=>s.fieldId==='desired_locations').map(s=>({type:'DESIRED_LOCATION',messageId:s.messageId,quote:'buscamos piso en Valencia'}))], dismissals:[], inconclusive:false };
  return {assertions:data.singleAssertions,blockers:[],warnings:[]};
}
export function multiResponse(role: string, input: unknown, data: ReturnType<typeof scripted>) {
  if (role === 'S1') return {status:'complete',candidates:data.signals};
  if (role === 'S2') {
    const req = input as {groups: {groupId:string;fieldId:string;candidates:{candidateId:string;subjectRef:{scope:string};occurrence:{messageId:string;focusSpan:unknown};evidenceRefs:{messageId:string;quote:string}[]}[]}[]};
    return {status:'complete',verdicts:data.signals.map(s=>({signalId:s.signalId,status:'confirmed',justification:'scripted review',evidenceRefs:s.evidenceRefs})),reviews:req.groups.flatMap(g=>g.candidates.map(c=>{
      const spec = data.specs.find(s=>s.fieldId===g.fieldId && s.messageId===c.occurrence.messageId);
      const quote = spec?.attribution ?? c.evidenceRefs[0].quote;
      return {groupId:g.groupId,candidateId:c.candidateId,atomicity:'atomic',support:'supported',justification:'scripted review',evidenceRefs:c.evidenceRefs,identitySpan:c.occurrence.focusSpan,subjectAttribution:{kind:c.subjectRef.scope==='case'?'case':c.subjectRef.scope==='participant'?'local_speaker':'buying_unit',messageId:c.occurrence.messageId,evidenceRefs:[{messageId:c.occurrence.messageId,quote}],justification:'scripted attribution'}};
    }))};
  }
  if (role === 'J') { const req = input as {dispute:{disputeId:string}}; return {disputeId:req.dispute.disputeId,resolution:{status:'unresolved',justification:'scripted uncertainty'}}; }
  return {claims:data.claims};
}
