// Lesson 10 — SELF JOIN (Phase 6). joinCore.
//
// Join a table to ITSELF via two aliases to walk a self-referencing foreign key:
// characters.rival_id and characters.mentor_id both point back into characters.
// The first exercise is tagged `self-join` for the "Narcissus" badge.

export default {
  id: 10,
  slug: 'self-join',
  title: 'SELF JOIN',
  joinCore: true,
  tables: ['characters'],
  concept: `
    <p>A <strong>self join</strong> joins a table to <em>itself</em>. You give the
    same table two different aliases so SQL treats them as two tables. It is the
    way to follow a column that points back into the same table — a
    <em>self-referencing foreign key</em>.</p>
    <p><code>characters.rival_id</code> and <code>characters.mentor_id</code> both
    reference <code>characters.id</code>. To pair each character with their rival
    you join <code>characters c</code> to <code>characters r</code>
    <code>ON c.rival_id = r.id</code> — e.g. Son Goku ↔ Vegeta, Vash ↔ Knives,
    Spike ↔ Vicious.</p>
    <p>Aliases are mandatory here: without them <code>id</code> and
    <code>name</code> would be hopelessly ambiguous.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      tags: ['self-join'],
      prompt:
        'Pair each character with their rival. Self-join <code>characters c</code> ' +
        'to <code>characters r</code> on <code>c.rival_id = r.id</code> and return ' +
        'the character <code>name</code> and the rival <code>name</code>.',
      starter:
        'SELECT c.name, r.name\nFROM characters c\nJOIN characters r ON ____ = ____;',
      solution:
        'SELECT c.name, r.name FROM characters c JOIN characters r ON c.rival_id = r.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'characters'],
      hints: [
        'Use the SAME table twice with two aliases: characters c and characters r.',
        'Follow the rival_id pointer: c.rival_id = r.id.',
        'Answer: SELECT c.name, r.name FROM characters c JOIN characters r ON c.rival_id = r.id;',
      ],
      commonMistake:
        'You must alias the table twice; rival_id points back into characters itself.',
    },
    {
      kind: 'query',
      tier: 'silver',
      tags: ['self-join'],
      prompt:
        'Pair each student with their mentor. Self-join <code>characters s</code> ' +
        'to <code>characters m</code> on <code>s.mentor_id = m.id</code> and ' +
        'return the student <code>name</code> and mentor <code>name</code>, ' +
        'sorted alphabetically by student name.',
      starter:
        'SELECT s.name, m.name\nFROM characters s\nJOIN characters m ON ____ = ____\nORDER BY s.name;',
      solution:
        'SELECT s.name, m.name FROM characters s JOIN characters m ON s.mentor_id = m.id ORDER BY s.name;',
      orderMatters: true,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'characters'],
      hints: [
        'Same idea as the rival join, but follow mentor_id.',
        'Join characters s to characters m ON s.mentor_id = m.id, then ORDER BY s.name.',
        'Answer: SELECT s.name, m.name FROM characters s JOIN characters m ON s.mentor_id = m.id ORDER BY s.name;',
      ],
      commonMistake:
        'Student names are unique, so ORDER BY s.name fully determines the order.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Find <strong>mutual rivals</strong> — pairs where each character names ' +
        'the other as their rival (<code>c.rival_id = r.id</code> AND ' +
        '<code>r.rival_id = c.id</code>). To list each pair once, keep only ' +
        '<code>c.id &lt; r.id</code>. Return the two names as <code>a</code> and ' +
        '<code>b</code>, sorted by the first name.',
      solution:
        'SELECT c.name AS a, r.name AS b FROM characters c JOIN characters r ON c.rival_id = r.id AND r.rival_id = c.id WHERE c.id < r.id ORDER BY c.name;',
      orderMatters: true,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'characters'],
      hints: [
        'Add a second condition to the ON so the rivalry points both ways.',
        'Use c.id < r.id to avoid listing the same pair twice (and swapped).',
        'Answer: SELECT c.name AS a, r.name AS b FROM characters c JOIN characters r ON c.rival_id = r.id AND r.rival_id = c.id WHERE c.id < r.id ORDER BY c.name;',
      ],
      commonMistake:
        'Without the c.id < r.id guard each mutual pair appears twice (once from each side).',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Use a <code>LEFT JOIN</code> self-join so <strong>every</strong> ' +
        'character appears, with their rival’s name or NULL when they have none. ' +
        'Return the character <code>name</code> and the rival <code>name</code> ' +
        '(NULL when absent), sorted by character name.',
      solution:
        'SELECT c.name, r.name FROM characters c LEFT JOIN characters r ON c.rival_id = r.id ORDER BY c.name;',
      orderMatters: true,
      requiredKeywords: ['left join'],
      columnTables: ['characters', 'characters'],
      rightTables: ['characters'],
      hints: [
        'A LEFT JOIN keeps characters with no rival (rival_id NULL).',
        'Their rival name comes back NULL; ORDER BY c.name.',
        'Answer: SELECT c.name, r.name FROM characters c LEFT JOIN characters r ON c.rival_id = r.id ORDER BY c.name;',
      ],
      commonMistake:
        'Character names are unique, so ORDER BY c.name is a total order even with the NULL rivals.',
    },
  ],
};
