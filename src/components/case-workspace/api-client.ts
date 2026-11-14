import { ApplicationResultSchema, type ApplicationResult, type CaseEvent } from '../../contracts';

type Operation = { operation: 'event'; event: CaseEvent } | { operation: 'reset'; caseId: string };
async function parse(response: Response): Promise<ApplicationResult> {
  const parsed = ApplicationResultSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Respuesta del servidor inválida');
  return parsed.data;
}
export async function fetchCase(caseId: string): Promise<ApplicationResult> {
  return parse(await fetch(`/api/cases?caseId=${encodeURIComponent(caseId)}`, { cache: 'no-store' }));
}
export async function sendOperation(operation: Operation): Promise<ApplicationResult> {
  return parse(await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation) }));
}
export type { Operation };
