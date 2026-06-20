import { test, expect } from '@playwright/test';

// Accessibility E2E (Phase 8, Chromium).
//
// Real, non-vacuous assertions:
//   - Key controls expose accessible names (getByRole name queries).
//   - Tab order reaches the editor and the run button.
//   - Color is never the SOLE signal: NULL carries the literal text "NULL"; the
//     JOIN column-coloring legend carries text table-name labels.

async function ready(page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
}

test('primary nav and query controls have accessible names', async ({ page }) => {
  await page.goto('/#/explore');
  await ready(page);
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });

  // Nav landmark + links by accessible name.
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lessons' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

  // Toolbar controls by accessible name.
  await expect(page.getByRole('button', { name: /run query/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /reset database/i })).toBeVisible();

  // The results region is a labelled landmark.
  await expect(page.getByRole('region', { name: /query results/i })).toBeAttached();
});

test('tab order reaches the editor and the run button', async ({ page }) => {
  await page.goto('/#/explore');
  await ready(page);
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });

  // The CodeMirror content is focusable (contenteditable participates in tab order).
  await page.locator('#editor .cm-content').focus();
  await expect(page.locator('#editor .cm-content')).toBeFocused();

  // Tabbing forward from the editor reaches the Run button (it is the next
  // focusable control after the editor in DOM order).
  await page.keyboard.press('Tab');
  const runFocused = await page.evaluate(() => {
    const el = document.activeElement;
    return el && el.id === 'run-btn';
  });
  expect(runFocused).toBe(true);

  // Activating it via the keyboard runs the query.
  await page.keyboard.press('Enter');
  await expect(page.locator('#result table')).toBeVisible({ timeout: 10000 });
});

test('NULL is shown as the literal text "NULL" (not color alone)', async ({ page }) => {
  await page.goto('/#/explore');
  await ready(page);
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });

  const editor = page.locator('#editor .cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(
    'SELECT c.name, v.name FROM characters c LEFT JOIN voice_actors v ON c.voice_actor_id = v.id;'
  );
  await page.keyboard.press('Control+Enter');

  const nullBadge = page.locator('#result td .null').first();
  await expect(nullBadge).toBeVisible({ timeout: 10000 });
  await expect(nullBadge).toHaveText('NULL');
});

test('JOIN column legend carries text labels (color never the sole signal)', async ({ page }) => {
  // Lesson mode supplies columnTables -> the result renders a legend whose items
  // carry the source-table NAME as text, not just a color swatch.
  await page.goto('/#/lesson/7');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });

  const editor = page.locator('#view-lesson .cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(
    'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;'
  );
  await page.locator('#lesson-run').click();

  const legend = page.locator('#lesson-result .legend');
  await expect(legend).toBeVisible({ timeout: 10000 });
  // Text labels (not just swatches): the legend names the source tables.
  await expect(legend).toContainText('characters');
  await expect(legend).toContainText('anime');
});
