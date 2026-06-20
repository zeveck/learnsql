// Lesson 8 — LEFT JOIN & the IS NULL anti-join (sample lesson, Phase 4). joinCore.

export default {
  id: 8,
  slug: 'left-join',
  title: 'LEFT JOIN',
  joinCore: true,
  tables: ['characters', 'voice_actors'],
  concept: `
    <p>A <code>LEFT JOIN</code> keeps <em>every</em> row from the left table,
    even when there is no match on the right — the right-hand columns come back
    <code>NULL</code>. That makes it perfect for "who is <em>missing</em> a
    relationship?": the <strong>anti-join</strong> pattern
    <code>LEFT JOIN ... WHERE right.key IS NULL</code>.</p>
    <p>Several characters (Wolfwood, Ein, Misato, …) have no voice actor recorded —
    a LEFT JOIN surfaces them with NULL on the voice-actor side.</p>
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
  ],
};
