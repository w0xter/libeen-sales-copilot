import { it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extract, openAITransport, type DiscardDiagnostic } from '../../../src/intake/extraction';
import { parseConversation } from '../../../src/intake/parse-conversation';
import { identifyIssues } from '../../../src/intake/issues';
import { nextQuestion } from '../../../src/intake/next-question';

it.skipIf(!process.env.INTAKE_LOCAL_DIAGNOSTIC)('local provider diagnostics', async () => {
  const cases = JSON.parse(readFileSync('/tmp/libeen-spike-cases.json', 'utf8')) as {snapshotId: string; conversation: string}[];
  const output = process.env.INTAKE_LOCAL_DIAGNOSTIC!;
  mkdirSync(output, { recursive: true });
  for (const item of cases.filter(c => !process.env.INTAKE_CASE || c.snapshotId === process.env.INTAKE_CASE)) {
    const parsed = parseConversation(item.conversation);
    if (!parsed.ok) throw new Error('parse failure');
    const discarded: DiscardDiagnostic[] = [];
    let raw: unknown;
    const transport = openAITransport(process.env.OPENAI_API_KEY!, process.env.OPENAI_MODEL!);
    const start = Date.now();
    const extraction = await extract(parsed.messages, async messages => { raw = await transport(messages); return raw; }, d => discarded.push(d));
    const issues = identifyIssues(extraction, parsed.messages);
    const intervention = nextQuestion(extraction, issues);
    writeFileSync(`${output}/${item.snapshotId}.json`, JSON.stringify({ snapshotId: item.snapshotId, model: process.env.OPENAI_MODEL, durationMs: Date.now()-start, messages: parsed.messages, raw, discarded, extraction, issues, intervention }, null, 2));
  }
}, 240000);
