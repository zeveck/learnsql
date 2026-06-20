// Lesson 8 — LEFT / RIGHT OUTER JOIN & the IS NULL anti-join (Phase 4 sample,
// fleshed out in Phase 6). joinCore.

export default {
  id: 8,
  slug: 'left-join',
  title: 'LEFT / RIGHT OUTER JOIN',
  joinCore: true,
  tables: ['characters', 'voice_actors', 'character_items', 'factions', 'character_factions'],
  concept: `
    <p>A <code>LEFT JOIN</code> keeps <em>every</em> row from the left table,
    even when there is no match on the right — the right-hand columns come back
    <code>NULL</code>. That makes it perfect for "who is <em>missing</em> a
    relationship?": the <strong>anti-join</strong> pattern
    <code>LEFT JOIN ... WHERE right.key IS NULL</code>.</p>
    <p>Several characters (Wolfwood, Ein, Misato, …) have no voice actor recorded,
    and many characters own no items at all — a LEFT JOIN surfaces them with NULL
    on the right side.</p>
    <p>A <code>RIGHT JOIN</code> is the mirror image: it keeps every row from the
    <em>right</em> table. <code>A RIGHT JOIN B</code> is the same as
    <code>B LEFT JOIN A</code> — the empty "Bounty Hunters Guild" faction (no
    members) shows up when factions are kept on the outer side.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        "List every character's name alongside their voice actor's name. " +
        'Characters without a voice actor should still appear (with NULL).',
      starter:
        'SELECT c.name, v.name\nFROM characters c\nLEFT JOIN voice_actors v ON ____ = ____;',
      solution:
        'SELECT c.name, v.name FROM characters c LEFT JOIN voice_actors v ON c.voice_actor_id = v.id;',
      orderMatters: false,
      requiredKeywords: ['left join'],
      columnTables: ['characters', 'voice_actors'],
      rightTables: ['voice_actors'],
      hints: [
        'Start from characters and LEFT JOIN voice_actors.',
        'Match on c.voice_actor_id = v.id.',
        'Answer: SELECT c.name, v.name FROM characters c LEFT JOIN voice_actors v ON c.voice_actor_id = v.id;',
      ],
      commonMistake:
        'An INNER JOIN would drop the voice-actor-less characters — use LEFT JOIN to keep them.',
    },
    {
      kind: 'query',
      tier: 'silver',
      tags: ['anti-join'],
      prompt:
        'Find the names of every character who has <strong>no</strong> voice ' +
        'actor, sorted alphabetically by name. Use a LEFT JOIN with an ' +
        '<code>IS NULL</code> filter (the anti-join).',
      starter:
        'SELECT c.name\nFROM characters c\nLEFT JOIN voice_actors v ON c.voice_actor_id = v.id\nWHERE v.id IS NULL\nORDER BY c.name;',
      solution:
        'SELECT c.name FROM characters c LEFT JOIN voice_actors v ON c.voice_actor_id = v.id WHERE v.id IS NULL ORDER BY c.name;',
      orderMatters: true,
      requiredKeywords: ['left join', 'is null'],
      columnTables: ['characters'],
      hints: [
        'LEFT JOIN keeps unmatched left rows with NULL on the right.',
        'Filter to only those unmatched rows: WHERE v.id IS NULL.',
        'Answer: SELECT c.name FROM characters c LEFT JOIN voice_actors v ON c.voice_actor_id = v.id WHERE v.id IS NULL ORDER BY c.name;',
      ],
      commonMistake:
        'Filter on the RIGHT table key being NULL (v.id IS NULL), not the left.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Which characters own <strong>no items</strong>? LEFT JOIN ' +
        '<code>characters</code> to <code>character_items</code> on ' +
        '<code>characters.id = character_items.character_id</code> and keep only ' +
        'the unmatched rows (<code>character_items.character_id IS NULL</code>). ' +
        'Return the character <code>name</code>, sorted alphabetically.',
      starter:
        'SELECT c.name\nFROM characters c\nLEFT JOIN character_items ci ON c.id = ci.character_id\nWHERE ____ IS NULL\nORDER BY c.name;',
      solution:
        'SELECT c.name FROM characters c LEFT JOIN character_items ci ON c.id = ci.character_id WHERE ci.character_id IS NULL ORDER BY c.name;',
      orderMatters: true,
      requiredKeywords: ['left join', 'is null'],
      columnTables: ['characters'],
      hints: [
        'LEFT JOIN keeps every character even with no item rows.',
        'The item-less characters have NULL on the character_items side: WHERE ci.character_id IS NULL.',
        'Answer: SELECT c.name FROM characters c LEFT JOIN character_items ci ON c.id = ci.character_id WHERE ci.character_id IS NULL ORDER BY c.name;',
      ],
      commonMistake:
        'This is the same anti-join shape: keep the left rows, then filter where the right key IS NULL.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Use a <code>RIGHT JOIN</code> to keep every faction, even those with no ' +
        'members. List each faction <code>name</code> with the count of its ' +
        'members as <code>members</code> (count the joined character key so an ' +
        'empty faction scores 0). Sort by member count ascending, then faction ' +
        'name — so the empty "Bounty Hunters Guild" comes first.',
      solution:
        'SELECT f.name, COUNT(cf.character_id) AS members FROM character_factions cf RIGHT JOIN factions f ON cf.faction_id = f.id GROUP BY f.id ORDER BY COUNT(cf.character_id), f.name;',
      orderMatters: true,
      requiredKeywords: ['right join', 'group by'],
      columnTables: ['factions', 'character_factions'],
      hints: [
        'RIGHT JOIN keeps every row of the right table (factions).',
        'Count cf.character_id (NULL for empty factions counts as 0), GROUP BY f.id.',
        'Answer: SELECT f.name, COUNT(cf.character_id) AS members FROM character_factions cf RIGHT JOIN factions f ON cf.faction_id = f.id GROUP BY f.id ORDER BY COUNT(cf.character_id), f.name;',
      ],
      commonMistake:
        'COUNT(*) would count 1 for an empty faction; COUNT(cf.character_id) counts 0 because the key is NULL.',
    },
  ],
};
