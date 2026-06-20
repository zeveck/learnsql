// Lesson 9 — FULL OUTER JOIN & CROSS JOIN (Phase 6). joinCore.
//
// FULL OUTER keeps BOTH sides (unmatched rows from either become NULL on the
// other). CROSS produces the Cartesian product — every left row paired with
// every right row. The CROSS exercise is tagged `cross-join` for the
// "Cartographer" badge.

export default {
  id: 9,
  slug: 'full-cross-join',
  title: 'FULL OUTER & CROSS JOIN',
  joinCore: true,
  tables: ['anime', 'studios', 'characters', 'genres'],
  concept: `
    <p>A <code>FULL OUTER JOIN</code> keeps <em>every</em> row from <strong>both</strong>
    tables. Where there is no match, the missing side comes back <code>NULL</code> —
    so you see unmatched rows from the left <em>and</em> the right at once. It is the
    union of a LEFT JOIN and a RIGHT JOIN.</p>
    <p>A <code>CROSS JOIN</code> has no <code>ON</code> condition: it pairs every left
    row with every right row, producing the <strong>Cartesian product</strong>
    (rows<sub>left</sub> × rows<sub>right</sub>). With 55 characters and 14 genres a
    cross join yields 770 pairings — useful when you deliberately want every
    combination (e.g. a grid), and a classic accident when you forget the join
    condition.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      tags: ['cross-join'],
      prompt:
        'Build a grid of every possible (character, genre) pairing using a ' +
        '<code>CROSS JOIN</code>. Return the character <code>name</code> and the ' +
        'genre <code>name</code>. (No <code>ON</code> clause — that is the point.)',
      starter:
        'SELECT c.name, g.name\nFROM characters c\nCROSS JOIN genres g;',
      solution:
        'SELECT c.name, g.name FROM characters c CROSS JOIN genres g;',
      orderMatters: false,
      requiredKeywords: ['cross join'],
      columnTables: ['characters', 'genres'],
      hints: [
        'A CROSS JOIN has no ON condition.',
        'Every character is paired with every genre: 55 × 14 = 770 rows.',
        'Answer: SELECT c.name, g.name FROM characters c CROSS JOIN genres g;',
      ],
      commonMistake:
        'A CROSS JOIN multiplies row counts — forgetting an ON in a normal join produces this by accident.',
    },
    {
      kind: 'query',
      tier: 'silver',
      tags: ['cross-join'],
      prompt:
        'Restrict the grid: pair every <strong>hero</strong> with every ' +
        '<strong>genre</strong>. Return the hero <code>name</code> and genre ' +
        '<code>name</code>, filtering to <code>role = \'hero\'</code> with a ' +
        'CROSS JOIN to <code>genres</code>.',
      solution:
        "SELECT c.name, g.name FROM characters c CROSS JOIN genres g WHERE c.role = 'hero';",
      orderMatters: false,
      requiredKeywords: ['cross join'],
      columnTables: ['characters', 'genres'],
      hints: [
        'CROSS JOIN characters to genres, then filter the characters with WHERE.',
        "Keep only heroes: WHERE c.role = 'hero'.",
        "Answer: SELECT c.name, g.name FROM characters c CROSS JOIN genres g WHERE c.role = 'hero';",
      ],
      commonMistake:
        'The WHERE filters the product after pairing — each remaining hero still pairs with all 14 genres.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Use a <code>FULL OUTER JOIN</code> between <code>anime</code> and ' +
        '<code>studios</code> (on <code>anime.studio_id = studios.id</code>) to ' +
        'list every anime <code>title</code> next to its studio <code>name</code>, ' +
        'keeping anime that have no studio (NULL studio) <em>and</em> any studio ' +
        'with no anime. Return <code>title</code> and the studio <code>name</code>.',
      starter:
        'SELECT a.title, s.name\nFROM anime a\nFULL OUTER JOIN studios s ON ____ = ____;',
      solution:
        'SELECT a.title, s.name FROM anime a FULL OUTER JOIN studios s ON a.studio_id = s.id;',
      orderMatters: false,
      requiredKeywords: ['full outer join'],
      columnTables: ['anime', 'studios'],
      rightTables: ['studios'],
      hints: [
        'FULL OUTER JOIN keeps rows from both tables.',
        'Join on a.studio_id = s.id; unmatched rows get NULL on the other side.',
        'Answer: SELECT a.title, s.name FROM anime a FULL OUTER JOIN studios s ON a.studio_id = s.id;',
      ],
      commonMistake:
        'The studio-less film keeps its row with a NULL studio — an INNER JOIN would have dropped it.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'From a <code>FULL OUTER JOIN</code> of <code>anime</code> and ' +
        '<code>studios</code>, surface only the <strong>unmatched</strong> rows — ' +
        'anime with no studio or studios with no anime — by filtering where ' +
        'either side is NULL. Return the anime <code>title</code> and studio ' +
        '<code>name</code>, sorted by <code>title</code> (NULLs sort first).',
      solution:
        'SELECT a.title, s.name FROM anime a FULL OUTER JOIN studios s ON a.studio_id = s.id WHERE a.id IS NULL OR s.id IS NULL ORDER BY a.title;',
      orderMatters: true,
      requiredKeywords: ['full outer join', 'is null'],
      columnTables: ['anime', 'studios'],
      rightTables: ['studios'],
      hints: [
        'Keep only rows where one side did not match: WHERE a.id IS NULL OR s.id IS NULL.',
        'Order by a.title for a stable result.',
        'Answer: SELECT a.title, s.name FROM anime a FULL OUTER JOIN studios s ON a.studio_id = s.id WHERE a.id IS NULL OR s.id IS NULL ORDER BY a.title;',
      ],
      commonMistake:
        'Check the primary key (a.id / s.id) for NULL, not the join column, to detect a non-match.',
    },
  ],
};
