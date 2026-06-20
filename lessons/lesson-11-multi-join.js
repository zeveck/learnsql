// Lesson 11 — Multi-table joins (3+ via junctions) (Phase 6). joinCore.
//
// Chain several joins to walk from one entity to another through junction
// (many-to-many) tables: characters -> character_items -> items -> anime, and
// voice_actors -> voice_actor_roles -> characters -> anime.

export default {
  id: 11,
  slug: 'multi-join',
  title: 'Multi-table joins',
  joinCore: true,
  tables: ['characters', 'character_items', 'items', 'anime', 'voice_actors', 'voice_actor_roles'],
  concept: `
    <p>Real questions span more than two tables. You <strong>chain</strong> joins:
    each new <code>JOIN ... ON</code> attaches one more table to what you have so
    far. To get a character's <em>items</em> you hop through the
    <code>character_items</code> junction:
    <code>characters → character_items → items</code>, and you can keep going to
    <code>anime</code> for the series.</p>
    <p>Many-to-many links always go through a <strong>junction table</strong>
    (<code>character_items</code>, <code>voice_actor_roles</code>, …). The pattern
    is the same every time: join the junction on both of its foreign keys to bridge
    the two entities it connects.</p>
    <p>Alias every table and qualify every column — with four tables in play,
    bare column names quickly become ambiguous.</p>
  `,
  exercises: [
    {
      kind: 'query',
      tier: 'bronze',
      prompt:
        'Show each character with an item: return the character <code>name</code>, ' +
        'the item <code>name</code>, and the item <code>item_type</code>. Join ' +
        '<code>characters</code> → <code>character_items</code> → <code>items</code>.',
      starter:
        'SELECT c.name, i.name, i.item_type\nFROM characters c\nJOIN character_items ci ON c.id = ci.character_id\nJOIN items i ON ci.item_id = i.id;',
      solution:
        'SELECT c.name, i.name, i.item_type FROM characters c JOIN character_items ci ON c.id = ci.character_id JOIN items i ON ci.item_id = i.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'items', 'items'],
      hints: [
        'Hop through the character_items junction to reach items.',
        'characters c JOIN character_items ci ON c.id = ci.character_id JOIN items i ON ci.item_id = i.id.',
        'Answer: SELECT c.name, i.name, i.item_type FROM characters c JOIN character_items ci ON c.id = ci.character_id JOIN items i ON ci.item_id = i.id;',
      ],
      commonMistake:
        'You cannot join characters to items directly — the link lives in the character_items junction.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Extend the chain to four tables: character <code>name</code>, item ' +
        '<code>name</code>, item <code>item_type</code>, and the ' +
        '<code>title</code> of the character’s anime. Join ' +
        '<code>characters</code> → <code>character_items</code> → ' +
        '<code>items</code> and also <code>characters</code> → <code>anime</code>.',
      solution:
        'SELECT c.name, i.name, i.item_type, a.title FROM characters c JOIN character_items ci ON c.id = ci.character_id JOIN items i ON ci.item_id = i.id JOIN anime a ON c.anime_id = a.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['characters', 'items', 'items', 'anime'],
      hints: [
        'Add one more JOIN to anime on c.anime_id = a.id.',
        'Keep all four tables aliased and qualify every column.',
        'Answer: SELECT c.name, i.name, i.item_type, a.title FROM characters c JOIN character_items ci ON c.id = ci.character_id JOIN items i ON ci.item_id = i.id JOIN anime a ON c.anime_id = a.id;',
      ],
      commonMistake:
        'anime links to characters directly (c.anime_id), not through the items chain.',
    },
    {
      kind: 'query',
      tier: 'silver',
      prompt:
        'Walk the dub junction: list each voice actor with a character they voice ' +
        'and that character’s anime. Join <code>voice_actors</code> → ' +
        '<code>voice_actor_roles</code> → <code>characters</code> → ' +
        '<code>anime</code>. Return the voice actor <code>name</code>, character ' +
        '<code>name</code>, and anime <code>title</code>.',
      solution:
        'SELECT v.name, c.name, a.title FROM voice_actors v JOIN voice_actor_roles vr ON v.id = vr.voice_actor_id JOIN characters c ON vr.character_id = c.id JOIN anime a ON c.anime_id = a.id;',
      orderMatters: false,
      requiredKeywords: ['join'],
      columnTables: ['voice_actors', 'characters', 'anime'],
      hints: [
        'The voice_actor_roles junction links voice_actors to characters.',
        'voice_actors v JOIN voice_actor_roles vr ... JOIN characters c ... JOIN anime a ...',
        'Answer: SELECT v.name, c.name, a.title FROM voice_actors v JOIN voice_actor_roles vr ON v.id = vr.voice_actor_id JOIN characters c ON vr.character_id = c.id JOIN anime a ON c.anime_id = a.id;',
      ],
      commonMistake:
        'voice_actor_roles is the junction — join it on both foreign keys to bridge actors and characters.',
    },
    {
      kind: 'query',
      tier: 'gold',
      prompt:
        'Find the voice actors who voice characters in <strong>more than one</strong> ' +
        'anime. Through <code>voice_actors</code> → <code>voice_actor_roles</code> → ' +
        '<code>characters</code> → <code>anime</code>, return the voice actor ' +
        '<code>name</code> and the number of distinct series as <code>series</code>, ' +
        'keeping only those with <code>COUNT(DISTINCT a.id) &gt; 1</code>. Sort by ' +
        '<code>series</code> descending, then voice actor <code>name</code>.',
      solution:
        'SELECT v.name, COUNT(DISTINCT a.id) AS series FROM voice_actors v JOIN voice_actor_roles vr ON v.id = vr.voice_actor_id JOIN characters c ON vr.character_id = c.id JOIN anime a ON c.anime_id = a.id GROUP BY v.id HAVING COUNT(DISTINCT a.id) > 1 ORDER BY COUNT(DISTINCT a.id) DESC, v.name;',
      orderMatters: true,
      requiredKeywords: ['join', 'group by', 'having'],
      columnTables: ['voice_actors', 'voice_actors'],
      hints: [
        'GROUP BY the voice actor and COUNT(DISTINCT a.id) for their series spread.',
        'Keep only > 1 with HAVING, then sort DESC with a name tiebreaker.',
        'Answer: SELECT v.name, COUNT(DISTINCT a.id) AS series FROM voice_actors v JOIN voice_actor_roles vr ON v.id = vr.voice_actor_id JOIN characters c ON vr.character_id = c.id JOIN anime a ON c.anime_id = a.id GROUP BY v.id HAVING COUNT(DISTINCT a.id) > 1 ORDER BY COUNT(DISTINCT a.id) DESC, v.name;',
      ],
      commonMistake:
        'COUNT(DISTINCT a.id) — without DISTINCT, two characters in the same series would inflate the count.',
    },
  ],
};
