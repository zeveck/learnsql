// Lesson 1 — SELECT & FROM (sample lesson, Phase 4).
//
// The first lesson: pull columns out of a single table. No joins yet.

export default {
  id: 1,
  slug: 'select-from',
  title: 'SELECT & FROM',
  joinCore: false,
  tables: ['characters'],
  concept: `
    <p>Every query starts with <code>SELECT</code> (which columns you want) and
    <code>FROM</code> (which table they live in). The <code>characters</code>
    table holds every anime character in the academy database.</p>
    <p>Use a comma-separated list of column names, or <code>*</code> for "every
    column" — though most exercises ask for a <em>specific</em> set, so list the
    columns the prompt names.</p>
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
        "Answer: SELECT name FROM characters; — name is the column, characters is the table.",
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
  ],
};
