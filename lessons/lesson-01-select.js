// Lesson 1 — SELECT & FROM (Phase 5).
//
// The first lesson: pull columns out of a single table. No joins yet.

export default {
  id: 1,
  slug: 'select-from',
  title: 'SELECT & FROM',
  joinCore: false,
  tables: ['characters', 'anime'],
  concept: `
    <p>Every query starts with <code>SELECT</code> (which columns you want) and
    <code>FROM</code> (which table they live in). The <code>characters</code>
    table holds every anime character in the academy database, and
    <code>anime</code> holds the series themselves.</p>
    <p>Use a comma-separated list of column names, or <code>*</code> for "every
    column" — though most exercises ask for a <em>specific</em> set, so list the
    columns the prompt names, in the order it names them.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Select the <code>name</code> column of every row in the <code>characters</code> table.',
      starter: 'SELECT ____\nFROM characters;',
      solution: 'SELECT name FROM characters;',
      orderMatters: false,
      requiredKeywords: ['select', 'from'],
      columnTables: ['characters'],
      hints: [
        'You only need one column from one table.',
        'The shape is: SELECT <column> FROM <table>;',
        'Answer: SELECT name FROM characters; — name is the column, characters is the table.',
      ],
      commonMistake:
        'SELECT * returns every column; this prompt asks for just name, so the column count must match.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Select the <code>name</code> and <code>role</code> columns (in that order) for every character.',
      starter: 'SELECT ____, ____\nFROM characters;',
      solution: 'SELECT name, role FROM characters;',
      orderMatters: false,
      requiredKeywords: ['select', 'from'],
      columnTables: ['characters', 'characters'],
      hints: [
        'Two columns, separated by a comma.',
        'SELECT <col1>, <col2> FROM <table>;',
        'Answer: SELECT name, role FROM characters;',
      ],
      commonMistake:
        'Column order matters for the count check — select name first, then role.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Select the <code>title</code>, <code>release_year</code>, and ' +
        '<code>media_type</code> columns of every <code>anime</code>.',
      starter: 'SELECT ____, ____, ____\nFROM anime;',
      solution: 'SELECT title, release_year, media_type FROM anime;',
      orderMatters: false,
      requiredKeywords: ['select', 'from'],
      columnTables: ['anime', 'anime', 'anime'],
      hints: [
        'This time the table is anime, not characters.',
        'List the three columns the prompt names, separated by commas.',
        'Answer: SELECT title, release_year, media_type FROM anime;',
      ],
      commonMistake:
        'These columns live in the anime table — characters has no title column.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'The schema panel lists every column. From the <code>anime</code> table, ' +
        'select <em>only</em> the <code>id</code>, <code>title</code>, and ' +
        '<code>episode_count</code> columns (in that order) for all 10 series — ' +
        'no extra columns.',
      solution: 'SELECT id, title, episode_count FROM anime;',
      orderMatters: false,
      requiredKeywords: ['select', 'from'],
      columnTables: ['anime', 'anime', 'anime'],
      hints: [
        'Name exactly three columns; the comparison fails if you include extras.',
        'SELECT id, title, episode_count FROM <table>;',
        'Answer: SELECT id, title, episode_count FROM anime;',
      ],
      commonMistake:
        'SELECT * returns all 6 anime columns and fails the count check — list exactly the three asked for.',
    },
  ],
};
