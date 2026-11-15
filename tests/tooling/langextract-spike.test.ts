import { test, expect } from 'vitest';
import { readdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { extract, openAITransport, type DiscardDiagnostic, type Message } from '../../src/intake/extraction';
import { identifyIssues } from '../../src/intake/issues';
import { nextQuestion } from '../../src/intake/next-question';

const input = process.env.SPIKE_INPUT || '/private/tmp/libeen-langextract-spike/20261115T221856Z';
const output = process.env.SPIKE_OUTPUT || 'evaluation/results/langextract-spike';

test.skipIf(process.env.SPIKE_RUN !== '1')('reproduce las extracciones y compara el mismo flujo', async () => {
  const files = readdirSync(input).filter(f => /__rep\d+\.json$/.test(f)).sort();
  expect(files).toHaveLength(72);
  const live = process.env.SPIKE_LIVE === '1';
  const destination = `${output}/${live ? 'openai' : 'langextract'}.jsonl`;
  writeFileSync(destination, '');
  const transport = live ? openAITransport(process.env.OPENAI_API_KEY!, process.env.OPENAI_MODEL || 'gpt-4.1-mini') : null;
  for (const file of files) {
    const source = JSON.parse(readFileSync(`${input}/${file}`, 'utf8'));
    const messages: Message[] = source.messages;
    const diagnostics: DiscardDiagnostic[] = [];
    let raw: unknown = source.model_output;
    const start = Date.now();
    const extraction = await extract(messages, async m => {
      if (transport) {
        try { raw = await transport(m); }
        catch (error) { console.error('Provider diagnostic:', error instanceof Error ? `${error.name}: ${error.message}; cause: ${String(error.cause)}` : String(error)); throw error; }
      }
      return raw;
    }, d => diagnostics.push(d));
    const elapsedSeconds = (Date.now() - start) / 1000;
    // Original preprocessing failures are distinct from replay validation failures.
    const originalDiscarded = live ? 0 : source.extract_result.discarded;
    const effectiveExtraction = extraction.ok ? { ...extraction, discarded: extraction.discarded + originalDiscarded } : extraction;
    const issues = identifyIssues(effectiveExtraction, messages);
    const intervention = nextQuestion(effectiveExtraction, issues);
    appendFileSync(destination, JSON.stringify({ caseId: source.case_id, repetition: source.repetition, messages, originalDiscarded, originalDiscardReasons: live ? [] : source.discard_reasons, replayDiagnostics: diagnostics, raw, extraction: effectiveExtraction, issues, intervention, elapsedSeconds, originalElapsedSeconds: live ? null : source.elapsed_seconds }) + '\n');
    if (!extraction.ok && live) throw new Error(`Live provider failed for ${file}: ${extraction.error}; stopped to avoid further calls`);
    if (live) console.log(`Completado ${file}`);
  }
}, 900000);
