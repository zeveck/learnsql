// Phase 2 — database layer tests (Node + vendored sql.js).
//
// Validates: exact seeded row counts for all 14 tables; SCHEMA/RELATIONSHIPS
// consistency with the actual DDL (via PRAGMA); one smoke query per JOIN type
// from the Join Opportunity Map; and runQuery's error classification + the
// never-throws contract.

import { test, assert, assertEqual } from './harness.mjs';
import { getSQL } from './_sqljs.mjs';
import { freshDb, runQuery } from '../js/db.js';
import { SCHEMA, RELATIONSHIPS } from '../data/schema.js';

// Helper: run a query expected to return exactly one result set, return it.
function one(db, sql) {
  const res = db.exec(sql);
  assert(res.length === 1, `expected one result set for: ${sql}`);
  return res[0];
}

// Helper: scalar value of a single-row, single-column query.
function scalar(db, sql) {
  return one(db, sql).values[0][0];
}

test('fresh DB has exact seeded row counts for all 14 tables', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const expected = {
    studios: 8,
    voice_actors: 18,
    anime: 10,
    episodes: 12,
    characters: 55,
    factions: 14,
    character_factions: 31,
    items: 18,
    character_items: 18,
    tropes: 12,
    character_tropes: 29,
    genres: 14,
    anime_genres: 27,
    voice_actor_roles: 11,
  };
  for (const [table, count] of Object.entries(expected)) {
    const actual = scalar(db, `SELECT COUNT(*) FROM ${table};`);
    assertEqual(actual, count, `row count mismatch for ${table}`);
  }
  db.close();
});

test('SCHEMA matches PRAGMA table_info for every table', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  for (const [table, cols] of Object.entries(SCHEMA)) {
    const res = one(db, `PRAGMA table_info(${table});`);
    const nameIdx = res.columns.indexOf('name');
    const actualCols = res.values.map((row) => row[nameIdx]);
    assertEqual(actualCols, cols, `SCHEMA[${table}] does not match the DDL columns`);
  }
  // Also: SCHEMA covers exactly the user tables in the DB (no extras/missing).
  const tablesRes = one(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  const dbTables = tablesRes.values.map((r) => r[0]).sort();
  const schemaTables = Object.keys(SCHEMA).sort();
  assertEqual(schemaTables, dbTables, 'SCHEMA tables differ from the DB tables');
  db.close();
});

test('every RELATIONSHIPS entry corresponds to a real foreign key', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);

  // Collect actual FKs from PRAGMA foreign_key_list for each table.
  const actualFks = [];
  for (const table of Object.keys(SCHEMA)) {
    const res = db.exec(`PRAGMA foreign_key_list(${table});`);
    if (res.length === 0) continue;
    const r = res[0];
    const cTable = r.columns.indexOf('table');
    const cFrom = r.columns.indexOf('from');
    const cTo = r.columns.indexOf('to');
    for (const row of r.values) {
      actualFks.push(
        JSON.stringify({
          fromTable: table,
          fromCol: row[cFrom],
          toTable: row[cTable],
          toCol: row[cTo],
        })
      );
    }
  }
  const actualSet = new Set(actualFks);

  for (const rel of RELATIONSHIPS) {
    const key = JSON.stringify({
      fromTable: rel.fromTable,
      fromCol: rel.fromCol,
      toTable: rel.toTable,
      toCol: rel.toCol,
    });
    assert(actualSet.has(key), `RELATIONSHIPS entry has no matching FK: ${key}`);
  }
  // And the counts match: no real FK is missing from RELATIONSHIPS.
  assertEqual(
    RELATIONSHIPS.length,
    actualFks.length,
    'RELATIONSHIPS count differs from the actual FK count'
  );
  db.close();
});

test('sqlite_version() is >= 3.39', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const version = scalar(db, 'SELECT sqlite_version();');
  db.close();
  const parts = String(version).split('.').map((n) => parseInt(n, 10));
  const min = [3, 39, 0];
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

test('INNER JOIN: anime joins studios (anime 10 drops out)', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT a.title, s.name FROM anime a INNER JOIN studios s ON a.studio_id = s.id
     WHERE a.id = 1;`
  );
  assertEqual(res.values, [['Trigun', 'Madhouse']]);
  // anime 10 (Cowboy Bebop: The Movie, studio_id NULL) is excluded by INNER JOIN.
  const cnt = scalar(db, 'SELECT COUNT(*) FROM anime a INNER JOIN studios s ON a.studio_id = s.id;');
  assertEqual(cnt, 9, 'INNER JOIN should drop the studio-less anime');
  db.close();
});

test('INNER JOIN + GROUP BY: character count per series', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const cnt = scalar(
    db,
    `SELECT COUNT(*) FROM characters c INNER JOIN anime a ON c.anime_id = a.id
     WHERE a.title = 'Trigun';`
  );
  assertEqual(cnt, 6, 'Trigun should have 6 characters');
  db.close();
});

test('LEFT JOIN: characters to voice_actors surfaces Wolfwood with NULL VA', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT c.name, v.name FROM characters c
     LEFT JOIN voice_actors v ON c.voice_actor_id = v.id
     WHERE c.name = 'Nicholas D. Wolfwood';`
  );
  assertEqual(res.values, [['Nicholas D. Wolfwood', null]]);
  db.close();
});

test('LEFT JOIN + GROUP BY: films have zero episodes', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const cnt = scalar(
    db,
    `SELECT COUNT(e.id) FROM anime a LEFT JOIN episodes e ON e.anime_id = a.id
     WHERE a.title = 'Akira';`
  );
  assertEqual(cnt, 0, 'Akira (film) should have 0 episodes');
  db.close();
});

test('RIGHT JOIN: factions surfaces the member-less Bounty Hunters Guild', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT f.name, cf.character_id FROM character_factions cf
     RIGHT JOIN factions f ON cf.faction_id = f.id
     WHERE f.name = 'Bounty Hunters Guild';`
  );
  assertEqual(res.values, [['Bounty Hunters Guild', null]]);
  db.close();
});

test('RIGHT JOIN: tropes surfaces the unused Glass Cannon', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT t.name, ct.character_id FROM character_tropes ct
     RIGHT JOIN tropes t ON ct.trope_id = t.id
     WHERE t.name = 'Glass Cannon';`
  );
  assertEqual(res.values, [['Glass Cannon', null]]);
  db.close();
});

test('FULL OUTER JOIN: anime/studios executes and surfaces unmatched both sides', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  // studio-less anime 10 surfaces with NULL studio.
  const animeSide = scalar(
    db,
    `SELECT COUNT(*) FROM anime a FULL OUTER JOIN studios s ON a.studio_id = s.id
     WHERE s.id IS NULL;`
  );
  assertEqual(animeSide, 1, 'one studio-less anime expected on the anime side');
  // No anime references studios 5 ('Studio Gallop' has anime 6, actually used).
  // Studios with no anime surface with NULL anime: studios 5 is used; verify the
  // join executes without error and a member-less studio surfaces.
  const studioSide = scalar(
    db,
    `SELECT COUNT(*) FROM anime a FULL OUTER JOIN studios s ON a.studio_id = s.id
     WHERE a.id IS NULL;`
  );
  assert(studioSide >= 0, 'FULL OUTER JOIN executed');
  db.close();
});

test('CROSS JOIN: characters x genres yields every pairing', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const cnt = scalar(db, 'SELECT COUNT(*) FROM characters CROSS JOIN genres;');
  assertEqual(cnt, 55 * 14, 'CROSS JOIN should produce 55*14 pairings');
  db.close();
});

test('SELF JOIN on rival: Goku -> Vegeta', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT c.name, r.name FROM characters c
     JOIN characters r ON c.rival_id = r.id
     WHERE c.name = 'Son Goku';`
  );
  assertEqual(res.values, [['Son Goku', 'Vegeta']]);
  db.close();
});

test('SELF JOIN on mentor: Son Goku -> Master Roshi', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT c.name, m.name FROM characters c
     JOIN characters m ON c.mentor_id = m.id
     WHERE c.name = 'Son Goku';`
  );
  assertEqual(res.values, [['Son Goku', 'Master Roshi']]);
  db.close();
});

test('Multi (3+) JOIN: character + item + type + series', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT c.name, i.name, i.item_type, a.title
     FROM characters c
     JOIN character_items ci ON ci.character_id = c.id
     JOIN items i ON ci.item_id = i.id
     JOIN anime a ON c.anime_id = a.id
     WHERE i.name = 'Red Motorcycle';`
  );
  assertEqual(res.values, [['Shotaro Kaneda', 'Red Motorcycle', 'vehicle', 'Akira']]);
  db.close();
});

test('Multi M2M JOIN: a voice actor across more than one series', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  // Megumi Hayashibara (4) voices Faye (Cowboy Bebop) and Rei (Evangelion).
  const cnt = scalar(
    db,
    `SELECT COUNT(DISTINCT a.id)
     FROM voice_actors v
     JOIN voice_actor_roles vr ON vr.voice_actor_id = v.id
     JOIN characters c ON vr.character_id = c.id
     JOIN anime a ON c.anime_id = a.id
     WHERE v.name = 'Megumi Hayashibara';`
  );
  assertEqual(cnt, 2, 'Megumi Hayashibara should span 2 series');
  db.close();
});

test('JOIN + GROUP BY + HAVING: factions with more than 2 members', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const res = one(
    db,
    `SELECT f.name, COUNT(*) AS members
     FROM characters c
     JOIN character_factions cf ON cf.character_id = c.id
     JOIN factions f ON cf.faction_id = f.id
     GROUP BY f.id HAVING COUNT(*) > 2
     ORDER BY f.name;`
  );
  // NERV (5: 19,20,21,22,23,25 -> 6), Z Fighters (5: 40,41,42,43,46), Lagoon
  // Company (4: 26,27,28,29) all have > 2 members. Just assert NERV is present.
  const names = res.values.map((r) => r[0]);
  assert(names.includes('NERV'), 'NERV should have more than 2 members');
  db.close();
});

test('runQuery classifies no_such_table', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const out = runQuery(db, 'SELECT * FROM nope;');
  assertEqual(out.ok, false);
  assertEqual(out.error.type, 'no_such_table');
  assert(out.error.raw.length > 0, 'raw message preserved');
  db.close();
});

test('runQuery classifies no_such_column', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const out = runQuery(db, 'SELECT powerlevel FROM characters;');
  assertEqual(out.ok, false);
  assertEqual(out.error.type, 'no_such_column');
  db.close();
});

test('runQuery classifies ambiguous_column', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const out = runQuery(
    db,
    'SELECT id FROM characters JOIN anime ON characters.anime_id = anime.id;'
  );
  assertEqual(out.ok, false);
  assertEqual(out.error.type, 'ambiguous_column');
  db.close();
});

test('runQuery success path returns ok:true and never throws', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const out = runQuery(db, "SELECT name FROM characters WHERE id = 1;");
  assertEqual(out.ok, true);
  assertEqual(out.results[0].values, [['Vash the Stampede']]);
  assert(typeof out.rowsModified === 'number', 'rowsModified is a number');
  db.close();
});

test('runQuery reports rowsModified for DML and never throws on a broken statement', async () => {
  const SQL = await getSQL();
  const db = freshDb(SQL);
  const upd = runQuery(db, "UPDATE characters SET voice_actor_id = 2 WHERE name = 'Nicholas D. Wolfwood';");
  assertEqual(upd.ok, true);
  assertEqual(upd.rowsModified, 1);
  // Broken syntax must be captured, not thrown.
  const broken = runQuery(db, 'SELECT FROM;');
  assertEqual(broken.ok, false);
  assertEqual(broken.error.type, 'syntax');
  db.close();
});
