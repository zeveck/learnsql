// Minimal engine bootstrap for Phase 1.
//
// In the browser, sql.js is loaded as a classic UMD <script> in index.html,
// which sets `globalThis.initSqlJs`. We read it from there. The wasm binary is
// resolved page-relative via `locateFile` (./vendor/sql-wasm.wasm).
//
// Note: the Node-side loader (tests/_sqljs.mjs) does NOT reuse this module —
// it imports the UMD default and uses an ABSOLUTE locateFile, because sql.js
// resolves a relative locateFile against process.cwd() under Node.

/**
 * Initialize the sql.js engine and return the SQL factory
 * (the object exposing `Database`).
 * @returns {Promise<object>} the SQL factory
 */
export async function initEngine() {
  const initSqlJs = globalThis.initSqlJs;
  if (typeof initSqlJs !== 'function') {
    throw new Error(
      'globalThis.initSqlJs is not available — ensure vendor/sql-wasm.js is ' +
      'loaded as a classic <script> before this module.'
    );
  }
  const SQL = await initSqlJs({ locateFile: (f) => './vendor/' + f });
  return SQL;
}
