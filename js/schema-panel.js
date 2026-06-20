// Schema / relationship panel.
//
// Renders every table from SCHEMA with its columns, marking primary keys (PK)
// and foreign keys (FK) from RELATIONSHIPS. Clicking a table inserts its name
// at the editor cursor; clicking a column inserts `table.column`. A
// highlightTables(names) hook spotlights tables (used by lessons + FK emphasis).

import { SCHEMA, RELATIONSHIPS } from '../data/schema.js';

/**
 * Heuristic primary-key detection for the schema panel display.
 * - Single-column tables with an `id` column → `id` is the PK.
 * - Junction tables (no `id`) → the leading *_id columns form a composite PK.
 * This mirrors the DDL well enough for a visual marker; it is not used for any
 * query logic.
 */
function primaryKeyCols(table, cols) {
  if (cols.includes('id')) return new Set(['id']);
  // Composite PK: the *_id columns (the join keys).
  const pk = cols.filter((c) => c.endsWith('_id'));
  return new Set(pk.length ? pk : []);
}

/** Map of fromTable.fromCol → relationship descriptor for FK markers. */
function fkIndex() {
  const idx = new Map();
  for (const rel of RELATIONSHIPS) {
    idx.set(rel.fromTable + '.' + rel.fromCol, rel);
  }
  return idx;
}

/**
 * Render the schema panel into `container`.
 *
 * @param {HTMLElement} container
 * @param {object} [opts]
 *   - onInsert: (text) => void   called with the snippet to insert at the cursor
 * @returns {{ highlightTables: (names:string[]) => void }}
 */
export function renderSchemaPanel(container, opts = {}) {
  const onInsert = typeof opts.onInsert === 'function' ? opts.onInsert : () => {};
  const fks = fkIndex();

  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'schema-list';

  for (const table of Object.keys(SCHEMA)) {
    const cols = SCHEMA[table];
    const pk = primaryKeyCols(table, cols);

    const tableEl = document.createElement('div');
    tableEl.className = 'schema-table';
    tableEl.dataset.table = table;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'schema-table-name';
    header.textContent = table;
    header.title = `Insert "${table}" at the cursor`;
    header.addEventListener('click', () => onInsert(table));
    tableEl.appendChild(header);

    const colList = document.createElement('ul');
    colList.className = 'schema-cols';
    for (const col of cols) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'schema-col';
      btn.dataset.col = col;

      const name = document.createElement('span');
      name.className = 'col-name';
      name.textContent = col;
      btn.appendChild(name);

      const markers = [];
      if (pk.has(col)) markers.push('PK');
      const rel = fks.get(table + '.' + col);
      if (rel) markers.push('FK→' + rel.toTable);
      if (markers.length) {
        const tag = document.createElement('span');
        tag.className = 'col-marker';
        tag.textContent = markers.join(' ');
        btn.appendChild(tag);
      }

      btn.title = `Insert "${table}.${col}" at the cursor`;
      btn.addEventListener('click', () => onInsert(table + '.' + col));
      li.appendChild(btn);
      colList.appendChild(li);
    }
    tableEl.appendChild(colList);
    wrap.appendChild(tableEl);
  }

  container.appendChild(wrap);

  return {
    /** Add the `highlighted` class to the named tables (clear it from others). */
    highlightTables(names) {
      const set = new Set(names || []);
      container.querySelectorAll('.schema-table').forEach((el) => {
        el.classList.toggle('highlighted', set.has(el.dataset.table));
      });
    },
  };
}
