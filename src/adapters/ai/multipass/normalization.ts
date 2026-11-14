/** Only metadata null spellings are normalized; values are never coerced. */
export function normalizeOptionalMetadata<T>(value: T): T | null {
  return typeof value === 'string' && value.trim().toLowerCase() === 'null' ? null : value;
}

import { randomUUID } from 'node:crypto';
import { ClaimCandidateSchema, RawClaimSchema, type ClaimCandidate } from './contracts';

export function createCandidate(raw: unknown, extractorId: string): ClaimCandidate {
  return ClaimCandidateSchema.parse({ ...RawClaimSchema.parse(raw), candidateId: randomUUID(), extractorId });
}
