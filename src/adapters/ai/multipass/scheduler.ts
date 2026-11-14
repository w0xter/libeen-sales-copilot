import type { OperationTrace, PipelineTrace, Role } from './trace';

export type Request = { runId: string; attemptId: string; correlationId: string; role: Role; instructionVersion: string; schemaVersion: string; configVersion: string; input: unknown; signal: AbortSignal };
export interface FakeTransport { execute(request: Request): Promise<unknown> }
export class Scheduler {
  private deadline: number;
  constructor(private transport: FakeTransport, private trace: PipelineTrace, private options: { timeoutMs: number; totalTimeoutMs: number; signal?: AbortSignal; instructionVersion: string; schemaVersion: string; configVersion: string }) { this.deadline = Date.now() + options.totalTimeoutMs; }
  async call(role: Role, input: unknown, validate: (value: unknown) => boolean): Promise<unknown | undefined> {
    if (this.trace.consumed >= 7 || this.options.signal?.aborted || Date.now() >= this.deadline) return undefined;
    const attemptId = `${this.trace.runId}-${++this.trace.consumed}`;
    this.trace.attempts[role] = (this.trace.attempts[role] ?? 0) + 1;
    const operation: OperationTrace = { attemptId, correlationId: attemptId, role, status: 'error', durationMs: 0, instructionVersion: this.options.instructionVersion, schemaVersion: this.options.schemaVersion, configVersion: this.options.configVersion };
    this.trace.operations.push(operation);
    const started = Date.now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    try {
      const cancelled = new Promise<never>((_, reject) => {
        onAbort = () => { controller.abort(); reject(new Error('cancelled')); };
        this.options.signal?.addEventListener('abort', onAbort, { once: true });
        if (this.options.signal?.aborted) onAbort();
        timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, Math.max(0, Math.min(this.options.timeoutMs, this.deadline - Date.now())));
      });
      const value = await Promise.race([Promise.resolve().then(() => this.transport.execute({ runId: this.trace.runId, attemptId, correlationId: attemptId, role, input, signal: controller.signal, instructionVersion: this.options.instructionVersion, schemaVersion: this.options.schemaVersion, configVersion: this.options.configVersion })), cancelled]);
      operation.status = validate(value) ? 'success' : 'invalid';
      if (operation.status === 'invalid') operation.cause = 'invalid_output';
      return operation.status === 'success' ? value : undefined;
    } catch (error) {
      const kind = error instanceof Error && (error.message === 'timeout' || error.message === 'cancelled') ? error.message : 'transport_error';
      operation.status = kind === 'timeout' ? 'timeout' : kind === 'cancelled' ? 'cancelled' : 'error';
      operation.cause = kind;
      return undefined;
    } finally {
      operation.durationMs = Date.now() - started;
      if (timer) clearTimeout(timer);
      if (onAbort) this.options.signal?.removeEventListener('abort', onAbort);
    }
  }
}
