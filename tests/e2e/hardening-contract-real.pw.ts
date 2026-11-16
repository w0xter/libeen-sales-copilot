import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
test('real contrato: reservado ficticio', async ({ page }) => {
  test.skip(process.env.RUN_E2E_REAL !== '1', 'Proveedor real optativo');
  await page.goto('/');
  await page.getByRole('button', { name: 'Texto libre' }).click();
  await page.locator('#alias').fill('Reservado contrato ficticio');
  await page.getByLabel('Texto original de la conversación').fill('Cliente: Queremos explorar SmartHousing en Sevilla. Compraríamos mi pareja y yo y nos mudaríamos dentro de un año. Entre ambos ingresamos unos 3.600 euros netos al mes y tenemos aproximadamente 15.000 euros ahorrados. Pagamos 175 euros mensuales de un préstamo y no sabemos si esa cuota ya está descontada de los ingresos.');
  const response = page.waitForResponse(r => r.url().endsWith('/api/intake') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
  const res = await response;
  const body = await res.json();
  writeFileSync('/private/tmp/libeen-contract-holdout.json', JSON.stringify({ status: res.status(), body }, null, 2));
  expect(res.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Ficha comercial' })).toBeVisible();
});
