import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseConversation } from '../../../src/intake/parse-conversation';
import { POST } from '../../../src/app/api/intake/route';

vi.mock('../../../src/intake/extraction', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../src/intake/extraction')>()),
  openAITransport: () => transport,
}));
const transport = vi.fn();
const candidate = { field: 'location', value: 'Gijón', messageId: 'm2', quote: 'Gijón', precision: 'explicit', subject: 'unknown', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null };
const request = (body: unknown) => new Request('http://localhost/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => { transport.mockReset(); vi.stubEnv('OPENAI_API_KEY', 'test-only'); });

describe('P5: entrada sintética', () => {
  it('identifica autores, texto multilínea explícito y audio sin transcripción', () => {
    expect(parseConversation('Libeen: Hola\nCliente: Busco en Gijón\n  para el año próximo\nAsesor: Gracias\nCliente: [audio de 1:12]')).toEqual({ ok: true, messages: [
      { id: 'm1', role: 'advisor', text: 'Hola' }, { id: 'm2', role: 'customer', text: 'Busco en Gijón\npara el año próximo' },
      { id: 'm3', role: 'advisor', text: 'Gracias' }, { id: 'm4', role: 'customer', text: null },
    ] });
  });
  it('rechaza líneas de autor incierto sin atribuirlas al turno anterior', () => {
    expect(parseConversation('Cliente: Hola\nDesconocido: gano 5000')).toMatchObject({ ok: false, error: 'uncertain_author', line: 2 });
    expect(parseConversation('Cliente: Hola\ngano 5000')).toMatchObject({ ok: false, error: 'uncertain_author', line: 2 });
  });
  it('rechaza audio mezclado con texto para no inferir su contenido', () => {
    expect(parseConversation('Cliente: Hola [audio de 1:12]')).toMatchObject({ ok: false, error: 'mixed_audio' });
  });
  it('analiza texto nuevo con B/D/E, conserva fuente y contabiliza descartes', async () => {
    transport.mockResolvedValue({ candidates: [candidate, { ...candidate, messageId: 'm1', quote: 'Gijón' }, { ...candidate, messageId: 'm3', quote: 'audio' }] });
    const response = await POST(request({ conversation: 'Asesor: ¿Buscas en Gijón?\nCliente: Busco en Gijón\nCliente: [audio de 0:20]' }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.messages[1]).toEqual({ id: 'm2', role: 'customer', text: 'Busco en Gijón' });
    expect(result.extraction.fields.location).toEqual([candidate]);
    expect(result.discarded).toBe(2);
    expect(result.issues.issues).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'inaccessible', messageId: 'm3' })]));
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'interest' });
  });
  it('hace visible el fallo del proveedor sin devolver resultados simulados', async () => {
    transport.mockRejectedValue(new Error('offline'));
    const response = await POST(request({ conversation: 'Cliente: Busco en Gijón' }));
    const result = await response.json();
    expect(response.status).toBe(502);
    expect(result.extraction).toEqual({ ok: false, error: 'provider_error' });
    expect(result.issues).toEqual({ ok: false, error: 'provider_error' });
    expect(result.intervention).toEqual({ kind: 'error', error: 'provider_error' });
    expect(result.discarded).toBeNull();
  });
  it('propaga una respuesta malformada del proveedor', async () => {
    transport.mockResolvedValue({ unexpected: [] });
    const response = await POST(request({ conversation: 'Cliente: Busco en Gijón' }));
    const result = await response.json();
    expect(response.status).toBe(502);
    expect(result.extraction).toEqual({ ok: false, error: 'invalid_response' });
    expect(result.intervention).toEqual({ kind: 'error', error: 'invalid_response' });
    expect(result.discarded).toBeNull();
  });
  it('rechaza JSON malformado', async () => {
    const response = await POST(new Request('http://localhost/api/intake', { method: 'POST', body: '{' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_json' });
  });
  it('rechaza entrada inválida y configuración ausente', async () => {
    expect((await POST(request({ conversation: 'texto sin autor' }))).status).toBe(400);
    expect((await POST(request({ conversation: '' }))).status).toBe(400);
    expect((await POST(request({ conversation: 7 }))).status).toBe(400);
    vi.stubEnv('OPENAI_API_KEY', '');
    const response = await POST(request({ conversation: 'Cliente: Hola' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'missing_server_configuration' });
  });
});
