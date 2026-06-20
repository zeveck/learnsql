// Lesson 7 — INNER JOIN (Phase 4 sample, fleshed out in Phase 6). joinCore.
//
// The headline topic: combine rows across two tables on a matching key and keep
// only the rows that match on both sides. Also hosts the sample DML exercise
// (give Wolfwood a voice actor via UPDATE).

export default {
  id: 7,
  slug: 'inner-join',
  title: 'INNER JOIN',
  joinCore: true,
  tables: ['characters', 'anime', 'studios', 'voice_actors'],
  concept: `
    <p>An <code>INNER JOIN</code> stitches two tables together on a matching key
    and keeps only the rows that match on <em>both</em> sides. Here, every
    character belongs to an anime via <code>characters.anime_id = anime.id</code>.</p>
    <p>Give each table a short alias (e.g. <code>characters c</code>) so you can
    write <code>c.name</code> and <code>a.title</code> unambiguously.</p>
    <p>Because an INNER JOIN drops rows with <em>no</em> match, it can quietly
    shrink your result — e.g. <code>anime</code> joined to <code>studios</code>
    loses the studio-less <em>Cowboy Bebop: The Movie</em>.</p>
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
      kind: 'query',
      tier: 'silver',
      prompt:
        'Show each anime <code>title</code> with the <code>name</code> of its ' +
        'studio. Join <code>anime</code> to <code>studios</code> on ' +
        '<code>anime.studio_id = studios.id</code>. Note that the studio-less ' +
        'film drops out of an INNER JOIN.',
      starter:
        'SELECT a.title, s.name\nFROM anime a\nJOIN studios s ON ____ = ____;',
      solution:
        'SELECT a.title, s.name FROM anime a JOIN studios s ON a.studio_id = s.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['anime', 'studios'],
      rightTables: ['studios'],
      hints: [
        'Join anime to studios on the studio_id foreign key.',
        'Use a.studio_id = s.id.',
        'Answer: SELECT a.title, s.name FROM anime a JOIN studios s ON a.studio_id = s.id;',
      ],
      commonMistake:
        'Cowboy Bebop: The Movie has a NULL studio_id, so an INNER JOIN omits it.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'List each character’s <code>name</code> together with the ' +
        '<code>name</code> of their voice actor. Join <code>characters</code> to ' +
        '<code>voice_actors</code> on <code>characters.voice_actor_id = ' +
        'voice_actors.id</code> (an INNER JOIN, so voice-actor-less characters ' +
        'drop out).',
      starter:
        'SELECT c.name, v.name\nFROM characters c\nJOIN voice_actors v ON ____ = ____;',
      solution:
        'SELECT c.name, v.name FROM characters c JOIN voice_actors v ON c.voice_actor_id = v.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'voice_actors'],
      rightTables: ['voice_actors'],
      hints: [
        'Join characters to voice_actors on the voice_actor_id key.',
        'Use c.voice_actor_id = v.id.',
        'Answer: SELECT c.name, v.name FROM characters c JOIN voice_actors v ON c.voice_actor_id = v.id;',
      ],
      commonMistake:
        'An INNER JOIN here silently drops Wolfwood, Ein, Misato and the others with no voice actor.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'For the heroes only, show the hero’s <code>name</code> and the ' +
        '<code>title</code> of their anime. Filter to <code>role = \'hero\'</code>, ' +
        'and sort alphabetically by character name (a unique total order).',
      solution:
        "SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id WHERE c.role = 'hero' ORDER BY c.name;",
      orderMatters: true,
      requiredKeywords: ['join', 'where'],
      columnTables: ['characters', 'anime'],
      rightTables: ['anime'],
      hints: [
        'Start from the INNER JOIN of characters and anime.',
        "Add WHERE c.role = 'hero', then ORDER BY c.name.",
        "Answer: SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id = a.id WHERE c.role = 'hero' ORDER BY c.name;",
      ],
      commonMistake:
        'Combine the join condition (ON) with the row filter (WHERE) — they are different clauses.',
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
