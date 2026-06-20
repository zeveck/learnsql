// Validator tests (Phase 4): every diagnosis class, order rules, alias-agnostic,
// SELECT * policy, soft nudge, and the DML correct/incorrect/error paths.

import { test, assert, assertEqual } from './harness.mjs';
import { getSQL } from './_sqljs.mjs';
import {
  checkAnswer,
  expectedFor,
  compareResults,
  computeNudge,
  normalizeCell,
} from '../js/validate.js';

// --- Pure comparison unit tests (no DB) -----------------------------------

test('compare: identical multisets are correct (order-insensitive)', () => {
  const a = { columns: ['x'], values: [[1], [2], [3]] };
  const b = { columns: ['x'], values: [[3], [1], [2]] };
  assertEqual(compareResults(a, b, false), { correct: true, diagnosis: 'correct' });
});

test('compare: column-count mismatch -> wrong_columns (SELECT * policy)', () => {
  const a = { columns: ['name', 'role', 'id'], values: [['Vash', 'hero', 1]] };
  const b = { columns: ['name', 'role'], values: [['Vash', 'hero']] };
  assertEqual(compareResults(a, b, false), { correct: false, diagnosis: 'wrong_columns' });
});

test('compare: actual superset -> extra_rows', () => {
  const a = { columns: ['x'], values: [[1], [2], [3]] };
  const b = { columns: ['x'], values: [[1], [2]] };
  assertEqual(compareResults(a, b, false), { correct: false, diagnosis: 'extra_rows' });
});

test('compare: actual subset -> missing_rows', () => {
  const a = { columns: ['x'], values: [[1]] };
  const b = { columns: ['x'], values: [[1], [2]] };
  assertEqual(compareResults(a, b, false), { correct: false, diagnosis: 'missing_rows' });
});

test('compare: no overlap -> disjoint', () => {
  const a = { columns: ['x'], values: [[9], [8]] };
  const b = { columns: ['x'], values: [[1], [2]] };
  assertEqual(compareResults(a, b, false), { correct: false, diagnosis: 'disjoint' });
});

test('compare: orderMatters reordered-equal -> order_only', () => {
  const a = { columns: ['x'], values: [[2], [1], [3]] };
  const b = { columns: ['x'], values: [[1], [2], [3]] };
  assertEqual(compareResults(a, b, true), { correct: false, diagnosis: 'order_only' });
});

test('compare: orderMatters correct order -> correct', () => {
  const a = { columns: ['x'], values: [[1], [2], [3]] };
  const b = { columns: ['x'], values: [[1], [2], [3]] };
  assertEqual(compareResults(a, b, true), { correct: true, diagnosis: 'correct' });
});

test('compare: order_only is unreachable when orderMatters is false', () => {
  // Same multiset, different order, but order doesn't matter -> correct.
  const a = { columns: ['x'], values: [[2], [1]] };
  const b = { columns: ['x'], values: [[1], [2]] };
  assertEqual(compareResults(a, b, false), { correct: true, diagnosis: 'correct' });
});

test('normalizeCell: no cross-type coercion ("8000" !== 8000)', () => {
  assert(normalizeCell('8000') !== normalizeCell(8000), 'string and number must differ');
  const a = { columns: ['x'], values: [['8000']] };
  const b = { columns: ['x'], values: [[8000]] };
  assert(!compareResults(a, b, false).correct, 'quoted int must not match int');
});

test('normalizeCell: strings are trimmed; NULL has its own sentinel', () => {
  assertEqual(normalizeCell('  hi  '), 'hi');
  assert(normalizeCell(null) !== 'null', 'null sentinel must not equal string "null"');
  const a = { columns: ['x'], values: [[null]] };
  const b = { columns: ['x'], values: [[null]] };
  assert(compareResults(a, b, false).correct, 'NULL matches NULL');
});

test('computeNudge: missing requiredKeyword -> nudge string; present -> null', () => {
  const ex = { requiredKeywords: ['join'] };
  assert(computeNudge(ex, 'SELECT * FROM t') != null, 'missing keyword nudges');
  assert(computeNudge(ex, 'SELECT * FROM a JOIN b ON a.id=b.id') == null, 'present keyword no nudge');
  // Comment-stripped: a keyword only present in a comment still nudges.
  assert(computeNudge(ex, 'SELECT * FROM t -- join') != null, 'keyword in comment ignored');
});

// --- query exercises against the real DB ----------------------------------

const QUERY_EX = {
  kind: 'query',
  solution: 'SELECT name, role FROM characters WHERE role = \'villain\';',
  orderMatters: false,
  requiredKeywords: ['where'],
};

test('query: correct answer -> correct:true', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, "SELECT name, role FROM characters WHERE role='villain';");
  assert(r.correct === true, 'should be correct: ' + JSON.stringify(r));
});

test('query: alias-agnostic (SELECT name AS n still matches)', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, "SELECT name AS n, role AS r FROM characters WHERE role='villain';");
  assert(r.correct === true, 'aliases must not break the match: ' + JSON.stringify(r));
});

test('query: SELECT * over-columns -> wrong_columns', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, "SELECT * FROM characters WHERE role='villain';");
  assert(r.correct === false, 'SELECT * must fail');
  assertEqual(r.diagnosis, 'wrong_columns');
});

test('query: extra rows (missing WHERE) -> extra_rows', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, 'SELECT name, role FROM characters;');
  assert(r.correct === false);
  assertEqual(r.diagnosis, 'extra_rows');
});

test('query: missing rows (over-tight WHERE) -> missing_rows', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, "SELECT name, role FROM characters WHERE role='villain' AND name='Vicious';");
  assert(r.correct === false);
  assertEqual(r.diagnosis, 'missing_rows');
});

test('query: disjoint result -> disjoint', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, "SELECT name, role FROM characters WHERE role='hero';");
  assert(r.correct === false);
  assertEqual(r.diagnosis, 'disjoint');
});

test('query: syntax error -> correct:false with friendly error', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, QUERY_EX, 'SELECT FROM WHERE;');
  assert(r.correct === false);
  assert(r.diagnosis === 'error');
  assert(typeof r.message === 'string' && r.message.length > 0);
});

test('query: orderMatters reordered -> order_only diagnosis', async () => {
  const SQL = await getSQL();
  const ex = {
    kind: 'query',
    solution: 'SELECT name FROM characters WHERE role=\'villain\' ORDER BY name ASC;',
    orderMatters: true,
  };
  // Same rows, reverse order.
  const r = checkAnswer(SQL, ex, "SELECT name FROM characters WHERE role='villain' ORDER BY name DESC;");
  assert(r.correct === false, 'reordered should not be correct');
  assertEqual(r.diagnosis, 'order_only');
});

test('query: correct-but-keyword-missing -> nudge set, stays correct', async () => {
  const SQL = await getSQL();
  const ex = {
    kind: 'query',
    // Solution finds villains via a JOIN-free query, but the lesson wants WHERE.
    solution: "SELECT name FROM characters WHERE role='villain';",
    orderMatters: false,
    requiredKeywords: ['having'], // intentionally absent from the natural answer
  };
  const r = checkAnswer(SQL, ex, "SELECT name FROM characters WHERE role='villain';");
  assert(r.correct === true, 'still correct');
  assert(typeof r.nudge === 'string' && r.nudge.length > 0, 'nudge present');
});

// --- DML exercises ---------------------------------------------------------

const DML_EX = {
  kind: 'dml',
  solution: "UPDATE characters SET voice_actor_id=2 WHERE name='Nicholas D. Wolfwood';",
  verifySql: "SELECT voice_actor_id FROM characters WHERE name='Nicholas D. Wolfwood';",
  expectRowsModified: 1,
  requiredKeywords: ['update'],
};

test('dml: correct mutation -> correct via verifySql', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, DML_EX, "UPDATE characters SET voice_actor_id=2 WHERE name='Nicholas D. Wolfwood';");
  assert(r.correct === true, 'correct mutation should validate: ' + JSON.stringify(r));
});

test('dml: wrong value mutation -> incorrect', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, DML_EX, "UPDATE characters SET voice_actor_id=5 WHERE name='Nicholas D. Wolfwood';");
  assert(r.correct === false, 'wrong value must fail');
});

test('dml: no/zero-row mutation -> incorrect (rows-modified guard)', async () => {
  const SQL = await getSQL();
  // Targets a non-existent character -> 0 rows modified.
  const r = checkAnswer(SQL, DML_EX, "UPDATE characters SET voice_actor_id=2 WHERE name='Nobody At All';");
  assert(r.correct === false, 'no-op mutation must fail');
});

test('dml: broken mutation -> incorrect + error', async () => {
  const SQL = await getSQL();
  const r = checkAnswer(SQL, DML_EX, "UPDATE characters SET voice_actor_id=2 WHERE nam='x';");
  assert(r.correct === false, 'broken mutation must fail');
  assertEqual(r.diagnosis, 'error');
  assert(typeof r.message === 'string' && r.message.length > 0);
});

test('dml: expectedFor returns the canonical post-mutation verify result', async () => {
  const SQL = await getSQL();
  const exp = expectedFor(SQL, DML_EX);
  assertEqual(exp.values, [[2]]);
  assertEqual(exp.rowsModified, 1);
});

test('dml: a fresh clone is used per check (no leakage between checks)', async () => {
  const SQL = await getSQL();
  // First a successful mutation, then a no-op: the second must NOT see the first.
  checkAnswer(SQL, DML_EX, "UPDATE characters SET voice_actor_id=2 WHERE name='Nicholas D. Wolfwood';");
  const r = checkAnswer(SQL, DML_EX, "UPDATE characters SET voice_actor_id=2 WHERE name='Nobody At All';");
  assert(r.correct === false, 'state must not leak across checks');
});
