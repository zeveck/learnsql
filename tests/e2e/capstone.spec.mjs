import { test, expect } from '@playwright/test';

// Capstone E2E (Phase 8; access model updated Phase 9, Chromium).
//
// Asserts the capstone (lesson 16) is OPENABLE regardless of progress (no gating
// — it's freely accessible even from a clean slate), then that solving the final
// accusation with the canonical query STILL awards the "Detective" badge + 300 XP
// and the profile (#/profile) reflects it (the reward logic is unchanged).
//
// SEEDING: rather than replay lessons, we call the page's test hook
// `window.__animeSqlAcademy.seedProgress(...)` to fast-forward to a chosen
// solvedExercises map. The reward path (XP + Detective badge) is exercised for
// real against the canonical query.

async function ready(page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
}

async function clearStorage(page) {
  await page.goto('/');
  await ready(page);
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

// Seed a specific solvedExercises map directly (e.g. to pre-solve the capstone's
// clue exercises so the lesson completes when the accusation is solved), reload.
async function seedProgress(page, partial) {
  await page.evaluate((pr) => globalThis.__animeSqlAcademy.seedProgress(pr), partial);
  await page.reload();
  await ready(page);
}

async function typeInto(page, sql) {
  const editor = page.locator('#view-lesson .cm-content');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await editor.pressSequentially(sql);
}

const CAPSTONE_SOLUTION =
  "SELECT c.name FROM characters c WHERE c.role = 'villain' AND c.is_human = 1 " +
  'AND c.id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id ' +
  "WHERE cf.rank = 'Leader' AND f.is_criminal = 1) " +
  'AND c.id IN (SELECT ci.character_id FROM character_items ci JOIN items i ON i.id = ci.item_id ' +
  "WHERE i.item_type = 'weapon');";

test('Capstone is OPENABLE regardless of progress (no gating)', async ({ page }) => {
  await clearStorage(page);

  // Fresh slate, NO progress: the capstone card is present and NOT locked, and
  // its CTA links straight into the lesson (no disabled "Locked" state).
  await page.goto('/#/');
  await ready(page);
  const card16 = page.locator('.lesson-card[data-lesson="16"]');
  await expect(card16).toBeVisible();
  await expect(card16).not.toHaveClass(/locked/);
  await expect(card16.locator('a.btn')).toHaveAttribute('href', '#/lesson/16');

  // Keep its special finale visual treatment (the capstone class), but no lock.
  await expect(card16).toHaveClass(/capstone/);

  // And it actually opens from a clean slate — every tab is reachable.
  await page.goto('/#/lesson/16');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });
  const tabCount = await page.locator('#exercise-tabs .exercise-tab').count();
  expect(tabCount).toBeGreaterThanOrEqual(4);
  // The final accusation tab is reachable with zero prior progress (no tab lock).
  await expect(page.locator('#exercise-tabs .exercise-tab').nth(3)).not.toHaveClass(/locked/);
});

test('Capstone solve awards Detective + 300 XP; profile reflects it', async ({ page }) => {
  await clearStorage(page);

  // The capstone is openable from a clean slate with every tab reachable. To
  // exercise the dedicated capstone SCORE SCREEN (which renders only when the
  // whole lesson is complete), we pre-solve the three clue exercises so that
  // solving the final accusation completes the lesson. This is NOT a gate — it
  // only fast-forwards the clue work a learner would otherwise do by hand.
  await seedProgress(page, {
    solvedExercises: { '16:0': true, '16:1': true, '16:2': true },
    lastActiveDate: new Date().toISOString().slice(0, 10),
  });

  await page.goto('/#/lesson/16');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });

  // The capstone has 4 exercises; the final (index 3, gold) is the accusation tab.
  const tabs = page.locator('#exercise-tabs .exercise-tab');
  await tabs.nth(3).click();

  // Solve with the canonical query.
  await typeInto(page, CAPSTONE_SOLUTION);
  await page.locator('#lesson-check').click();

  // The dedicated capstone score screen renders with the badge + the capstone
  // award. The flat capstone base is 300 XP; with the first-try bonus the gain is
  // 310, so we assert the awarded XP is at least 300.
  const score = page.locator('.capstone-score');
  await expect(score).toBeVisible({ timeout: 10000 });
  await expect(score).toContainText('Makoto Shishio');
  await expect(score.locator('.capstone-badges')).toContainText('Detective');
  const xpGainText = await score.locator('.capstone-xp').textContent();
  const xpGain = parseInt(xpGainText.match(/(\d+)/)[1], 10);
  expect(xpGain).toBeGreaterThanOrEqual(300);

  // Profile reflects the win: total XP >= 300, the Detective badge earned.
  await page.goto('/#/profile');
  await ready(page);
  const totalXp = await page.locator('.profile-stat-value').first().textContent();
  expect(parseInt(totalXp, 10)).toBeGreaterThanOrEqual(300);

  const detective = page.locator('.badge-card', { hasText: 'Detective' });
  await expect(detective).toHaveClass(/earned/);
  await expect(detective).toContainText('Earned');

  // Persists across reload.
  await page.reload();
  await ready(page);
  await expect(page.locator('.badge-card', { hasText: 'Detective' })).toHaveClass(/earned/);
});
