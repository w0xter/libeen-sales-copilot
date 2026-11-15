import { expect, it } from 'vitest';
import { captureMultipassTransport } from './f02-live-capture';
import type { Request } from '../../src/adapters/ai/multipass/scheduler';

it('records synthetic pass inputs and outputs while preserving transport results', async () => {
  const records: unknown[] = [];
  const transport = captureMultipassTransport({ execute: async () => ({ claims: [{ value: 'synthetic-output' }] }) }, records);
  const request: Request = { runId: 'r', attemptId: 'a', correlationId: 'a', role: 'E1', instructionVersion: 'v', schemaVersion: 'v', configVersion: 'v', input: { message: 'synthetic-input' }, signal: new AbortController().signal };
  expect(await transport.execute(request)).toEqual({ claims: [{ value: 'synthetic-output' }] });
  expect(records).toEqual([{ role: 'E1', input: { message: 'synthetic-input' }, output: { claims: [{ value: 'synthetic-output' }] } }]);
});

it('preserves errors without recording exception contents', async () => {
  const records: unknown[] = [];
  const transport = captureMultipassTransport({ execute: async () => { throw Error('private-error'); } }, records);
  const request: Request = { runId: 'r', attemptId: 'a', correlationId: 'a', role: 'S1', instructionVersion: 'v', schemaVersion: 'v', configVersion: 'v', input: {}, signal: new AbortController().signal };
  await expect(transport.execute(request)).rejects.toThrow('private-error');
  expect(records).toEqual([{ role: 'S1', input: {}, error: 'transport_error' }]);
});
