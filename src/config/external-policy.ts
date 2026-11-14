import { z } from 'zod';
import type { ConfigBundle } from '../contracts';
import { validateConfig } from './index';

const ExternalPolicySchema = z.strictObject({ version: z.string().min(1), requireSpecificMoveMonthBeforeCall: z.boolean() });

/** Applies the explicitly exposed demo option; protected policy rules remain intact. */
export function applyExternalPolicy(base: ConfigBundle, input: unknown): ConfigBundle {
  const settings = ExternalPolicySchema.parse(input);
  const bundle = structuredClone(base);
  bundle.businessPolicy.version = settings.version;
  bundle.workflow.businessPolicyVersion = settings.version;
  bundle.businessPolicy.advisoryCall.requireSpecificMoveMonthBeforeCall = settings.requireSpecificMoveMonthBeforeCall;
  const valid = validateConfig(bundle);
  if (!valid.ok) throw new Error('Invalid external business policy');
  return valid.value;
}
