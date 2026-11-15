import { describe, expect, it } from 'vitest';
import { simulate } from './f02-simulation';

type Output = { assertions:{fieldId:string;value:unknown;scope:string;messageId:string;quote:string}[]; findings:{type:string;messageId:string;quote:string}[] };
const run = (id:'B01'|'B05', mutation:(role:string,value:unknown)=>unknown, strategy:'single'|'multipass'='single') => simulate({ids:[id],repeat:1,model:'mock',maxRequests:20,strategies:[strategy],mutate:mutation});
const mutateAssertion = (change:(a:Output['assertions'][number])=>void) => (role:string,value:unknown) => {
  if(role!=='interpretation') return value;
  const out=structuredClone(value) as Output;
  change(out.assertions.find(a=>a.fieldId==='declared_monthly_income')!);
  return out;
};
const detected = (row:NonNullable<Awaited<ReturnType<typeof run>>['pairs'][number]['single']>, metric:'value'|'scope'|'evidence') => row.status !== 'complete' || row.metrics[metric].numerator < row.metrics[metric].denominator;
describe('scripted response mutations',()=>{
  it('detects a wrong financial amount',async()=>{const r=await run('B01',mutateAssertion(a=>{a.value=3000;}));expect(detected(r.pairs[0].single!,'value')).toBe(true);});
  it('detects a wrong joint scope',async()=>{const r=await run('B01',mutateAssertion(a=>{a.scope='participant';}));expect(detected(r.pairs[0].single!,'scope')).toBe(true);});
  it('detects individual income assigned to the buying unit',async()=>{const r=await run('B05',mutateAssertion(a=>{a.scope='buying_unit';}));expect(detected(r.pairs[0].single!,'scope')).toBe(true);});
  it('rejects fabricated textual evidence',async()=>{const r=await run('B01',mutateAssertion(a=>{a.quote='invented';}));expect(detected(r.pairs[0].single!,'evidence')).toBe(true);});
  it('reports an additional assertion',async()=>{
    const r=await run('B01',(role,value)=>{if(role!=='interpretation')return value;const out=structuredClone(value) as Output;out.assertions.push({fieldId:'buyer_count',scope:'buying_unit',value:2,unit:null,period:null,incomeBasis:null,precision:'explicit',messageId:'laura-m1',quote:'mi pareja y yo'} as never);return out;});
    const row=r.pairs[0].single!;expect(row.status!=='complete'||row.metrics.additional.numerator>0).toBe(true);
  });
  it('reports an omitted protected signal',async()=>{
    const r=await run('B05',(role,value)=>{if(role!=='verification')return value;const out=structuredClone(value) as Output;out.findings=[];return out;});
    expect(r.pairs[0].single!.metrics.protectedRecall).toMatchObject({numerator:0,denominator:1});
  });
  it('reports a false opt-out',async()=>{
    const r=await run('B01',(role,value)=>{if(role!=='verification')return value;const out=structuredClone(value) as Output;out.findings.push({type:'OPT_OUT',messageId:'laura-m3',quote:'Unos 3.800 € netos entre los dos.'});return out;});
    expect(r.pairs[0].single!.metrics.falseSignals.OPT_OUT.numerator).toBe(1);
  });
  it('routes incorrect S2 subject attribution to safe review',async()=>{
    const r=await run('B05',(role,value)=>{if(role!=='S2')return value;const out=structuredClone(value) as {reviews:{subjectAttribution:{kind:string}}[]};out.reviews.forEach(v=>{v.subjectAttribution.kind='ambiguous';});return out;},'multipass');
    expect(r.pairs[0].multipass!.status).not.toBe('complete');
  });
});
