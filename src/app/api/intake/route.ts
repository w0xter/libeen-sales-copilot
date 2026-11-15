import { openAITransport } from '../../../intake/extraction';
import { parseConversation } from '../../../intake/parse-conversation';
import { runIntake } from '../../../intake/run-intake';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }
  if (typeof body !== 'object' || body === null || !('conversation' in body) || typeof body.conversation !== 'string') {
    return Response.json({ error: 'invalid_input' }, { status: 400 });
  }
  const parsed = parseConversation(body.conversation);
  if (!parsed.ok) return Response.json(parsed, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'missing_server_configuration' }, { status: 503 });
  const result = await runIntake(parsed.messages, openAITransport(apiKey, process.env.OPENAI_MODEL || 'gpt-4.1-mini'));
  return Response.json({ messages: parsed.messages, ...result, discarded: result.extraction.ok ? result.extraction.discarded : null }, { status: result.extraction.ok ? 200 : 502 });
}
