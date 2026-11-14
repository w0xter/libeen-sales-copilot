import { CaseEventSchema, CaseSnapshotSchema, type ApplicationError, type CaseEvent, type CaseRepository, type CaseSnapshot, type EventReceipt, type Result } from '../../contracts';
import { stableSerialize } from './event-fingerprint';

const fail = (code: ApplicationError['code'], message: string, currentRevision?: number): Result<never> => ({
  ok: false, error: { code, message, retryable: code === 'REVISION_CONFLICT', ...(currentRevision === undefined ? {} : { currentRevision }) },
});
const copy = <T>(value: T): T => structuredClone(value);

/** Local, single-process storage; it is reset on process restart. */
export class MemoryCaseRepository implements CaseRepository {
  private readonly originals = new Map<string, CaseSnapshot>();
  private readonly snapshots = new Map<string, CaseSnapshot>();
  private readonly receipts = new Map<string, { fingerprint: string; receipt: EventReceipt }>();

  constructor(fixtures: CaseSnapshot[]) {
    for (const fixture of fixtures) {
      const parsed = CaseSnapshotSchema.parse(fixture);
      if (this.originals.has(parsed.caseId)) throw new Error('Duplicate case fixture');
      this.originals.set(parsed.caseId, copy(parsed));
      this.snapshots.set(parsed.caseId, copy(parsed));
    }
  }

  async get(caseId: string): Promise<Result<CaseSnapshot>> {
    const snapshot = this.snapshots.get(caseId);
    return snapshot ? { ok: true, value: copy(snapshot) } : fail('NOT_FOUND', 'Caso no encontrado');
  }

  async saveIfRevision(snapshot: CaseSnapshot, expectedRevision: number): Promise<Result<CaseSnapshot>> {
    const parsed = CaseSnapshotSchema.safeParse(snapshot);
    if (!parsed.success || !Number.isInteger(expectedRevision) || expectedRevision < 0 || parsed.data.revision !== expectedRevision + 1) return fail('INVALID_INPUT', 'Revisión o expediente inválido');
    const current = this.snapshots.get(parsed.data.caseId);
    if (!current) return fail('NOT_FOUND', 'Caso no encontrado');
    if (current.revision !== expectedRevision) return fail('REVISION_CONFLICT', 'El caso ha cambiado', current.revision);
    this.snapshots.set(parsed.data.caseId, copy(parsed.data));
    return { ok: true, value: copy(parsed.data) };
  }

  async appendEvent(event: CaseEvent): Promise<Result<EventReceipt>> {
    const parsed = CaseEventSchema.safeParse(event);
    if (!parsed.success) return fail('INVALID_INPUT', 'Evento inválido');
    const nextEvent = parsed.data;
    const fingerprint = stableSerialize(nextEvent);
    const existing = this.receipts.get(nextEvent.eventId);
    if (existing) return existing.fingerprint === fingerprint ? { ok: true, value: copy(existing.receipt) } : fail('IDEMPOTENCY_CONFLICT', 'El identificador del evento ya existe');
    const current = this.snapshots.get(nextEvent.caseId);
    if (!current) return fail('NOT_FOUND', 'Caso no encontrado');
    if (current.revision !== nextEvent.expectedRevision) return fail('REVISION_CONFLICT', 'El caso ha cambiado', current.revision);
    if (nextEvent.type === 'MESSAGE_RECEIVED' && current.messages.some(message => message.messageId === nextEvent.payload.message.messageId)) return fail('INVALID_INPUT', 'El mensaje ya existe');
    const updated = copy(current);
    updated.events.push(copy(nextEvent));
    if (nextEvent.type === 'MESSAGE_RECEIVED') {
      updated.messages.push(copy(nextEvent.payload.message));
      updated.analysisStatus = 'pending';
    }
    updated.revision++;
    const receipt = { eventId: nextEvent.eventId, caseId: nextEvent.caseId, revision: updated.revision };
    this.snapshots.set(updated.caseId, updated);
    this.receipts.set(nextEvent.eventId, { fingerprint, receipt });
    return { ok: true, value: copy(receipt) };
  }

  async reset(caseId: string): Promise<Result<CaseSnapshot>> {
    const original = this.originals.get(caseId);
    if (!original) return fail('NOT_FOUND', 'Caso no encontrado');
    this.snapshots.set(caseId, copy(original));
    for (const [id, entry] of this.receipts) if (entry.receipt.caseId === caseId) this.receipts.delete(id);
    return { ok: true, value: copy(original) };
  }
}
