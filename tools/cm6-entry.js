// CodeMirror 6 vendoring entry point (dev-only — NEVER loaded by the site).
//
// This file re-exports exactly the CodeMirror APIs the editor needs. It is
// bundled ONCE into ./vendor/codemirror.bundle.js via:
//
//   npm run vendor:cm6
//
// esbuild produces a single self-contained ESM file, which guarantees exactly
// one instance of @codemirror/state (CodeMirror breaks if @codemirror/state is
// duplicated). The served site imports ONLY ./vendor/codemirror.bundle.js — it
// never touches node_modules and never a CDN. Re-run vendor:cm6 only to update
// CodeMirror.
export { EditorView, keymap, highlightSpecialChars, drawSelection } from '@codemirror/view';
export { EditorState } from '@codemirror/state';
export { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
export { sql } from '@codemirror/lang-sql';
export { autocompletion } from '@codemirror/autocomplete';
