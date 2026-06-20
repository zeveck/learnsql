// Friendly error translation for the workbench.
//
// `friendlyError(error)` turns a structured runQuery error
//   { raw, type, message }
// into a learner-friendly string. Pure & importable under Node (no DOM) so the
// mapping + fuzzy suggestion are unit-tested in tests/results.test.mjs.
//
// `type` ∈ no_such_column | no_such_table | ambiguous_column | syntax | other
// (classified in js/db.js by substring-matching the SQLite message).

import { SCHEMA } from '../data/schema.js';

/** Levenshtein edit distance between two strings (iterative DP). */
export function levenshtein(a, b) {
  a = String(a);
  b = String(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/** Flat, de-duplicated list of every column name across all tables. */
export function allColumns(schema = SCHEMA) {
  const set = new Set();
  for (const table of Object.keys(schema)) {
    for (const col of schema[table]) set.add(col);
  }
  return [...set];
}

/** Sorted list of all table names. */
export function allTables(schema = SCHEMA) {
  return Object.keys(schema).sort();
}

/**
 * Best fuzzy suggestion for `name` among `candidates` within `maxDistance`
 * edits (case-insensitive). Returns the closest candidate or null.
 */
export function suggest(name, candidates, maxDistance = 2) {
  const target = String(name).toLowerCase();
  let best = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    const d = levenshtein(target, String(cand).toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  if (best !== null && bestDist <= maxDistance && bestDist > 0) return best;
  // Exact (case-insensitive) match isn't a useful suggestion.
  if (best !== null && bestDist === 0) return null;
  return null;
}

/**
 * Extract the offending identifier from a SQLite "no such X: TOKEN" message.
 * e.g. "no such column: powerlevel" → "powerlevel".
 */
export function extractOffender(raw, kind) {
  const re = new RegExp('no such ' + kind + ':\\s*([^\\s]+)', 'i');
  const m = String(raw).match(re);
  if (!m) return null;
  // SQLite may qualify it: characters.powerlevel → take the last segment.
  const tok = m[1].replace(/[`"';]/g, '');
  const parts = tok.split('.');
  return parts[parts.length - 1];
}

/** Extract the token after a "near" clause in a syntax error, if any. */
export function extractSyntaxToken(raw) {
  const m = String(raw).match(/near\s+"([^"]+)"/i);
  return m ? m[1] : null;
}

/**
 * Translate a structured error into a learner-friendly message.
 * @param {{raw?:string, type?:string, message?:string}} error
 * @param {object} [schema] defaults to the live SCHEMA
 * @returns {string}
 */
export function friendlyError(error, schema = SCHEMA) {
  if (!error) return 'Something went wrong.';
  const raw = String(error.raw != null ? error.raw : error.message != null ? error.message : error);
  const type = error.type || 'other';

  switch (type) {
    case 'no_such_column': {
      const col = extractOffender(raw, 'column');
      if (!col) return raw;
      const hit = suggest(col, allColumns(schema), 2);
      let msg = `There is no column \`${col}\`.`;
      if (hit) msg += ` Did you mean \`${hit}\`?`;
      return msg;
    }
    case 'no_such_table': {
      const table = extractOffender(raw, 'table');
      const tables = allTables(schema);
      const hit = table ? suggest(table, tables, 2) : null;
      let msg = table ? `There is no table \`${table}\`.` : 'No such table.';
      if (hit) msg += ` Did you mean \`${hit}\`?`;
      msg += ` Available tables: ${tables.join(', ')}.`;
      return msg;
    }
    case 'ambiguous_column': {
      // SQLite: "ambiguous column name: id"
      const m = raw.match(/ambiguous column name:\s*([^\s]+)/i);
      const col = m ? m[1].replace(/[`"';]/g, '') : 'that column';
      return (
        `The column \`${col}\` exists in more than one joined table. ` +
        `Qualify it with the table, e.g. \`characters.${col}\`.`
      );
    }
    case 'syntax': {
      const tok = extractSyntaxToken(raw);
      let msg = tok
        ? `Syntax error near \`${tok}\`.`
        : 'Syntax error in your SQL.';
      msg += ' Check for a missing comma, keyword, or closing quote/parenthesis.';
      return msg;
    }
    default:
      return raw;
  }
}
