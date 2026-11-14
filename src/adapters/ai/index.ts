import type { Interpreter, DraftGenerator, Result } from '../../contracts';
import { ReplayInterpreter, ReplayDraftGenerator } from './replay';
import { OpenAIInterpreter, OpenAIDraftGenerator, openAITransport, type ModelTransport } from './openai';
import { failure } from './validation';

export interface AIAdapters { mode: 'replay' | 'openai'; interpreter: Interpreter; draftGenerator: DraftGenerator }
export interface AIEnvironment { AI_MODE?: string; OPENAI_API_KEY?: string; OPENAI_MODEL?: string }
/** Server-only factory; no implicit replay fallback when OpenAI is unavailable. */
export function createAIAdapters(env: AIEnvironment = { AI_MODE: process.env.AI_MODE, OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_MODEL: process.env.OPENAI_MODEL }, transport?: ModelTransport): Result<AIAdapters> {
  if (typeof window !== 'undefined') return failure('MODEL_UNAVAILABLE', 'La IA solo está disponible en el servidor');
  if (env.AI_MODE === 'replay') return { ok: true, value: { mode: 'replay', interpreter: new ReplayInterpreter(), draftGenerator: new ReplayDraftGenerator() } };
  if (env.AI_MODE !== 'openai') return failure('INVALID_CONFIGURATION', 'AI_MODE debe ser openai o replay');
  if (!env.OPENAI_API_KEY?.trim()) return failure('MODEL_UNAVAILABLE', 'Falta la credencial del modelo');
  const model = env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
  const client = transport ?? openAITransport(env.OPENAI_API_KEY, model, 25000);
  return { ok: true, value: { mode: 'openai', interpreter: new OpenAIInterpreter(client), draftGenerator: new OpenAIDraftGenerator(client) } };
}
export type { ModelTransport } from './openai';
