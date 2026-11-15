import type { FakeTransport } from '../../src/adapters/ai/multipass/scheduler';

/** Synthetic evaluation only. Never record credentials or exception contents. */
export function captureMultipassTransport(transport: FakeTransport, records: unknown[]): FakeTransport {
  return { async execute(request) {
    try {
      const output = await transport.execute(request);
      records.push({ role: request.role, input: request.input, output });
      return output;
    } catch (error) {
      records.push({ role: request.role, input: request.input, error: 'transport_error' });
      throw error;
    }
  } };
}
