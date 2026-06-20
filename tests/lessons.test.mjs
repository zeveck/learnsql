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
import { allExercises, getLesson, LESSONS } from '../js/lessons.js';

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

// (i.b) The JOIN-core lessons are gated AFTER lesson 6 (play/gating order is by id).
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
