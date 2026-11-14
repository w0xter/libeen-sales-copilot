import { z } from 'zod';
import { Id, Timestamp } from './primitives';

export const SubjectRefSchema = z.strictObject({
  scope: z.enum(['case', 'participant', 'buying_unit']), id: Id
});
export type SubjectRef = z.infer<typeof SubjectRefSchema>;

export const EvidenceRefSchema = z.strictObject({
  messageId: Id,
  quote: z.string().min(1).optional(),
  start: z.number().int().nonnegative().optional(),
  end: z.number().int().nonnegative().optional()
}).refine(v => (v.start === undefined && v.end === undefined) || (v.start !== undefined && v.end !== undefined && v.end > v.start), 'Evidence ranges must have an ordered start and end');
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const MessageSchema = z.strictObject({
  messageId: Id,
  conversationId: Id,
  role: z.enum(['customer', 'advisor', 'system']),
  occurredAt: Timestamp,
  content: z.discriminatedUnion('type', [z.strictObject({
    type: z.literal('text'), text: z.string().min(1)
  }), z.strictObject({
    type: z.literal('audio_unavailable'),
    durationSeconds: z.number().int().nonnegative().optional()
  })]),
  simulated: z.boolean().optional()
});
export type Message = z.infer<typeof MessageSchema>;
