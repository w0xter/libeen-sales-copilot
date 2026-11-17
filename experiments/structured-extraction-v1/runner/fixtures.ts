import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { Gold } from '../types';
import type { Message } from '../../../src/intake/extraction';
export const frozen = '0c0b06bb363c857e7c20e25597d075e8321652da';
export type Fixture = { caseId: string; family: string; split: string; input: { messages: { messageId: string; role: Message['role']; text: string | null }[] }; gold: { assertions: { field: string; value: Record<string, unknown>; evidence: { messageId: string; exactQuote: string }; derivation: 'explicit' | 'inferred' }[]; absentFields: string[]; contextChecks: string[] } };
export function loadFixtures(root: string, split: string): { cases: { fixture: Fixture; gold: Gold; messages: Message[] }[]; hashes: Record<string, string> } {
 const files = ['datasets/gold.v1.jsonl', 'datasets/gold.v1.schema.json', 'datasets/split-manifest.v1.json', 'audit/gold-v1-audit.jsonl', 'validate-gold-v1.mjs'];
 const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
 const hashes: Record<string, string> = {};
 for (const file of files) {
  const path = `experiments/structured-extraction-v1/${file}`;
  const content = readFileSync(join(root, file));
  const frozenContent = execFileSync('git', ['show', `${frozen}:${path}`], { cwd: repoRoot });
  if (!content.equals(frozenContent)) throw Error(`Frozen input differs: ${file}`);
  hashes[file] = execFileSync('git', ['hash-object', join(root, file)], { encoding: 'utf8' }).trim();
 }
 execFileSync(process.execPath, [join(root, 'validate-gold-v1.mjs')], { cwd: repoRoot });
 const manifest = JSON.parse(readFileSync(join(root, files[2]), 'utf8')) as { splits: Record<string, string[]> };
 if (!Object.hasOwn(manifest.splits, split)) throw Error(`Unknown split: ${split}`);
 const all = readFileSync(join(root, files[0]), 'utf8').trim().split('\n').map(line => JSON.parse(line) as Fixture);
 const cases = manifest.splits[split].map(id => {
  const fixture = all.find(x => x.caseId === id && x.split === split);
  if (!fixture) throw Error(`Invalid split case ${id}`);
  return { fixture, messages: fixture.input.messages.map(m => ({ id: m.messageId, role: m.role, text: m.text })), gold: { ...fixture.gold, assertions: fixture.gold.assertions.map(a => ({ ...a, field: a.field as Gold['assertions'][number]['field'], evidence: { messageId: a.evidence.messageId, quote: a.evidence.exactQuote } })) } };
 });
 return { cases, hashes };
}
