# Lesson authoring contract

Lessons are plain ES-module data files under `lessons/`, each `export default` an
object. They are registered (explicitly imported) by `js/lessons.js` — the
deployed site is build-free with no directory listing, so when you add a lesson
file you must also add it to `LESSON_MODULES` in `js/lessons.js`.

The **canonical `solution` is the source of truth.** Expected results are
*generated* by running the solution on a fresh seeded clone — never typed. Every
Check (and every test) runs on a fresh seeded clone via `freshDb`, so prior edits
never leak into validation.

## Lesson shape

```js
export default {
  id: 7,                       // unique integer; also the play + gating order
  slug: 'inner-join',          // unique kebab-case slug
  title: 'INNER JOIN',
  joinCore: true,              // optional; JOIN-core lessons award XP ×1.5
  concept: `...html string...`,// taught above the editor (trusted author HTML)
  tables: ['characters','anime'], // tables to spotlight in the schema panel
  exercises: [ /* see below */ ],
};
```

## Exercise shapes

Two `kind`s. Both carry `tier` (`'bronze' | 'silver' | 'gold'`) and a `prompt`.

### `query` — validated by result-set comparison

```js
{
  kind: 'query', tier: 'bronze',
  prompt: 'List each character name with the title of the anime they appear in.',
  starter: 'SELECT c.name, a.title\nFROM characters c\nINNER JOIN anime a ON ____ = ____;',
  solution: 'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id=a.id;',
  orderMatters: false,           // true ONLY when the prompt fixes a total order
  requiredKeywords: ['join'],    // soft nudge if absent — never flips correctness
  columnTables: ['characters','anime'], // result-col-index -> source table (lesson viz)
  rightTables: ['anime'],        // tables whose all-NULL rows render "unmatched"
  tags: ['anti-join'],           // optional badge triggers (see below)
  allowEmpty: false,             // set true if the expected result is legitimately empty
  hints: [ 'L1 nudge', 'L2 skeleton', 'L3 near-answer + why' ],
  commonMistake: 'Every character has an anime, so an INNER JOIN drops nobody here.',
}
```

### `dml` — validated by running the mutation then a `verifySql` SELECT

```js
{
  kind: 'dml', tier: 'silver',
  prompt: 'Give Nicholas D. Wolfwood the voice actor Show Hayami (id 2) using UPDATE.',
  solution:  "UPDATE characters SET voice_actor_id=2 WHERE name='Nicholas D. Wolfwood';",
  verifySql: "SELECT voice_actor_id FROM characters WHERE name='Nicholas D. Wolfwood';",
  expectRowsModified: 1,         // optional: assert the mutation touched N rows
  requiredKeywords: ['update','set'],
  hints: [ ... ], commonMistake: '...',
}
```

The validator runs the user's mutation on a fresh clone, then runs `verifySql`
on the mutated DB and compares it (order-insensitively) to the same `verifySql`
run after the canonical `solution`. Never trust the (empty) DML result itself.

## Comparison rules (what makes an answer "correct")

1. **Column count must match** the canonical solution. A `SELECT *` that returns
   extra columns therefore fails (`wrong_columns`) — select exactly the columns
   the prompt names.
2. Cells are normalized with **no cross-type coercion**: `null` → a NULL
   sentinel, numbers → `Number`, strings → trimmed. `'8000' ≠ 8000`. Because
   expected and actual query the same typed columns, equivalent answers match.
   Do **not** author a prompt that mixes a column's type.
3. Rows are compared **by column position**, ignoring header names — so
   `SELECT name AS n` still matches.
4. `orderMatters: false` (default) → **multiset** compare. `orderMatters: true`
   → **ordered** compare; give every "sort by" prompt a **unique total order**
   (the test runs the solution again under `PRAGMA reverse_unordered_selects=ON`
   and requires identical output).

## Determinism rules

- No `RANDOM()` / time functions in solutions (results must be reproducible).
- "Multiple correct queries" means many query shapes → ONE result set; it does
  **not** mean multiple acceptable result sets.

## Tags → badges

Optional `tags` on an exercise drive event badges in `js/score.js`:

| tag | badge |
|---|---|
| `self-join` | Narcissus (first self-join solve) |
| `cross-join` | Cartographer (first CROSS) |
| `anti-join` | Left Behind (LEFT-JOIN `IS NULL` anti-join) |
| `capstone` | Detective (capstone) |

## Hints

Up to three, revealed one at a time, costed before spending:
L1 nudge (−2), L2 structural skeleton (−5), L3 near-answer + why (−10).

## The mechanical guard (`tests/lessons.test.mjs`)

Every authored exercise must pass, in a fresh seeded clone:
(a) `query` solution runs + `checkAnswer(solution)` → correct;
(b) `dml` solution + `verifySql` run + `checkAnswer(solution)` → correct;
(c) expected result non-empty unless `allowEmpty: true`;
(d) any `requiredKeywords` actually appear in the solution;
(e) `columnTables.length` (when present) equals the solution's column count;
(f) order determinism — for each `orderMatters: true` exercise, the solution
gives identical output normally and under `PRAGMA reverse_unordered_selects=ON`.
