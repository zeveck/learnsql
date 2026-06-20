// Tiny zero-dependency test harness for Node-side logic tests.
// Tests register via test(name, fn); run-node.mjs imports the *.test.mjs files
// (which call test()), then runs the queue and reports pass/fail counts.

const queue = [];
let passed = 0;
let failed = 0;

/** Register a test. fn may be sync or async. */
export function test(name, fn) {
  queue.push({ name, fn });
}

/** Assert a condition is truthy. */
export function assert(cond, message) {
  if (!cond) {
    throw new Error(message || 'assertion failed');
  }
}

/** Deep structural equality (handles arrays, plain objects, primitives). */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

/** Assert deep equality, throwing a readable diff message on mismatch. */
export function assertEqual(actual, expected, message) {
  if (!deepEqual(actual, expected)) {
    throw new Error(
      (message ? message + '\n' : '') +
        '  expected: ' + JSON.stringify(expected) + '\n' +
        '  actual:   ' + JSON.stringify(actual)
    );
  }
}

/** Run all registered tests; returns { passed, failed }. */
export async function runAll() {
  for (const { name, fn } of queue) {
    try {
      await fn();
      passed++;
      console.log('  PASS  ' + name);
    } catch (err) {
      failed++;
      console.log('  FAIL  ' + name);
      console.log('        ' + String(err && err.stack ? err.stack : err).replace(/\n/g, '\n        '));
    }
  }
  return { passed, failed };
}
