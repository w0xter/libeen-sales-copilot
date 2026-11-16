import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('real: reservado ficticio no visto', async ({ page }) => {
  test.skip(process.env.RUN_E2E_REAL !== '1', 'Proveedor real optativo');
  await page.goto('/');
  await page.getByRole('button', { name: 'Texto libre' }).click();
  await page.locator('#alias').fill('Caso reservado ficticio');
  await page.getByLabel('Texto original de la conversación').fill('Cliente: Quiero explorar SmartHousing en Bilbao. Compraría yo sola y me gustaría mudarme dentro de seis meses. Cobro aproximadamente 2.600 euros netos al mes y no tengo ahorros. Pago una cuota de 130 euros al mes que no está descontada de mis ingresos.');
  const response = page.waitForResponse(r => r.url().endsWith('/api/intake') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
  const res = await response;
  const body = await res.json();
  writeFileSync('/private/tmp/libeen-hardening-holdout.json', JSON.stringify({ status: res.status(), body }, null, 2));
  expect(res.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Ficha comercial' })).toBeVisible();
});
