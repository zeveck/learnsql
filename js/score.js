// Scoring + progression engine (Phase 4).
//
// The XP / level / streak / badge MATH is implemented as PURE functions so the
// full model is unit-testable under Node. PERSISTENCE (IndexedDB, with a
// localStorage fallback) is browser-only and feature-detected — importing this
// module under Node never touches a browser API.
//
// Progress shape (persisted):
//   { solvedExercises: { [exerciseKey]: true },
//     xp, level, streak, freezes, badges: string[], lastActiveDate }

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

/** Base XP by tier. */
export const TIER_XP = { bronze: 10, silver: 25, gold: 50 };

/** The capstone awards a flat 300 XP (Phase 7 uses this). */
export const CAPSTONE_XP = 300;

const FIRST_TRY_BONUS = 10;
const JOIN_CORE_MULTIPLIER = 1.5;
const HINT_COST = 5; // XP deducted per hint, from THAT exercise's award.

/**
 * Compute the XP awarded for solving an exercise.
 *
 * @param {object} opts
 *   - tier: 'bronze'|'silver'|'gold'
 *   - firstTry: boolean      no failed run AND no hint used (+10)
 *   - joinCore: boolean      lesson flagged joinCore (×1.5 on the base award)
 *   - hintsUsed: number      each hint subtracts 5, floored at base/2
 *   - capstone: boolean      flat 300 (ignores tier)
 *   - alreadySolved: boolean re-solving a solved exercise yields 0
 * @returns {number} XP (never negative)
 */
export function computeXp(opts = {}) {
  const {
    tier = 'bronze',
    firstTry = false,
    joinCore = false,
    hintsUsed = 0,
    capstone = false,
    alreadySolved = false,
  } = opts;

  if (alreadySolved) return 0;

  let base = capstone ? CAPSTONE_XP : (TIER_XP[tier] || 0);

  // JOIN-core lessons multiply the base tier award.
  if (joinCore && !capstone) base = base * JOIN_CORE_MULTIPLIER;

  // First-try bonus only when no failed run and no hint used.
  let award = base;
  if (firstTry && hintsUsed === 0) award += FIRST_TRY_BONUS;

  // Hints subtract from the award, floored at base/2.
  if (hintsUsed > 0) {
    const floor = base / 2;
    award = Math.max(floor, base - hintsUsed * HINT_COST);
  }

  return Math.max(0, Math.round(award));
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/** Level thresholds (ascending). The highest threshold the XP meets wins. */
export const LEVELS = [
  { name: 'Academy Student', min: 0 },
  { name: 'Genin', min: 150 },
  { name: 'Chunin', min: 400 },
  { name: 'Jonin', min: 800 },
  { name: 'Query Sensei', min: 1400 },
  { name: 'SQL Hokage', min: 2200 },
];

/** Resolve the level name for a given total XP. */
export function levelForXp(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.min) current = lvl;
    else break;
  }
  return current.name;
}

/**
 * Level detail for a profile screen: current level, next level (or null at the
 * top), and progress fraction toward the next threshold.
 */
export function levelDetail(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  let progress = 1;
  if (next) {
    const span = next.min - current.min;
    progress = span > 0 ? (xp - current.min) / span : 1;
  }
  return { level: current.name, next: next ? next.name : null, progress };
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

/** Days between two ISO YYYY-MM-DD dates (b - a), UTC, integer. */
export function daysBetween(a, b) {
  const da = Date.parse(a + 'T00:00:00Z');
  const db = Date.parse(b + 'T00:00:00Z');
  return Math.round((db - da) / 86400000);
}

/**
 * Advance a daily streak given the previous state and "today".
 *   - same day               -> unchanged
 *   - exactly +1 day         -> streak += 1
 *   - gap > 1 day            -> if a freeze is available, spend ONE to keep the
 *                               streak (streak += 1, freezes -= 1); else reset
 *                               the streak to 1
 *   - no prior activity      -> streak = 1
 * A +1 "streak freeze" is granted every time the running streak hits a multiple
 * of 7.
 *
 * @param {object} prev { streak, freezes, lastActiveDate }
 * @param {string} today ISO YYYY-MM-DD
 * @returns {{ streak, freezes, lastActiveDate }}
 */
export function advanceStreak(prev = {}, today) {
  let streak = prev.streak || 0;
  let freezes = prev.freezes || 0;
  const last = prev.lastActiveDate || null;

  if (!last) {
    streak = 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap === 0) {
      // Same day — no change to streak or freezes.
      return { streak, freezes, lastActiveDate: today };
    } else if (gap === 1) {
      streak += 1;
    } else if (gap > 1) {
      if (freezes > 0) {
        freezes -= 1;
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      // gap < 0 (clock skew / out-of-order) — treat as same-day, no change.
      return { streak, freezes, lastActiveDate: last };
    }
  }

  // Grant a freeze whenever the streak reaches a 7-day multiple.
  if (streak > 0 && streak % 7 === 0) freezes += 1;

  return { streak, freezes, lastActiveDate: today };
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export const BADGES = {
  INNER_CIRCLE: 'Inner Circle', // all INNER-JOIN exercises gold
  LEFT_BEHIND: 'Left Behind', // solve the LEFT-JOIN IS NULL anti-join
  CARTOGRAPHER: 'Cartographer', // first CROSS JOIN
  NARCISSUS: 'Narcissus', // first SELF JOIN
  NO_HINTS_NEEDED: 'No Hints Needed', // clear a lesson with 0 hints
  FLAWLESS_VICTORY: 'Flawless Victory', // every exercise in a lesson first-try
  DETECTIVE: 'Detective', // solve the capstone
  PERFECT_RUN: 'Perfect Run', // all exercises gold
};

/**
 * Display metadata for every badge — an emblem (also carries a text name so
 * color/emoji is never the SOLE signal) and the unlock criterion. The profile
 * screen renders ALL of these; locked ones are greyed with the criterion shown.
 * Keyed by the badge's display name (the value stored in `progress.badges`).
 */
export const BADGE_META = {
  [BADGES.INNER_CIRCLE]: { emblem: '⭕', criteria: 'Solve every INNER-JOIN exercise at Gold.' },
  [BADGES.LEFT_BEHIND]: { emblem: '🫥', criteria: 'Solve the LEFT-JOIN “IS NULL” anti-join.' },
  [BADGES.CARTOGRAPHER]: { emblem: '🗺️', criteria: 'Run your first CROSS JOIN.' },
  [BADGES.NARCISSUS]: { emblem: '🪞', criteria: 'Solve your first SELF JOIN.' },
  [BADGES.NO_HINTS_NEEDED]: { emblem: '🧠', criteria: 'Clear a whole lesson using zero hints.' },
  [BADGES.FLAWLESS_VICTORY]: { emblem: '🏆', criteria: 'Solve every exercise in a lesson first-try.' },
  [BADGES.DETECTIVE]: { emblem: '🕵️', criteria: 'Crack the capstone mystery.' },
  [BADGES.PERFECT_RUN]: { emblem: '💎', criteria: 'Solve every exercise in the course at Gold.' },
};

/** Stable list of all badge display names, in presentation order. */
export const ALL_BADGES = [
  BADGES.NARCISSUS,
  BADGES.CARTOGRAPHER,
  BADGES.LEFT_BEHIND,
  BADGES.INNER_CIRCLE,
  BADGES.NO_HINTS_NEEDED,
  BADGES.FLAWLESS_VICTORY,
  BADGES.DETECTIVE,
  BADGES.PERFECT_RUN,
];

/**
 * Given a solve event + the (already updated) progress, return the list of NEW
 * badge names to award. Pure: callers add returned badges that aren't present.
 *
 * @param {object} event
 *   - exercise: the exercise just solved
 *   - lesson:   the lesson it belongs to
 *   - hintsUsed: number
 *   - lessonComplete: boolean   the lesson's required tiers are now all solved
 *   - lessonFirstTryAll: boolean every exercise in the lesson solved first-try
 *   - lessonNoHints: boolean    the lesson was cleared with 0 hints total
 *   - allGold: boolean          every authored exercise is now gold-solved
 *   - allInnerGold: boolean     every INNER-JOIN exercise is now gold-solved
 * @param {string[]} existingBadges
 * @returns {string[]} new badge names (not already owned)
 */
export function badgesForEvent(event = {}, existingBadges = []) {
  const owned = new Set(existingBadges);
  const out = [];
  const add = (b) => {
    if (!owned.has(b) && !out.includes(b)) out.push(b);
  };

  const ex = event.exercise || {};
  const tags = new Set(ex.tags || []);

  if (tags.has('self-join')) add(BADGES.NARCISSUS);
  if (tags.has('cross-join')) add(BADGES.CARTOGRAPHER);
  if (tags.has('anti-join')) add(BADGES.LEFT_BEHIND);
  if (event.capstone || tags.has('capstone')) add(BADGES.DETECTIVE);

  if (event.lessonComplete && event.lessonNoHints) add(BADGES.NO_HINTS_NEEDED);
  if (event.lessonComplete && event.lessonFirstTryAll) add(BADGES.FLAWLESS_VICTORY);

  if (event.allInnerGold) add(BADGES.INNER_CIRCLE);
  if (event.allGold) add(BADGES.PERFECT_RUN);

  return out;
}

// ---------------------------------------------------------------------------
// Progress orchestration (pure on the data, no I/O)
// ---------------------------------------------------------------------------

/** A stable key for an exercise within a lesson. */
export function exerciseKey(lessonId, exerciseIndex) {
  return `${lessonId}:${exerciseIndex}`;
}

/** A fresh, empty progress object. */
export function emptyProgress() {
  return {
    solvedExercises: {},
    xp: 0,
    level: LEVELS[0].name,
    streak: 0,
    freezes: 0,
    badges: [],
    lastActiveDate: null,
  };
}

/**
 * Apply a solve to a progress object (pure — returns a new progress object plus
 * the XP awarded and any newly earned badges). Re-solving a solved exercise is a
 * no-op award (0 XP), though streak/lastActiveDate still advance.
 *
 * @param {object} progress current progress
 * @param {object} solve
 *   - key: string             exerciseKey(lessonId, idx)
 *   - tier, firstTry, joinCore, hintsUsed, capstone
 *   - today: ISO date         for streak advance
 *   - event: object           extra badge-trigger context (see badgesForEvent)
 * @returns {{ progress, xpAwarded, newBadges }}
 */
export function applySolve(progress, solve = {}) {
  const p = {
    ...emptyProgress(),
    ...progress,
    solvedExercises: { ...(progress && progress.solvedExercises) },
    badges: [...((progress && progress.badges) || [])],
  };

  const alreadySolved = !!p.solvedExercises[solve.key];
  const xpAwarded = computeXp({
    tier: solve.tier,
    firstTry: solve.firstTry,
    joinCore: solve.joinCore,
    hintsUsed: solve.hintsUsed,
    capstone: solve.capstone,
    alreadySolved,
  });

  p.xp = Math.max(0, p.xp + xpAwarded);
  if (solve.key) p.solvedExercises[solve.key] = true;
  p.level = levelForXp(p.xp);

  // Streak advance (only meaningful with a date).
  if (solve.today) {
    const s = advanceStreak(
      { streak: p.streak, freezes: p.freezes, lastActiveDate: p.lastActiveDate },
      solve.today
    );
    p.streak = s.streak;
    p.freezes = s.freezes;
    p.lastActiveDate = s.lastActiveDate;
  }

  // Badges (only on a genuinely new solve).
  let newBadges = [];
  if (!alreadySolved) {
    newBadges = badgesForEvent(
      { ...(solve.event || {}), capstone: solve.capstone, exercise: (solve.event && solve.event.exercise) },
      p.badges
    );
    for (const b of newBadges) p.badges.push(b);
  }

  return { progress: p, xpAwarded, newBadges };
}

// ---------------------------------------------------------------------------
// Persistence (browser-only; feature-detected)
// ---------------------------------------------------------------------------

const STORE_KEY = 'anime-sql-academy:progress';
const IDB_NAME = 'anime-sql-academy';
const IDB_STORE = 'progress';

function hasIndexedDB() {
  return typeof globalThis !== 'undefined' && !!globalThis.indexedDB;
}
function hasLocalStorage() {
  try {
    return typeof globalThis !== 'undefined' && !!globalThis.localStorage;
  } catch {
    return false;
  }
}

function openProgressDB() {
  return new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) idb.createObjectStore(IDB_STORE);
      // The Phase-2 'sandbox' store may also exist; leave it untouched.
      if (!idb.objectStoreNames.contains('sandbox')) idb.createObjectStore('sandbox');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Load persisted progress (IndexedDB, then localStorage). Empty if none. */
export async function getProgress() {
  if (hasIndexedDB()) {
    try {
      const idb = await openProgressDB();
      try {
        const val = await new Promise((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(STORE_KEY);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (val) return { ...emptyProgress(), ...val };
      } finally {
        idb.close();
      }
    } catch {
      /* fall through to localStorage */
    }
  }
  if (hasLocalStorage()) {
    try {
      const raw = globalThis.localStorage.getItem(STORE_KEY);
      if (raw) return { ...emptyProgress(), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }
  return emptyProgress();
}

/** Persist progress (IndexedDB primary, localStorage fallback/mirror). */
export async function saveProgress(progress) {
  let ok = false;
  if (hasIndexedDB()) {
    try {
      const idb = await openProgressDB();
      try {
        await new Promise((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(progress, STORE_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        ok = true;
      } finally {
        idb.close();
      }
    } catch {
      /* fall through */
    }
  }
  if (hasLocalStorage()) {
    try {
      globalThis.localStorage.setItem(STORE_KEY, JSON.stringify(progress));
      ok = true;
    } catch {
      /* ignore */
    }
  }
  return ok;
}

/** Reset all progress to empty (and persist the empty state). */
export async function resetProgress() {
  const empty = emptyProgress();
  await saveProgress(empty);
  return empty;
}
