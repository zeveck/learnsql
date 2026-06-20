// Capstone — "The Tournament Murder" (Phase 7).
//
// A self-contained anime-themed mystery. The learner gathers clues across several
// `query` exercises, narrowing the suspect pool, and the FINAL `query` exercise's
// canonical solution returns the culprit's name (a single, unique row), validated
// by the ordinary result-set comparison — no new mechanism.
//
// The clue chain (verified against the real seed to yield exactly ONE culprit):
//   - The killer is a VILLAIN and HUMAN (an eyewitness saw a human assailant).
//   - The killer LEADS a CRIMINAL faction (rank 'Leader', factions.is_criminal = 1).
//   - The murder weapon is a personally-owned WEAPON item.
// The unique intersection is **Makoto Shishio** (leader of the criminal faction
// Juppongatana, owner of the katana Mugenjin). Balalaika also leads a criminal
// faction but owns no weapon item, so the weapon clue eliminates her — leaving one.
//
// Scoring: the final exercise carries tags:['capstone'], and the lesson is flagged
// isCapstone — the runner passes solve.capstone:true, so js/score.js awards the
// flat 300 XP (computeXp capstone branch) and the "Detective" badge (badgesForEvent
// keys on event.capstone || the 'capstone' tag).

export default {
  id: 16,
  slug: 'capstone-tournament-murder',
  title: 'Capstone — The Tournament Murder',
  isCapstone: true,
  capstone: true,
  tables: [
    'characters',
    'factions',
    'character_factions',
    'character_items',
    'items',
    'anime',
  ],
  concept: `
    <p><strong>Case file: The Tournament Murder.</strong> During the grand
    inter-series martial-arts tournament, a competitor was found slain in the
    locker rooms. The festival board has handed you the academy database and asked
    you to name the killer.</p>
    <p>Three facts survived the investigation:</p>
    <ol>
      <li>A surviving witness swears the assailant was a <strong>human villain</strong>
      (<code>role = 'villain'</code>, <code>is_human = 1</code>).</li>
      <li>The killer was no foot-soldier — they <strong>lead a criminal
      organisation</strong> (a <code>character_factions</code> row with
      <code>rank = 'Leader'</code> into a faction where
      <code>factions.is_criminal = 1</code>).</li>
      <li>The murder weapon was the killer’s <strong>own personal weapon</strong>
      (a <code>character_items</code> row pointing at an
      <code>items.item_type = 'weapon'</code>).</li>
    </ol>
    <p>Work the clues one exercise at a time to narrow the suspects, then make your
    accusation: a single query that returns just the culprit’s <code>name</code>.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Clue 1 — the witness. List every <strong>human villain</strong> by ' +
        '<code>name</code> (<code>role = \'villain\'</code> and ' +
        '<code>is_human = 1</code>), sorted alphabetically. These are your initial ' +
        'suspects.',
      starter:
        "SELECT name\nFROM characters\nWHERE role = '____' AND is_human = ____\nORDER BY name;",
      solution:
        "SELECT name FROM characters WHERE role = 'villain' AND is_human = 1 ORDER BY name;",
      orderMatters: true,
      requiredKeywords: ['where', 'is_human'],
      columnTables: ['characters'],
      hints: [
        "Filter characters on role = 'villain'.",
        'Add AND is_human = 1 (humans are stored as 1).',
        "Answer: SELECT name FROM characters WHERE role = 'villain' AND is_human = 1 ORDER BY name;",
      ],
      commonMistake:
        'is_human is a 0/1 flag — humans are 1, non-humans are 0.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Clue 2 — the rank. Of the suspects, who <strong>leads a criminal ' +
        'faction</strong>? Join <code>characters</code> → ' +
        '<code>character_factions</code> → <code>factions</code> and keep only ' +
        'human villains whose <code>rank = \'Leader\'</code> in a faction with ' +
        '<code>is_criminal = 1</code>. Return the character <code>name</code> and ' +
        'faction <code>name</code> as <code>faction</code>, sorted by character ' +
        'name.',
      solution:
        "SELECT c.name, f.name AS faction FROM characters c JOIN character_factions cf ON cf.character_id = c.id JOIN factions f ON f.id = cf.faction_id WHERE c.role = 'villain' AND c.is_human = 1 AND cf.rank = 'Leader' AND f.is_criminal = 1 ORDER BY c.name;",
      orderMatters: true,
      requiredKeywords: ['join', 'where'],
      columnTables: ['characters', 'factions'],
      hints: [
        'Join characters to character_factions to factions.',
        "Filter to role = 'villain', is_human = 1, cf.rank = 'Leader', f.is_criminal = 1.",
        "Answer: SELECT c.name, f.name AS faction FROM characters c JOIN character_factions cf ON cf.character_id = c.id JOIN factions f ON f.id = cf.faction_id WHERE c.role = 'villain' AND c.is_human = 1 AND cf.rank = 'Leader' AND f.is_criminal = 1 ORDER BY c.name;",
      ],
      commonMistake:
        'The rank lives on the membership row (character_factions), the criminal flag on factions.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Clue 3 — the weapon. Narrow the two faction leaders to those who own a ' +
        'personal <strong>weapon</strong>. Of the human-villain criminal-faction ' +
        'leaders, return the character <code>name</code> and the weapon ' +
        '<code>name</code> as <code>weapon</code> (an <code>items.item_type = ' +
        '\'weapon\'</code> they hold in <code>character_items</code>), sorted by ' +
        'character name.',
      solution:
        "SELECT c.name, i.name AS weapon FROM characters c JOIN character_items ci ON ci.character_id = c.id JOIN items i ON i.id = ci.item_id WHERE i.item_type = 'weapon' AND c.role = 'villain' AND c.is_human = 1 AND c.id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE cf.rank = 'Leader' AND f.is_criminal = 1) ORDER BY c.name;",
      orderMatters: true,
      requiredKeywords: ['join', 'weapon'],
      columnTables: ['characters', 'items'],
      hints: [
        'Join characters to character_items to items, filtering item_type = \'weapon\'.',
        'Restrict to the leaders from Clue 2 with an IN subquery on character_factions/factions.',
        "Answer: SELECT c.name, i.name AS weapon FROM characters c JOIN character_items ci ON ci.character_id = c.id JOIN items i ON i.id = ci.item_id WHERE i.item_type = 'weapon' AND c.role = 'villain' AND c.is_human = 1 AND c.id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE cf.rank = 'Leader' AND f.is_criminal = 1) ORDER BY c.name;",
      ],
      commonMistake:
        'One of the two leaders owns no weapon item — the weapon clue is what eliminates them.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        '<strong>Make your accusation.</strong> Combine all three clues into one ' +
        'query that returns the <strong>single</strong> culprit’s <code>name</code> ' +
        '— the human villain who leads a criminal faction <em>and</em> owns a ' +
        'personal weapon. There is exactly one. Name the killer.',
      solution:
        "SELECT c.name FROM characters c WHERE c.role = 'villain' AND c.is_human = 1 AND c.id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE cf.rank = 'Leader' AND f.is_criminal = 1) AND c.id IN (SELECT ci.character_id FROM character_items ci JOIN items i ON i.id = ci.item_id WHERE i.item_type = 'weapon');",
      orderMatters: false,
      requiredKeywords: ['where', 'in'],
      columnTables: ['characters'],
      tags: ['capstone'],
      hints: [
        'Start from the human villains, then intersect the two IN subqueries from Clues 2 and 3.',
        'One IN subquery for criminal-faction leaders, one for weapon owners — require BOTH.',
        "Answer: SELECT c.name FROM characters c WHERE c.role = 'villain' AND c.is_human = 1 AND c.id IN (SELECT cf.character_id FROM character_factions cf JOIN factions f ON f.id = cf.faction_id WHERE cf.rank = 'Leader' AND f.is_criminal = 1) AND c.id IN (SELECT ci.character_id FROM character_items ci JOIN items i ON i.id = ci.item_id WHERE i.item_type = 'weapon');",
      ],
      commonMistake:
        'All three clues must hold at once — the intersection leaves exactly one suspect: the killer.',
    },
  ],
};
