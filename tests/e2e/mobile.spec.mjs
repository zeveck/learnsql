import { test, expect } from '@playwright/test';

// Mobile / responsive E2E (Phase 8, Chromium with iPhone emulation).
//
// On a small viewport the editor, results, schema panel, and lesson flow must be
// usable:
//   - the editor font is >= 16px (avoids iOS focus-zoom);
//   - result tables can scroll horizontally (overflow-x container);
//   - the schema panel collapses behind a toggle and can be expanded;
//   - a lesson is playable (type + Check -> a verdict).
//
// Emulate a phone-sized viewport for this whole file. We deliberately set ONLY
// the viewport + touch/mobile metrics (NOT devices['iPhone 12'], which would
// switch defaultBrowserType to webkit — uninstalled here). This keeps the suite
// Chromium-only while exercising the small-screen layout (iPhone 12 logical px).
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

async function ready(page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
}

test('editor uses >=16px font (no iOS focus-zoom)', async ({ page }) => {
  await page.goto('/#/explore');
  await ready(page);
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });

  const fontPx = await page.locator('#editor .cm-content').evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize)
  );
  expect(fontPx).toBeGreaterThanOrEqual(16);
});

test('schema panel collapses on mobile and can be toggled open', async ({ page }) => {
  await page.goto('/#/explore');
  await ready(page);

  // The collapse toggle is visible on the narrow viewport.
  const toggle = page.locator('#schema-toggle');
  await expect(toggle).toBeVisible();

  // The panel is expanded by default; toggling collapses it (aria-expanded flips,
  // the inner table list hides).
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const tables = page.locator('#schema-panel .schema-table-name');
  await expect(tables.first()).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(tables.first()).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(tables.first()).toBeVisible();
});

test('result tables scroll horizontally on a narrow viewport', async ({ page }) => {
  await page.goto('/#/explore');
  await ready(page);
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });

  const editor = page.locator('#editor .cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  // A wide row forces horizontal overflow on a phone-width viewport.
  await editor.pressSequentially(
    'SELECT id, name, anime_id, role, is_human, rival_id, mentor_id, voice_actor_id FROM characters;'
  );
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#result table')).toBeVisible({ timeout: 10000 });

  // The scroll container actually overflows (scrollWidth > clientWidth) and is
  // scrollable (overflow-x: auto).
  const scrollable = await page.locator('#result .result-set').first().evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      overflowX: style.overflowX,
      overflows: el.scrollWidth > el.clientWidth,
    };
  });
  expect(scrollable.overflowX === 'auto' || scrollable.overflowX === 'scroll').toBe(true);
  expect(scrollable.overflows).toBe(true);
});

test('a lesson is playable on mobile (type + Check -> verdict)', async ({ page }) => {
  await page.goto('/#/lesson/1');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });

  const editor = page.locator('#view-lesson .cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially('SELECT name FROM characters;');
  await page.locator('#lesson-check').click();
  await expect(page.locator('#lesson-verdict.correct')).toBeVisible({ timeout: 10000 });
});
