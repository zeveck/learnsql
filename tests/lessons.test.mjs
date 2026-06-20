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
import { allExercises } from '../js/lessons.js';

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
