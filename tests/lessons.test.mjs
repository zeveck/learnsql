// Shared mechanical lesson guard (Phase 4; extended by Phases 5-7).
//
// For every authored exercise, in a FRESH seeded clone, assert the contract
// (a)-(f) from the plan:
//   (a) query solution runs + checkAnswer(solution) -> correct
//   (b) dml solution + verifySql run + checkAnswer(solution) -> correct
//   (c) expected result non-empty unless allowEmpty:true
//   (d) requiredKeywords actually appear in the solution
//   (e) columnTables.length == solution column count (when present)
//   (f) order determinism for orderMatters:true (PRAGMA reverse_unordered_selects)

import { test, assert } from './harness.mjs';
import { getSQL } from './_sqljs.mjs';
import { freshDb, runQuery } from '../js/db.js';
import { checkAnswer, expectedFor, stripComments } from '../js/validate.js';
import {
  allExercises,
  getLesson,
  getLessonBySlug,
  LESSONS,
  lessonUnlocked,
  lessonComplete,
  lessonTierState,
  lessonSolvedCount,
  lessonMap,
} from '../js/lessons.js';
import { applySolve, emptyProgress, exerciseKey, BADGES } from '../js/score.js';

function lastResult(outcome) {
  const results = (outcome.ok && outcome.results) || [];
  return results.length ? results[results.length - 1] : { columns: [], values: [] };
}

for (const { lesson, exercise, index } of allExercises()) {
  const label = `lesson ${lesson.id} (${lesson.slug}) exercise #${index} [${exercise.tier}/${exercise.kind}]`;

  test(`${label}: solution validates as correct`, async () => {
    const SQL = await getSQL();

    // (a)/(b) solution runs and checkAnswer(solution) -> correct.
    const db = freshDb(SQL);
    try {
      const solOutcome = runQuery(db, exercise.solution);
      assert(solOutcome.ok, `solution failed to run: ${solOutcome.ok ? '' : solOutcome.error.raw}`);
      if (exercise.kind === 'dml') {
        const ver = runQuery(db, exercise.verifySql);
        assert(ver.ok, `verifySql failed to run: ${ver.ok ? '' : ver.error.raw}`);
      }
    } finally {
      db.close();
    }

    const verdict = checkAnswer(SQL, exercise, exercise.solution);
    assert(verdict.correct === true, `checkAnswer(solution) not correct: ${JSON.stringify(verdict)}`);

    // (c) expected non-empty unless allowEmpty.
    const expected = expectedFor(SQL, exercise);
    if (!exercise.allowEmpty) {
      assert(expected.values.length > 0, 'expected result is empty (set allowEmpty:true if intended)');
    }

    // (d) requiredKeywords appear in the (comment-stripped, lower-cased) solution.
    if (Array.isArray(exercise.requiredKeywords)) {
      const hay = stripComments(exercise.solution).toLowerCase();
      for (const kw of exercise.requiredKeywords) {
        assert(hay.includes(String(kw).toLowerCase()), `solution is missing requiredKeyword "${kw}"`);
      }
    }

    // (e) columnTables length matches the solution's column count.
    if (Array.isArray(exercise.columnTables)) {
      const cols = exercise.kind === 'dml' ? expected.columns : expected.columns;
      assert(
        exercise.columnTables.length === cols.length,
        `columnTables length ${exercise.columnTables.length} != column count ${cols.length}`
      );
    }

    // (f) order determinism for orderMatters:true.
    if (exercise.orderMatters && exercise.kind === 'query') {
      const d1 = freshDb(SQL);
      const d2 = freshDb(SQL);
      try {
        const normal = lastResult(runQuery(d1, exercise.solution));
        runQuery(d2, 'PRAGMA reverse_unordered_selects=ON;');
        const reversed = lastResult(runQuery(d2, exercise.solution));
        assert(
          JSON.stringify(normal.values) === JSON.stringify(reversed.values),
          'order is not fully determined by ORDER BY (reverse_unordered_selects changed the output)'
        );
      } finally {
        d1.close();
        d2.close();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Phase 6 — JOIN-core lessons (7-12): tagging + canonical-exercise presence.
//
// These assertions guarantee the badges + Join Opportunity Map have the
// exercises they depend on (Phase 4 js/score.js keys badges on exercise tags
// and the all-INNER-gold roll-up; the lesson map relies on these constructs).
// ---------------------------------------------------------------------------

/** Lower-cased, comment-stripped solution text for a lesson's exercises. */
function lessonSolutions(lesson) {
  return (lesson.exercises || []).map((e) => stripComments(e.solution || '').toLowerCase());
}

/** Does any exercise in the lesson carry the given tag? */
function lessonHasTag(lesson, tag) {
  return (lesson.exercises || []).some((e) => Array.isArray(e.tags) && e.tags.includes(tag));
}

// (i) Lessons 7-12 exist and are all flagged joinCore:true.
test('Phase 6: lessons 7-12 load and are all tagged joinCore', () => {
  for (let id = 7; id <= 12; id++) {
    const lesson = getLesson(id);
    assert(lesson, `lesson ${id} is not registered`);
    assert(lesson.joinCore === true, `lesson ${id} (${lesson.slug}) is not joinCore:true`);
    assert((lesson.exercises || []).length >= 4, `lesson ${id} should have >= 4 exercises`);
  }
});

// (i.b) The JOIN-core lessons sort AFTER lesson 6 (suggested play order is by id;
// this is presentation order on the map, not a gate — every lesson is openable).
test('Phase 6: JOIN-core lessons 7-12 sort after lesson 6', () => {
  const order = LESSONS.map((l) => l.id);
  const idx6 = order.indexOf(6);
  for (let id = 7; id <= 12; id++) {
    assert(order.indexOf(id) > idx6, `lesson ${id} must be ordered after lesson 6`);
  }
});

// (ii) Each canonical badge/map exercise is present.

// Lesson 7 — INNER JOIN exercises support "Inner Circle" (all-INNER gold).
test('Phase 6: lesson 7 has INNER JOIN query exercises (Inner Circle)', () => {
  const l7 = getLesson(7);
  const innerQueries = (l7.exercises || []).filter(
    (e) => e.kind === 'query' && stripComments(e.solution || '').toLowerCase().includes('join')
  );
  assert(innerQueries.length >= 2, 'lesson 7 needs INNER JOIN query exercises for the Inner Circle badge');
});

// Lesson 8 — the LEFT-JOIN IS NULL anti-join (badge "Left Behind"), tagged anti-join.
test('Phase 6: lesson 8 has the LEFT JOIN IS NULL anti-join (Left Behind)', () => {
  const l8 = getLesson(8);
  assert(lessonHasTag(l8, 'anti-join'), 'lesson 8 must tag an exercise anti-join (Left Behind badge)');
  const hasAntiJoin = lessonSolutions(l8).some(
    (s) => s.includes('left join') && s.includes('is null')
  );
  assert(hasAntiJoin, 'lesson 8 must contain a LEFT JOIN ... IS NULL anti-join solution');
});

// Lesson 9 — a CROSS JOIN exercise (badge "Cartographer"), tagged cross-join.
test('Phase 6: lesson 9 has a CROSS JOIN (Cartographer)', () => {
  const l9 = getLesson(9);
  assert(lessonHasTag(l9, 'cross-join'), 'lesson 9 must tag an exercise cross-join (Cartographer badge)');
  assert(
    lessonSolutions(l9).some((s) => s.includes('cross join')),
    'lesson 9 must contain a CROSS JOIN solution'
  );
});

// Lesson 10 — a SELF JOIN exercise (badge "Narcissus"), tagged self-join.
test('Phase 6: lesson 10 has a SELF JOIN (Narcissus)', () => {
  const l10 = getLesson(10);
  assert(lessonHasTag(l10, 'self-join'), 'lesson 10 must tag an exercise self-join (Narcissus badge)');
  // A self join references the characters table at least twice.
  const hasSelfJoin = lessonSolutions(l10).some((s) => {
    const matches = s.match(/characters/g) || [];
    return s.includes('join') && matches.length >= 2;
  });
  assert(hasSelfJoin, 'lesson 10 must contain a SELF JOIN solution (characters joined to itself)');
});

// Lesson 11 — a 3+-table join (Multi-table joins).
test('Phase 6: lesson 11 has a 3+-table join', () => {
  const l11 = getLesson(11);
  const hasMulti = lessonSolutions(l11).some((s) => (s.match(/\bjoin\b/g) || []).length >= 2);
  assert(hasMulti, 'lesson 11 must contain a multi-table (3+) join solution (>= 2 JOIN keywords)');
});

// Lesson 12 — a JOIN + GROUP BY aggregate.
test('Phase 6: lesson 12 has a JOIN + GROUP BY aggregate', () => {
  const l12 = getLesson(12);
  const hasJoinGroup = lessonSolutions(l12).some(
    (s) => s.includes('join') && s.includes('group by')
  );
  assert(hasJoinGroup, 'lesson 12 must contain a JOIN + GROUP BY solution');
});

// ---------------------------------------------------------------------------
// Phase 7 — advanced lessons (13-15) + the capstone mystery.
// ---------------------------------------------------------------------------

const CAPSTONE = getLessonBySlug('capstone-tournament-murder');

// (i) Lessons 13-15 load with >= 4 exercises and the right headline construct.
test('Phase 7: lessons 13-15 load with content', () => {
  for (const id of [13, 14, 15]) {
    const lesson = getLesson(id);
    assert(lesson, `lesson ${id} is not registered`);
    assert((lesson.exercises || []).length >= 4, `lesson ${id} should have >= 4 exercises`);
  }
  // Subqueries use a nested SELECT; CTEs use WITH.
  assert(
    lessonSolutions(getLesson(13)).some((s) => /\(\s*select/.test(s)),
    'lesson 13 must contain a subquery (a nested SELECT)'
  );
  assert(
    lessonSolutions(getLesson(14)).some((s) => s.includes('with ')),
    'lesson 14 must contain a CTE (WITH ...)'
  );
});

// (i.b) Lesson 15 uses dml exercises with verifySql (the headline assertion).
test('Phase 7: lesson 15 exercises are dml with verifySql', () => {
  const l15 = getLesson(15);
  const dmls = (l15.exercises || []).filter((e) => e.kind === 'dml');
  assert(dmls.length >= 4, 'lesson 15 must have >= 4 dml exercises');
  for (const e of dmls) {
    assert(typeof e.verifySql === 'string' && e.verifySql.trim(), 'every lesson-15 dml needs a verifySql SELECT');
  }
  // Cover INSERT, UPDATE, and DELETE across the lesson.
  const sols = dmls.map((e) => stripComments(e.solution || '').toLowerCase());
  assert(sols.some((s) => s.includes('insert')), 'lesson 15 must cover INSERT');
  assert(sols.some((s) => s.includes('update')), 'lesson 15 must cover UPDATE');
  assert(sols.some((s) => s.includes('delete')), 'lesson 15 must cover DELETE');
});

// (ii) The capstone's final exercise solution returns a non-empty UNIQUE culprit.
test('Phase 7: capstone final solution returns exactly one unique culprit', async () => {
  const SQL = await getSQL();
  assert(CAPSTONE, 'the capstone lesson must be registered');
  const finalEx = CAPSTONE.exercises[CAPSTONE.exercises.length - 1];
  assert(finalEx.kind === 'query', 'the capstone final exercise must be a query');

  const expected = expectedFor(SQL, finalEx);
  assert(expected.values.length === 1, `capstone final must return exactly 1 row, got ${expected.values.length}`);
  assert(expected.columns.length === 1, 'capstone final must return a single (name) column');
  assert(expected.values[0][0] === 'Makoto Shishio', `unexpected culprit: ${JSON.stringify(expected.values[0])}`);

  // The canonical solution validates as correct via the existing comparison.
  const verdict = checkAnswer(SQL, finalEx, finalEx.solution);
  assert(verdict.correct === true, `capstone solution not correct: ${JSON.stringify(verdict)}`);
});

// (iii) Solving the capstone awards 300 XP + the "Detective" badge via js/score.js.
test('Phase 7: solving the capstone awards 300 XP + Detective badge', () => {
  assert(CAPSTONE, 'the capstone lesson must be registered');
  const lastIdx = CAPSTONE.exercises.length - 1;
  const finalEx = CAPSTONE.exercises[lastIdx];
  // The final exercise carries the capstone tag the scorer keys on.
  assert(
    Array.isArray(finalEx.tags) && finalEx.tags.includes('capstone'),
    'the capstone final exercise must be tagged capstone'
  );

  const before = emptyProgress();
  const { progress, xpAwarded, newBadges } = applySolve(before, {
    key: exerciseKey(CAPSTONE.id, lastIdx),
    tier: finalEx.tier,
    capstone: true,
    today: '2026-06-20',
    event: { exercise: finalEx },
  });

  assert(xpAwarded === 300, `capstone should award 300 XP, got ${xpAwarded}`);
  assert(progress.xp === 300, `progress XP should be 300, got ${progress.xp}`);
  assert(newBadges.includes(BADGES.DETECTIVE), `capstone should award the Detective badge, got ${JSON.stringify(newBadges)}`);
  assert(progress.badges.includes(BADGES.DETECTIVE), 'Detective badge must be recorded in progress');
});

// ---------------------------------------------------------------------------
// Phase 9 — access model: every lesson (incl. the capstone) is freely openable
// in any order, with NO sequential gating and NO intra-lesson tier lock. The
// helpers describe PROGRESS only (for the card completion indicators).
// ---------------------------------------------------------------------------

// (iv) The capstone — and every lesson — is accessible regardless of progress.
test('Phase 9: every lesson (incl. capstone) is accessible with NO progress', () => {
  assert(CAPSTONE, 'the capstone lesson must be registered');
  const keyFn = exerciseKey;

  // With no progress at all, nothing is locked — including the capstone.
  for (const lesson of LESSONS) {
    assert(
      lessonUnlocked(lesson, {}, keyFn) === true,
      `lesson ${lesson.id} must be accessible with empty progress (no gating)`
    );
  }
  assert(
    lessonUnlocked(CAPSTONE, {}, keyFn) === true,
    'capstone must be OPENABLE with empty progress (no lock)'
  );

  // The map view reports every lesson as unlocked and (with empty progress) not
  // complete — the indicators are pure readouts, never gates.
  const map = lessonMap({}, keyFn);
  assert(map.length === LESSONS.length, 'lessonMap must cover every lesson');
  for (const entry of map) {
    assert(entry.unlocked === true, `lessonMap entry ${entry.lesson.id} must be unlocked`);
    assert(entry.complete === false, `lessonMap entry ${entry.lesson.id} must not be complete with empty progress`);
  }
});

// (v) Per-tier medal state + complete state are driven by REAL solved progress.
test('Phase 9: lesson card medal/complete state reflects seeded progress', () => {
  const keyFn = exerciseKey;
  const lesson = getLesson(1); // lesson 1: bronze(0), silver(1), silver(2), gold(3)
  const tiers0 = (lesson.exercises || []).map((e) => e.tier);
  assert(tiers0[0] === 'bronze' && tiers0[3] === 'gold', 'fixture assumes lesson 1 tier layout');

  // Nothing solved -> no medal done, not complete, 0/N counter.
  const none = lessonTierState(lesson, {}, keyFn);
  assert(none.bronze.present && !none.bronze.done, 'bronze present but not done at zero progress');
  assert(none.silver.present && !none.silver.done && none.silver.total === 2, 'silver: 2 exercises, none done');
  assert(none.gold.present && !none.gold.done, 'gold present but not done at zero progress');
  assert(lessonComplete(lesson, {}, keyFn) === false, 'lesson 1 not complete at zero progress');
  assert(lessonSolvedCount(lesson, {}, keyFn).solved === 0, 'counter starts at 0');

  // Solve the bronze only -> 🥉 lights, 🥈/🥇 stay dark, counter 1/total.
  const solvedBronze = { [keyFn(1, 0)]: true };
  const t1 = lessonTierState(lesson, solvedBronze, keyFn);
  assert(t1.bronze.done === true, 'bronze medal lights when the bronze exercise is solved');
  assert(t1.silver.done === false, 'silver stays dark until BOTH silvers are solved');
  assert(t1.gold.done === false, 'gold stays dark until the gold is solved');
  const c1 = lessonSolvedCount(lesson, solvedBronze, keyFn);
  assert(c1.solved === 1 && c1.total === tiers0.length, `counter should be 1/${tiers0.length}`);

  // Solve ONE of the two silvers -> silver still NOT done (needs both).
  const oneSilver = { [keyFn(1, 0)]: true, [keyFn(1, 1)]: true };
  assert(lessonTierState(lesson, oneSilver, keyFn).silver.done === false, 'silver needs BOTH silver exercises');
  assert(lessonTierState(lesson, oneSilver, keyFn).silver.solved === 1, 'silver solved count = 1 of 2');

  // Solve both silvers -> silver lights.
  const bothSilver = { [keyFn(1, 0)]: true, [keyFn(1, 1)]: true, [keyFn(1, 2)]: true };
  assert(lessonTierState(lesson, bothSilver, keyFn).silver.done === true, 'silver lights when both silvers solved');

  // Solve all four -> all medals done AND lessonComplete true.
  const all = { [keyFn(1, 0)]: true, [keyFn(1, 1)]: true, [keyFn(1, 2)]: true, [keyFn(1, 3)]: true };
  const tAll = lessonTierState(lesson, all, keyFn);
  assert(tAll.bronze.done && tAll.silver.done && tAll.gold.done, 'all three medals light when every exercise solved');
  assert(lessonComplete(lesson, all, keyFn) === true, '✓ Complete when every exercise is solved');
  assert(lessonSolvedCount(lesson, all, keyFn).solved === tiers0.length, 'counter shows all solved');
});
