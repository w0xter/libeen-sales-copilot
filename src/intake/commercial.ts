import { fieldNames, type EffectiveSheet } from './effective';
import { intakeRules, type IntakeRules } from './rules';
export type IssueStatus = 'pending' | 'resolved' | 'dismissed';
export type ReviewedIssue = { category: string; status: IssueStatus; description?: string };
export type Stage = 'Nuevo' | 'En cualificación' | 'Cualificado';
export function canUseQuestion(issues: ReviewedIssue[]): boolean {
  return !issues.some(i => i.category === 'sensitive' && i.status === 'pending');
}
export function suggestedStage({ analyzed, alias, sheet, pendingIssues, rules = intakeRules }: { analyzed: boolean; alias: string; sheet: EffectiveSheet; pendingIssues: ReviewedIssue[]; rules?: IntakeRules }): Stage {
  if (!analyzed) return 'Nuevo';
  if (!alias.trim() || fieldNames.some(f => sheet[f].status === 'conflict') || rules.requiredFields.some(f => sheet[f].status !== 'available') || pendingIssues.some(i => i.status === 'pending')) return 'En cualificación';
  const interest = sheet.interest.selected?.value ?? '';
  if (rules.requiredFields.includes('interest') && (!/smart\s*housing/i.test(interest) || !/inter[eé]s|interesad|quier|explor/i.test(interest) || /\b(?:no|sin|desinter[eé]s)\b/i.test(interest))) return 'En cualificación';
  const income = sheet.income.selected?.metadata;
  if (rules.requiredFields.includes('income') && (!income || income.incomeBasis === 'unknown' || income.subject === 'unknown')) return 'En cualificación';
  if (sheet.debts.status === 'conflict' || sheet.debts.selected?.metadata?.debtIncluded === 'unknown') return 'En cualificación';
  return 'Cualificado';
}
