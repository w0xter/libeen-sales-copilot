import type { Condition, WorkflowDefinition, WorkflowProgress, MilestoneEvaluation } from '../../contracts';
import { evaluateCondition, uniqueEvidence, type EvaluationContext } from './conditions';

export function evaluateWorkflow(input: EvaluationContext & { definition: WorkflowDefinition }): WorkflowProgress {
  const { definition } = input;
  const evaluations = new Map<string, MilestoneEvaluation>();
  const visiting = new Set<string>();
  const byId = new Map(definition.milestones.map(m => [m.id, m]));
  function evaluate(id: string): MilestoneEvaluation {
    const cached = evaluations.get(id);
    if (cached) return cached;
    const milestone = byId.get(id);
    if (!milestone || visiting.has(id)) throw new Error('Invalid workflow dependency');
    visiting.add(id);
    const predecessors = milestone.prerequisites.map(evaluate);
    const completion = evaluateCondition(milestone.completion, input);
    const applicability = milestone.applicability ? evaluateCondition(milestone.applicability, input) : undefined;
    const relevant = input.blockers.filter(b => b.status === 'open');
    const alternate = milestone.terminalRoute && milestone.alternativeTerminalConfirmations?.includes('HUMAN_HANDOFF_CONFIRMED') && input.events.some(event => event.type === 'HUMAN_HANDOFF_CONFIRMED' && event.actor === 'advisor');
    let status: MilestoneEvaluation['status'];
    if (applicability?.result === 'unsatisfied') status = 'not_applicable';
    else if (applicability && applicability.result !== 'satisfied') status = 'blocked';
    else if (alternate) status = 'completed';
    else if (completion.result !== 'satisfied') status = 'blocked';
    else if (predecessors.some(p => p.status !== 'completed')) status = 'pending';
    else status = 'completed';
    const collect = (condition: Condition): ReturnType<typeof evaluateCondition>[] => {
      const own = evaluateCondition(condition, input);
      if (condition.op === 'ALL' || condition.op === 'ANY') return [own, ...condition.conditions.flatMap(collect)];
      if (condition.op === 'NOT' || condition.op === 'when_option_enabled') return [own, ...collect(condition.condition)];
      return [own];
    };
    const guards = [...(milestone.applicability ? collect(milestone.applicability) : []), ...collect(milestone.completion)];
    const result: MilestoneEvaluation = { milestoneId: id, status, guards, evidenceRefs: uniqueEvidence(guards.flatMap(g => g.evidenceRefs)), blockers: relevant, workflowVersion: definition.version };
    visiting.delete(id);
    evaluations.set(id, result);
    return result;
  }
  return { workflowId: definition.id, workflowVersion: definition.version, milestones: definition.milestones.map(m => evaluate(m.id)) };
}
