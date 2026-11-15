import { execFileSync } from 'node:child_process';
import { evaluateCaptured, gradeSignal } from './f02-r02-semantic';
import corpus from './f02-r07a-annotations.v1.json';

export function evaluateR07a(zip:string, replay:string) {
  const baseline = evaluateCaptured(zip, replay);
  const reports = new Map<string, {runs:{id?:string;scenario?:string;calls:{index:number;kind:string;output?:{candidates?:{signalId:string;category:string}[];verdicts?:{signalId:string;status:string}[]}}[]}[]}>();
  const records = corpus.annotations.map(annotation => {
    const captured = baseline.scenarios.find(s => s.id === annotation.id);
    let trace = null;
    if (captured) {
      if (!reports.has(captured.sourceFile)) reports.set(captured.sourceFile, JSON.parse(execFileSync('unzip',['-p',zip,`f02-24-20261115-multipass/${captured.sourceFile}.json`],{encoding:'utf8'})));
      const run = reports.get(captured.sourceFile)!.runs.find(r => (r.scenario ?? r.id) === annotation.id)!;
      const s1 = run.calls.find(c => c.kind === 'multipass_S1');
      const s2 = run.calls.find(c => c.kind === 'multipass_S2');
      const proposals = (s1?.output?.candidates ?? []).filter(c => c.category === annotation.category);
      const additional = (s2?.output?.candidates ?? []).filter(c => c.category === annotation.category);
      const ids = new Set([...proposals,...additional].map(c => c.signalId));
      trace = {s1CallIndex:s1?.index ?? null,s1Proposals:proposals,s2CallIndex:s2?.index ?? null,s2AdditionalCandidates:additional,s2Verdicts:(s2?.output?.verdicts ?? []).filter(v => ids.has(v.signalId)),sharedIds:[...ids].filter(id => new Set([...(s1?.output?.candidates ?? []),...(s2?.output?.candidates ?? [])].filter(c => c.signalId === id).map(c => c.category)).size > 1)};
    }
    const stages = Object.fromEntries(['S1','S2','public'].map(stage => {
      const signal = captured?.signals.find(s => s.category === annotation.category && s.stage === stage);
      const available = signal !== undefined && signal.classification !== 'not_evaluable';
      const classification = !available ? 'not_evaluable' : annotation.expected === null ? 'unresolved' : gradeSignal(annotation.expected, signal.observed, true).classification;
      return [stage, {observed:signal?.observed ?? null, classification, combinedS1S2CandidateEvidence:signal?.evidence ?? []}];
    }));
    return {annotation, trace, stages};
  });
  const classifications = ['true_positive','true_negative','false_positive','false_negative','unresolved','unlabeled','not_evaluable'];
  const metrics = Object.fromEntries(['OPT_OUT','BINDING_CLAIM','TRUST','URGENT'].map(category => [category, Object.fromEntries(['S1','S2','public'].map(stage => {
    const items = records.filter(r => r.annotation.category === category);
    const counts = Object.fromEntries(classifications.map(c => [c,items.filter(r => r.stages[stage].classification === c).length]));
    return [stage,{total:items.length,evaluable:counts.true_positive+counts.true_negative+counts.false_positive+counts.false_negative,counts}];
  }))]));
  return {version:'1.0.0',archiveSha256:baseline.archiveSha256,provenance:corpus.provenance,method:'R02 observations; labels R07a; synthetic additions have no model calls and are not_evaluable',records,metrics};
}
