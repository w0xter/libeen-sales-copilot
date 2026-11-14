import { z } from 'zod';
import { Id, Revision } from './primitives';

export const ApplicationErrorSchema = z.strictObject({
  code: z.enum(['INVALID_INPUT', 'NOT_FOUND', 'INVALID_CONFIGURATION', 'MODEL_UNAVAILABLE', 'MODEL_OUTPUT_INVALID', 'EVIDENCE_INVALID', 'REVISION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'POLICY_DENIED', 'STALE_PROPOSAL', 'DRAFT_GENERATION_FAILED']),
  message: Id,
  retryable: z.boolean(),
  currentRevision: Revision.optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});
export type ApplicationError = z.infer<typeof ApplicationErrorSchema>;
export type Result<T> = {
  ok: true;
  value: T;
} | {
  ok: false;
  error: ApplicationError;
};

export const ResultSchema = <T extends z.ZodType>(value: T) => z.discriminatedUnion('ok', [z.strictObject({
  ok: z.literal(true), value
}), z.strictObject({
  ok: z.literal(false), error: ApplicationErrorSchema
})]);
