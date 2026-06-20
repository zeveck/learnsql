// Lesson 2 — WHERE (filtering) (Phase 5).
//
// Keep only the rows you care about: comparisons, AND/OR/NOT, BETWEEN, IN,
// LIKE, and IS NULL.

export default {
  id: 2,
  slug: 'where',
  title: 'WHERE (filtering)',
  joinCore: false,
  tables: ['characters', 'anime'],
  concept: `
    <p>A <code>WHERE</code> clause filters rows: only those for which the
    condition is <em>true</em> survive. Compare with <code>=</code>,
    <code>&lt;&gt;</code>, <code>&lt;</code>, <code>&gt;</code>,
    <code>&lt;=</code>, <code>&gt;=</code>, and combine conditions with
    <code>AND</code>, <code>OR</code>, and <code>NOT</code>.</p>
    <p>Handy shorthands: <code>BETWEEN x AND y</code> (inclusive range),
    <code>IN (a, b, c)</code> (membership), <code>LIKE 'Cowboy%'</code> (pattern
    match, <code>%</code> = any run of characters), and <code>IS NULL</code> /
    <code>IS NOT NULL</code> (you must use <code>IS</code> for NULL — never
    <code>= NULL</code>). Text values go in single quotes: <code>'villain'</code>.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        "List the <code>name</code> of every character whose <code>role</code> " +
        "is exactly <code>'villain'</code>.",
      starter: "SELECT name\nFROM characters\nWHERE role = '____';",
      solution: "SELECT name FROM characters WHERE role = 'villain';",
      orderMatters: false,
      requiredKeywords: ['where'],
      columnTables: ['characters'],
      hints: [
        'Filter the rows with a WHERE clause.',
        "Compare the role column to the text 'villain' (single quotes).",
        "Answer: SELECT name FROM characters WHERE role = 'villain';",
      ],
      commonMistake:
        "Text literals need single quotes: WHERE role = 'villain', not role = villain.",
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'List the <code>title</code> and <code>release_year</code> of every anime ' +
        'released <strong>between 1990 and 1999</strong> (inclusive). Sort by ' +
        '<code>release_year</code> ascending, then by <code>title</code>.',
      starter:
        'SELECT title, release_year\nFROM anime\nWHERE release_year BETWEEN ____ AND ____\nORDER BY release_year, title;',
      solution:
        'SELECT title, release_year FROM anime WHERE release_year BETWEEN 1990 AND 1999 ORDER BY release_year, title;',
      orderMatters: true,
      requiredKeywords: ['where', 'between'],
      columnTables: ['anime', 'anime'],
      hints: [
        'BETWEEN 1990 AND 1999 includes both endpoints.',
        'Add ORDER BY release_year, title to fix the order.',
        'Answer: SELECT title, release_year FROM anime WHERE release_year BETWEEN 1990 AND 1999 ORDER BY release_year, title;',
      ],
      commonMistake:
        'BETWEEN is inclusive of both endpoints, so 1990 and 1999 are kept.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        "List the <code>name</code> of every character who is a " +
        "<code>'hero'</code> <strong>or</strong> an <code>'anti-hero'</code> " +
        "<strong>and</strong> is <em>not</em> human (<code>is_human = 0</code>), " +
        'sorted alphabetically by name.',
      starter:
        "SELECT name\nFROM characters\nWHERE role IN ('____', '____') AND is_human = ____\nORDER BY name;",
      solution:
        "SELECT name FROM characters WHERE role IN ('hero', 'anti-hero') AND is_human = 0 ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['where', 'in'],
      columnTables: ['characters'],
      hints: [
        "Use IN ('hero', 'anti-hero') for the two roles.",
        'Combine the role test with AND is_human = 0.',
        "Answer: SELECT name FROM characters WHERE role IN ('hero', 'anti-hero') AND is_human = 0 ORDER BY name;",
      ],
      commonMistake:
        'AND binds tighter than OR — using IN for the role list keeps the logic clear.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        "List the <code>name</code> of every character who has " +
        "<strong>no</strong> voice actor recorded (<code>voice_actor_id IS " +
        "NULL</code>) and whose name <strong>starts with the letter M</strong> " +
        "(use <code>LIKE 'M%'</code>), sorted alphabetically by name.",
      solution:
        "SELECT name FROM characters WHERE voice_actor_id IS NULL AND name LIKE 'M%' ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['where', 'is null', 'like'],
      columnTables: ['characters'],
      hints: [
        'Test the missing voice actor with voice_actor_id IS NULL (never = NULL).',
        "Pattern-match the name with LIKE 'M%'.",
        "Answer: SELECT name FROM characters WHERE voice_actor_id IS NULL AND name LIKE 'M%' ORDER BY name;",
      ],
      commonMistake:
        'NULL comparisons need IS NULL, not = NULL — = NULL is never true.',
    },
  ],
};
