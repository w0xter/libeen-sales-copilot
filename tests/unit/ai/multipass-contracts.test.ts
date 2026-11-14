import { describe, expect, it } from 'vitest';
import { SpanSchema, RawClaimSchema } from '../../../src/adapters/ai/multipass/contracts';
import { normalizeOptionalMetadata } from '../../../src/adapters/ai/multipass/normalization';

describe('multipass contracts', () => {
  it('rejects invalid spans and preserves optional metadata distinctions', () => {
    expect(SpanSchema.safeParse({ start: 2, end: 2, text: '' }).success).toBe(false);
    expect(normalizeOptionalMetadata('null')).toBeNull();
    expect(normalizeOptionalMetadata(null)).toBeNull();
    expect(normalizeOptionalMetadata('unknown')).toBe('unknown');
    expect(normalizeOptionalMetadata(0)).toBe(0);
  });
  it('rejects model-supplied identifiers', () => {
    expect(RawClaimSchema.safeParse({ candidateId: 'forged' }).success).toBe(false);
  });
});

import { createCandidate } from '../../../src/adapters/ai/multipass/normalization';
import { validateCandidate } from '../../../src/adapters/ai/multipass/evidence';
import type { FactSchema, Message } from '../../../src/contracts';
const schema: FactSchema = { id: 's', version: '1', fields: [{ id: 'savings', label: 'Savings', description: '', type: 'money', scopes: ['participant'], cardinality: 'one', units: ['EUR'], enumOptions: [], sensitivity: 'sensitive', schemaVersion: '1', structuralValidation: { min: 0 } }] };
const messages: Message[] = [{ messageId: 'm', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text: 'ahorro 0' } }];
const raw = { fieldId: 'savings', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 0, unit: 'EUR', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: 8, text: 'ahorro 0' }, focusSpan: { start: 7, end: 8, text: '0' } }, evidenceRefs: [{ messageId: 'm', quote: '0', start: 7, end: 8 }] };
it('validates fields, units, subject, values and evidence against the supplied schema', () => {
  const candidate = createCandidate(raw, 'e1');
  expect(validateCandidate(candidate, schema, messages)).toBe(true);
  expect(validateCandidate({ ...candidate, unit: 'USD' }, schema, messages)).toBe(false);
  expect(validateCandidate({ ...candidate, value: -1 }, schema, messages)).toBe(false);
  expect(validateCandidate({ ...candidate, evidenceRefs: [{ messageId: 'm', quote: '1', start: 7, end: 8 }] }, schema, messages)).toBe(false);
  expect(() => createCandidate({ ...raw, candidateId: 'forged' }, 'e1')).toThrow();
});
