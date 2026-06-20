// Node test runner: import every tests/*.test.mjs (each registers tests via the
// harness), run them all, print counts, and exit non-zero on any failure.

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runAll } from './harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const testFiles = readdirSync(here)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

for (const f of testFiles) {
  console.log('\n# ' + f);
  await import(join(here, f));
}

const { passed, failed } = await runAll();

console.log('\n----------------------------------------');
console.log(`Total: ${passed + failed}  Passed: ${passed}  Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
