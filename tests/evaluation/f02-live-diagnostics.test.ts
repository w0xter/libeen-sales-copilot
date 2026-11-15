import { expect, it } from 'vitest';
import { demoBundle } from '../../src/config';
import { MultipassInterpreter } from '../../src/adapters/ai/multipass/interpreter';
import { fixture, seed } from './f02-fixtures';
import { multiResponse, scripted } from './f02-scripts';

it.each(['repair', 'context'] as const)('captures a safe diagnostic for a five-attempt %s failure', async mode => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    if (mode === 'repair' && (request.role === 'E1' || request.role === 'Repair')) return { secret: 'customer-and-model-output-secret' };
    if (mode === 'context' && request.role === 'S2') return { status: 'complete', reviews: [], verdicts: [] };
    return multiResponse(request.role, request.input, scripted(name, messages));
  } }, diagnostic => captured.push(diagnostic));
  const result = await interpreter.interpret(input);
  expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
  expect(captured).toHaveLength(1);
  expect(captured[0]).toMatchObject({ finalStatus: 'failed', failureCode: mode === 'repair' ? 'initial_pass_failed' : 'incomplete_contextual_review', consumed: 5 });
  const trace = captured[0] as { operations: { role: string; status: string; durationMs: number }[] };
  expect(trace.operations.map(operation => operation.role)).toEqual(['E1', 'E2', 'E3', 'S1', mode === 'repair' ? 'Repair' : 'S2']);
  expect(JSON.stringify(captured)).not.toContain('customer-and-model-output-secret');
  expect(JSON.stringify(captured)).not.toContain('3.800');
});

it('does not change interpretation if the diagnostic observer fails', async () => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const interpreter = new MultipassInterpreter({ execute: async request => multiResponse(request.role, request.input, scripted(name, messages)) }, () => { throw new Error('observer failed'); });
  expect((await interpreter.interpret(input)).ok).toBe(true);
});

it.each([
  ['missing', { expected: 12, actual: 11, missing: 1, duplicates: 0, foreign: 0 }],
  ['duplicate', { expected: 12, actual: 13, missing: 0, duplicates: 1, foreign: 0 }],
  ['foreign', { expected: 12, actual: 12, missing: 1, duplicates: 0, foreign: 1 }],
] as const)('counts %s contextual reviews without recording their contents', async (mode, counts) => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (request.role !== 'S2') return output;
    const review = output as { reviews: { groupId: string; candidateId: string }[] };
    if (mode === 'missing') review.reviews.pop();
    if (mode === 'duplicate') review.reviews.push(review.reviews[0]);
    if (mode === 'foreign') review.reviews[0].candidateId = 'secret-foreign-id';
    return review;
  } }, diagnostic => captured.push(diagnostic));
  const result = await interpreter.interpret(input);
  expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
  expect(captured[0]).toMatchObject({ failureCode: 'incomplete_contextual_review', reviewCounts: counts });
  expect(JSON.stringify(captured)).not.toContain('secret-foreign-id');
  expect(JSON.stringify(captured)).not.toContain('3.800');
});

it.each(['empty', 'rejected', 'accepted'] as const)('counts %s extraction and grouping without retaining candidate content', async mode => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (!['E1', 'E2', 'E3'].includes(request.role)) return output;
    const extraction = output as { claims: { occurrence: { statementSpan: { text: string } } }[] };
    if (mode === 'empty') extraction.claims = [];
    if (mode === 'rejected') extraction.claims.forEach(claim => { claim.occurrence.statementSpan.text = 'private-invalid-evidence'; });
    return extraction;
  } }, diagnostic => captured.push(diagnostic));
  await interpreter.interpret(input);
  const extractionCounts = mode === 'empty' ? { E1: 0, E2: 0, E3: 0 } : { E1: 4, E2: 4, E3: 4 };
  expect(captured[0]).toMatchObject({ groupingCounts: {
    extraction: extractionCounts,
    candidates: mode === 'empty' ? 0 : 12,
    groups: mode === 'accepted' ? 4 : 0,
    groupedCandidates: mode === 'accepted' ? 12 : 0,
    rejected: mode === 'rejected' ? 12 : 0,
    rejectionReasons: mode === 'rejected' ? { invalid_candidate: 12 } : {},
  } });
  expect(JSON.stringify(captured)).not.toContain('private-invalid-evidence');
  expect(JSON.stringify(captured)).not.toContain('3.800');
});

it('distinguishes absent statement quotes from unknown fields without exposing content', async () => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (!['E1', 'E2', 'E3'].includes(request.role)) return output;
    const extraction = output as { claims: { fieldId: string; occurrence: { statementSpan: { text: string } } }[] };
    extraction.claims[0].fieldId = 'private-unknown-field';
    extraction.claims.slice(1).forEach(claim => { claim.occurrence.statementSpan.text = 'private-absent-quote'; });
    return extraction;
  } }, diagnostic => captured.push(diagnostic));
  await interpreter.interpret(input);
  expect(captured[0]).toMatchObject({ groupingCounts: { rejectionReasons: { invalid_candidate: 12 }, invalidCandidateReasons: { unknown_field: 3, statement_span_mismatch: 9 } } });
  expect(captured[0]).toMatchObject({ groupingCounts: { spanMismatchKinds: { text_absent: 9 } } });
  expect(JSON.stringify(captured)).not.toContain('private-unknown-field');
  expect(JSON.stringify(captured)).not.toContain('3.800');
});

it('consolidates uniquely located literal claims even when extractor offsets are wrong', async () => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (!['E1', 'E2', 'E3'].includes(request.role)) return output;
    const extraction = output as { claims: { occurrence: { statementSpan: { end: number }; focusSpan: { end: number } } }[] };
    extraction.claims.forEach(claim => { claim.occurrence.statementSpan.end--; claim.occurrence.focusSpan.end--; });
    return extraction;
  } });
  expect((await interpreter.interpret(input)).ok).toBe(true);
});

it('repairs unique evidence offsets but still rejects one-review-per-group omissions', async () => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (request.role === 'E1') {
      const extraction = output as { claims: { evidenceRefs: { start?: number; end?: number }[] }[] };
      extraction.claims.forEach(claim => { claim.evidenceRefs[0].start = 0; claim.evidenceRefs[0].end = 1; });
    }
    if (request.role === 'S2') {
      const review = output as { reviews: { groupId: string }[] };
      const seen = new Set<string>();
      review.reviews = review.reviews.filter(r => !seen.has(r.groupId) && !!seen.add(r.groupId));
    }
    return output;
  } }, diagnostic => captured.push(diagnostic));
  await interpreter.interpret(input);
  expect(captured[0]).toMatchObject({ groupingCounts: { rejected: 0, evidenceFailures: {} }, reviewCounts: { expected: 12, actual: 4, missing: 8, groupsExpected: 4, groupsReviewed: 4, groupsReviewedOnce: 4 } });
  expect(JSON.stringify(captured)).not.toContain('3.800');
});

it('records configured field and allowed scopes for rejected invalid-scope candidates', async () => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (request.role === 'E1') {
      const extraction = output as { claims: { fieldId: string; subjectRef: { scope: string } }[] };
      extraction.claims.find(claim => claim.fieldId === 'desired_locations')!.subjectRef.scope = 'participant';
    }
    return output;
  } }, diagnostic => captured.push(diagnostic));
  await interpreter.interpret(input);
  expect(captured[0]).toMatchObject({ groupingCounts: { invalidScopes: [{ fieldId: 'desired_locations', receivedScope: 'participant', allowedScopes: ['case'], count: 1 }] } });
});

it('reports the category of a grouping-related human review without embedding source text', async () => {
  const { name, messages } = fixture('C01');
  const input = { caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (request.role === 'E1') {
      const extraction = output as { claims: { occurrence: { statementSpan: { text: string } } }[] };
      extraction.claims[0].occurrence.statementSpan.text = 'not-a-real-quote';
    }
    return output;
  } }, diagnostic => captured.push(diagnostic));
  await interpreter.interpret(input);
  expect(captured[0]).toMatchObject({ finalStatus: 'human_review_required', reviewReasonCategories: expect.arrayContaining(['grouping']) });
  expect(JSON.stringify(captured)).not.toContain('not-a-real-quote');
});

it.each(['identical', 'contradictory'] as const)('rejects %s duplicate reviews with content-free diagnostics', async kind => {
  const { name, messages } = fixture('C01');
  const captured: unknown[] = [];
  const interpreter = new MultipassInterpreter({ execute: async request => {
    const output = multiResponse(request.role, request.input, scripted(name, messages));
    if (request.role !== 'S2') return output;
    const value = output as { reviews: { support: string }[] };
    value.reviews.push(kind === 'identical' ? structuredClone(value.reviews[0]) : { ...value.reviews[0], support: 'refuted' });
    return value;
  } }, value => captured.push(value));
  const result = await interpreter.interpret({ caseSnapshot: seed(name, messages), messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
  expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
  expect(captured[0]).toMatchObject({ failureCode: 'incomplete_contextual_review', reviewCounts: { duplicates: 1, identicalDuplicates: kind === 'identical' ? 1 : 0, conflictingDuplicates: kind === 'contradictory' ? 1 : 0 } });
  expect(JSON.stringify(captured)).not.toContain('3.800');
});
