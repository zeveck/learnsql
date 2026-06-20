// CodeMirror 6 editor wrapper for the SQL workbench.
//
// Imports ONLY the vendored, self-contained bundle (./vendor/codemirror.bundle.js)
// — never node_modules, never a CDN. The bundle is produced by `npm run vendor:cm6`
// (see tools/cm6-entry.js) and committed.
//
// @codemirror/lang-sql is fed the SCHEMA object so table/column names autocomplete,
// keywords upper-case as you type, and Mod-Enter (Ctrl/Cmd-Enter) runs the query.

import {
  EditorView,
  EditorState,
  keymap,
  highlightSpecialChars,
  drawSelection,
  history,
  defaultKeymap,
  historyKeymap,
  sql,
  autocompletion,
} from '../vendor/codemirror.bundle.js';

import { SCHEMA } from '../data/schema.js';

/**
 * Build a schema descriptor for @codemirror/lang-sql autocomplete.
 * lang-sql accepts `schema` as { tableName: [columnNames...] }.
 */
function sqlSchema() {
  // SCHEMA is already { table: [cols] }; clone defensively.
  const out = {};
  for (const t of Object.keys(SCHEMA)) out[t] = SCHEMA[t].slice();
  return out;
}

/**
 * Create a CodeMirror SQL editor.
 *
 * @param {HTMLElement} parent  host element
 * @param {object} [options]
 *   - doc: string            initial document
 *   - onRun: (sql) => void   called on Mod-Enter with the current value
 * @returns {{ view, getValue, setValue, focus }}
 */
export function createEditor(parent, options = {}) {
  const { doc = '', onRun } = options;

  const runKeymap = keymap.of([
    {
      key: 'Mod-Enter',
      preventDefault: true,
      run: (view) => {
        if (typeof onRun === 'function') onRun(view.state.doc.toString());
        return true;
      },
    },
  ]);

  const state = EditorState.create({
    doc,
    extensions: [
      highlightSpecialChars(),
      drawSelection(),
      history(),
      autocompletion(),
      sql({ schema: sqlSchema(), upperCaseKeywords: true }),
      runKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.theme(
        {
          // 16px content avoids iOS focus-zoom (Safari zooms inputs < 16px).
          '&': { backgroundColor: '#11122a', color: '#e8e8f0', height: '100%', fontSize: '16px' },
          '.cm-content': { caretColor: '#a78bfa', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
          '.cm-cursor': { borderLeftColor: '#a78bfa' },
          '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.04)' },
          '.cm-gutters': { backgroundColor: '#11122a', color: '#6a6b90', border: 'none' },
          '.cm-tooltip': { backgroundColor: '#1b1c33', border: '1px solid #33345a' },
          '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: '#33345a', color: '#fff' },
        },
        { dark: true }
      ),
    ],
  });

  const view = new EditorView({ state, parent });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    },
    /** Insert text at the current selection/cursor (used by the schema panel). */
    insertAtCursor: (text) => {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    },
    focus: () => view.focus(),
  };
}
