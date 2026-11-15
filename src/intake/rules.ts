import type { Field } from './effective';

/** Parámetros de negocio editables; no contienen comportamiento ni políticas financieras. */
export type IntakeRules = {
  requiredFields: Exclude<Field, 'debts'>[];
  ambiguityOrder: Field[];
  prioritizeIncomeBasis: boolean;
};
export const intakeRules: IntakeRules = {
  requiredFields: ['interest', 'location', 'horizon', 'buyers', 'income', 'savings'],
  ambiguityOrder: ['income', 'debts', 'interest', 'location', 'horizon', 'buyers', 'savings'],
  prioritizeIncomeBasis: true,
};
