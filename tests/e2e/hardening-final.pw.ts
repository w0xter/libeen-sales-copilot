import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
test('real: segundo reservado ficticio', async ({ page }) => {
  test.skip(process.env.RUN_E2E_REAL !== '1', 'Proveedor real optativo');
  await page.goto('/');
  await page.getByRole('button', { name: 'Texto libre' }).click();
  await page.locator('#alias').fill('Segundo caso reservado ficticio');
  await page.getByLabel('Texto original de la conversación').fill('Cliente: Quiero explorar SmartHousing en Málaga. Compraría yo sola y me gustaría mudarme en diez meses. Cobro unos 2.200 euros brutos mensuales y tengo aproximadamente 8.000 euros ahorrados. Pago una cuota de 90 euros al mes y no sé si ya está descontada de mis ingresos.');
  const response = page.waitForResponse(r => r.url().endsWith('/api/intake') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
  const res = await response;
  const body = await res.json();
  writeFileSync('/private/tmp/libeen-hardening-holdout-final.json', JSON.stringify({ status: res.status(), body }, null, 2));
  expect(res.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Ficha comercial' })).toBeVisible();
});
