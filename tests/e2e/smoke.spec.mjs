import { test, expect } from '@playwright/test';

test('engine smoke: loads sql.js, renders (1,Vash)/(2,Spike), no console errors', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Track that the wasm is fetched from ./vendor/sql-wasm.wasm.
  let wasmFetched = false;
  page.on('response', (resp) => {
    if (resp.url().endsWith('/vendor/sql-wasm.wasm')) wasmFetched = true;
  });

  await page.goto('/');

  // Wait for the result table to render.
  const table = page.locator('#result table');
  await expect(table).toBeVisible({ timeout: 15000 });

  // Header columns.
  await expect(table.locator('thead th').nth(0)).toHaveText('a');
  await expect(table.locator('thead th').nth(1)).toHaveText('b');

  // Row data.
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('td').nth(0)).toHaveText('1');
  await expect(rows.nth(0).locator('td').nth(1)).toHaveText('Vash');
  await expect(rows.nth(1).locator('td').nth(0)).toHaveText('2');
  await expect(rows.nth(1).locator('td').nth(1)).toHaveText('Spike');

  // Status flipped to ready.
  await expect(page.locator('#status')).toHaveText('SQL engine ready.');

  expect(wasmFetched, 'wasm should be fetched from ./vendor/sql-wasm.wasm').toBe(true);
  expect(pageErrors, 'no uncaught page errors').toEqual([]);
  expect(consoleErrors, 'no console errors (incl. favicon 404)').toEqual([]);
});
