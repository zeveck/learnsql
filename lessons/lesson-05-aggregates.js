// Lesson 5 — Aggregates (Phase 5).
//
// Collapse many rows into one summary value: COUNT / SUM / AVG / MIN / MAX,
// and the COUNT(*) vs COUNT(col) distinction around NULLs.

export default {
  id: 5,
  slug: 'aggregates',
  title: 'Aggregates',
  joinCore: false,
  tables: ['characters', 'anime'],
  concept: `
    <p>Aggregate functions reduce a whole set of rows to a single value:
    <code>COUNT</code> (how many), <code>SUM</code> (total), <code>AVG</code>
    (average), <code>MIN</code>, and <code>MAX</code>.</p>
    <p>A key distinction: <code>COUNT(*)</code> counts every row, while
    <code>COUNT(column)</code> counts only rows where that column is
    <strong>not NULL</strong>. So <code>COUNT(*)</code> over the characters table
    is 55, but <code>COUNT(voice_actor_id)</code> is smaller because many
    characters have no voice actor. <code>SUM</code> and <code>AVG</code> also
    skip NULLs.</p>
    <p>An aggregate with no <code>GROUP BY</code> summarizes the entire (filtered)
    table into exactly one row.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Count how many rows are in the <code>characters</code> table. Return the ' +
        'single count value.',
      starter: 'SELECT COUNT(____)\nFROM characters;',
      solution: 'SELECT COUNT(*) FROM characters;',
      orderMatters: false,
      requiredKeywords: ['count'],
      columnTables: ['characters'],
      hints: [
        'COUNT(*) counts every row.',
        'No WHERE, no GROUP BY — just COUNT(*) over the whole table.',
        'Answer: SELECT COUNT(*) FROM characters;',
      ],
      commonMistake:
        'COUNT(*) returns one row with the total; you do not select name here.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'In one row, return the total number of characters as <code>total</code> ' +
        'and the number that actually have a voice actor as <code>with_va</code>. ' +
        'Use <code>COUNT(*)</code> for the total and <code>COUNT(voice_actor_id)</code> ' +
        '(which skips NULLs) for the second.',
      starter:
        'SELECT COUNT(*) AS total, COUNT(____) AS with_va\nFROM characters;',
      solution:
        'SELECT COUNT(*) AS total, COUNT(voice_actor_id) AS with_va FROM characters;',
      orderMatters: false,
      requiredKeywords: ['count'],
      columnTables: ['characters', 'characters'],
      hints: [
        'COUNT(*) counts all rows; COUNT(voice_actor_id) skips the NULL ones.',
        'Select both aggregates in one row, each with an alias.',
        'Answer: SELECT COUNT(*) AS total, COUNT(voice_actor_id) AS with_va FROM characters;',
      ],
      commonMistake:
        'COUNT(voice_actor_id) ignores NULLs, so it is smaller than COUNT(*).',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Across the <strong>TV anime</strong> only (<code>media_type = \'TV\'</code>), ' +
        'return the total number of episodes as <code>total_episodes</code> using ' +
        '<code>SUM(episode_count)</code>.',
      starter:
        "SELECT SUM(____) AS total_episodes\nFROM anime\nWHERE media_type = 'TV';",
      solution:
        "SELECT SUM(episode_count) AS total_episodes FROM anime WHERE media_type = 'TV';",
      orderMatters: false,
      requiredKeywords: ['sum', 'where'],
      columnTables: ['anime'],
      hints: [
        "Filter to media_type = 'TV' first, then SUM the episode_count.",
        'WHERE filters rows before the aggregate runs.',
        "Answer: SELECT SUM(episode_count) AS total_episodes FROM anime WHERE media_type = 'TV';",
      ],
      commonMistake:
        'Apply the WHERE filter before summing so the films are excluded.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'In one summary row over the <code>anime</code> table, return the earliest ' +
        'release year as <code>earliest</code> (<code>MIN</code>), the latest as ' +
        '<code>latest</code> (<code>MAX</code>), and the average episode count as ' +
        '<code>avg_episodes</code> (<code>AVG</code>).',
      solution:
        'SELECT MIN(release_year) AS earliest, MAX(release_year) AS latest, AVG(episode_count) AS avg_episodes FROM anime;',
      orderMatters: false,
      requiredKeywords: ['min', 'max', 'avg'],
      columnTables: ['anime', 'anime', 'anime'],
      hints: [
        'Three aggregates in one SELECT, each over the anime table.',
        'MIN/MAX over release_year, AVG over episode_count.',
        'Answer: SELECT MIN(release_year) AS earliest, MAX(release_year) AS latest, AVG(episode_count) AS avg_episodes FROM anime;',
      ],
      commonMistake:
        'All three aggregates share the same FROM — no GROUP BY needed for a single summary row.',
    },
  ],
};
