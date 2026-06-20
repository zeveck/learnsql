// Lesson 12 — JOIN + aggregation (Phase 6). joinCore.
//
// GROUP BY across joined tables: items per character, characters per studio,
// factions with > 2 members (JOIN + GROUP + HAVING), and episodes per anime
// including films = 0 via a LEFT JOIN.

export default {
  id: 12,
  slug: 'join-aggregation',
  title: 'JOIN + aggregation',
  joinCore: true,
  tables: ['characters', 'character_items', 'studios', 'anime', 'factions', 'character_factions', 'episodes'],
  concept: `
    <p>Joins and aggregation combine naturally: <code>JOIN</code> first to bring the
    rows together, then <code>GROUP BY</code> a key and apply
    <code>COUNT</code>/<code>SUM</code>/… per group. "How many items per character?"
    is a join (<code>characters</code> ⋈ <code>character_items</code>) followed by
    <code>GROUP BY</code> the character.</p>
    <p>Two things matter when you aggregate over a join:</p>
    <ul>
      <li>To keep groups that would otherwise vanish (e.g. anime with <strong>0</strong>
      episodes), use a <code>LEFT JOIN</code> and <code>COUNT</code> the
      <em>right</em> key — <code>COUNT(e.id)</code> counts 0 when there is no match,
      whereas <code>COUNT(*)</code> would wrongly count 1.</li>
      <li><code>HAVING</code> filters the groups <em>after</em> aggregating — e.g.
      factions with more than two members.</li>
    </ul>
    <p>For "top N" questions, add a tiebreaker so the order is fully determined.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'How many items does each (item-owning) character have? Join ' +
        '<code>characters</code> to <code>character_items</code> and return the ' +
        'character <code>name</code> with the count as <code>items</code>, ' +
        'grouped per character.',
      starter:
        'SELECT c.name, COUNT(ci.item_id) AS items\nFROM characters c\nJOIN character_items ci ON c.id = ci.character_id\nGROUP BY c.id;',
      solution:
        'SELECT c.name, COUNT(ci.item_id) AS items FROM characters c JOIN character_items ci ON c.id = ci.character_id GROUP BY c.id;',
      orderMatters: false,
      requiredKeywords: ['join', 'group by'],
      columnTables: ['characters', 'character_items'],
      hints: [
        'Join characters to character_items, then GROUP BY the character.',
        'COUNT(ci.item_id) counts the rows in each group.',
        'Answer: SELECT c.name, COUNT(ci.item_id) AS items FROM characters c JOIN character_items ci ON c.id = ci.character_id GROUP BY c.id;',
      ],
      commonMistake:
        'GROUP BY the character key (c.id) so each character is one group.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'How many characters does each studio produce? Join ' +
        '<code>studios</code> → <code>anime</code> → <code>characters</code> and ' +
        'return the studio <code>name</code> with the character count as ' +
        '<code>characters</code>. Sort by the count descending, then studio ' +
        '<code>name</code>.',
      solution:
        'SELECT s.name, COUNT(c.id) AS characters FROM studios s JOIN anime a ON a.studio_id = s.id JOIN characters c ON c.anime_id = a.id GROUP BY s.id ORDER BY COUNT(c.id) DESC, s.name;',
      orderMatters: true,
      requiredKeywords: ['join', 'group by'],
      columnTables: ['studios', 'characters'],
      hints: [
        'Chain studios → anime → characters, then GROUP BY the studio.',
        'COUNT(c.id) per group; sort DESC with a studio-name tiebreaker.',
        'Answer: SELECT s.name, COUNT(c.id) AS characters FROM studios s JOIN anime a ON a.studio_id = s.id JOIN characters c ON c.anime_id = a.id GROUP BY s.id ORDER BY COUNT(c.id) DESC, s.name;',
      ],
      commonMistake:
        'Group by the studio; add the name tiebreaker so equal counts sort predictably.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Which factions have <strong>more than two</strong> members? Join ' +
        '<code>factions</code> to <code>character_factions</code>, group per ' +
        'faction, and keep only those with <code>HAVING COUNT(*) &gt; 2</code>. ' +
        'Return the faction <code>name</code> and member count as ' +
        '<code>members</code>, sorted by count descending then <code>name</code>.',
      solution:
        'SELECT f.name, COUNT(*) AS members FROM factions f JOIN character_factions cf ON cf.faction_id = f.id GROUP BY f.id HAVING COUNT(*) > 2 ORDER BY COUNT(*) DESC, f.name;',
      orderMatters: true,
      requiredKeywords: ['join', 'group by', 'having'],
      columnTables: ['factions', 'character_factions'],
      hints: [
        'Join the faction membership junction, then GROUP BY the faction.',
        'Filter groups with HAVING COUNT(*) > 2, then sort DESC with a name tiebreaker.',
        'Answer: SELECT f.name, COUNT(*) AS members FROM factions f JOIN character_factions cf ON cf.faction_id = f.id GROUP BY f.id HAVING COUNT(*) > 2 ORDER BY COUNT(*) DESC, f.name;',
      ],
      commonMistake:
        'HAVING (not WHERE) filters on the aggregated member count after grouping.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Count episodes per anime, <strong>including films with zero</strong>. ' +
        'LEFT JOIN <code>anime</code> to <code>episodes</code> and ' +
        '<code>COUNT(e.id)</code> (so a film with no episodes counts 0). Return ' +
        'the anime <code>title</code> and episode count as <code>episodes</code>, ' +
        'sorted by the count descending, then <code>title</code>.',
      solution:
        'SELECT a.title, COUNT(e.id) AS episodes FROM anime a LEFT JOIN episodes e ON e.anime_id = a.id GROUP BY a.id ORDER BY COUNT(e.id) DESC, a.title;',
      orderMatters: true,
      requiredKeywords: ['left join', 'group by'],
      columnTables: ['anime', 'episodes'],
      rightTables: ['episodes'],
      hints: [
        'A LEFT JOIN keeps anime with no episode rows.',
        'COUNT(e.id) counts 0 for those; COUNT(*) would wrongly count 1. Sort DESC with a title tiebreaker.',
        'Answer: SELECT a.title, COUNT(e.id) AS episodes FROM anime a LEFT JOIN episodes e ON e.anime_id = a.id GROUP BY a.id ORDER BY COUNT(e.id) DESC, a.title;',
      ],
      commonMistake:
        'COUNT(*) counts the single all-NULL row as 1 for a film — COUNT(e.id) correctly gives 0.',
    },
  ],
};
