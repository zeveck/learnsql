// Result renderer for the workbench.
//
// renderResults(container, queryOutcome, opts) handles the three shapes that
// db.js's runQuery can return, plus the opt-in JOIN-teaching visualizations.
//
// The PURE helpers (escapeHtml, isUnmatchedRow, unmatchedRowFlags) carry no DOM
// dependency and are importable under Node for tests/results.test.mjs. The
// friendlyError mapping lives in js/errors.js (also pure).

import { friendlyError } from './errors.js';

/** Maximum rows rendered before the "show all" toggle appears. */
export const DISPLAY_CAP = 200;

/**
 * HTML-escape a value for safe insertion as text. NULL/undefined return ''
 * here; the renderer substitutes a dedicated NULL badge so a NULL is never a
 * blank cell.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * JOIN-teaching unmatched-row detector.
 *
 * Given a single result row (array of cell values), the per-column source-table
 * map `columnTables` (result-column-index → source table name), and the set of
 * "right" table names `rightTables`, return true iff EVERY column that belongs
 * to a right table is NULL (and at least one such column exists). This is how a
 * LEFT/OUTER JOIN's "no match on the right" rows are highlighted.
 *
 * CAVEAT (pedagogy heuristic, NOT a parser): this presumes curated lesson data.
 * A genuinely matched right row whose selected columns happen to all be NULL
 * would be mislabeled "unmatched". It is therefore used ONLY in lesson mode,
 * when the caller explicitly supplies columnTables + rightTables. Explore mode
 * omits the map → plain table, no coloring, no unmatched flags.
 *
 * @param {Array<*>} row
 * @param {Array<string>} columnTables
 * @param {Array<string>} rightTables
 * @returns {boolean}
 */
export function isUnmatchedRow(row, columnTables, rightTables) {
  if (!Array.isArray(columnTables) || !Array.isArray(rightTables)) return false;
  const rightSet = new Set(rightTables);
  let sawRightCol = false;
  for (let i = 0; i < columnTables.length; i++) {
    if (rightSet.has(columnTables[i])) {
      sawRightCol = true;
      if (row[i] !== null && row[i] !== undefined) return false;
    }
  }
  return sawRightCol;
}

/**
 * Compute the unmatched flag for every row in a {columns, values} result.
 * @returns {boolean[]} one flag per row (all false when the map is absent)
 */
export function unmatchedRowFlags(result, columnTables, rightTables) {
  if (!result || !Array.isArray(result.values)) return [];
  return result.values.map((row) => isUnmatchedRow(row, columnTables, rightTables));
}

// --- DOM rendering ---------------------------------------------------------

/** Stable color palette keyed by source-table name (for header coloring). */
const TABLE_COLORS = [
  '#ff5c8a', '#5cc8ff', '#9eff6b', '#ffd45c', '#c98aff',
  '#ff9e5c', '#6bffd4', '#ff6bb5', '#8a9eff', '#b5ff6b',
  '#ffb55c', '#6bd4ff', '#d46bff', '#5cffa0',
];

/** Deterministically assign a color to each distinct table name. */
function colorMap(columnTables) {
  const map = new Map();
  let i = 0;
  for (const t of columnTables) {
    if (t == null) continue;
    if (!map.has(t)) {
      map.set(t, TABLE_COLORS[i % TABLE_COLORS.length]);
      i++;
    }
  }
  return map;
}

/** Build the inner HTML for one {columns, values} result set. */
function tableHtml(result, opts, state) {
  const { columnTables, rightTables } = opts;
  const colors = Array.isArray(columnTables) ? colorMap(columnTables) : null;
  const flags = unmatchedRowFlags(result, columnTables, rightTables);

  const headCells = result.columns
    .map((c, idx) => {
      if (colors && columnTables[idx] != null) {
        const color = colors.get(columnTables[idx]);
        return `<th style="border-bottom:3px solid ${color}" title="${escapeHtml(columnTables[idx])}">${escapeHtml(c)}</th>`;
      }
      return `<th>${escapeHtml(c)}</th>`;
    })
    .join('');

  const total = result.values.length;
  const showAll = !!state.showAll;
  const limit = showAll ? total : Math.min(DISPLAY_CAP, total);

  let bodyRows = '';
  for (let r = 0; r < limit; r++) {
    const row = result.values[r];
    const cls = flags[r] ? ' class="unmatched"' : '';
    const cells = row
      .map((cell) =>
        cell === null || cell === undefined
          ? '<td><span class="null">NULL</span></td>'
          : `<td>${escapeHtml(cell)}</td>`
      )
      .join('');
    bodyRows += `<tr${cls}>${cells}</tr>`;
  }

  let html = `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;

  // Legend for color-coded source tables.
  if (colors && colors.size > 0) {
    const legend = [...colors.entries()]
      .map(
        ([t, color]) =>
          `<span class="legend-item"><span class="swatch" style="background:${color}"></span>${escapeHtml(t)}</span>`
      )
      .join('');
    html += `<div class="legend">${legend}</div>`;
  }

  // Display cap notice + show-all toggle.
  if (total > DISPLAY_CAP) {
    if (!showAll) {
      html += `<div class="cap-notice">Showing ${DISPLAY_CAP} of ${total} rows. ` +
        `<button type="button" class="show-all-btn">Show all</button></div>`;
    } else {
      html += `<div class="cap-notice">Showing all ${total} rows. ` +
        `<button type="button" class="show-all-btn" data-collapse="1">Show first ${DISPLAY_CAP}</button></div>`;
    }
  }
  return html;
}

/**
 * Render a queryOutcome (from runQuery) into `container`.
 *
 * @param {HTMLElement} container
 * @param {object} outcome  runQuery result:
 *   { ok:true, results:[{columns,values}], rowsModified } | { ok:false, error }
 * @param {object} [opts]
 *   - columnTables: Array<string>  result-column-index → source table (lesson mode)
 *   - rightTables:  Array<string>  tables whose all-NULL rows are "unmatched"
 */
export function renderResults(container, outcome, opts = {}) {
  if (!container) return;
  container.innerHTML = '';

  if (!outcome) {
    container.innerHTML = '<div class="result-empty">No query run yet.</div>';
    return;
  }

  if (outcome.ok === false) {
    const msg = friendlyError(outcome.error);
    const div = document.createElement('div');
    div.className = 'result-error';
    div.textContent = msg;
    container.appendChild(div);
    return;
  }

  const results = outcome.results || [];

  // DML / no-row statements: report rows modified.
  if (results.length === 0) {
    const n = outcome.rowsModified || 0;
    const div = document.createElement('div');
    div.className = 'result-info';
    div.textContent = `${n} row(s) modified.`;
    container.appendChild(div);
    return;
  }

  // Per-result-set show-all state, kept on a closure so the toggle re-renders.
  const states = results.map(() => ({ showAll: false }));

  function paint() {
    container.innerHTML = results
      .map((res, i) => `<div class="result-set" data-set="${i}">${tableHtml(res, opts, states[i])}</div>`)
      .join('');
    container.querySelectorAll('.show-all-btn').forEach((btn) => {
      const setEl = btn.closest('.result-set');
      const idx = setEl ? Number(setEl.getAttribute('data-set')) : 0;
      btn.addEventListener('click', () => {
        states[idx].showAll = !states[idx].showAll;
        paint();
      });
    });
  }
  paint();
}
