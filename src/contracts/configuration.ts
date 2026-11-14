import { z } from 'zod';
import { Id, StringList } from './primitives';
import { ConditionSchema } from './conditions';
import { CaseEventSchema, type CaseEvent } from './events';
import { PolicyDecisionSchema } from './decisions';

/** Declarative configuration; cross-catalog references must be validated by the config loader. */
export const FieldDefinitionSchema = z.strictObject({
  id: Id,
  label: Id,
  description: z.string(),
  type: z.enum(['text', 'enum', 'boolean', 'number', 'money', 'range', 'date', 'collection']),
  scopes: z.array(z.enum(['case', 'participant', 'buying_unit'])).min(1),
  cardinality: z.enum(['one', 'many']),
  units: StringList,
  enumOptions: StringList,
  structuralValidation: z.strictObject({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    integer: z.boolean().optional()
  }).refine(v => v.min === undefined || v.max === undefined || v.min <= v.max).optional(),
  sensitivity: z.enum(['normal', 'sensitive']),
  schemaVersion: Id
});
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

export const FactSchemaSchema = z.strictObject({
  id: Id, version: Id, fields: z.array(FieldDefinitionSchema)
});
export type FactSchema = z.infer<typeof FactSchemaSchema>;

export const MilestoneDefinitionSchema = z.strictObject({
  id: Id,
  purpose: Id,
  prerequisites: StringList,
  completion: ConditionSchema,
  applicability: ConditionSchema.optional(),
  onIncomplete: StringList,
  onBlocked: StringList,
  allowedSuccessors: StringList,
  terminalRoute: z.boolean(),
  alternativeTerminalConfirmations: z.array(z.literal('HUMAN_HANDOFF_CONFIRMED')).min(1).optional(),
  evidencePolicy: StringList
}).refine(milestone => milestone.terminalRoute || !milestone.alternativeTerminalConfirmations, 'Alternative confirmations require a terminal route');
export type MilestoneDefinition = z.infer<typeof MilestoneDefinitionSchema>;

export const WorkflowDefinitionSchema = z.strictObject({
  id: Id,
  version: Id,
  goal: Id,
  factSchemaVersion: Id,
  businessPolicyVersion: Id,
  milestones: z.array(MilestoneDefinitionSchema)
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const AgentProfileSchema = z.strictObject({
  id: Id,
  version: Id,
  role: Id,
  compatibleWorkflows: StringList,
  conversationStrategy: z.array(z.string()),
  decisionStrategy: z.array(z.string()),
  capabilities: StringList,
  contextStrategy: z.array(z.string()),
  communicationStyle: z.array(z.string()),
  fallbackBehavior: z.array(z.string()),
  observabilityHints: z.array(z.string())
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

/** Trigger categories combine with AND; each `Any` list combines with OR. A required option must be true. Omitted triggers match unconditionally. No executable code is accepted. */
export const PolicyRuleSchema = z.strictObject({
  id: Id,
  condition: ConditionSchema.optional(),
  conditionResults: z.array(z.enum(['satisfied', 'unsatisfied', 'unknown', 'conflict'])).optional(),
  blockerTypesAny: StringList.optional(),
  eventTypesAny: z.array(z.enum(CaseEventSchema.options.map(option => option.shape.type.value) as [
    CaseEvent['type'],
    ...CaseEvent['type'][]
  ])).optional(),
  requiredOption: z.enum(['requireProductInterest', 'requireLocation', 'requireBuyerCount', 'requireMovingHorizon', 'requireSpecificMoveMonthBeforeCall', 'requireDeclaredIncomeContext', 'requireDeclaredSavings', 'requireDisclosedDebtSemanticsResolved', 'preventWhenCriticalBlockerOpen']).optional(),
  result: PolicyDecisionSchema.shape.result,
  allowedActions: StringList,
  prohibitedActions: StringList,
  priority: z.number().int(),
  reviewRequired: z.boolean(),
  reason: Id,
}).refine(rule => !rule.conditionResults || !!rule.condition, 'conditionResults requires condition');
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const BusinessPolicySchema = z.strictObject({
  id: Id,
  version: Id,
  synthetic: z.literal(true),
  advisoryCall: z.strictObject({
    requireProductInterest: z.boolean(),
    requireLocation: z.boolean(),
    requireBuyerCount: z.boolean(),
    requireMovingHorizon: z.boolean(),
    requireSpecificMoveMonthBeforeCall: z.boolean(),
    requireDeclaredIncomeContext: z.boolean(),
    requireDeclaredSavings: z.boolean(),
    requireDisclosedDebtSemanticsResolved: z.boolean(),
    preventWhenCriticalBlockerOpen: z.literal(true)
  }),
  financialApprovalEnabled: z.literal(false),
  rules: z.array(PolicyRuleSchema)
});
export type BusinessPolicy = z.infer<typeof BusinessPolicySchema>;

export const ReviewPolicySchema = z.strictObject({
  id: Id, version: Id, protectedRuleIds: StringList, prohibitedClaims: z.array(z.string())
});
export type ReviewPolicy = z.infer<typeof ReviewPolicySchema>;

export const ActionCatalogSchema = z.strictObject({
  id: Id,
  version: Id,
  actions: z.array(z.strictObject({
    id: Id,
    description: Id,
    requiresDraft: z.boolean(),
    requiresHumanReview: z.boolean()
  }))
});
export type ActionCatalog = z.infer<typeof ActionCatalogSchema>;

export const ConfigBundleSchema = z.strictObject({
  workflow: WorkflowDefinitionSchema,
  factSchema: FactSchemaSchema,
  agentProfile: AgentProfileSchema,
  businessPolicy: BusinessPolicySchema,
  reviewPolicy: ReviewPolicySchema,
  actionCatalog: ActionCatalogSchema
});
export type ConfigBundle = z.infer<typeof ConfigBundleSchema>;
