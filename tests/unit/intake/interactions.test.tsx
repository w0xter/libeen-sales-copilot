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
  it('copia la ficha y bloquea el resultado tras cambiar la conversación o fallar el reanálisis', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response }).mockRejectedValueOnce(new Error('provider_error')));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    await act(async () => { await button(renderer.root, 'Copiar ficha CRM').props.onClick(); });
    expect(writeText.mock.calls[0][0]).toContain('Copia manual para CRM');
    act(() => button(renderer.root, 'Editar texto').props.onClick());
    act(() => renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' }).props.onChange({ target: { value: 'Cliente: nueva intervención ficticia' } }));
    expect(renderer.root.findAllByType('button').some(b => b.children.includes('Copiar ficha CRM'))).toBe(false);
    await act(async () => { await button(renderer.root, 'Reanalizar conversación ↗').props.onClick(); });
    expect(renderer.root.findAllByType('button').some(b => b.children.includes('Copiar ficha CRM'))).toBe(false);
    expect(renderer.root.findAllByProps({ role: 'alert' })[0].children.join('')).toContain('provider_error');
  });

  it('aplica una corrección y adopta una declaración nueva en la vista previa', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const candidate = { field: 'income', value: '3.800 €/mes', messageId: 'm1', quote: '3.800 €', precision: 'approximate', subject: 'joint', incomeBasis: 'net', debtIncluded: 'unknown', uncertainty: null };
    const next = { ...candidate, value: '4.100 €/mes', messageId: 'm2', quote: '4.100 €' };
    const original = { ...response, messages: [{ id: 'm1', role: 'customer', text: 'Ingresos 3.800 €' }], extraction: { ...response.extraction, fields: { ...fields, income: [candidate] } } };
    const updated = { ...original, messages: [...original.messages, { id: 'm2', role: 'customer', text: 'Ahora 4.100 €' }], extraction: { ...original.extraction, fields: { ...fields, income: [candidate, next] } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => original }).mockResolvedValueOnce({ ok: true, json: async () => updated }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    act(() => button(renderer.root, 'Revisar').props.onClick());
    act(() => button(renderer.root, 'Corregir').props.onClick());
    act(() => renderer.root.findByProps({ id: 'revision-value' }).props.onChange({ target: { value: '3.600 €/mes' } }));
    act(() => renderer.root.findAllByType('form').find(f => f.findAllByProps({ id: 'revision-value' }).length)!.props.onSubmit({ preventDefault() {} }));
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('3.600 €/mes [corrected]');
    act(() => button(renderer.root, 'Editar texto').props.onClick());
    act(() => renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' }).props.onChange({ target: { value: 'Cliente: Ingresos 3.800 €\nCliente: Ahora 4.100 €' } }));
    await act(async () => { await button(renderer.root, 'Reanalizar conversación ↗').props.onClick(); });
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Ingresos mensuales: Conflicto sin resolver');
    act(() => button(renderer.root, 'Usar nueva declaración').props.onClick());
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('4.100 €/mes [adopted]');
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Revisión humana conservada: corrected · 3.600 €/mes');
  });

});
