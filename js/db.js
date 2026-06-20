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

// ---------------------------------------------------------------------------
// Phase 2 — seeded database layer.
//
// This module is importable in BOTH the browser (ES module) and Node (tests).
// The sql.js factory `SQL` is always passed in by the caller — never hardcoded
// here — so tests can supply getSQL() from tests/_sqljs.mjs while the browser
// supplies the result of initEngine(). IndexedDB-backed sandbox persistence is
// feature-detected so importing this module under Node does not crash.
// ---------------------------------------------------------------------------

import { SCHEMA_SQL, SEED_SQL } from '../data/schema.js';

// Module-level cache of the exported, seeded database image. Built once via
// getSeedBytes(); every freshDb()/resetDb() clones from this byte image rather
// than re-running the (large) seed SQL.
let seedBytes = null;

/**
 * Build the seeded database once and return its exported bytes (cached).
 * Foreign keys are left OFF (SQLite default) — a forgiving sandbox.
 * @param {object} SQL the sql.js factory (from initEngine / getSQL)
 * @returns {Uint8Array} the exported seeded database image
 */
export function getSeedBytes(SQL) {
  if (seedBytes === null) {
    const db = new SQL.Database();
    db.run(SCHEMA_SQL);
    db.run(SEED_SQL);
    seedBytes = db.export();
    db.close();
  }
  return seedBytes;
}

/**
 * Create a fresh seeded database by cloning the cached seed image.
 * No seed SQL is re-executed per call.
 * @param {object} SQL the sql.js factory
 * @returns {object} a new SQL.Database seeded from the cached image
 */
export function freshDb(SQL) {
  return new SQL.Database(getSeedBytes(SQL));
}

/**
 * Alias of freshDb: discard the current database and return a fresh clone.
 * @param {object} SQL the sql.js factory
 * @returns {object} a fresh seeded database
 */
export function resetDb(SQL) {
  return freshDb(SQL);
}

/**
 * Classify a SQLite error message into a coarse type, by substring match.
 * @param {string} message
 * @returns {'no_such_table'|'no_such_column'|'ambiguous_column'|'syntax'|'other'}
 */
function classifyError(message) {
  const m = String(message).toLowerCase();
  if (m.includes('no such table')) return 'no_such_table';
  if (m.includes('no such column')) return 'no_such_column';
  if (m.includes('ambiguous column name')) return 'ambiguous_column';
  if (m.includes('syntax error')) return 'syntax';
  return 'other';
}

/**
 * Run a SQL string against a database, capturing errors structurally.
 * Never throws.
 * @param {object} db an open SQL.Database
 * @param {string} sql the SQL to execute
 * @returns {{ok:true, results:Array<{columns:string[],values:any[][]}>, rowsModified:number}
 *          | {ok:false, error:{raw:string, type:string, message:string}}}
 */
export function runQuery(db, sql) {
  try {
    const results = db.exec(sql);
    const rowsModified = db.getRowsModified();
    return { ok: true, results, rowsModified };
  } catch (err) {
    const raw = String(err && err.message != null ? err.message : err);
    return {
      ok: false,
      error: { raw, type: classifyError(raw), message: raw },
    };
  }
}

// --- Sandbox persistence (browser-only; IndexedDB binary-native) -----------

const IDB_NAME = 'anime-sql-academy';
const IDB_STORE = 'sandbox';
const IDB_KEY = 'db';

/** True when IndexedDB is available (i.e. we're in a browser). */
function hasIndexedDB() {
  return typeof globalThis !== 'undefined' && !!globalThis.indexedDB;
}

/** Open (creating if needed) the sandbox IndexedDB.
 *
 * The DB version is shared with js/score.js (which adds a 'progress' store at
 * version 2). Both modules MUST open the same name at the same version and each
 * create any store it is missing in onupgradeneeded — otherwise the second
 * opener throws a VersionError. */
function openSandboxDB() {
  return new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE);
      }
      if (!idb.objectStoreNames.contains('progress')) {
        idb.createObjectStore('progress');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persist the current database to IndexedDB as raw bytes (not base64).
 * Browser-only — a no-op resolving to false when IndexedDB is absent.
 * @param {object} db an open SQL.Database
 * @returns {Promise<boolean>} true if persisted
 */
export async function saveSandbox(db) {
  if (!hasIndexedDB()) return false;
  const bytes = db.export();
  const idb = await openSandboxDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    idb.close();
  }
  return true;
}

/**
 * Restore a previously persisted sandbox database from IndexedDB.
 * Returns null when IndexedDB is absent or nothing was saved.
 * @param {object} SQL the sql.js factory
 * @returns {Promise<object|null>} a restored SQL.Database, or null
 */
export async function loadSandbox(SQL) {
  if (!hasIndexedDB()) return null;
  const idb = await openSandboxDB();
  let bytes;
  try {
    bytes = await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    idb.close();
  }
  if (!bytes) return null;
  return new SQL.Database(new Uint8Array(bytes));
}
