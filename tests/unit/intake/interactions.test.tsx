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
    expect(renderer.root.findByProps({ 'aria-label': 'Pregunta sugerida editable' }).props.disabled).toBe(true);
    act(() => button(renderer.root, 'Marcar resuelta').props.onClick());
    act(() => button(renderer.root, 'He revisado la pregunta').props.onClick());
    expect(button(renderer.root, 'Copiar pregunta').props.disabled).toBe(false);
  });
  it('copia la ficha y bloquea el resultado tras cambiar la conversación o fallar el reanálisis', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const location = { field: 'location', value: 'Madrid', messageId: 'm1', quote: 'Hola', precision: 'explicit', subject: 'unknown', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null };
    const usable = { ...response, extraction: { ...response.extraction, fields: { ...fields, location: [location] } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => usable }).mockRejectedValueOnce(new Error('provider_error')));
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

  it('exige revisar una etapa cualificada si llega una alerta sensible', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('crypto', { randomUUID: () => 'stage' });
    const valueByField: Record<string, string> = { interest: 'Interesado en SmartHousing', location: 'Madrid', horizon: 'un año', buyers: 'dos', income: '3.000 €/mes', savings: '0' };
    const candidates = Object.entries(valueByField).map(([field, value]) => ({ field, value, messageId: 'm1', quote: value, precision: 'explicit', subject: 'joint', incomeBasis: 'net', debtIncluded: 'included', uncertainty: null }));
    const full = { ...response, messages: [{ id: 'm1', role: 'customer', text: Object.values(valueByField).join(', ') }], extraction: { ...response.extraction, fields: { ...fields, ...Object.fromEntries(candidates.map(c => [c.field, [c]])) } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => full }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Etapa actual: En cualificación');
    act(() => button(renderer.root, 'Confirmar etapa sugerida').props.onClick());
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Etapa actual: Cualificado');
    act(() => renderer.root.findByProps({ id: 'manual-alert' }).props.onChange({ target: { value: 'No contactar' } }));
    act(() => renderer.root.findAllByType('form')[0].props.onSubmit({ preventDefault() {} }));
    expect(button(renderer.root, 'Copiar ficha CRM').props.disabled).toBe(true);
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Etapa pendiente de revisión');
    act(() => button(renderer.root, 'Confirmar etapa sugerida').props.onClick());
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Etapa actual: En cualificación');
  });
  it('bloquea copiar si un reanálisis añade una contradicción material', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const candidate = { field: 'income', value: '3.000 €/mes', messageId: 'm1', quote: '3.000', precision: 'explicit', subject: 'joint', incomeBasis: 'net', debtIncluded: 'unknown', uncertainty: null };
    const first = { ...response, messages: [{ id: 'm1', role: 'customer', text: 'Ingresos 3.000' }], extraction: { ...response.extraction, fields: { ...fields, income: [candidate] } } };
    const second = { ...first, messages: [...first.messages, { id: 'm2', role: 'customer', text: 'Ingresos 4.000' }], extraction: { ...first.extraction, fields: { ...fields, income: [candidate, { ...candidate, messageId: 'm2', quote: '4.000', value: '4.000 €/mes' }] } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => first }).mockResolvedValueOnce({ ok: true, json: async () => second }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    expect(button(renderer.root, 'Copiar ficha CRM').props.disabled).toBe(false);
    act(() => button(renderer.root, 'Editar texto').props.onClick());
    act(() => renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' }).props.onChange({ target: { value: 'Cliente: Ingresos 3.000\nCliente: Ingresos 4.000' } }));
    await act(async () => { await button(renderer.root, 'Reanalizar conversación ↗').props.onClick(); });
    expect(button(renderer.root, 'Copiar ficha CRM').props.disabled).toBe(true);
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Conflicto sin resolver');
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Vista previa no exportable');
    expect(button(renderer.root, 'Revisar ficha')).toBeDefined();
  });
  it('ofrece recuperación cuando no hay datos utilizables', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    expect(button(renderer.root, 'Copiar ficha CRM').props.disabled).toBe(true);
    expect(button(renderer.root, 'Revisar conversación')).toBeDefined();
  });

  it('no exporta Cualificado tras reanálisis que introduce un conflicto', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const values: Record<string, string> = { interest: 'Interesado en SmartHousing', location: 'Madrid', horizon: 'un año', buyers: 'dos', income: '3.000 €/mes', savings: '0' };
    const candidates = Object.entries(values).map(([field, value]) => ({ field, value, messageId: 'm1', quote: value, precision: 'explicit', subject: 'joint', incomeBasis: 'net', debtIncluded: 'included', uncertainty: null }));
    const first = { ...response, messages: [{ id: 'm1', role: 'customer', text: Object.values(values).join(', ') }], extraction: { ...response.extraction, fields: { ...fields, ...Object.fromEntries(candidates.map(c => [c.field, [c]])) } } };
    const income = candidates.find(c => c.field === 'income')!;
    const second = { ...first, messages: [...first.messages, { id: 'm2', role: 'customer', text: '4.000 €/mes' }], extraction: { ...first.extraction, fields: { ...first.extraction.fields, income: [income, { ...income, messageId: 'm2', quote: '4.000 €/mes', value: '4.000 €/mes' }] } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => first }).mockResolvedValueOnce({ ok: true, json: async () => second }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    act(() => button(renderer.root, 'Confirmar etapa sugerida').props.onClick());
    expect(renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value).toContain('Etapa actual: Cualificado');
    act(() => button(renderer.root, 'Editar texto').props.onClick());
    act(() => renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' }).props.onChange({ target: { value: 'Cliente: conversación ficticia nueva' } }));
    await act(async () => { await button(renderer.root, 'Reanalizar conversación ↗').props.onClick(); });
    const preview = renderer.root.findByProps({ 'aria-label': 'Vista previa de ficha CRM' }).props.value;
    expect(preview).toContain('Etapa pendiente de revisión (etapa anterior: Cualificado)');
    expect(preview).toContain('Conflicto sin resolver');
    expect(button(renderer.root, 'Copiar ficha CRM').props.disabled).toBe(true);
  });

  it('bloquea la revisión abierta cuando cambia la conversación', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const candidate = { field: 'location', value: 'Madrid', messageId: 'm1', quote: 'Hola', precision: 'explicit', subject: 'unknown', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...response, extraction: { ...response.extraction, fields: { ...fields, location: [candidate] } } }) }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    act(() => button(renderer.root, 'Revisar').props.onClick());
    act(() => button(renderer.root, 'Editar texto').props.onClick());
    act(() => renderer.root.findByProps({ 'aria-label': 'Texto original de la conversación' }).props.onChange({ target: { value: 'Cliente: otra conversación' } }));
    expect(button(renderer.root, 'Confirmar dato').props.disabled).toBe(true);
    expect(button(renderer.root, 'Corregir').props.disabled).toBe(true);
    expect(button(renderer.root, 'Descartar').props.disabled).toBe(true);
  });
  it('informa del éxito y del fallo al copiar la pregunta', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denegado'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    await act(async () => { await button(renderer.root, 'Analizar conversación ↗').props.onClick(); });
    await act(async () => { await button(renderer.root, 'Copiar pregunta').props.onClick(); });
    expect(renderer.root.findAllByProps({ role: 'status' }).some(n => n.children.includes('Pregunta copiada.'))).toBe(true);
    await act(async () => { await button(renderer.root, 'Copiar pregunta').props.onClick(); });
    expect(renderer.root.findAllByProps({ role: 'status' }).some(n => n.children.includes('No se pudo copiar. Selecciona y copia la pregunta.'))).toBe(true);
  });
  it('pide confirmación antes de perder un alias editado', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('window', { confirm });
    await act(async () => { renderer = create(<IntakeWorkspace />); });
    act(() => renderer.root.findByProps({ id: 'alias' }).props.onChange({ target: { value: 'Alias ficticio' } }));
    act(() => button(renderer.root, 'Javier').props.onClick());
    expect(confirm).toHaveBeenCalledOnce();
    expect(renderer.root.findByProps({ id: 'alias' }).props.value).toBe('Alias ficticio');
  });

});
