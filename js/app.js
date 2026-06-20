// Anime SQL Academy — Explore mode (Phase 3).
//
// The default route: a free-form SQL sandbox over the seeded anime database.
// CodeMirror editor (vendored bundle) + Run/Ctrl-Enter, result renderer with
// NULL badges, a clickable schema panel, a Reset button, and a "fresh each run"
// vs "persist my changes" (IndexedDB sandbox) toggle.

import {
  initEngine,
  freshDb,
  resetDb,
  runQuery,
  saveSandbox,
  loadSandbox,
} from './db.js';
import { createEditor } from './editor.js';
import { renderResults } from './results.js';
import { renderSchemaPanel } from './schema-panel.js';

const STARTER_SQL = "SELECT name, role FROM characters WHERE role='villain';";

async function main() {
  const statusEl = document.getElementById('status');
  const editorHost = document.getElementById('editor');
  const resultEl = document.getElementById('result');
  const schemaHost = document.getElementById('schema-panel');
  const runBtn = document.getElementById('run-btn');
  const resetBtn = document.getElementById('reset-btn');
  const persistToggle = document.getElementById('persist-toggle');

  let SQL;
  let db;

  try {
    SQL = await initEngine();
    // Try restoring a persisted sandbox; otherwise start fresh.
    const restored = await loadSandbox(SQL);
    db = restored || freshDb(SQL);
    if (restored) persistToggle.checked = true;
  } catch (err) {
    statusEl.textContent = 'Error loading SQL engine: ' + (err && err.message ? err.message : String(err));
    statusEl.classList.add('error');
    console.error(err);
    return;
  }

  statusEl.textContent = 'SQL engine ready. Write a query and press Run (or Ctrl/Cmd+Enter).';
  statusEl.classList.add('ready');
  statusEl.dataset.ready = 'true';

  // --- Editor -------------------------------------------------------------
  const editor = createEditor(editorHost, {
    doc: STARTER_SQL,
    onRun: () => run(),
  });

  // --- Schema panel -------------------------------------------------------
  renderSchemaPanel(schemaHost, {
    onInsert: (text) => editor.insertAtCursor(text),
  });

  // --- Run ----------------------------------------------------------------
  async function run() {
    const sql = editor.getValue().trim();
    if (!sql) {
      renderResults(resultEl, null);
      return;
    }
    // In "fresh each run" mode, reset the DB before each run so explorations
    // don't accumulate. In "persist" mode, keep the working DB and save it.
    if (!persistToggle.checked) {
      db.close();
      db = freshDb(SQL);
    }
    const outcome = runQuery(db, sql);
    renderResults(resultEl, outcome);
    if (persistToggle.checked && outcome.ok) {
      try {
        await saveSandbox(db);
      } catch (e) {
        console.warn('sandbox save failed', e);
      }
    }
  }

  runBtn.addEventListener('click', () => run());

  // --- Reset --------------------------------------------------------------
  resetBtn.addEventListener('click', async () => {
    db.close();
    db = resetDb(SQL);
    if (persistToggle.checked) {
      try {
        await saveSandbox(db);
      } catch (e) {
        console.warn('sandbox save failed', e);
      }
    }
    renderResults(resultEl, null);
    statusEl.textContent = 'Database reset to its original seeded state.';
  });

  // --- Persist toggle -----------------------------------------------------
  persistToggle.addEventListener('change', async () => {
    if (persistToggle.checked) {
      try {
        await saveSandbox(db);
      } catch (e) {
        console.warn('sandbox save failed', e);
      }
    }
  });

  editor.focus();
}

main();
