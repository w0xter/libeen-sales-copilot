import type { Message } from '../../src/intake/extraction';

export const fields = ['interest', 'location', 'horizon', 'buyers', 'income', 'savings', 'debts'] as const;
export type Field = typeof fields[number];
export type Assertion = { field: Field; value: Record<string, unknown>; evidence: { messageId: string; quote: string }; derivation: 'explicit' | 'inferred'; normalization?: { unresolved: string[]; originalValue: string } };
export type Gold = { assertions: Assertion[]; absentFields: string[]; contextChecks: string[] };
export type TransportResult = { raw: unknown; rawText?: string; usage?: { inputTokens?: number; outputTokens?: number; cost?: number }; provider?: string; parameters?: Record<string, unknown> };
export type Transport = (messages: Message[], config: { arm: 'A' | 'B' | 'C'; model: string }) => Promise<TransportResult>;
export type AdapterResult = { raw?: unknown; rawText?: string; errorDetail?: string; originalAccepted?: unknown; accepted: Assertion[]; discards: { item: unknown; reason: string }[]; error?: string; usage?: TransportResult['usage']; provider?: string; parameters?: Record<string, unknown>; limitations: string[] };
export type Adapter = { run(messages: Message[], transport: Transport, model: string): Promise<AdapterResult> };
