import type { Message } from './extraction';

type ParseResult =
  | { ok: true; messages: Message[] }
  | { ok: false; error: 'empty_conversation' | 'uncertain_author' | 'empty_message' | 'mixed_audio'; line?: number };

/** Solo acepta turnos explícitos; una continuación debe ir indentada. */
export function parseConversation(source: string): ParseResult {
  const turns: { role: Message['role']; text: string; line: number }[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const match = line.match(/^\s*(Cliente|Libeen|Asesor)\s*:\s*(.*)$/i);
    if (match) {
      turns.push({ role: match[1].toLowerCase() === 'cliente' ? 'customer' : 'advisor', text: match[2].trim(), line: i + 1 });
    } else if (/^\s+\S/.test(line) && turns.length && !/^\s*[^:]+:/.test(line)) {
      turns[turns.length - 1].text += `\n${line.trim()}`;
    } else {
      return { ok: false, error: 'uncertain_author', line: i + 1 };
    }
  }
  if (!turns.length) return { ok: false, error: 'empty_conversation' };
  const messages: Message[] = [];
  for (const turn of turns) {
    const content = turn.text.trim();
    if (!content) return { ok: false, error: 'empty_message', line: turn.line };
    const audio = /\[(?:audio|nota de voz|mensaje de voz)\b[^\]]*\]/i;
    const marker = content.match(audio);
    if (marker && marker[0] !== content) return { ok: false, error: 'mixed_audio', line: turn.line };
    messages.push({ id: `m${messages.length + 1}`, role: turn.role, text: marker ? null : content });
  }
  return { ok: true, messages };
}
