// Shared Node-side sql.js loader.
//
// Node's CJS->ESM interop lets us default-import the UMD build. The crucial
// difference from the browser: locateFile MUST return an ABSOLUTE path, because
// sql.js resolves a relative return value against process.cwd() (not this file),
// which would ENOENT when tests run from a different cwd. fileURLToPath gives a
// portable absolute path (vs the non-portable URL.pathname on Windows).

import initSqlJs from '../vendor/sql-wasm.js';
import { fileURLToPath } from 'node:url';

let sqlPromise = null;

/** Initialize and cache the SQL factory for Node tests. */
export function getSQL() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (f) => fileURLToPath(new URL('../vendor/' + f, import.meta.url)),
    });
  }
  return sqlPromise;
}
