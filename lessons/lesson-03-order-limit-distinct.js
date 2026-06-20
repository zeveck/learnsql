// Lesson 3 — ORDER BY / LIMIT / DISTINCT (Phase 5).
//
// Sort results, take the top N, and collapse duplicates.

export default {
  id: 3,
  slug: 'order-limit-distinct',
  title: 'ORDER BY / LIMIT / DISTINCT',
  joinCore: false,
  tables: ['characters', 'anime'],
  concept: `
    <p><code>ORDER BY</code> sorts the result. Default is ascending
    (<code>ASC</code>); add <code>DESC</code> for descending. Sort by several
    columns to break ties: <code>ORDER BY episode_count DESC, title</code> sorts
    by episodes (most first) and breaks ties alphabetically by title.</p>
    <p><code>LIMIT n</code> keeps only the first <code>n</code> rows <em>after</em>
    sorting — perfect for "top N" questions. <code>DISTINCT</code> removes
    duplicate rows so you get each unique value once.</p>
    <p>For a stable "top N", always sort by something unique (add a tiebreaker
    column) so the order is well-defined.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'List the <code>title</code> of every anime, sorted alphabetically ' +
        '(ascending) by title.',
      starter: 'SELECT title\nFROM anime\nORDER BY ____;',
      solution: 'SELECT title FROM anime ORDER BY title;',
      orderMatters: true,
      requiredKeywords: ['order by'],
      columnTables: ['anime'],
      hints: [
        'Add an ORDER BY clause.',
        'Ascending is the default, so ORDER BY title is enough.',
        'Answer: SELECT title FROM anime ORDER BY title;',
      ],
      commonMistake:
        'Without ORDER BY, the row order is not guaranteed — name the sort column.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'List the <code>title</code> and <code>episode_count</code> of the ' +
        '<strong>3 anime with the most episodes</strong>. Sort by ' +
        '<code>episode_count</code> descending, breaking ties by <code>title</code>, ' +
        'and keep only the top 3.',
      starter:
        'SELECT title, episode_count\nFROM anime\nORDER BY episode_count DESC, title\nLIMIT ____;',
      solution:
        'SELECT title, episode_count FROM anime ORDER BY episode_count DESC, title LIMIT 3;',
      orderMatters: true,
      requiredKeywords: ['order by', 'limit'],
      columnTables: ['anime', 'anime'],
      hints: [
        'Sort by episode_count DESC so the biggest is first.',
        'Add a title tiebreaker, then LIMIT 3.',
        'Answer: SELECT title, episode_count FROM anime ORDER BY episode_count DESC, title LIMIT 3;',
      ],
      commonMistake:
        'LIMIT happens after ORDER BY — sort first, then cut to the top 3.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'List each <strong>distinct</strong> <code>role</code> that characters ' +
        'can have, sorted alphabetically. (There should be one row per unique role.)',
      starter: 'SELECT DISTINCT ____\nFROM characters\nORDER BY role;',
      solution: 'SELECT DISTINCT role FROM characters ORDER BY role;',
      orderMatters: true,
      requiredKeywords: ['distinct', 'order by'],
      columnTables: ['characters'],
      hints: [
        'DISTINCT collapses duplicate rows to one each.',
        'SELECT DISTINCT role FROM characters, then ORDER BY role.',
        'Answer: SELECT DISTINCT role FROM characters ORDER BY role;',
      ],
      commonMistake:
        'Without DISTINCT you get one row per character; DISTINCT gives one row per unique role.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'The academy wants the <strong>5 oldest anime</strong>. List each ' +
        "anime's <code>title</code> and <code>release_year</code>, sorted by " +
        '<code>release_year</code> ascending (oldest first), breaking ties by ' +
        '<code>title</code>, and keep only the first 5.',
      solution:
        'SELECT title, release_year FROM anime ORDER BY release_year, title LIMIT 5;',
      orderMatters: true,
      requiredKeywords: ['order by', 'limit'],
      columnTables: ['anime', 'anime'],
      hints: [
        'Oldest first means ascending release_year.',
        'Break ties with title, then LIMIT 5.',
        'Answer: SELECT title, release_year FROM anime ORDER BY release_year, title LIMIT 5;',
      ],
      commonMistake:
        'Oldest = smallest year = ascending order (no DESC here).',
    },
  ],
};
