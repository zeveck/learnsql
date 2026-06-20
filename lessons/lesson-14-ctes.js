// Lesson 14 — Common Table Expressions (WITH) (Phase 7).
//
// A CTE names an intermediate result so the main query reads top-to-bottom
// instead of inside-out. Multiple CTEs chain into a readable pipeline.

export default {
  id: 14,
  slug: 'ctes',
  title: 'CTEs (WITH)',
  tables: ['characters', 'anime', 'factions', 'character_factions', 'character_items', 'items'],
  concept: `
    <p>A <strong>Common Table Expression</strong> (a <code>WITH</code> clause) gives
    a subquery a <em>name</em> so you can refer to it like a table:</p>
    <pre><code>WITH faction_sizes AS (
  SELECT faction_id, COUNT(*) AS members
  FROM character_factions
  GROUP BY faction_id
)
SELECT f.name, fs.members
FROM faction_sizes fs
JOIN factions f ON f.id = fs.faction_id;</code></pre>
    <p>CTEs make a deeply nested query read top-to-bottom. You can define
    <strong>several</strong>, separated by commas, and each later CTE may reference
    the earlier ones — building a clear <em>pipeline</em> of named steps toward the
    final <code>SELECT</code>.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Define a CTE called <code>villains</code> that selects every ' +
        '<code>villain</code> character, then select their <code>name</code>s from ' +
        'it, sorted alphabetically.',
      starter:
        "WITH villains AS (\n  SELECT id, name FROM characters WHERE role = '____'\n)\nSELECT name FROM villains ORDER BY name;",
      solution:
        "WITH villains AS (SELECT id, name FROM characters WHERE role = 'villain') SELECT name FROM villains ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['with', 'select'],
      columnTables: ['characters'],
      hints: [
        "The CTE body is just a SELECT: SELECT id, name FROM characters WHERE role = 'villain'.",
        'Then SELECT name FROM villains, referring to the CTE by name.',
        "Answer: WITH villains AS (SELECT id, name FROM characters WHERE role = 'villain') SELECT name FROM villains ORDER BY name;",
      ],
      commonMistake:
        'A CTE is referenced by its name in the main query — treat it like a table.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Using a CTE <code>faction_sizes</code> that counts members per faction, ' +
        'list the factions with <strong>more than two</strong> members: their ' +
        '<code>name</code> and member count as <code>members</code>, sorted by ' +
        'count descending (a unique total order — counts are distinct here).',
      starter:
        "WITH faction_sizes AS (\n  SELECT faction_id, COUNT(*) AS members\n  FROM character_factions\n  GROUP BY faction_id\n)\nSELECT f.name, fs.members\nFROM faction_sizes fs\nJOIN factions f ON f.id = fs.faction_id\nWHERE fs.members > ____\nORDER BY fs.members DESC, f.name;",
      solution:
        "WITH faction_sizes AS (SELECT faction_id, COUNT(*) AS members FROM character_factions GROUP BY faction_id) SELECT f.name, fs.members FROM faction_sizes fs JOIN factions f ON f.id = fs.faction_id WHERE fs.members > 2 ORDER BY fs.members DESC, f.name;",
      orderMatters: true,
      requiredKeywords: ['with', 'group by'],
      columnTables: ['factions', 'character_factions'],
      hints: [
        'The CTE aggregates: GROUP BY faction_id, COUNT(*) AS members.',
        'Join the named CTE back to factions, then filter WHERE fs.members > 2.',
        "Answer: WITH faction_sizes AS (SELECT faction_id, COUNT(*) AS members FROM character_factions GROUP BY faction_id) SELECT f.name, fs.members FROM faction_sizes fs JOIN factions f ON f.id = fs.faction_id WHERE fs.members > 2 ORDER BY fs.members DESC, f.name;",
      ],
      commonMistake:
        'Aggregate inside the CTE, then filter the named result in the outer query.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Which anime have an <strong>above-average</strong> number of characters? ' +
        'Build a CTE <code>anime_chars</code> (characters per anime), then keep ' +
        'those above the average count. Return the anime <code>title</code> and ' +
        'count as <code>n</code>, sorted by <code>n</code> descending then ' +
        '<code>title</code>.',
      solution:
        "WITH anime_chars AS (SELECT anime_id, COUNT(*) AS n FROM characters GROUP BY anime_id) SELECT a.title, ac.n FROM anime_chars ac JOIN anime a ON a.id = ac.anime_id WHERE ac.n > (SELECT AVG(n) FROM anime_chars) ORDER BY ac.n DESC, a.title;",
      orderMatters: true,
      requiredKeywords: ['with', 'avg'],
      columnTables: ['anime', 'characters'],
      hints: [
        'The CTE counts characters per anime: GROUP BY anime_id, COUNT(*) AS n.',
        'You can reuse the CTE twice: once joined to anime, once for (SELECT AVG(n) FROM anime_chars).',
        "Answer: WITH anime_chars AS (SELECT anime_id, COUNT(*) AS n FROM characters GROUP BY anime_id) SELECT a.title, ac.n FROM anime_chars ac JOIN anime a ON a.id = ac.anime_id WHERE ac.n > (SELECT AVG(n) FROM anime_chars) ORDER BY ac.n DESC, a.title;",
      ],
      commonMistake:
        'A CTE can be referenced more than once in the same query — here, for the join and for the average.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Build a <strong>two-CTE pipeline</strong>: <code>criminal_members</code> ' +
        '(ids of characters in a criminal faction) and <code>armed</code> (ids of ' +
        'characters who own a <code>weapon</code>). Then list the <code>name</code> ' +
        'of every character in <strong>both</strong> sets, sorted alphabetically.',
      solution:
        "WITH criminal_members AS (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE f.is_criminal = 1), armed AS (SELECT ci.character_id FROM character_items ci JOIN items i ON i.id = ci.item_id WHERE i.item_type = 'weapon') SELECT c.name FROM characters c WHERE c.id IN (SELECT character_id FROM criminal_members) AND c.id IN (SELECT character_id FROM armed) ORDER BY c.name;",
      orderMatters: true,
      requiredKeywords: ['with', 'in'],
      columnTables: ['characters'],
      hints: [
        'Define two CTEs separated by a comma: criminal_members and armed.',
        'In the final SELECT, require c.id IN (criminal_members) AND c.id IN (armed).',
        "Answer: WITH criminal_members AS (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE f.is_criminal = 1), armed AS (SELECT ci.character_id FROM character_items ci JOIN items i ON i.id = ci.item_id WHERE i.item_type = 'weapon') SELECT c.name FROM characters c WHERE c.id IN (SELECT character_id FROM criminal_members) AND c.id IN (SELECT character_id FROM armed) ORDER BY c.name;",
      ],
      commonMistake:
        'Separate multiple CTEs with commas; only the final SELECT produces output.',
    },
  ],
};
