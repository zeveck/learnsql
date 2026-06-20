// Lesson 7 — INNER JOIN (sample lesson, Phase 4). joinCore.
//
// The headline topic: combine rows across two tables on a matching key. Also
// hosts the sample DML exercise (give Wolfwood a voice actor via UPDATE).

export default {
  id: 7,
  slug: 'inner-join',
  title: 'INNER JOIN',
  joinCore: true,
  tables: ['characters', 'anime', 'voice_actors'],
  concept: `
    <p>An <code>INNER JOIN</code> stitches two tables together on a matching key
    and keeps only the rows that match on <em>both</em> sides. Here, every
    character belongs to an anime via <code>characters.anime_id = anime.id</code>.</p>
    <p>Give each table a short alias (e.g. <code>characters c</code>) so you can
    write <code>c.name</code> and <code>a.title</code> unambiguously.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'List each character name with the <code>title</code> of the anime they appear in.',
      starter:
        'SELECT c.name, a.title\nFROM characters c\nINNER JOIN anime a ON ____ = ____;',
      solution:
        'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'anime'],
      rightTables: ['anime'],
      hints: [
        'You need both the characters table and the anime table.',
        'Join on the key that links them: characters.anime_id = anime.id.',
        'Answer: SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id;',
      ],
      commonMistake:
        'Every character has an anime, so an INNER JOIN drops nobody here.',
    },
    {
      kind: 'dml',
      tier: 'silver',
      prompt:
        'Nicholas D. Wolfwood has no voice actor yet. Give him voice actor ' +
        '<strong>Show Hayami (id 2)</strong> using an <code>UPDATE</code>.',
      starter:
        "UPDATE characters SET voice_actor_id = ____ WHERE name = '____';",
      solution:
        "UPDATE characters SET voice_actor_id = 2 WHERE name = 'Nicholas D. Wolfwood';",
      verifySql:
        "SELECT voice_actor_id FROM characters WHERE name = 'Nicholas D. Wolfwood';",
      expectRowsModified: 1,
      requiredKeywords: ['update', 'set'],
      hints: [
        'UPDATE the characters table, SET the voice_actor_id column.',
        "Filter to exactly one row with WHERE name = 'Nicholas D. Wolfwood'.",
        "Answer: UPDATE characters SET voice_actor_id = 2 WHERE name = 'Nicholas D. Wolfwood';",
      ],
      commonMistake:
        'Match on the exact name; a missing WHERE updates every row.',
    },
  ],
};
