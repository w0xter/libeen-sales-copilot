import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { IntakeWorkspace } from '../../../src/components/intake/workspace';

const fields = Object.fromEntries(['interest', 'location', 'horizon', 'buyers', 'income', 'savings', 'debts'].map(f => [f, []]));
const response = { messages: [{ id: 'm1', role: 'customer', text: 'Hola' }], extraction: { ok: true, fields, discarded: 0 }, issues: { ok: true, issues: [], incomplete: false }, intervention: { kind: 'question', question: '¿En qué zona buscáis?', reason: 'Falta zona', field: 'location', issueId: 'issue-1' }, discarded: 0 };
function button(root: ReactTestInstance, label: string) { return root.findAllByType('button').find(b => b.children.includes(label))!; }
let renderer: ReactTestRenderer;
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.unstubAllGlobals(); });
describe('interacciones de la interfaz', () => {
  it('bloquea la pregunta al añadir una alerta sensible y permite revisarla', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    vi.stubGlobal('crypto', { randomUUID: () => 'test' });
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    expect(button(renderer.root, 'Copiar pregunta').props.disabled).toBe(false);
    act(() => renderer.root.findByProps({ id: 'manual-alert' }).props.onChange({ target: { value: 'Revisar contacto' } }));
    act(() => renderer.root.findAllByType('form')[0].props.onSubmit({ preventDefault() {} }));
    expect(button(renderer.root, 'Copiar pregunta').props.disabled).toBe(true);
    act(() => button(renderer.root, 'Marcar resuelta').props.onClick());
    act(() => button(renderer.root, 'He revisado la pregunta').props.onClick());
    expect(button(renderer.root, 'Copiar pregunta').props.disabled).toBe(false);
  });
});
