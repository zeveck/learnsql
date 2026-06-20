import { test, expect } from '@playwright/test';

// Lesson-runner E2E (Phase 4; access model updated Phase 9).
//   - every lesson is freely accessible WITHOUT prerequisites (no gating)
//   - a wrong query yields a diagnosis
//   - the correct INNER JOIN yields "Correct" + an XP gain
//   - solving an exercise updates the lesson card's completion indicator on the
//     map (the bronze medal lights + the "N/M solved" counter increments)
//   - reload -> progress persisted (XP + medal state retained)
//
// No gating: lesson 7 is openable directly from a clean slate. Each test starts
// from a clean slate (cleared storage).

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

test('No gating: lesson 7 is openable from a clean slate (no prerequisites)', async ({ page }) => {
  await clearStorage(page);

  // No progress at all: the map shows NO locked cards, and lesson 7 is openable.
  await page.goto('/#/');
  await ready(page);
  await expect(page.locator('.lesson-card.locked')).toHaveCount(0);
  const card7 = page.locator('.lesson-card[data-lesson="7"]');
  await expect(card7).not.toHaveClass(/locked/);
  // Its CTA links straight to the lesson — no "Locked" disabled span.
  await expect(card7.locator('a.btn')).toHaveAttribute('href', '#/lesson/7');

  // Open lesson 7 directly without solving anything first.
  await page.goto('/#/lesson/7');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });
});

test('Lesson 7: wrong->diagnosis, correct->XP + card medal/counter update, persists', async ({ page }) => {
  await clearStorage(page);

  // Open lesson 7 directly (no prerequisites).
  await page.goto('/#/lesson/7');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });

  // A wrong answer -> a diagnosis verdict.
  await typeInto(page, 'SELECT name FROM characters;');
  await page.locator('#lesson-check').click();
  const verdict = page.locator('#lesson-verdict');
  await expect(verdict).toHaveClass(/incorrect/, { timeout: 10000 });
  await expect(verdict.locator('.diagnosis')).toBeVisible();

  // The correct INNER JOIN -> Correct + XP gain. (Lesson 7's exercise 0 is the
  // bronze, so this lights the bronze medal on the lesson-7 card.)
  await typeInto(page, 'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;');
  await page.locator('#lesson-check').click();
  await expect(page.locator('#lesson-verdict.correct')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#lesson-verdict .xp-gain')).toBeVisible();

  // Back on the map: XP increased AND the lesson-7 card's completion indicator
  // updated — its bronze medal is now "solved" and the counter shows >= 1 solved.
  await page.goto('/#/');
  await ready(page);
  const xpText = await page.locator('.map-stats .stat-sub').first().textContent();
  const xp = parseInt(xpText.match(/(\d+)\s*XP/)[1], 10);
  expect(xp).toBeGreaterThan(0);

  const card7 = page.locator('.lesson-card[data-lesson="7"]');
  const bronzeMedal = card7.locator('.medal.medal-bronze');
  await expect(bronzeMedal).toHaveClass(/medal-solved/);
  await expect(bronzeMedal).toHaveAttribute('title', /solved/);
  const counterText = await card7.locator('.lesson-counter').textContent();
  const solvedCount = parseInt(counterText.match(/(\d+)\s*\//)[1], 10);
  expect(solvedCount).toBeGreaterThanOrEqual(1);
  // The card is no longer "Not started".
  await expect(card7).toContainText(/In progress|Complete/);

  // Reload -> progress persisted (XP retained + the medal still lit).
  await page.reload();
  await ready(page);
  const xpText2 = await page.locator('.map-stats .stat-sub').first().textContent();
  const xp2 = parseInt(xpText2.match(/(\d+)\s*XP/)[1], 10);
  expect(xp2).toBe(xp);
  await expect(page.locator('.lesson-card[data-lesson="7"] .medal.medal-bronze')).toHaveClass(/medal-solved/);
});
