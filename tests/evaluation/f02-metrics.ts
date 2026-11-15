type Evidence = string | { messageId:string; quote?:string; start?:number; end?:number };
type Fact = { fieldId:string; value?:unknown; scope?:string; unit?:string; period?:string; incomeBasis?:string; precision?:string; messageId?:string; evidence?:Evidence[] };
type Oracle = { facts:Fact[]; protected:string[]; forbidden:string[]; factsEvaluable?:boolean };
type Observed = { status:string; facts:Fact[]; signals:string[]; messages?:{messageId:string;role:string;text?:string}[] };
const counter = () => ({numerator:0,denominator:0,notEvaluable:0});
const evidenceId = (e:Evidence) => typeof e === 'string' ? e : e.messageId;
export function score(oracle:Oracle, observed:Observed) {
  const metrics = {value:counter(),scope:counter(),unit:counter(),period:counter(),incomeBasis:counter(),precision:counter(),evidence:counter(),protectedRecall:counter(),coverage:counter(),expected:counter(),additional:counter(),invalidEvidence:counter(),falseSignals:Object.fromEntries(oracle.forbidden.map(s=>[s,counter()]))};
  const evaluable = !['error','incomplete','human_review'].includes(observed.status);
  metrics.coverage.denominator=1; metrics.coverage.numerator=observed.status==='complete'?1:0;
  if (oracle.factsEvaluable === false) for (const key of ['expected','value','scope','unit','period','incomeBasis','precision','evidence'] as const) metrics[key].notEvaluable++;
  const used = new Set<number>();
  for (const expected of oracle.facts) {
    if (!evaluable) { metrics.expected.notEvaluable++; for (const key of ['value','scope','unit','period','incomeBasis','precision'] as const) if (expected[key] !== undefined) metrics[key].notEvaluable++; if(expected.messageId) metrics.evidence.notEvaluable++; continue; }
    const candidates = observed.facts.map((f,i)=>({f,i})).filter(x=>!used.has(x.i)&&x.f.fieldId===expected.fieldId);
    candidates.sort((a,b) => Number(b.f.evidence?.some(e=>evidenceId(e)===expected.messageId)) - Number(a.f.evidence?.some(e=>evidenceId(e)===expected.messageId)) || Number(b.f.scope===expected.scope)-Number(a.f.scope===expected.scope));
    const selected = candidates[0]; if (selected) used.add(selected.i);
    const actual = selected?.f;
    metrics.expected.denominator++; if (actual) metrics.expected.numerator++;
    for (const key of ['value','scope','unit','period','incomeBasis','precision'] as const) {
      if (expected[key] === undefined) continue;
      if (!actual) { metrics[key].notEvaluable++; continue; }
      metrics[key].denominator++;
      if (JSON.stringify(actual[key])===JSON.stringify(expected[key])) metrics[key].numerator++;
    }
    if (expected.messageId) { if (!actual) metrics.evidence.notEvaluable++; else { metrics.evidence.denominator++; if (actual.evidence?.some(e=>evidenceId(e)===expected.messageId && validEvidence(e,observed.messages))) metrics.evidence.numerator++; } }
  }
  if (evaluable && oracle.factsEvaluable !== false) {
    metrics.additional.denominator=observed.facts.length; metrics.additional.numerator=observed.facts.length-used.size;
    for (const fact of observed.facts) { if (!fact.evidence?.length) { metrics.invalidEvidence.denominator++; metrics.invalidEvidence.numerator++; } else for (const ref of fact.evidence) { metrics.invalidEvidence.denominator++; if (!validEvidence(ref,observed.messages)) metrics.invalidEvidence.numerator++; } }
  } else { metrics.additional.notEvaluable++; metrics.invalidEvidence.notEvaluable++; }
  for (const signal of oracle.protected) { if(!evaluable) metrics.protectedRecall.notEvaluable++; else {metrics.protectedRecall.denominator++; if(observed.signals.includes(signal)) metrics.protectedRecall.numerator++;} }
  for (const signal of oracle.forbidden) { const m=metrics.falseSignals[signal]; if(!evaluable) m.notEvaluable++; else {m.denominator++; if(observed.signals.includes(signal)) m.numerator++;} }
  return metrics;
}
function validEvidence(ref:Evidence,messages:Observed['messages']) {
  if (!messages) return true;
  if (typeof ref === 'string') return false;
  const m=messages.find(m=>m.messageId===ref.messageId);
  if (!m || m.role!=='customer' || !m.text || !ref.quote) return false;
  const start=ref.start ?? m.text.indexOf(ref.quote), end=ref.end ?? start+ref.quote.length;
  return start>=0 && end>start && m.text.slice(start,end)===ref.quote;
}

/** Negative deltas indicate fewer matches; denominators must refer to the same annotated checks. */
export function compareMetrics(single:ReturnType<typeof score>, multi:ReturnType<typeof score>) {
  const keys=['value','scope','unit','period','incomeBasis','precision','evidence','protectedRecall','expected'] as const;
  return Object.fromEntries(keys.map(key=>{
    const a=single[key], b=multi[key];
    const comparable=a.denominator>0 && a.denominator===b.denominator && a.notEvaluable===0 && b.notEvaluable===0;
    return [key,{delta:comparable?b.numerator-a.numerator:null,comparable}];
  })) as Record<typeof keys[number],{delta:number|null;comparable:boolean}>;
}
