import { describe, expect, it } from 'vitest';
import { MemoryCaseRepository } from '../../../src/adapters/persistence/memory-case-repository';
import { configBundleRef } from '../../../src/config';
import { cases } from '../../../src/fixtures';
import type { CaseEvent, CaseSnapshot } from '../../../src/contracts';

const fixture: CaseSnapshot = {
  caseId: 'laura', revision: 0, messages: cases[0].messages, assertions: [], knowledge: { facts: [] },
  goal: { id: 'goal', description: 'Orientación', status: 'active' },
  workflowProgress: { workflowId: 'smart-housing-qualification', workflowVersion: '1.0.0', milestones: [] },
  blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR',
};
const event: CaseEvent = { eventId: 'evt-1', caseId: 'laura', actor: 'customer', occurredAt: '2026-05-02T10:00:00Z', expectedRevision: 0, type: 'MESSAGE_RECEIVED', payload: { message: { messageId: 'new', conversationId: 'laura-conversation', role: 'customer', occurredAt: '2026-05-02T10:00:00Z', content: { type: 'text', text: 'Hola' } } } };

describe('in-memory case repository', () => {
  it('persists an incoming message before any interpretation and deduplicates retries', async () => {
    const repo = new MemoryCaseRepository([fixture]);
    const first = await repo.appendEvent(event);
    expect(first).toEqual({ ok: true, value: { receipt: { eventId: 'evt-1', caseId: 'laura', revision: 1 }, duplicate: false } });
    expect(await repo.appendEvent(event)).toEqual({ ok: true, value: { receipt: { eventId: 'evt-1', caseId: 'laura', revision: 1 }, duplicate: true } });
    const current = await repo.get('laura');
    expect(current.ok && current.value.messages.filter(m => m.messageId === 'new')).toHaveLength(1);
    expect(current.ok && current.value.revision).toBe(1);
    const changed = structuredClone(event);
    if (changed.type === 'MESSAGE_RECEIVED' && changed.payload.message.content.type === 'text') changed.payload.message.content.text = 'Cambio';
    expect(await repo.appendEvent(changed)).toMatchObject({ ok: false, error: { code: 'IDEMPOTENCY_CONFLICT' } });
  });
  it('rejects invalid or duplicate messages without changing the case', async () => {
    const repo = new MemoryCaseRepository([fixture]);
    const duplicate = structuredClone(event);
    if (duplicate.type === 'MESSAGE_RECEIVED') duplicate.payload.message.messageId = fixture.messages[0].messageId;
    expect(await repo.appendEvent(duplicate)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await repo.get('laura')).toEqual({ ok: true, value: fixture });
    expect(await repo.appendEvent({ ...event, expectedRevision: 2 })).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT', currentRevision: 0 } });
  });
  it('does not expose mutable repository or receipt state', async () => {
    const repo = new MemoryCaseRepository([fixture]);
    const result = await repo.get('laura');
    if (!result.ok) throw new Error('fixture missing');
    result.value.messages.length = 0;
    expect(await repo.get('laura')).toEqual({ ok: true, value: fixture });
    const receipt = await repo.appendEvent(event);
    if (!receipt.ok) throw new Error('event failed');
    receipt.value.receipt.revision = 99;
    expect(await repo.appendEvent(event)).toMatchObject({ ok: true, value: { receipt: { revision: 1 } } });
    await repo.reset('laura');
    expect(await repo.appendEvent(event)).toMatchObject({ ok: true, value: { receipt: { revision: 1 } } });
  });
  it('commits a lifecycle event and its projection together, once', async () => {
    const repo = new MemoryCaseRepository([fixture]);
    const approval: CaseEvent = { eventId: 'approve-1', caseId: 'laura', actor: 'advisor', occurredAt: event.occurredAt, expectedRevision: 0, type: 'DRAFT_APPROVED', payload: { draftId: 'd1', proposalId: 'p1' } };
    const projected: CaseSnapshot = { ...structuredClone(fixture), revision: 1, events: [approval], status: 'WAITING_CUSTOMER' };
    expect(await repo.appendEventWithSnapshot(approval, projected)).toMatchObject({ ok: true, value: { duplicate: false, receipt: { revision: 1 } } });
    expect(await repo.appendEventWithSnapshot(approval, projected)).toMatchObject({ ok: true, value: { duplicate: true, receipt: { revision: 1 } } });
    expect(await repo.get('laura')).toEqual({ ok: true, value: projected });
    const other = { ...approval, eventId: 'approve-2' };
    expect(await repo.appendEventWithSnapshot(other, { ...projected, events: [other] })).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } });
    expect(await repo.get('laura')).toEqual({ ok: true, value: projected });
  });
  it('rejects stale writes, isolates copies and restores the original fixture on reset', async () => {
    const repo = new MemoryCaseRepository([fixture]);
    const first = await repo.get('laura');
    const second = await repo.get('laura');
    if (!first.ok || !second.ok) throw new Error('fixture missing');
    first.value.status = 'ON_HOLD_REVIEW';
    expect(await repo.saveIfRevision({ ...first.value, revision: 1 }, 0)).toMatchObject({ ok: true });
    expect(await repo.saveIfRevision({ ...second.value, revision: 1 }, 0)).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT', currentRevision: 1 } });
    expect(await repo.reset('laura')).toEqual({ ok: true, value: fixture });
    expect(await repo.get('laura')).toEqual({ ok: true, value: fixture });
  });
});
