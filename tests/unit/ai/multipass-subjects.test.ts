import { describe, expect, it } from 'vitest';

import { resolveLocalSubject } from '../../../src/adapters/ai/multipass/subjects';

async function resolve(text: string, scope: 'buying_unit' | 'participant', focus: string, messageId = 'm1') {
  return resolveLocalSubject({ caseId: 'case-a', messageId, text, scope, focusStart: text.indexOf(focus), focusEnd: text.indexOf(focus) + focus.length });
}
describe('local subject evidence', () => {
  it('derives an anonymous buying unit from explicit two-buyer evidence', async () => {
    expect(await resolve('Compramos mi pareja y yo; entre los dos ganamos 3000.', 'buying_unit', '3000')).toMatchObject({ kind: 'resolved', provenance: { messageId: 'm1' } });
  });
  it('derives a buying unit from an explicitly single buyer', async () => {
    expect(await resolve('Compro yo solo y gano 2000.', 'buying_unit', 'solo')).toMatchObject({ kind: 'resolved' });
  });
  it('resolves a uniquely self-attributed declaration locally', async () => {
    expect(await resolve('Yo gano 2000 euros.', 'participant', '2000')).toMatchObject({ kind: 'resolved', provenance: { messageId: 'm1' } });
  });
  it.each(['Yo gano 2400 y mi pareja gana 1800.', 'Yo gano 2000 y mi pareja gana 2000.'])('abstains on multiple referents: %s', async text => {
    expect(await resolve(text, 'participant', text.includes('2400') ? '2400' : '2000')).toMatchObject({ kind: 'unresolved' });
  });
  it('does not bind a partner declaration to the speaker', async () => {
    expect(await resolve('Mi pareja gana 1800.', 'participant', '1800')).toMatchObject({ kind: 'unresolved' });
  });
  it.each(['Me escribió: «yo gano 2000».', 'Reenviado: yo gano 2000.'])('does not interpret quoted or forwarded text as sender identity: %s', async text => {
    expect(await resolve(text, 'participant', '2000')).toMatchObject({ kind: 'unresolved' });
  });
  it('is idempotent but does not link separate messages without proof', async () => {
    const first = await resolve('Yo gano 2000.', 'participant', '2000', 'one');
    const again = await resolve('Yo gano 2000.', 'participant', '2000', 'one');
    const other = await resolve('Yo gano 2000.', 'participant', '2000', 'two');
    expect(first.kind).toBe('resolved'); expect(again.kind).toBe('resolved'); expect(other.kind).toBe('resolved');
    if (first.kind !== 'resolved' || again.kind !== 'resolved' || other.kind !== 'resolved') throw Error('expected local subjects');
    expect(first.id).toBe(again.id); expect(first.id).not.toBe(other.id);
  });
});

it('does not resolve a focus that does not identify the attributed expression', async () => {
  expect(await resolve('Yo gano 2000 euros.', 'participant', 'Yo')).toMatchObject({ kind: 'unresolved' });
});
