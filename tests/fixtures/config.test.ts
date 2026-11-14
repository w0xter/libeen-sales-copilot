import { describe, expect, it } from 'vitest';
import { demoBundle, validateConfig } from '../../src/config';
import { cases, scenarios, expectedFacts } from '../../src/fixtures';

describe('demo configuration and synthetic fixtures', () => {
  it('validates references and rejects unknown fields and milestones', () => {
    expect(validateConfig(demoBundle).ok).toBe(true);
    const field = structuredClone(demoBundle);
    field.workflow.milestones[0].completion = { id: 'bad', op: 'fact_present', fieldId: 'missing' };
    expect(validateConfig(field)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
    const nested = structuredClone(demoBundle);
    nested.workflow.milestones[0].completion = { id: 'not', op: 'NOT', condition: { id: 'bad', op: 'fact_present', fieldId: 'missing' } };
    expect(validateConfig(nested)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
    const basis = structuredClone(demoBundle);
    basis.workflow.milestones[0].completion = { id: 'basis', op: 'fact_income_basis', fieldId: 'buyer_count', basis: 'net' };
    expect(validateConfig(basis)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
    const scope = structuredClone(demoBundle);
    scope.workflow.milestones[0].completion = { id: 'scope', op: 'fact_income_basis', fieldId: 'declared_monthly_income', subjectScope: 'case', basis: 'net' };
    expect(validateConfig(scope)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
    const unprotected = structuredClone(demoBundle);
    unprotected.reviewPolicy.protectedRuleIds = [];
    expect(validateConfig(unprotected)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
    const route = structuredClone(demoBundle);
    route.workflow.milestones[0].allowedSuccessors.push('missing');
    expect(validateConfig(route)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
  });
  it('has unique case/message identifiers and evidence referencing text messages', () => {
    expect(new Set(cases.map(c => c.caseId)).size).toBe(cases.length);
    const messages = [...cases.flatMap(c => c.messages), ...scenarios.flatMap(s => s.additions)];
    expect(new Set(messages.map(m => m.messageId)).size).toBe(messages.length);
    for (const scenario of scenarios) {
      const source = cases.find(c => c.caseId === scenario.caseId)!;
      for (const ref of scenario.evidenceRefs) {
        const message = [...source.messages, ...scenario.additions].find(m => m.messageId === ref.messageId);
        expect(message?.content.type).toBe('text');
      }
    }
  });
  it('preserves financial uncertainty and evidence in the expected facts', () => {
    expect(expectedFacts.laura.find(f => f.fieldId === 'debt_deduction_semantics')?.status).toBe('unknown');
    expect(expectedFacts.rosa.find(f => f.fieldId === 'available_savings')).toMatchObject({ value: 0, status: 'known' });
    expect(expectedFacts.javier.find(f => f.fieldId === 'declared_monthly_income')).toMatchObject({ value: { min: 2000, max: 3000 }, incomeBasis: 'unknown' });
    for (const [caseId, facts] of Object.entries(expectedFacts)) {
      const messages = cases.find(c => c.caseId === caseId)!.messages;
      for (const fact of facts) for (const ref of fact.evidenceRefs) expect(messages.find(m => m.messageId === ref.messageId)?.content.type).toBe('text');
    }
  });
  it('keeps R10 independent of financial M3 and does not infer product interest', () => {
    expect(demoBundle.businessPolicy.advisoryCall.requireSpecificMoveMonthBeforeCall).toBe(false);
    const off = scenarios.find(s => s.id === 'laura-r10-off')!;
    const on = scenarios.find(s => s.id === 'laura-r10-on')!;
    expect(off.expected.m3).toBe(on.expected.m3);
    expect(off.expected.action).not.toBe(on.expected.action);
    expect(scenarios.find(s => s.id === 'laura-initial')?.expected.productInterest).toBe('unknown');
  });
});

describe('terminal handoff route', () => {
  it('allows an explicit handoff route only on a terminal milestone', () => {
    const m5 = demoBundle.workflow.milestones.find(m => m.id === 'M5')!;
    expect(m5.alternativeTerminalConfirmations).toEqual(['HUMAN_HANDOFF_CONFIRMED']);
    const invalid = structuredClone(demoBundle);
    invalid.workflow.milestones[0].alternativeTerminalConfirmations = ['HUMAN_HANDOFF_CONFIRMED'];
    expect(validateConfig(invalid)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
  });
});

describe('policy option guards', () => {
  it('validates references nested in option guards', () => {
    const valid = structuredClone(demoBundle);
    valid.workflow.milestones[0].completion = { id: 'option', op: 'when_option_enabled', option: 'requireLocation', condition: { id: 'location', op: 'fact_present', fieldId: 'desired_locations' } };
    expect(validateConfig(valid).ok).toBe(true);
    const invalid = structuredClone(demoBundle);
    invalid.workflow.milestones[0].completion = { id: 'option', op: 'when_option_enabled', option: 'requireLocation', condition: { id: 'bad', op: 'fact_present', fieldId: 'missing' } };
    expect(validateConfig(invalid)).toMatchObject({ ok: false, error: { code: 'INVALID_CONFIGURATION' } });
  });
});
