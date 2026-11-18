import { z } from 'zod';
import type { Message } from '../../../src/intake/extraction';
import { assertionSchema, instructions } from '../adapters/minimal';

export const inputPrefix = 'Mensajes de conversación en JSON:\n';
export function minimalRequest(messages: Message[], model: string) {
 return { model, instructions: `${instructions}\nEsquema de una afirmación: ${JSON.stringify(z.toJSONSchema(assertionSchema))}`, input: inputPrefix + JSON.stringify(messages), text: { format: { type: 'json_object' as const } } };
}
