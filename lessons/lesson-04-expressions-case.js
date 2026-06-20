// Lesson 4 — Expressions, aliases & CASE (Phase 5).
//
// Compute new columns: arithmetic, string concatenation, CASE, and AS aliases.

export default {
  id: 4,
  slug: 'expressions-case',
  title: 'Expressions, aliases & CASE',
  joinCore: false,
  tables: ['anime', 'characters'],
  concept: `
    <p>A <code>SELECT</code> list can hold <em>computed</em> columns, not just raw
    ones. Do arithmetic (<code>2026 - release_year</code>), concatenate text with
    <code>||</code> (<code>title || ' (' || release_year || ')'</code>), and name
    the result with <code>AS</code>: <code>2026 - release_year AS age</code>.</p>
    <p><code>CASE</code> is SQL's if/else. The searched form tests conditions:</p>
    <pre>CASE WHEN is_human = 1 THEN 'Human' ELSE 'Non-human' END</pre>
    <p>and the simple form compares one expression to values:</p>
    <pre>CASE role WHEN 'hero' THEN 'Protagonist' ELSE 'Other' END</pre>
    <p>Aliases only rename the output column header; the comparison ignores header
    names, so an alias never breaks a correct answer.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        "List each anime's <code>title</code> and its <strong>age in years</strong> " +
        '(computed as <code>2026 - release_year</code>), naming the computed ' +
        'column <code>age</code>.',
      starter: 'SELECT title, 2026 - ____ AS age\nFROM anime;',
      solution: 'SELECT title, 2026 - release_year AS age FROM anime;',
      orderMatters: false,
      requiredKeywords: ['as'],
      columnTables: ['anime', 'anime'],
      hints: [
        'You can write arithmetic right in the SELECT list.',
        'Subtract release_year from 2026 and name it with AS age.',
        'Answer: SELECT title, 2026 - release_year AS age FROM anime;',
      ],
      commonMistake:
        'The expression 2026 - release_year produces the column — AS only names it.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'For every character, build a single column called <code>bio</code> of the ' +
        "form <em>\"Name the role\"</em> by concatenating " +
        "<code>name</code>, the literal <code>' the '</code>, and " +
        '<code>role</code> with <code>||</code>. Sort the result by ' +
        '<code>name</code>.',
      starter:
        "SELECT name || ' the ' || ____ AS bio\nFROM characters\nORDER BY name;",
      solution:
        "SELECT name || ' the ' || role AS bio FROM characters ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['as'],
      columnTables: ['characters'],
      hints: [
        "Join the pieces with ||: name || ' the ' || role.",
        "Mind the spaces inside the ' the ' literal.",
        "Answer: SELECT name || ' the ' || role AS bio FROM characters ORDER BY name;",
      ],
      commonMistake:
        "Use || (not +) to concatenate strings in SQLite, and quote the literal ' the '.",
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        "List each character's <code>name</code> and a computed " +
        '<code>species</code> column that is <code>\'Human\'</code> when ' +
        '<code>is_human = 1</code> and <code>\'Non-human\'</code> otherwise. ' +
        'Restrict to heroes (<code>role = \'hero\'</code>) and sort by ' +
        '<code>name</code>.',
      starter:
        "SELECT name,\n  CASE WHEN is_human = 1 THEN 'Human' ELSE '____' END AS species\nFROM characters\nWHERE role = 'hero'\nORDER BY name;",
      solution:
        "SELECT name, CASE WHEN is_human = 1 THEN 'Human' ELSE 'Non-human' END AS species FROM characters WHERE role = 'hero' ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['case', 'when'],
      columnTables: ['characters', 'characters'],
      hints: [
        'CASE WHEN <condition> THEN <value> ELSE <value> END.',
        "Test is_human = 1 for 'Human', otherwise 'Non-human'.",
        "Answer: SELECT name, CASE WHEN is_human = 1 THEN 'Human' ELSE 'Non-human' END AS species FROM characters WHERE role = 'hero' ORDER BY name;",
      ],
      commonMistake:
        'Every CASE needs a closing END; the ELSE branch catches the non-human heroes.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Build a roster for Trigun (<code>anime_id = 1</code>). For each ' +
        'character, return their <code>name</code>, their <code>role</code>, and ' +
        'an <code>alignment</code> column from a <code>CASE</code> that maps ' +
        "<code>'hero'</code> to <code>'Protagonist'</code>, <code>'villain'</code> " +
        "to <code>'Antagonist'</code>, and anything else to <code>'Other'</code>. " +
        'Sort by <code>name</code>.',
      solution:
        "SELECT name, role, CASE role WHEN 'hero' THEN 'Protagonist' WHEN 'villain' THEN 'Antagonist' ELSE 'Other' END AS alignment FROM characters WHERE anime_id = 1 ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['case', 'when'],
      columnTables: ['characters', 'characters', 'characters'],
      hints: [
        "The simple CASE form compares one value: CASE role WHEN 'hero' THEN ...",
        "Chain two WHEN branches and finish with ELSE 'Other' END.",
        "Answer: SELECT name, role, CASE role WHEN 'hero' THEN 'Protagonist' WHEN 'villain' THEN 'Antagonist' ELSE 'Other' END AS alignment FROM characters WHERE anime_id = 1 ORDER BY name;",
      ],
      commonMistake:
        "In simple CASE you write CASE role WHEN 'hero' ... — don't repeat 'role =' inside each WHEN.",
    },
  ],
};
