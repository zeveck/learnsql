// Scoring tests (Phase 4): XP math (tiers, first-try, ×1.5, hint floor,
// re-solve 0), level thresholds, streak increment + freeze, and a badge trigger.

import { test, assert, assertEqual } from './harness.mjs';
import {
  computeXp,
  levelForXp,
  levelDetail,
  advanceStreak,
  daysBetween,
  badgesForEvent,
  applySolve,
  emptyProgress,
  exerciseKey,
  BADGES,
  CAPSTONE_XP,
} from '../js/score.js';

// --- XP --------------------------------------------------------------------

test('xp: tier base values', () => {
  assertEqual(computeXp({ tier: 'bronze' }), 10);
  assertEqual(computeXp({ tier: 'silver' }), 25);
  assertEqual(computeXp({ tier: 'gold' }), 50);
});

test('xp: first-try bonus +10 (only with no hints)', () => {
  assertEqual(computeXp({ tier: 'bronze', firstTry: true }), 20);
  // First-try is void if a hint was used.
  assert(computeXp({ tier: 'bronze', firstTry: true, hintsUsed: 1 }) < 20);
});

test('xp: joinCore multiplies base by 1.5 (before bonus)', () => {
  // bronze 10 -> 15; +10 first-try -> 25.
  assertEqual(computeXp({ tier: 'bronze', joinCore: true }), 15);
  assertEqual(computeXp({ tier: 'bronze', joinCore: true, firstTry: true }), 25);
  // silver 25 -> 37.5 -> rounded 38.
  assertEqual(computeXp({ tier: 'silver', joinCore: true }), 38);
});

test('xp: hints subtract 5 each, floored at base/2', () => {
  // gold 50: -5 per hint.
  assertEqual(computeXp({ tier: 'gold', hintsUsed: 1 }), 45);
  assertEqual(computeXp({ tier: 'gold', hintsUsed: 2 }), 40);
  // Floor at base/2 = 25 — many hints can't go below.
  assertEqual(computeXp({ tier: 'gold', hintsUsed: 10 }), 25);
  // bronze 10: floor 5.
  assertEqual(computeXp({ tier: 'bronze', hintsUsed: 10 }), 5);
});

test('xp: re-solving a solved exercise yields 0', () => {
  assertEqual(computeXp({ tier: 'gold', firstTry: true, alreadySolved: true }), 0);
});

test('xp: capstone is a flat 300 (ignores tier/joinCore)', () => {
  assertEqual(computeXp({ capstone: true }), CAPSTONE_XP);
  assertEqual(computeXp({ capstone: true, joinCore: true, tier: 'bronze' }), CAPSTONE_XP);
});

test('xp: never negative', () => {
  assert(computeXp({ tier: 'bronze', hintsUsed: 100 }) >= 0);
});

// --- Levels ----------------------------------------------------------------

test('levels: thresholds resolve to the right name', () => {
  assertEqual(levelForXp(0), 'Academy Student');
  assertEqual(levelForXp(149), 'Academy Student');
  assertEqual(levelForXp(150), 'Genin');
  assertEqual(levelForXp(399), 'Genin');
  assertEqual(levelForXp(400), 'Chunin');
  assertEqual(levelForXp(800), 'Jonin');
  assertEqual(levelForXp(1400), 'Query Sensei');
  assertEqual(levelForXp(2200), 'SQL Hokage');
  assertEqual(levelForXp(99999), 'SQL Hokage');
});

test('levels: detail reports next + progress fraction', () => {
  const d = levelDetail(275); // between Genin(150) and Chunin(400)
  assertEqual(d.level, 'Genin');
  assertEqual(d.next, 'Chunin');
  assert(Math.abs(d.progress - (275 - 150) / (400 - 150)) < 1e-9);
  // At the top there is no next.
  assertEqual(levelDetail(3000).next, null);
});

// --- Streaks ---------------------------------------------------------------

test('streak: daysBetween computes calendar days', () => {
  assertEqual(daysBetween('2026-06-19', '2026-06-20'), 1);
  assertEqual(daysBetween('2026-06-19', '2026-06-26'), 7);
});

test('streak: first activity starts at 1', () => {
  const s = advanceStreak({}, '2026-06-19');
  assertEqual(s.streak, 1);
  assertEqual(s.lastActiveDate, '2026-06-19');
});

test('streak: same-day activity does not change the streak', () => {
  const s = advanceStreak({ streak: 3, freezes: 0, lastActiveDate: '2026-06-19' }, '2026-06-19');
  assertEqual(s.streak, 3);
});

test('streak: consecutive day increments', () => {
  const s = advanceStreak({ streak: 3, freezes: 0, lastActiveDate: '2026-06-19' }, '2026-06-20');
  assertEqual(s.streak, 4);
});

test('streak: a 7-day streak grants a freeze', () => {
  const s = advanceStreak({ streak: 6, freezes: 0, lastActiveDate: '2026-06-19' }, '2026-06-20');
  assertEqual(s.streak, 7);
  assertEqual(s.freezes, 1);
});

test('streak: a gap spends a freeze to keep the streak; else resets', () => {
  // With a freeze available, a 3-day gap keeps (and grows) the streak.
  const kept = advanceStreak({ streak: 4, freezes: 1, lastActiveDate: '2026-06-19' }, '2026-06-22');
  assertEqual(kept.streak, 5);
  assertEqual(kept.freezes, 0);
  // Without a freeze, a gap resets to 1.
  const reset = advanceStreak({ streak: 4, freezes: 0, lastActiveDate: '2026-06-19' }, '2026-06-22');
  assertEqual(reset.streak, 1);
});

// --- Badges ----------------------------------------------------------------

test('badge: Narcissus on first self-join solve', () => {
  const got = badgesForEvent({ exercise: { tags: ['self-join'] } }, []);
  assert(got.includes(BADGES.NARCISSUS), 'self-join should earn Narcissus');
  // Already owned -> not re-awarded.
  const again = badgesForEvent({ exercise: { tags: ['self-join'] } }, [BADGES.NARCISSUS]);
  assert(!again.includes(BADGES.NARCISSUS));
});

test('badge: anti-join -> Left Behind; cross-join -> Cartographer; capstone -> Detective', () => {
  assert(badgesForEvent({ exercise: { tags: ['anti-join'] } }, []).includes(BADGES.LEFT_BEHIND));
  assert(badgesForEvent({ exercise: { tags: ['cross-join'] } }, []).includes(BADGES.CARTOGRAPHER));
  assert(badgesForEvent({ capstone: true, exercise: {} }, []).includes(BADGES.DETECTIVE));
});

test('badge: lesson-level triggers (No Hints Needed, Flawless Victory)', () => {
  const a = badgesForEvent({ exercise: {}, lessonComplete: true, lessonNoHints: true }, []);
  assert(a.includes(BADGES.NO_HINTS_NEEDED));
  const b = badgesForEvent({ exercise: {}, lessonComplete: true, lessonFirstTryAll: true }, []);
  assert(b.includes(BADGES.FLAWLESS_VICTORY));
});

// --- Orchestration ---------------------------------------------------------

test('applySolve: awards XP, marks solved, updates level + badges', () => {
  let p = emptyProgress();
  const key = exerciseKey(10, 0);
  const out = applySolve(p, {
    key,
    tier: 'gold',
    firstTry: true,
    joinCore: true,
    hintsUsed: 0,
    today: '2026-06-19',
    event: { exercise: { tags: ['self-join'] } },
  });
  // gold 50 ×1.5 = 75; +10 first-try = 85.
  assertEqual(out.xpAwarded, 85);
  assertEqual(out.progress.xp, 85);
  assert(out.progress.solvedExercises[key] === true);
  assert(out.newBadges.includes(BADGES.NARCISSUS));
  assertEqual(out.progress.streak, 1);
});

test('applySolve: re-solving the same exercise awards 0 and no new badge', () => {
  let p = emptyProgress();
  const key = exerciseKey(10, 0);
  const first = applySolve(p, { key, tier: 'bronze', event: { exercise: { tags: ['self-join'] } } });
  const second = applySolve(first.progress, { key, tier: 'bronze', event: { exercise: { tags: ['self-join'] } } });
  assertEqual(second.xpAwarded, 0);
  assertEqual(second.newBadges.length, 0);
  assertEqual(second.progress.xp, first.progress.xp);
});
