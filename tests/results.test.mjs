// Unit tests for the pure result/error helpers (no DOM, runnable under Node).

import { test, assert, assertEqual } from './harness.mjs';
import { friendlyError, levenshtein, suggest } from '../js/errors.js';
import { escapeHtml, isUnmatchedRow, unmatchedRowFlags } from '../js/results.js';

// --- friendlyError: per type --------------------------------------------

test('friendlyError: no_such_column reports the column with a fuzzy suggestion', () => {
  const msg = friendlyError({
    type: 'no_such_column',
    raw: 'no such column: powerlevel',
  });
  assert(msg.includes('powerlevel'), 'mentions the bad column: ' + msg);
  // SCHEMA has no exact "powerlevel"; nothing within edit distance 2, so no
  // misleading suggestion. But a near-miss SHOULD suggest.
});

test('friendlyError: no_such_column suggests a close real column', () => {
  // "titel" is one edit from "title" (anime.title).
  const msg = friendlyError({ type: 'no_such_column', raw: 'no such column: titel' });
  assert(msg.includes('titel'), 'mentions bad column');
  assert(msg.includes('title'), 'suggests "title": ' + msg);
});

test('friendlyError: no_such_table lists available tables and suggests', () => {
  const msg = friendlyError({ type: 'no_such_table', raw: 'no such table: charcters' });
  assert(msg.includes('charcters'), 'mentions bad table');
  assert(msg.includes('characters'), 'suggests characters: ' + msg);
  // Lists available tables.
  assert(msg.includes('Available tables:'), 'lists tables: ' + msg);
  assert(msg.includes('studios'), 'lists a real table: ' + msg);
});

test('friendlyError: ambiguous_column tells you to qualify it', () => {
  const msg = friendlyError({ type: 'ambiguous_column', raw: 'ambiguous column name: id' });
  assert(msg.includes('id'), 'mentions the column');
  assert(/qualify/i.test(msg), 'says to qualify: ' + msg);
  assert(msg.includes('characters.id') || msg.includes('.id'), 'shows qualified form: ' + msg);
});

test('friendlyError: syntax surfaces the offending token + a hint', () => {
  const msg = friendlyError({ type: 'syntax', raw: 'near "FORM": syntax error' });
  assert(msg.includes('FORM'), 'shows offending token: ' + msg);
  assert(/comma|keyword|quote|paren/i.test(msg), 'gives a hint: ' + msg);
});

test('friendlyError: other returns the raw message', () => {
  const raw = 'database disk image is malformed';
  const msg = friendlyError({ type: 'other', raw });
  assertEqual(msg, raw);
});

// --- Levenshtein / suggest ----------------------------------------------

test('levenshtein computes edit distance', () => {
  assertEqual(levenshtein('title', 'title'), 0);
  assertEqual(levenshtein('titl', 'title'), 1); // one insertion
  assertEqual(levenshtein('titel', 'title'), 2); // transposition = 2 in plain Levenshtein
  assertEqual(levenshtein('kitten', 'sitting'), 3);
});

test('suggest returns the closest within maxDistance, null if none/exact', () => {
  assertEqual(suggest('titel', ['title', 'role', 'name'], 2), 'title');
  assertEqual(suggest('xyzzy', ['title', 'role', 'name'], 2), null);
  // Exact match is not a useful suggestion.
  assertEqual(suggest('name', ['title', 'role', 'name'], 2), null);
});

// --- escapeHtml ----------------------------------------------------------

test('escapeHtml escapes all dangerous characters', () => {
  assertEqual(escapeHtml(`<script>"&'`), '&lt;script&gt;&quot;&amp;&#39;');
});

test('escapeHtml returns empty string for null/undefined', () => {
  assertEqual(escapeHtml(null), '');
  assertEqual(escapeHtml(undefined), '');
});

test('escapeHtml stringifies numbers', () => {
  assertEqual(escapeHtml(42), '42');
  assertEqual(escapeHtml(0), '0');
});

// --- unmatched-row detection --------------------------------------------

test('isUnmatchedRow flags a row whose right-table cols are all NULL', () => {
  // columns: [c.name, va.name] ; right table = voice_actors (index 1).
  const columnTables = ['characters', 'voice_actors'];
  const rightTables = ['voice_actors'];
  assert(isUnmatchedRow(['Wolfwood', null], columnTables, rightTables), 'all right cols NULL → unmatched');
  assert(!isUnmatchedRow(['Spike', 'Koichi Yamadera'], columnTables, rightTables), 'right col present → matched');
});

test('isUnmatchedRow requires at least one right column to exist', () => {
  // No column belongs to the right table → never "unmatched".
  assert(!isUnmatchedRow(['Vash', null], ['characters', 'characters'], ['voice_actors']));
});

test('isUnmatchedRow needs EVERY right col NULL (mixed → matched)', () => {
  const columnTables = ['characters', 'voice_actors', 'voice_actors'];
  const rightTables = ['voice_actors'];
  // one right col present, one NULL → matched (not all NULL).
  assert(!isUnmatchedRow(['X', 'Y', null], columnTables, rightTables));
  // both right cols NULL → unmatched.
  assert(isUnmatchedRow(['X', null, null], columnTables, rightTables));
});

test('unmatchedRowFlags maps over a {columns,values} result with the supplied map', () => {
  const result = {
    columns: ['name', 'va'],
    values: [
      ['Spike', 'Koichi Yamadera'],
      ['Wolfwood', null],
      ['Ein', null],
    ],
  };
  const flags = unmatchedRowFlags(result, ['characters', 'voice_actors'], ['voice_actors']);
  assertEqual(flags, [false, true, true]);
});

test('unmatchedRowFlags returns all-false when the map is absent (Explore mode)', () => {
  const result = { columns: ['name', 'va'], values: [['Wolfwood', null]] };
  assertEqual(unmatchedRowFlags(result, undefined, undefined), [false]);
});
