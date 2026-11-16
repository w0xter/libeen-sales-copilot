import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
test('real PoC: una conversación ficticia inédita', async ({ page }) => {
  test.skip(process.env.RUN_E2E_REAL !== '1', 'Proveedor real optativo');
  await page.goto('/');
  await page.getByRole('button', { name: 'Texto libre' }).click();
  await page.locator('#alias').fill('PoC ficticio');
  await page.getByLabel('Texto original de la conversación').fill('Cliente: Quiero explorar SmartHousing en Alicante. Compraría yo sola y me gustaría mudarme dentro de ocho meses. Gano unos 2.750 euros netos al mes, tengo 11.000 euros ahorrados y pago una cuota de 145 euros mensuales; no sé si la cuota está descontada de mis ingresos.');
  const response = page.waitForResponse(r => r.url().endsWith('/api/intake') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
  const res = await response; const body = await res.json();
  writeFileSync('/private/tmp/libeen-poc-real.json', JSON.stringify({ status: res.status(), body }, null, 2));
  expect(res.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Ficha comercial' })).toBeVisible();
});
