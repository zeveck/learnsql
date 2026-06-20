// Lesson 15 — INSERT / UPDATE / DELETE (Phase 7).
//
// The three data-mutation statements. Each exercise uses the `dml` exercise kind:
// the learner's mutation runs on a fresh clone, then a `verifySql` SELECT proves
// the change. The recurring lesson: the WHERE clause is what keeps a mutation
// surgical — a missing WHERE on UPDATE/DELETE touches EVERY row.

export default {
  id: 15,
  slug: 'insert-update-delete',
  title: 'INSERT / UPDATE / DELETE',
  tables: ['characters', 'items', 'character_items', 'character_factions', 'episodes'],
  concept: `
    <p>So far you have only <em>read</em> data. These three statements <em>change</em>
    it:</p>
    <ul>
      <li><code>INSERT INTO t (cols...) VALUES (...);</code> — add a new row.</li>
      <li><code>UPDATE t SET col = val WHERE ...;</code> — change existing rows.</li>
      <li><code>DELETE FROM t WHERE ...;</code> — remove rows.</li>
    </ul>
    <p><strong>The <code>WHERE</code> clause is everything.</strong> An
    <code>UPDATE</code> or <code>DELETE</code> with no <code>WHERE</code> hits
    <em>every row in the table</em>. Always scope the change to exactly the rows you
    mean. (In SQL strings, escape a literal apostrophe by doubling it:
    <code>'Vash''s revolver'</code>.)</p>
  `,
  exercises: [
    {
      kind: 'dml',
      tier: 'bronze',
      prompt:
        'A new weapon turns up at the crime scene. <code>INSERT</code> a row into ' +
        '<code>items</code> with <code>name</code> ' +
        "<strong>Battousai's Wakizashi</strong>, <code>item_type</code> " +
        "<strong>weapon</strong>, and <code>description</code> " +
        '<strong>A short companion blade</strong>.',
      starter:
        "INSERT INTO items (name, item_type, description)\nVALUES ('____', '____', '____');",
      solution:
        "INSERT INTO items (name, item_type, description) VALUES ('Battousai''s Wakizashi', 'weapon', 'A short companion blade');",
      verifySql:
        "SELECT name, item_type, description FROM items WHERE name = 'Battousai''s Wakizashi';",
      expectRowsModified: 1,
      requiredKeywords: ['insert', 'values'],
      hints: [
        'INSERT INTO items (name, item_type, description) VALUES (...).',
        "Escape the apostrophe by doubling it: 'Battousai''s Wakizashi'.",
        "Answer: INSERT INTO items (name, item_type, description) VALUES ('Battousai''s Wakizashi', 'weapon', 'A short companion blade');",
      ],
      commonMistake:
        "List the columns you supply, and double any apostrophe inside a string literal.",
    },
    {
      kind: 'dml',
      tier: 'silver',
      prompt:
        'After a heel-turn, Vegeta is no longer a clear-cut rival villain. ' +
        '<code>UPDATE</code> his <code>role</code> in <code>characters</code> to ' +
        '<strong>anti-hero</strong> — matching on his exact <code>name</code> so ' +
        'only that one row changes.',
      starter:
        "UPDATE characters SET role = '____' WHERE name = '____';",
      solution:
        "UPDATE characters SET role = 'anti-hero' WHERE name = 'Vegeta';",
      verifySql:
        "SELECT role FROM characters WHERE name = 'Vegeta';",
      expectRowsModified: 1,
      requiredKeywords: ['update', 'set', 'where'],
      hints: [
        'UPDATE characters SET role = ... .',
        "Scope it with WHERE name = 'Vegeta' so exactly one row changes.",
        "Answer: UPDATE characters SET role = 'anti-hero' WHERE name = 'Vegeta';",
      ],
      commonMistake:
        'Without the WHERE clause this UPDATE would rewrite the role of EVERY character.',
    },
    {
      kind: 'dml',
      tier: 'silver',
      prompt:
        'Meryl re-counts her hidden derringers. <code>UPDATE</code> the ' +
        '<code>quantity</code> in <code>character_items</code> to <strong>7</strong> ' +
        'for the exact row <code>character_id = 4</code> and ' +
        '<code>item_id = 3</code>.',
      starter:
        "UPDATE character_items SET quantity = ____ WHERE character_id = ____ AND item_id = ____;",
      solution:
        "UPDATE character_items SET quantity = 7 WHERE character_id = 4 AND item_id = 3;",
      verifySql:
        "SELECT quantity FROM character_items WHERE character_id = 4 AND item_id = 3;",
      expectRowsModified: 1,
      requiredKeywords: ['update', 'set', 'where'],
      hints: [
        'The junction row is keyed by BOTH character_id and item_id.',
        'WHERE character_id = 4 AND item_id = 3 pins exactly one row.',
        'Answer: UPDATE character_items SET quantity = 7 WHERE character_id = 4 AND item_id = 3;',
      ],
      commonMistake:
        'A composite-key row needs both key columns in the WHERE to target just it.',
    },
    {
      kind: 'dml',
      tier: 'gold',
      prompt:
        'Ryoji Kaji’s cover is blown, so strike his SEELE membership. ' +
        '<code>DELETE</code> the row in <code>character_factions</code> where ' +
        '<code>character_id = 25</code> and <code>faction_id = 7</code> — and ' +
        '<strong>only</strong> that row.',
      starter:
        "DELETE FROM character_factions WHERE character_id = ____ AND faction_id = ____;",
      solution:
        "DELETE FROM character_factions WHERE character_id = 25 AND faction_id = 7;",
      verifySql:
        "SELECT COUNT(*) AS remaining FROM character_factions WHERE character_id = 25 AND faction_id = 7;",
      expectRowsModified: 1,
      requiredKeywords: ['delete', 'where'],
      hints: [
        'DELETE FROM character_factions WHERE ... .',
        'Target the single membership row with both keys: character_id = 25 AND faction_id = 7.',
        'Answer: DELETE FROM character_factions WHERE character_id = 25 AND faction_id = 7;',
      ],
      commonMistake:
        'A DELETE with no WHERE empties the whole table — always scope it to the rows you mean.',
    },
  ],
};
