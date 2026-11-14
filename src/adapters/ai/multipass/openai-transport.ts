import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { normalizeWire, wireSchema } from './wire';
import { prompts } from './prompts';
import type { FakeTransport, Request } from './scheduler';
import type { Role } from './trace';

type Target = Exclude<Role, 'Repair'>;
type SDK = { responses: { create: (body: never, options: { signal: AbortSignal }) => Promise<{ status: string; output: { type: string; content?: { type: string }[] }[]; output_text: string }> } };
function target(request: Request): Target {
  if (request.role !== 'Repair') return request.role;
  const role = (request.input as { targetRole?: Role }).targetRole;
  if (!role || role === 'Repair') throw new Error('invalid target');
  return role;
}
// Strip review votes and extractor attribution from J. Equivalent alternatives
// are collapsed before presentation; candidate IDs remain valid for reconciliation.
function modelInput(role: Target, input: unknown): unknown {
  if (role !== 'J') return input;
  const data = input as { snapshot: unknown; dispute: { candidateIds: string[] }; group?: { candidates: Record<string, unknown>[] } };
  const seen = new Set<string>();
  const alternatives = (data.group?.candidates ?? []).flatMap(c => {
    const { extractorId: ignored, candidateId, ...rest } = c; void ignored;
    const key = JSON.stringify(rest);
    if (seen.has(key)) return [];
    seen.add(key); return [{ candidateId, ...rest }];
  });
  return { snapshot: data.snapshot, dispute: { ...data.dispute, candidateIds: alternatives.map(a => a.candidateId) }, alternatives };
}
export function openAIMultipassTransport(apiKey: string, model: string, client?: SDK): FakeTransport {
  const sdk = client ?? new OpenAI({ apiKey, timeout: 25000, maxRetries: 0 }) as unknown as SDK;
  return { async execute(request) {
    const role = target(request);
    const original = request.role === 'Repair' ? (request.input as { originalInput: unknown }).originalInput : request.input;
    const instructions = request.role === 'Repair' ? `${prompts.Repair}\n${prompts[role]}` : prompts[role];
    const response = await sdk.responses.create({ model, instructions, input: JSON.stringify(modelInput(role, original)), text: { format: zodTextFormat(wireSchema(role), `multipass_${role.toLowerCase()}`) } } as never, { signal: request.signal });
    if (response.status !== 'completed') throw new Error('MODEL_INCOMPLETE');
    if (response.output.some(item => item.type === 'message' && item.content?.some(c => c.type === 'refusal'))) throw new Error('MODEL_REFUSAL');
    try { return normalizeWire(role, JSON.parse(response.output_text)); } catch { return null; }
  } };
}
