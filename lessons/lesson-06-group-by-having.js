// Lesson 6 — GROUP BY & HAVING (Phase 5).
//
// Per-group aggregates, HAVING vs WHERE, and the group-by rule.

export default {
  id: 6,
  slug: 'group-by-having',
  title: 'GROUP BY & HAVING',
  joinCore: false,
  tables: ['characters', 'anime'],
  concept: `
    <p><code>GROUP BY</code> splits rows into groups and runs the aggregate once
    <em>per group</em>. <code>SELECT role, COUNT(*) FROM characters GROUP BY
    role</code> gives one row per role with its count.</p>
    <p><strong>The group-by rule:</strong> every column in the SELECT list must
    either appear in <code>GROUP BY</code> or be wrapped in an aggregate.</p>
    <p><code>WHERE</code> filters <em>rows</em> before grouping; <code>HAVING</code>
    filters <em>groups</em> after aggregating. To keep only groups with more than
    8 members you need <code>HAVING COUNT(*) &gt; 8</code> — a <code>WHERE</code>
    cannot see the aggregate.</p>
    <p>Group on a column that uniquely labels each group, and add a tiebreaker in
    <code>ORDER BY</code>, so "top group" questions have a well-defined order.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Count how many characters have each <code>role</code>. Return ' +
        '<code>role</code> and the count as <code>n</code>, sorted by ' +
        '<code>role</code> alphabetically.',
      starter:
        'SELECT role, COUNT(*) AS n\nFROM characters\nGROUP BY ____\nORDER BY role;',
      solution:
        'SELECT role, COUNT(*) AS n FROM characters GROUP BY role ORDER BY role;',
      orderMatters: true,
      requiredKeywords: ['group by'],
      columnTables: ['characters', 'characters'],
      hints: [
        'GROUP BY role makes one group per distinct role.',
        'COUNT(*) then counts the members of each group.',
        'Answer: SELECT role, COUNT(*) AS n FROM characters GROUP BY role ORDER BY role;',
      ],
      commonMistake:
        'role must be in the GROUP BY because it is selected alongside an aggregate.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'For each anime, count its characters. Return the anime <code>title</code> ' +
        'and the count as <code>characters</code>, joining ' +
        '<code>characters</code> to <code>anime</code> on ' +
        '<code>characters.anime_id = anime.id</code>. Sort by the count ' +
        'descending, breaking ties by <code>title</code>.',
      starter:
        'SELECT a.title, COUNT(c.id) AS characters\nFROM anime a\nJOIN characters c ON c.anime_id = a.id\nGROUP BY a.id\nORDER BY characters DESC, a.title;',
      solution:
        'SELECT a.title, COUNT(c.id) AS characters FROM anime a JOIN characters c ON c.anime_id = a.id GROUP BY a.id ORDER BY COUNT(c.id) DESC, a.title;',
      orderMatters: true,
      requiredKeywords: ['group by', 'count'],
      columnTables: ['anime', 'characters'],
      hints: [
        'Join the two tables, then GROUP BY the anime.',
        'COUNT(c.id) counts characters per group; sort DESC with a title tiebreaker.',
        'Answer: SELECT a.title, COUNT(c.id) AS characters FROM anime a JOIN characters c ON c.anime_id = a.id GROUP BY a.id ORDER BY COUNT(c.id) DESC, a.title;',
      ],
      commonMistake:
        'Group by the anime (a.id), and add the title tiebreaker so ties sort predictably.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Show only the <code>role</code> groups that have <strong>more than 8</strong> ' +
        'characters. Return <code>role</code> and the count as <code>n</code>, using ' +
        '<code>HAVING COUNT(*) &gt; 8</code>, sorted by <code>n</code> descending then ' +
        '<code>role</code>.',
      starter:
        'SELECT role, COUNT(*) AS n\nFROM characters\nGROUP BY role\nHAVING COUNT(*) > ____\nORDER BY n DESC, role;',
      solution:
        'SELECT role, COUNT(*) AS n FROM characters GROUP BY role HAVING COUNT(*) > 8 ORDER BY COUNT(*) DESC, role;',
      orderMatters: true,
      requiredKeywords: ['group by', 'having'],
      columnTables: ['characters', 'characters'],
      hints: [
        'HAVING filters groups after the COUNT is known.',
        'Keep groups where COUNT(*) > 8, then sort.',
        'Answer: SELECT role, COUNT(*) AS n FROM characters GROUP BY role HAVING COUNT(*) > 8 ORDER BY COUNT(*) DESC, role;',
      ],
      commonMistake:
        'You cannot filter on COUNT(*) in WHERE — use HAVING after GROUP BY.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'The academy wants the series with a real ensemble of characters. Join ' +
        '<code>characters</code> to <code>anime</code> and, for each anime, return ' +
        'its <code>title</code> and character count as <code>characters</code>, but ' +
        'keep <strong>only anime with at least 7 characters</strong> ' +
        '(<code>HAVING COUNT(c.id) &gt;= 7</code>). Sort by the count descending, ' +
        'breaking ties by <code>title</code>.',
      solution:
        'SELECT a.title, COUNT(c.id) AS characters FROM anime a JOIN characters c ON c.anime_id = a.id GROUP BY a.id HAVING COUNT(c.id) >= 7 ORDER BY COUNT(c.id) DESC, a.title;',
      orderMatters: true,
      requiredKeywords: ['group by', 'having', 'join'],
      columnTables: ['anime', 'characters'],
      hints: [
        'Same grouped join as before, plus a HAVING on the count.',
        'Filter groups with HAVING COUNT(c.id) >= 7, then sort DESC with a title tiebreaker.',
        'Answer: SELECT a.title, COUNT(c.id) AS characters FROM anime a JOIN characters c ON c.anime_id = a.id GROUP BY a.id HAVING COUNT(c.id) >= 7 ORDER BY COUNT(c.id) DESC, a.title;',
      ],
      commonMistake:
        'HAVING (not WHERE) filters on the aggregated COUNT after grouping.',
    },
  ],
};
