import { test, expect } from '@playwright/test';

// Full-curriculum smoke (Phase 8, Chromium).
//
// End-to-end confirmation that gating, scoring, and persistence hold together:
//   1. From a clean slate, lesson 7 is locked and the capstone is locked (gating).
//   2. Seed bronzes 1..6 -> lesson 7 unlocks; solve lesson 7's bronze for real ->
//      XP increases and the next lesson unlocks (scoring + gating).
//   3. Seed bronzes 1..15 -> the capstone unlocks; solve it with the canonical
//      query -> Detective + 300 XP (scoring).
//   4. Reload -> the profile still shows the XP and the Detective badge
//      (persistence).
//
// Seeding reuses the page test hook (see capstone.spec.mjs); the gate logic is
// untouched and still evaluated against the seeded solvedExercises map.

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

async function seedBronzeThrough(page, n) {
  await page.evaluate((max) => globalThis.__animeSqlAcademy.seedBronzeThrough(max), n);
  // Reload so app.js re-reads the persisted seed and re-renders (a same-hash
  // goto would NOT reload the SPA).
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

test('gating + scoring + persistence hold from lesson 7 through the capstone', async ({ page }) => {
  await clearStorage(page);

  // (1) Clean slate: lesson 7 and the capstone are both locked.
  await page.goto('/#/');
  await ready(page);
  await expect(page.locator('.lesson-card[data-lesson="7"]')).toHaveClass(/locked/);
  await expect(page.locator('.lesson-card[data-lesson="16"]')).toHaveClass(/locked/);

  // (2) Seed bronzes 1..6 -> lesson 7 unlocks. Solve lesson 7's bronze for real.
  await seedBronzeThrough(page, 6);
  await page.goto('/#/');
  await ready(page);
  await expect(page.locator('.lesson-card[data-lesson="7"]')).not.toHaveClass(/locked/);

  const xpBefore = await mapXp(page);

  await page.goto('/#/lesson/7');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });
  await typeInto(page, 'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;');
  await page.locator('#lesson-check').click();
  await expect(page.locator('#lesson-verdict.correct')).toBeVisible({ timeout: 10000 });

  const xpAfter7 = await mapXp(page);
  expect(xpAfter7).toBeGreaterThan(xpBefore);
  await expect(page.locator('.lesson-card[data-lesson="8"]')).not.toHaveClass(/locked/);

  // (3) Seed bronzes 1..15 -> the capstone unlocks. Verify the gate, then seed the
  // capstone's clue exercises (0..2) so the final accusation tab is reachable, and
  // solve the accusation for real.
  await seedBronzeThrough(page, 15);
  await page.goto('/#/');
  await ready(page);
  await expect(page.locator('.lesson-card[data-lesson="16"]')).not.toHaveClass(/locked/);

  // Combined seed: lessons 1..15 bronze + capstone clues 0..2.
  const solved = {};
  for (let id = 1; id <= 15; id++) solved[`${id}:0`] = true;
  solved['16:0'] = true; solved['16:1'] = true; solved['16:2'] = true;
  await page.evaluate((s) => globalThis.__animeSqlAcademy.seedProgress({ solvedExercises: s }), solved);
  await page.reload();
  await ready(page);

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
