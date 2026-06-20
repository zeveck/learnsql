// Lesson 13 — Subqueries (Phase 7).
//
// A query inside a query. Three flavours: a SCALAR subquery (returns one value,
// usable anywhere a value goes), an IN subquery (a value-list filter), and a
// CORRELATED subquery (runs once per outer row, referencing it).

export default {
  id: 13,
  slug: 'subqueries',
  title: 'Subqueries',
  tables: ['characters', 'anime', 'episodes', 'factions', 'character_factions', 'character_items', 'items'],
  concept: `
    <p>A <strong>subquery</strong> is a <code>SELECT</code> nested inside another
    query. There are three shapes worth knowing:</p>
    <ul>
      <li><strong>Scalar</strong> — returns a single value, so it can sit anywhere a
      value goes: <code>WHERE anime_id = (SELECT id FROM anime ORDER BY
      episode_count DESC LIMIT 1)</code>.</li>
      <li><strong><code>IN</code></strong> — returns a column of values used as a
      set membership test: <code>WHERE id IN (SELECT character_id FROM ...)</code>.
      <code>NOT IN</code> flips it into an anti-membership test.</li>
      <li><strong>Correlated</strong> — references the outer row, so it re-runs once
      per outer row: <code>WHERE (SELECT COUNT(*) FROM character_items ci WHERE
      ci.character_id = c.id) &gt; 1</code>.</li>
    </ul>
    <p>A scalar subquery that returns more than one row is an error — keep it to one
    value (e.g. with <code>LIMIT 1</code> or an aggregate).</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Which characters appear in the anime with the most episodes? Use a ' +
        '<strong>scalar subquery</strong> to find that anime’s id, then list ' +
        'the character <code>name</code>s, sorted alphabetically.',
      starter:
        "SELECT name\nFROM characters\nWHERE anime_id = (SELECT id FROM anime ORDER BY ____ DESC LIMIT 1)\nORDER BY name;",
      solution:
        "SELECT name FROM characters WHERE anime_id = (SELECT id FROM anime ORDER BY episode_count DESC LIMIT 1) ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['select', 'where'],
      columnTables: ['characters'],
      hints: [
        'First find the anime id: SELECT id FROM anime ORDER BY episode_count DESC LIMIT 1.',
        'Put that whole SELECT in parentheses as the right side of WHERE anime_id = (...).',
        'Answer: SELECT name FROM characters WHERE anime_id = (SELECT id FROM anime ORDER BY episode_count DESC LIMIT 1) ORDER BY name;',
      ],
      commonMistake:
        'A scalar subquery must return exactly one value — LIMIT 1 keeps it to one row.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'List every character (by <code>name</code>) who belongs to <strong>any ' +
        'criminal faction</strong>. Use an <code>IN</code> subquery against the ' +
        '<code>character_factions</code>/<code>factions</code> tables ' +
        '(<code>factions.is_criminal = 1</code>). Sort alphabetically.',
      starter:
        "SELECT name\nFROM characters\nWHERE id IN (\n  SELECT cf.character_id\n  FROM character_factions cf\n  JOIN factions f ON f.id = cf.faction_id\n  WHERE ____\n)\nORDER BY name;",
      solution:
        "SELECT name FROM characters WHERE id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE f.is_criminal = 1) ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['in', 'select'],
      columnTables: ['characters'],
      hints: [
        'The inner query returns the ids of criminal-faction members.',
        'Filter the outer characters with WHERE id IN (... that inner query ...).',
        "Answer: SELECT name FROM characters WHERE id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE f.is_criminal = 1) ORDER BY name;",
      ],
      commonMistake:
        'The inner query must return exactly the id column you compare with IN.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Which anime have <strong>no episodes recorded</strong> (the films)? Use ' +
        'a <code>NOT IN</code> subquery over <code>episodes.anime_id</code>. ' +
        'Return the <code>title</code>, sorted alphabetically.',
      starter:
        "SELECT title\nFROM anime\nWHERE id NOT IN (SELECT ____ FROM episodes)\nORDER BY title;",
      solution:
        "SELECT title FROM anime WHERE id NOT IN (SELECT anime_id FROM episodes) ORDER BY title;",
      orderMatters: true,
      requiredKeywords: ['not in', 'select'],
      columnTables: ['anime'],
      hints: [
        'The inner query lists every anime_id that DOES have episodes.',
        'NOT IN keeps the anime whose id is absent from that list.',
        'Answer: SELECT title FROM anime WHERE id NOT IN (SELECT anime_id FROM episodes) ORDER BY title;',
      ],
      commonMistake:
        'NOT IN is the anti-membership test — these are the rows with no match in the inner set.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Who is a hoarder? List every character (by <code>name</code>) who owns ' +
        '<strong>more items than the average owner</strong>. Use a ' +
        '<strong>correlated subquery</strong> to count each character’s items, ' +
        'and a second subquery for the average items-per-owner. Sort alphabetically.',
      solution:
        "SELECT c.name FROM characters c WHERE (SELECT COUNT(*) FROM character_items ci WHERE ci.character_id = c.id) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM character_items GROUP BY character_id)) ORDER BY c.name;",
      orderMatters: true,
      requiredKeywords: ['select', 'count', 'avg'],
      columnTables: ['characters'],
      hints: [
        'The correlated count: (SELECT COUNT(*) FROM character_items ci WHERE ci.character_id = c.id).',
        'Compare it to the average items-per-owner: (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM character_items GROUP BY character_id)).',
        "Answer: SELECT c.name FROM characters c WHERE (SELECT COUNT(*) FROM character_items ci WHERE ci.character_id = c.id) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM character_items GROUP BY character_id)) ORDER BY c.name;",
      ],
      commonMistake:
        'The correlated subquery references the OUTER row (ci.character_id = c.id) — it re-runs per character.',
    },
  ],
};
