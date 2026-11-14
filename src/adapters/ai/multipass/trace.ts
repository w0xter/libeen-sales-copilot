export type Role = 'E1' | 'E2' | 'E3' | 'S1' | 'S2' | 'J' | 'Repair';
export type OperationTrace = { attemptId: string; role: Role; status: 'success' | 'invalid' | 'error' | 'timeout' | 'cancelled'; durationMs: number; cause?: string; correlationId: string; instructionVersion: string; schemaVersion: string; configVersion: string };
export type PipelineTrace = { runId: string; operations: OperationTrace[]; attempts: Partial<Record<Role, number>>; consumed: number; disputes: number; resolutions: number; abstentionCauses: string[]; finalStatus: string };
export function createTrace(runId: string): PipelineTrace {
  return { runId, operations: [], attempts: {}, consumed: 0, disputes: 0, resolutions: 0, abstentionCauses: [], finalStatus: 'running' };
}
