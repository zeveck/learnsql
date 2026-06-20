import { test, assert, assertEqual } from './harness.mjs';
import { getSQL } from './_sqljs.mjs';

test('smoke SQL returns the exact expected result', async () => {
  const SQL = await getSQL();
  const db = new SQL.Database();
  db.run("CREATE TABLE t(a,b); INSERT INTO t VALUES (1,'Vash'),(2,'Spike');");
  const results = db.exec('SELECT * FROM t;');
  assert(results.length === 1, 'expected exactly one result set');
  assertEqual(results[0], {
    columns: ['a', 'b'],
    values: [
      [1, 'Vash'],
      [2, 'Spike'],
    ],
  });
  db.close();
});

test('sqlite_version() is >= 3.39', async () => {
  const SQL = await getSQL();
  const db = new SQL.Database();
  const res = db.exec('SELECT sqlite_version();');
  const version = res[0].values[0][0];
  db.close();

  const parts = String(version).split('.').map((n) => parseInt(n, 10));
  const min = [3, 39, 0];
  // Numeric dotted-part comparison: version >= 3.39.0
  let ge = true;
  for (let i = 0; i < min.length; i++) {
    const v = parts[i] || 0;
    if (v > min[i]) break;
    if (v < min[i]) {
      ge = false;
      break;
    }
  }
  assert(ge, `sqlite_version ${version} is below 3.39`);
});
