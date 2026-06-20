import { test, expect } from '@playwright/test';

// Full-curriculum smoke (Phase 8; access model updated Phase 9, Chromium).
//
// End-to-end confirmation that ACCESS, scoring, and persistence hold together:
//   1. From a clean slate, NO lesson is locked — lesson 7 and the capstone are
//      both freely openable (no gating).
//   2. Solve lesson 7's bronze for real -> XP increases and the lesson-7 card's
//      completion indicator updates (bronze medal lights, counter increments).
//   3. The capstone is openable directly; solve it (after pre-solving its clues
//      so the lesson completes) -> Detective + 300 XP (scoring is unchanged).
//   4. Reload -> the profile still shows the XP and the Detective badge
//      (persistence).

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

async function mapXp(page) {
  await page.goto('/#/');
  await ready(page);
  const txt = await page.locator('.map-stats .stat-sub').first().textContent();
  return parseInt(txt.match(/(\d+)\s*XP/)[1], 10);
}

const CAPSTONE_SOLUTION =
  "SELECT c.name FROM characters c WHERE c.role = 'villain' AND c.is_human = 1 " +
  'AND c.id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id ' +
  "WHERE cf.rank = 'Leader' AND f.is_criminal = 1) " +
  'AND c.id IN (SELECT ci.character_id FROM character_items ci JOIN items i ON i.id = ci.item_id ' +
  "WHERE i.item_type = 'weapon');";

test('access + scoring + persistence: any lesson openable, solving updates cards, capstone rewards hold', async ({ page }) => {
  await clearStorage(page);

  // (1) Clean slate: NO cards are locked — lesson 7 and the capstone are openable.
  await page.goto('/#/');
  await ready(page);
  await expect(page.locator('.lesson-card.locked')).toHaveCount(0);
  await expect(page.locator('.lesson-card[data-lesson="7"]')).not.toHaveClass(/locked/);
  await expect(page.locator('.lesson-card[data-lesson="16"]')).not.toHaveClass(/locked/);
  // Capstone keeps its finale visual treatment but is reachable.
  await expect(page.locator('.lesson-card[data-lesson="16"]')).toHaveClass(/capstone/);

  // (2) Solve lesson 7's bronze for real -> XP rises and the card indicator updates.
  const xpBefore = await mapXp(page);

  await page.goto('/#/lesson/7');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });
  await typeInto(page, 'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;');
  await page.locator('#lesson-check').click();
  await expect(page.locator('#lesson-verdict.correct')).toBeVisible({ timeout: 10000 });

  const xpAfter7 = await mapXp(page);
  expect(xpAfter7).toBeGreaterThan(xpBefore);
  // The lesson-7 card's bronze medal is now lit and the counter shows >= 1 solved.
  const card7 = page.locator('.lesson-card[data-lesson="7"]');
  await expect(card7.locator('.medal.medal-bronze')).toHaveClass(/medal-solved/);
  const c7 = await card7.locator('.lesson-counter').textContent();
  expect(parseInt(c7.match(/(\d+)\s*\//)[1], 10)).toBeGreaterThanOrEqual(1);

  // (3) The capstone is openable directly. Pre-solve its clue exercises (0..2)
  // so that solving the accusation completes the lesson and shows the score
  // screen — this only fast-forwards the clue work, it is NOT a gate.
  await seedProgress(page, {
    solvedExercises: { '16:0': true, '16:1': true, '16:2': true },
    lastActiveDate: new Date().toISOString().slice(0, 10),
  });

  await page.goto('/#/lesson/16');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });
  await page.locator('#exercise-tabs .exercise-tab').nth(3).click();
  await typeInto(page, CAPSTONE_SOLUTION);
  await page.locator('#lesson-check').click();
  const score = page.locator('.capstone-score');
  await expect(score).toBeVisible({ timeout: 10000 });
  const capXpText = await score.locator('.capstone-xp').textContent();
  expect(parseInt(capXpText.match(/(\d+)/)[1], 10)).toBeGreaterThanOrEqual(300);
  await expect(score.locator('.capstone-badges')).toContainText('Detective');

  // (4) Persistence: reload, the profile still shows >= 300 XP and Detective.
  await page.reload();
  await page.goto('/#/profile');
  await ready(page);
  const profileXp = await page.locator('.profile-stat-value').first().textContent();
  expect(parseInt(profileXp, 10)).toBeGreaterThanOrEqual(300);
  await expect(page.locator('.badge-card', { hasText: 'Detective' })).toHaveClass(/earned/);
});
