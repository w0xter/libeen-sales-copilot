import { z } from 'zod';
import { CaseEventSchema, type ApplicationResult } from '../../../contracts';
import { getRuntime } from './runtime';

const requestSchema = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('event'), event: CaseEventSchema }),
  z.strictObject({ operation: z.literal('reset'), caseId: z.string().min(1) }),
]);
const invalid = () => Response.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Solicitud inválida', retryable: false } }, { status: 400 });
function respond(result: ApplicationResult): Response {
  const status = result.ok ? 200 : result.error.code === 'NOT_FOUND' ? 404 : ['REVISION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'STALE_PROPOSAL'].includes(result.error.code) ? 409 : result.error.code === 'MODEL_UNAVAILABLE' ? 503 : 400;
  return Response.json(result, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(request: Request): Promise<Response> {
  const caseId = new URL(request.url).searchParams.get('caseId');
  if (!caseId) return invalid();
  return respond(await getRuntime().getCase(caseId));
}
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return invalid(); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return invalid();
  if (parsed.data.operation === 'event' && parsed.data.event.type === 'CUSTOMER_CONFIRMED_NEXT_STEP') return Response.json({ ok: false, error: { code: 'POLICY_DENIED', message: 'La confirmación del cliente requiere una validación adicional', retryable: false } }, { status: 403 });
  const runtime = getRuntime();
  return respond(parsed.data.operation === 'event' ? await runtime.handleEvent(parsed.data.event) : await runtime.resetCase(parsed.data.caseId));
}
