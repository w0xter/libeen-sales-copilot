import { z } from 'zod';
import { RawClaimSchema, ContextReviewSchema, AdjudicationResponseSchema } from './contracts';
import { SafetyCandidateSchema, SafetyVerdictSchema } from './safety';
import type { Role } from './trace';

// Wire schemas have no optional properties: Structured Outputs requires every
// object property to be required. Nullable fields are removed explicitly below.
const span = z.strictObject({ start: z.number(), end: z.number(), text: z.string() });
const evidence = z.strictObject({ messageId: z.string(), quote: z.string().nullable(), start: z.number().nullable(), end: z.number().nullable() });
const subject = z.strictObject({ scope: z.enum(['case', 'participant', 'buying_unit']), id: z.string() });
const value = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.strictObject({ min: z.number(), max: z.number() })]);
const claim = z.strictObject({ fieldId: z.string(), subjectRef: subject, value: value.nullable(), unit: z.string().nullable(), period: z.string().nullable(), incomeBasis: z.enum(['net', 'gross', 'unknown']).nullable(), precision: z.enum(['explicit', 'approximate', 'ambiguous', 'inferred']), occurrence: z.strictObject({ messageId: z.string(), statementSpan: span, focusSpan: span.nullable(), previousAssertionId: z.string().nullable() }), evidenceRefs: z.array(evidence), correction: z.strictObject({ dimension: z.enum(['value', 'incomeBasis', 'period', 'unit', 'subjectRef']), previousAssertionId: z.string() }).nullable() });
const signal = z.strictObject({ signalId: z.string(), category: z.enum(['OPT_OUT', 'URGENT', 'BINDING_CLAIM', 'TRUST', 'PRIVACY']), evidenceRefs: z.array(evidence) });
const verdict = z.strictObject({ signalId: z.string(), status: z.enum(['confirmed', 'dismissed', 'uncertain']), justification: z.string(), evidenceRefs: z.array(evidence) });
const context = z.strictObject({ groupId: z.string(), candidateId: z.string(), atomicity: z.enum(['atomic', 'multiple', 'uncertain']), support: z.enum(['supported', 'refuted', 'uncertain', 'absent']), identitySpan: span.nullable(), evidenceRefs: z.array(evidence), justification: z.string() });
export const extractionWire = z.strictObject({ claims: z.array(claim) });
export const scanWire = z.strictObject({ status: z.literal('complete'), candidates: z.array(signal) });
export const reviewWire = z.strictObject({ status: z.literal('complete'), reviews: z.array(context), candidates: z.array(signal), verdicts: z.array(verdict) });
export const adjudicationWire = z.strictObject({ disputeId: z.string(), resolution: z.strictObject({ status: z.enum(['selected', 'unresolved']), candidateId: z.string().nullable(), justification: z.string(), evidenceRefs: z.array(evidence).nullable() }) });
export function wireSchema(role: Exclude<Role, 'Repair'>) { return role === 'S1' ? scanWire : role === 'S2' ? reviewWire : role === 'J' ? adjudicationWire : extractionWire; }

function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, stripNulls(v)]));
  return value;
}
export function normalizeWire(role: Exclude<Role, 'Repair'>, raw: unknown): unknown {
  const parsed = wireSchema(role).parse(raw);
  const normalized = stripNulls(parsed);
  if (role === 'S1') return z.strictObject({ status: z.literal('complete'), candidates: z.array(SafetyCandidateSchema) }).parse(normalized);
  if (role === 'S2') return z.strictObject({ status: z.literal('complete'), reviews: z.array(ContextReviewSchema), candidates: z.array(SafetyCandidateSchema), verdicts: z.array(SafetyVerdictSchema) }).parse(normalized);
  if (role === 'J') return AdjudicationResponseSchema.parse(normalized);
  return z.strictObject({ claims: z.array(RawClaimSchema) }).parse(normalized);
}
