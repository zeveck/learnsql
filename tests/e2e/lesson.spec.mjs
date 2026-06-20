import { test, expect } from '@playwright/test';

// Lesson-runner E2E (Phase 4): play sample Lesson 7 (INNER JOIN).
//   - a wrong query yields a diagnosis
//   - the correct INNER JOIN yields "Correct" + an XP gain
//   - the next lesson (8) unlocks
//   - reload -> progress persisted (XP retained, lesson 8 still unlocked)
//
// Gating: lesson 7 unlocks only after lesson 1's Bronze is cleared, so we solve
// lesson 1 first. Each test starts from a clean slate (cleared storage).

async function ready(page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
}

async function clearStorage(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    try { localStorage.clear(); } catch {}
    try {
      const dbs = (indexedDB.databases && (await indexedDB.databases())) || [];
      await Promise.all(
        dbs.map((d) => d.name && new Promise((res) => {
          const r = indexedDB.deleteDatabase(d.name);
          r.onsuccess = r.onerror = r.onblocked = () => res();
        }))
      );
    } catch {}
  });
}

async function typeInto(page, sql) {
  const editor = page.locator('#view-lesson .cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(sql);
}

async function solveLesson1Bronze(page) {
  await page.goto('/#/lesson/1');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });
  await typeInto(page, 'SELECT name FROM characters;');
  await page.locator('#lesson-check').click();
  await expect(page.locator('#lesson-verdict.correct')).toBeVisible({ timeout: 10000 });
}

test('Lesson 7: wrong->diagnosis, correct->XP+unlock, persists across reload', async ({ page }) => {
  await clearStorage(page);
  await solveLesson1Bronze(page);

  // Now lesson 7 is unlocked. Open it.
  await page.goto('/#/lesson/7');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });

  // A wrong answer -> a diagnosis verdict.
  await typeInto(page, 'SELECT name FROM characters;');
  await page.locator('#lesson-check').click();
  const verdict = page.locator('#lesson-verdict');
  await expect(verdict).toHaveClass(/incorrect/, { timeout: 10000 });
  await expect(verdict.locator('.diagnosis')).toBeVisible();

  // The correct INNER JOIN -> Correct + XP gain.
  await typeInto(page, 'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;');
  await page.locator('#lesson-check').click();
  await expect(page.locator('#lesson-verdict.correct')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#lesson-verdict .xp-gain')).toBeVisible();

  // Capture XP from the map header.
  await page.goto('/#/');
  await ready(page);
  const xpText = await page.locator('.map-stats .stat-sub').first().textContent();
  const xp = parseInt(xpText.match(/(\d+)\s*XP/)[1], 10);
  expect(xp).toBeGreaterThan(0);

  // Lesson 8 is now unlocked (lesson 7's bronze cleared).
  const card8 = page.locator('.lesson-card[data-lesson="8"]');
  await expect(card8).not.toHaveClass(/locked/);

  // Reload -> progress persisted.
  await page.reload();
  await ready(page);
  const xpText2 = await page.locator('.map-stats .stat-sub').first().textContent();
  const xp2 = parseInt(xpText2.match(/(\d+)\s*XP/)[1], 10);
  expect(xp2).toBe(xp);
  await expect(page.locator('.lesson-card[data-lesson="8"]')).not.toHaveClass(/locked/);
});
