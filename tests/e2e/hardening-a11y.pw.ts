import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const replay = JSON.parse(readFileSync('docs/current/evaluation/continuation/real-laura-initial.json', 'utf8')).body;

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`landmarks en entrada y resultado ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/intake', route => route.fulfill({ json: replay }));
    await page.goto('/');
    await expect(page.locator('.disclaimer')).toHaveCount(1);
    await expect(page.locator('main .disclaimer, footer .disclaimer, footer.disclaimer, [role="contentinfo"] .disclaimer')).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => v.id === 'region')).toEqual([]);
    await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
    await expect(page.getByRole('heading', { name: 'Ficha comercial' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => v.id === 'region')).toEqual([]);
    await page.unrouteAll();
    await page.route('**/api/intake', route => route.fulfill({ status: 502, json: { error: 'provider_error' } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Analizar conversación ↗' }).click();
    await expect(page.locator('.error-box[role="alert"]')).toBeVisible();
  });
}
