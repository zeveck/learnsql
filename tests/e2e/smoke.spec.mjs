import { test, expect } from '@playwright/test';

// Workbench smoke (Phase 3 replaced the Phase-1 (1,Vash)/(2,Spike) placeholder
// with the real Explore workbench). This guards that the page still loads
// sql.js from ./vendor, the WASM is fetched from ./vendor/sql-wasm.wasm, the
// editor mounts, a query runs, and there are no console/page errors (favicon +
// the vendored CodeMirror bundle present).

test('workbench smoke: loads sql.js + vendored CodeMirror, runs a query, no console errors', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  let wasmFetched = false;
  let cmBundleFetched = false;
  page.on('response', (resp) => {
    if (resp.url().endsWith('/vendor/sql-wasm.wasm')) wasmFetched = true;
    if (resp.url().endsWith('/vendor/codemirror.bundle.js')) cmBundleFetched = true;
  });

  // The lesson map is the default route; the Explore workbench (with the editor
  // + run button this smoke checks) lives at #/explore.
  await page.goto('/#/explore');

  // Engine ready + editor mounted.
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });

  // The starter query runs and renders a table.
  await page.locator('#run-btn').click();
  await expect(page.locator('#result table')).toBeVisible({ timeout: 10000 });

  expect(wasmFetched, 'wasm should be fetched from ./vendor/sql-wasm.wasm').toBe(true);
  expect(cmBundleFetched, 'CodeMirror should load from ./vendor/codemirror.bundle.js').toBe(true);
  expect(pageErrors, 'no uncaught page errors').toEqual([]);
  expect(consoleErrors, 'no console errors (incl. favicon 404)').toEqual([]);
});
