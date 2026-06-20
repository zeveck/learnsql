import { test, expect } from '@playwright/test';

// Capstone E2E (Phase 8, Chromium).
//
// Asserts the capstone (lesson 16) is LOCKED before its gate is met and UNLOCKED
// after lesson 15's Bronze is cleared, then that solving the final accusation
// with the canonical query awards the "Detective" badge + 300 XP and the profile
// (#/profile) reflects it.
//
// SEEDING: rather than replay 15 lessons, we call the page's test hook
// `window.__animeSqlAcademy.seedBronzeThrough(N)`, which writes the SAME
// solvedExercises map the runner would have written (every bronze of lessons
// 1..N) and persists it. The gate logic in js/lessons.js is UNCHANGED and is
// still evaluated honestly against that seeded data — we only fast-forward the
// state, we do not weaken the gate.

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

async function seedBronzeThrough(page, maxLessonId) {
  await page.evaluate((n) => globalThis.__animeSqlAcademy.seedBronzeThrough(n), maxLessonId);
  // A same-hash goto does NOT reload the SPA; reload so the persisted seed is
  // re-read by app.js and the map re-renders against it.
  await page.reload();
  await ready(page);
}

// Seed a specific solvedExercises map directly (e.g. to pre-solve the capstone's
// clue exercises so its final accusation tab is reachable), then reload.
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

test('Capstone is LOCKED before lesson 15 bronze, UNLOCKED after', async ({ page }) => {
  await clearStorage(page);

  // Fresh slate: the capstone card is locked on the map.
  await page.goto('/#/');
  await ready(page);
  const card16 = page.locator('.lesson-card[data-lesson="16"]');
  await expect(card16).toBeVisible();
  await expect(card16).toHaveClass(/locked/);

  // Seed bronzes for lessons 1..15 -> the capstone's gate (lesson 15 bronze) is met.
  await seedBronzeThrough(page, 15);
  await page.goto('/#/');
  await ready(page);
  await expect(page.locator('.lesson-card[data-lesson="16"]')).not.toHaveClass(/locked/);
});

// The capstone's solvedExercises that gate the final accusation tab: lessons 1..15
// bronze (the lesson gate) PLUS the capstone's first three clue exercises (the
// intra-lesson tab gate). This is exactly what a learner who worked the clues
// would have; the gate logic is unchanged.
function capstoneReadyProgress() {
  const solvedExercises = {};
  // bronze of lessons 1..15 (gate the capstone lesson itself)
  for (let id = 1; id <= 15; id++) solvedExercises[`${id}:0`] = true;
  // capstone clues 0,1,2 solved -> tab 3 (the accusation) is reachable
  solvedExercises['16:0'] = true;
  solvedExercises['16:1'] = true;
  solvedExercises['16:2'] = true;
  return { solvedExercises, lastActiveDate: new Date().toISOString().slice(0, 10) };
}

test('Capstone solve awards Detective + 300 XP; profile reflects it', async ({ page }) => {
  await clearStorage(page);
  await seedProgress(page, capstoneReadyProgress());

  // Open the (now unlocked) capstone and jump to its final accusation exercise.
  await page.goto('/#/lesson/16');
  await ready(page);
  await expect(page.locator('#view-lesson .cm-content')).toBeVisible({ timeout: 20000 });

  // The capstone has 4 exercises; the final (index 3, gold) is the accusation tab.
  // With clues 0..2 pre-solved its tab is reachable.
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
