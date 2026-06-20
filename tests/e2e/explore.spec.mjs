import { test, expect } from '@playwright/test';

// Explore mode E2E: typing SQL, Run + Ctrl+Enter, results, UPDATE → rows
// modified, Reset → reverted, LEFT JOIN → visible NULL badges.
//
// Use Control+Enter (Playwright maps "Mod" via the actual modifier; on Linux
// Chromium the OS modifier is Control, so Meta+Enter would NOT fire CodeMirror's
// Mod-Enter binding).

async function gotoReady(page) {
  await page.goto('/');
  // Engine ready flips a data attribute on #status.
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
  // The CodeMirror editor mounted.
  await expect(page.locator('#editor .cm-content')).toBeVisible({ timeout: 20000 });
}

async function typeSql(page, sql) {
  const editor = page.locator('#editor .cm-content');
  await editor.click();
  // Select-all + delete to clear the starter, then type fresh SQL.
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(sql);
}

test('Explore: villains query via Ctrl+Enter shows Vicious and Millions Knives', async ({ page }) => {
  await gotoReady(page);
  await typeSql(page, "SELECT name, role FROM characters WHERE role='villain';");
  await page.keyboard.press('Control+Enter');

  const table = page.locator('#result table');
  await expect(table).toBeVisible({ timeout: 10000 });
  await expect(table).toContainText('Vicious');
  await expect(table).toContainText('Millions Knives');
});

test('Explore: UPDATE reports rows modified; Reset reverts it', async ({ page }) => {
  await gotoReady(page);

  // Persist changes so the UPDATE survives the next Run (otherwise fresh-each-run
  // would reset it implicitly). We test the explicit Reset button instead.
  await page.locator('#persist-toggle').check();

  await typeSql(page, "UPDATE characters SET role='hero' WHERE name='Vicious';");
  await page.locator('#run-btn').click();
  await expect(page.locator('#result .result-info')).toContainText('row(s) modified', { timeout: 10000 });

  // Confirm the mutation took effect.
  await typeSql(page, "SELECT role FROM characters WHERE name='Vicious';");
  await page.locator('#run-btn').click();
  await expect(page.locator('#result table')).toContainText('hero', { timeout: 10000 });

  // Reset, then re-query: the change is gone.
  await page.locator('#reset-btn').click();
  await typeSql(page, "SELECT role FROM characters WHERE name='Vicious';");
  await page.locator('#run-btn').click();
  await expect(page.locator('#result table')).toContainText('villain', { timeout: 10000 });
  await expect(page.locator('#result table')).not.toContainText('hero');
});

test('Explore: LEFT JOIN renders visible NULL badges', async ({ page }) => {
  await gotoReady(page);
  await typeSql(
    page,
    'SELECT c.name, v.name FROM characters c LEFT JOIN voice_actors v ON c.voice_actor_id = v.id;'
  );
  await page.keyboard.press('Control+Enter');

  const table = page.locator('#result table');
  await expect(table).toBeVisible({ timeout: 10000 });

  // Wolfwood (id 3) has a NULL voice_actor_id → a NULL badge must render.
  const nullBadges = page.locator('#result td .null');
  await expect(nullBadges.first()).toBeVisible();
  await expect(nullBadges.first()).toHaveText('NULL');
  expect(await nullBadges.count()).toBeGreaterThan(0);
});

test('Explore: schema panel lists all 14 tables with click-to-insert', async ({ page }) => {
  await gotoReady(page);
  const tableButtons = page.locator('#schema-panel .schema-table-name');
  await expect(tableButtons).toHaveCount(14);

  // Click-to-insert: clear the editor, click the "characters" table button,
  // confirm its name appears in the editor.
  await typeSql(page, '');
  await page.locator('#schema-panel .schema-table-name', { hasText: 'characters' }).first().click();
  await expect(page.locator('#editor .cm-content')).toContainText('characters');
});
