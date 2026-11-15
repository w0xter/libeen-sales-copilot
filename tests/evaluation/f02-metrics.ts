type Fact = { fieldId: string; value?: unknown; scope?: string; unit?: string; period?: string; incomeBasis?: string; precision?: string; messageId?: string; evidence?: string[] };
type Oracle = { facts: Fact[]; protected: string[]; forbidden: string[] };
type Observed = { status: string; facts: Fact[]; signals: string[] };
const counter = () => ({ numerator: 0, denominator: 0, notEvaluable: 0 });
export function score(oracle: Oracle, observed: Observed) {
  const metrics = { value: counter(), scope: counter(), unit: counter(), period: counter(), incomeBasis: counter(), precision: counter(), evidence: counter(), protectedRecall: counter(), coverage: counter(), falseSignals: Object.fromEntries(oracle.forbidden.map(s => [s, counter()])) };
  const evaluable = observed.status !== 'error' && observed.status !== 'incomplete';
  metrics.coverage.denominator = 1;
  metrics.coverage.numerator = observed.status === 'complete' ? 1 : 0;
  for (const expected of oracle.facts) {
    const actual = observed.facts.find(f => f.fieldId === expected.fieldId);
    for (const dimension of ['value','scope','unit','period','incomeBasis','precision'] as const) {
      if (expected[dimension] === undefined) continue;
      const metric = metrics[dimension];
      if (!evaluable) { metric.notEvaluable++; continue; }
      metric.denominator++;
      if (actual && JSON.stringify(actual[dimension]) === JSON.stringify(expected[dimension])) metric.numerator++;
    }
    if (expected.messageId) {
      if (!evaluable) metrics.evidence.notEvaluable++;
      else { metrics.evidence.denominator++; if (actual?.evidence?.includes(expected.messageId)) metrics.evidence.numerator++; }
    }
  }
  for (const signal of oracle.protected) {
    if (!evaluable) metrics.protectedRecall.notEvaluable++;
    else { metrics.protectedRecall.denominator++; if (observed.signals.includes(signal)) metrics.protectedRecall.numerator++; }
  }
  for (const signal of oracle.forbidden) {
    const metric = metrics.falseSignals[signal];
    if (!evaluable) metric.notEvaluable++;
    else { metric.denominator++; if (observed.signals.includes(signal)) metric.numerator++; }
  }
  return metrics;
}
