import { expect, it } from 'vitest';
import { minimalRequest } from './minimal-request';

it('puts the JSON instruction in the provider input while retaining the original messages', () => {
 const messages = [{ id: 'm1', role: 'customer' as const, text: 'Quiero información.' }];
 const request = minimalRequest(messages, 'gpt-4.1-mini');
 expect(request.text.format.type).toBe('json_object');
 expect(request.input).toMatch(/json/i);
 const start = request.input.indexOf('[');
 expect(JSON.parse(request.input.slice(start))).toEqual(messages);
});
