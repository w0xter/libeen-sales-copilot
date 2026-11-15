import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { IntakeWorkspace } from '../../../src/components/intake/workspace';

let renderer: ReactTestRenderer;
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.unstubAllGlobals(); });
it('abre el espacio de trabajo tras analizar y permite volver a la conversación', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const fields = Object.fromEntries(['interest', 'location', 'horizon', 'buyers', 'income', 'savings', 'debts'].map(field => [field, []]));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [], extraction: { ok: true, fields, discarded: 0 }, issues: { ok: true, issues: [], incomplete: false }, intervention: { kind: 'question', question: '¿Dónde?', reason: 'Falta zona', field: 'location' }, discarded: 0 }) }));
  await act(async () => { renderer = create(<IntakeWorkspace />); });
  const button = (label: string) => renderer.root.findAllByType('button').find(b => b.children.includes(label))!;
  await act(async () => { await button('Analizar conversación ↗').props.onClick(); });
  expect(button('Ver conversación')).toBeDefined();
  expect(renderer.root.findByProps({ id: 'conversation-panel' }).props.hidden).toBe(true);
  act(() => button('Ver conversación').props.onClick());
  expect(renderer.root.findByProps({ id: 'conversation-panel' }).props.hidden).toBe(false);
});
