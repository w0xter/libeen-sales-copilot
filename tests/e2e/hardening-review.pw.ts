import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runIntake } from '../../src/intake/run-intake';

test('revisión de cuota deja estado visible y permite continuar', async ({ page }) => {
  const body = JSON.parse(readFileSync('docs/current/evaluation/hardening/contract-laura-continuation.json', 'utf8')).body;
  const raw = { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues };
  const result = await runIntake(body.messages, async () => raw);
  await page.route('**/api/intake', route => route.fulfill({ json: { ...result, messages: body.messages, discarded: result.extraction.ok ? result.extraction.discarded : null } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
  await expect(page.getByText(/Revisión del asesor: Revisa la conversación/)).toBeVisible();
  await page.getByRole('button', { name: /Marcar resuelta: Revisa la conversación/ }).click();
  await expect(page.getByLabel('Pregunta sugerida editable')).toHaveValue(/SmartHousing/);
  await expect(page.getByText('Necesita aclaración · Resuelta')).toBeVisible();
  await expect(page.getByLabel('Vista previa de ficha CRM')).toHaveValue(/\[resolved\].*cuota/i);
  await expect(page.getByLabel('Vista previa de ficha CRM')).toHaveValue(/cuota: unknown/);
});

test('la resolución manual permanece visible si el reanálisis omite la incidencia', async ({ page }) => {
  const body = JSON.parse(readFileSync('docs/current/evaluation/hardening/contract-laura-continuation.json', 'utf8')).body;
  const raw = { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues };
  const first = await runIntake(body.messages, async () => raw);
  if (!first.issues.ok) throw new Error('incidencias inválidas');
  const second = { ...first, issues: { ...first.issues, issues: first.issues.issues.filter(i => i.reason !== 'debt_inclusion') }, intervention: { kind: 'question', question: '¿Os interesa explorar SmartHousing?', reason: 'Falta interés', field: 'interest', issueId: 'next' } };
  let count = 0;
  await page.route('**/api/intake', route => route.fulfill({ json: { ...(count++ ? second : first), messages: body.messages, discarded: 0 } }));
  await page.goto('/'); await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
  await page.getByRole('button', { name: /Marcar resuelta: Revisa la conversación/ }).click();
  await page.getByRole('button', { name: 'Ver conversación' }).click();
  await page.getByRole('button', { name: 'Editar texto' }).click();
  await page.getByLabel('Texto original de la conversación').fill('Cliente: continuación ficticia de revisión');
  await page.getByRole('button', { name: 'Reanalizar conversación ↗' }).click();
  await expect(page.getByText('Necesita aclaración · Resuelta')).toBeVisible();
  await expect(page.getByLabel('Vista previa de ficha CRM')).toHaveValue(/\[resolved\].*cuota/i);
  await page.getByRole('button', { name: /Reabrir: Revisión conservada/ }).click();
  await expect(page.getByText(/Revisión del asesor: Revisión conservada/)).toBeVisible();
  await expect(page.getByText('Necesita aclaración · Pendiente')).toBeVisible();
});
