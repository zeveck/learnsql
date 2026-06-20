---
title: Anime SQL Academy — Interactive Client-Side SQL Learning Site
created: 2026-06-19
status: active
---

# Plan: Anime SQL Academy

## Overview

Build a fun, fully **client-side** website that teaches SQL — with a heavy emphasis on
**JOINs** — using an anime-themed mock SQLite database. Learners write real SQL in the
browser, see live results, explore and modify the database, work through a tiered lesson
curriculum, and earn XP / badges. The site is served as a static site via **GitHub Pages at
`sql.synapticnoise.com`**.

### Locked decisions
- **No backend.** Everything runs in the browser. SQL executes via **sql.js** (SQLite compiled
  to WASM, single-threaded — needs no COOP/COEP headers, which GitHub Pages cannot set).
- **The DEPLOYED site is build-free.** It is exactly the committed static files (HTML + CSS +
  ES modules) plus the committed `vendor/` assets. Deploying is `git push` → live; the browser
  loads only relative-path local files (no runtime CDN, no bundler output, no server).
- **Served from the repository ROOT** of `main` (Pages source = "Deploy from a branch", branch
  `main`, folder `/ (root)`). `index.html`, `CNAME`, `.nojekyll`, `assets/favicon.svg`, and the
  asset directories (`css/`, `js/`, `data/`, `lessons/`, `vendor/`) all live at repo root.
- **9 anime series:** Trigun, Cowboy Bebop, Akira, Neon Genesis Evangelion, Black Lagoon,
  Rurouni Kenshin, Dragon Ball Z, Fullmetal Alchemist: Brotherhood, Attack on Titan.
- **Relative asset URLs everywhere** (`./vendor/...`, `./js/...`) so the site also works at the
  raw `*.github.io/<repo>/` fallback URL, not only at the custom-domain root.

### Dev-tooling carve-out (IMPORTANT — resolves the "no build" tension)
"No build step" governs the **deployed site**, NOT the development environment. A **dev-only
`package.json`** exists for tooling that is **never loaded by the site and never deployed**:
- `@playwright/test` — the E2E test runner.
- `esbuild` + the `@codemirror/*` / `@lezer/*` packages — used **once** to produce the committed
  `vendor/codemirror.bundle.js` (see Phase 3). Re-run only to update CodeMirror.

`node_modules/` is gitignored and never served. The **committed `vendor/` files ARE served**
(they are the vendored runtime assets). The site's own runtime imports resolve only to
`./vendor/*` and `./js/*` — no `node_modules`, no CDN.

### Testing approach (no framework preconfigured; this plan establishes one in Phase 1)
- **Logic tests run headless under Node** using sql.js (it runs in Node too). A tiny
  zero-dependency runner `tests/run-node.mjs` discovers and runs `tests/*.test.mjs`, exiting
  non-zero on any failure. **Node `locateFile` MUST return an absolute path** (sql.js resolves
  it against `process.cwd()`, not the test file — see Phase 1). Command: `node tests/run-node.mjs`
  (the project's **unit** test command).
- **UI / end-to-end** uses **`@playwright/test`** with a `webServer` block that launches
  `python3 -m http.server` as the static preview (no app dev server exists). **Only Chromium is
  installed** in this environment (`.devcontainer/setup.sh` installs chromium), so the gating
  E2E run is **Chromium-only**; Firefox/WebKit are an optional manual check (Phase 8).
- `scripts/test-all.sh` = `node tests/run-node.mjs && npx playwright test` (the project's **full**
  test command). Every phase's final acceptance criterion is `bash scripts/test-all.sh` exits 0.
- Every phase's Acceptance Criteria are concrete and machine-checkable or directly observable.

### Accepted exposure (root serving)
Serving from the repo root + `.nojekyll` means the **entire committed repo is publicly fetchable**
at the domain (e.g. `/docs/plans/SQL.md`, `/.claude/...`, `/tests/...`, `/scripts/...`). This is
acceptable for an open teaching project; **the README must state it and the repo must contain no
secrets.** (Plan docs live under `docs/plans/` and are unrelated to the app.)

## Progress Tracker

| Phase | Status | Commit | Notes |
|-------|--------|--------|-------|
| 1 — Scaffold, tooling, engine smoke test & deploy pipeline | ✅ | 227b3fd | tests 3/3 (node 2, e2e 1) |
| 2 — Database layer (schema + seed + db.js) | ✅ | | tests 25/25 (node 24, e2e 1) |
| 3 — Query workbench UI (editor, results, schema panel, explore) | ⬚ | | |
| 4 — Lesson + validation + scoring engine (incl. DML validation) | ⬚ | | |
| 5 — Lesson content: basics & aggregation (lessons 1–6) | ⬚ | | |
| 6 — Lesson content: JOIN core (lessons 7–12) | ⬚ | | |
| 7 — Lesson content: advanced (13–15) + capstone mystery | ⬚ | | |
| 8 — Polish: profile, mobile, a11y, cross-browser, final QA | ⬚ | | |

---

## Phase 1 — Scaffold, tooling, engine smoke test & deploy pipeline

### Goal
Establish the repo-root static-site skeleton, the dev-only tooling (`package.json`, Playwright
config, test runner), prove sql.js loads and runs a query rendering a table in **both** the
browser and headless Node, vendor sql.js, and make the site deployable to GitHub Pages at the
custom domain (with the human-only steps documented).

### Work Items
- [ ] Root layout: `index.html`, `css/styles.css`, `js/app.js`, `js/db.js`, `assets/favicon.svg`,
      `vendor/`, `data/` (placeholder), `lessons/` (placeholder), `tests/`, `scripts/`, `tools/`.
- [ ] Vendor **sql.js pinned to 1.14.1** (≥1.10 required for RIGHT/FULL OUTER JOIN): commit
      `vendor/sql-wasm.js` and `vendor/sql-wasm.wasm`. (No `.mjs` exists — do NOT reference one.)
- [ ] **Browser sql.js load:** `index.html` includes `<script src="./vendor/sql-wasm.js"></script>`
      (a CLASSIC script — it is UMD and exposes a global `initSqlJs`; an ES-module `import` of it
      resolves to `undefined` in the browser) BEFORE the `<script type="module" src="./js/app.js">`.
      `js/db.js` reads `globalThis.initSqlJs`.
- [ ] `js/db.js` (minimal this phase): `export async function initEngine()` →
      `await globalThis.initSqlJs({ locateFile: f => './vendor/' + f })`, returns the `SQL` factory.
- [ ] `js/app.js` (smoke): init engine, `new SQL.Database()`, run
      `CREATE TABLE t(a,b); INSERT INTO t VALUES (1,'Vash'),(2,'Spike');` then `SELECT * FROM t;`,
      render into a `<table>`. Replace a "Loading SQL engine…" placeholder; show any error visibly.
- [ ] `assets/favicon.svg` + `<link rel="icon" href="./assets/favicon.svg">` (relative) so there
      is no 404 (the Phase-1 "no console errors" check depends on this).
- [ ] `CNAME` (repo root): one line `sql.synapticnoise.com`. `.nojekyll` (repo root): empty.
- [ ] **Dev tooling:** `package.json` (dev-only, `private:true`) with devDependencies
      `@playwright/test` and `esbuild` (and, added in Phase 3, the `@codemirror/*`/`@lezer/*`
      packages). **Pin `@playwright/test` to a version whose bundled Chromium revision matches
      the devcontainer's pre-installed browser** (currently revision 1228 / Playwright ~1.61.x —
      check `~/.cache/ms-playwright`); `scripts/test-all.sh` also runs `npx playwright install
      chromium` defensively. `.gitignore`: add `node_modules/`, `test-results/`,
      `playwright-report/`, `.test-results.txt` (keep `.zskills/`). Do NOT gitignore `vendor/`.
- [ ] `playwright.config.mjs`: `use:{ baseURL:'http://localhost:8000' }`,
      `webServer:{ command:'python3 -m http.server 8000', url:'http://localhost:8000', reuseExistingServer:true, timeout:30000 }`,
      `projects:[{ name:'chromium', use: devices['Desktop Chrome'] }]` (Chromium only — the only
      installed browser). `testDir:'tests/e2e'`.
- [ ] `tests/harness.mjs`: tiny `test(name, fn)` + `assert`/`assertEqual` (deep-equal) helpers
      collecting pass/fail. `tests/run-node.mjs`: import all `tests/*.test.mjs`, run, print
      counts, `process.exit(failures>0?1:0)`.
- [ ] `tests/_sqljs.mjs`: a shared Node loader — `import initSqlJs from '../vendor/sql-wasm.js'`
      (Node's CJS→ESM interop makes the UMD default-importable) and init with an **absolute**
      `locateFile`: `f => fileURLToPath(new URL('../vendor/' + f, import.meta.url))` (import
      `fileURLToPath` from `node:url` — portable, vs the non-portable `.pathname`). Export
      `getSQL()`. (This is the documented Node↔browser `locateFile` divergence.)
- [ ] `tests/engine.test.mjs`: via `getSQL()`, run the smoke SQL, assert the result equals
      `{columns:['a','b'], values:[[1,'Vash'],[2,'Spike']]}`. Assert `sqlite_version()` ≥ 3.39
      (string compare on dotted parts) so a vendored-asset downgrade fails loudly.
- [ ] `scripts/test-all.sh`: `set -e; node tests/run-node.mjs; npx playwright install chromium
      >/dev/null 2>&1 || true; npx playwright test`. (Phase 1 already ships
      `tests/e2e/smoke.spec.mjs`, so Playwright runs a real spec from Phase 1 onward.)
- [ ] `tests/e2e/smoke.spec.mjs` (Playwright, Chromium): load `/`, wait for the table, assert the
      `(1,Vash)`/`(2,Spike)` rows render and there are no page errors.
- [ ] `README.md`: architecture, the dev-tooling carve-out, the accepted root-serving exposure,
      and the **human-only deploy steps** (see Design).

### Design & Constraints

**sql.js — two distinct load paths (do NOT share the `locateFile` string):**
- Browser: classic `<script src="./vendor/sql-wasm.js">` sets `globalThis.initSqlJs`; then
  `initSqlJs({ locateFile: f => './vendor/' + f })` (page-relative).
- Node: `import initSqlJs from '../vendor/sql-wasm.js'`; `locateFile` MUST be absolute:
  `f => fileURLToPath(new URL('../vendor/' + f, import.meta.url))` (sql.js resolves relative
  returns against `process.cwd()` → ENOENT if reused from the browser string).

**Result rendering contract (reused in Phase 3):** `db.exec(sql)` → `[{columns,values}]`
(empty `[]` for no-row statements). HTML-escape every cell.

**GitHub Pages serving (root):** Pages source = "Deploy from a branch", branch `main`, folder
`/ (root)`. `CNAME`/`.nojekyll` at repo root. `.wasm` is served as `application/wasm`. No
COOP/COEP needed.

**README — human-only steps (cannot be automated):**
1. DNS at the `synapticnoise.com` provider: add a **CNAME record**, host `sql`, value
   `<account>.github.io` (account host only — NO repo, NO path). Up to 24h propagation.
2. Create the GitHub repo, add `origin`, push `main`.
3. Settings → Pages → Source = **Deploy from a branch**, Branch **`main`**, Folder **`/ (root)`**.
4. Settings → Pages → Custom domain = `sql.synapticnoise.com`, Save (await green DNS check).
5. After cert provisions (up to 24h), tick **Enforce HTTPS**.
6. Verify `https://sql.synapticnoise.com/CNAME` returns the domain and the `.wasm` loads as
   `application/wasm`.

### Acceptance Criteria
- [ ] `node tests/run-node.mjs` exits 0: `engine.test.mjs` passes (smoke SQL returns the exact
      expected result; `sqlite_version()` ≥ 3.39).
- [ ] Served over `http://` (`python3 -m http.server`), `index.html` shows the `(1,Vash)`/
      `(2,Spike)` table, the WASM is fetched from `./vendor/sql-wasm.wasm`, and there are **no
      console errors** (favicon present).
- [ ] `tests/e2e/smoke.spec.mjs` passes under `npx playwright test` (Chromium).
- [ ] `CNAME`, `.nojekyll`, `vendor/sql-wasm.js`, `vendor/sql-wasm.wasm`, `assets/favicon.svg`,
      `package.json`, `playwright.config.mjs` exist; `node_modules/` is gitignored.
- [ ] `README.md` lists the 6 human deploy steps and notes the root-serving exposure.
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
None (first phase).

---

## Phase 2 — Database layer (schema + seed + db.js)

### Goal
Define the complete anime SQLite schema and seed data, and a `db.js` that builds a fresh seeded
in-memory database (cached + cloned for speed), runs queries with structured error capture,
resets, and optionally persists a sandbox to IndexedDB. All JOIN types return sensible results.

### Work Items
- [ ] `data/schema.js` — exports `SCHEMA_SQL` (full DDL), `SEED_SQL` (full INSERTs), `SCHEMA`
      (object: table → array of column names, for autocomplete + schema panel), and
      `RELATIONSHIPS` (array of `{fromTable, fromCol, toTable, toCol}` FK descriptors, for the
      schema panel + FK highlighting). `SCHEMA`/`RELATIONSHIPS` MUST be kept consistent with the
      DDL (a test enforces this).
- [ ] `js/db.js`:
  - `getSeedBytes(SQL)` → build a DB once (`SCHEMA_SQL` then `SEED_SQL`, **foreign keys left
    OFF** = SQLite default), `db.export()` to a `Uint8Array`, cache it; return the cached bytes.
  - `freshDb(SQL)` → `new SQL.Database(getSeedBytes(SQL))` (clone from the cached image — fast;
    no re-exec of the seed SQL per call).
  - `runQuery(db, sql)` → `{ ok:true, results:[{columns,values}], rowsModified }` or
    `{ ok:false, error:{ raw, type, message } }`; never throws. `type` ∈ `no_such_column`,
    `no_such_table`, `ambiguous_column`, `syntax`, `other` (matched on the SQLite message text).
  - `resetDb(SQL)` → a fresh clone. `saveSandbox(db)`/`loadSandbox(SQL)` persist/restore the
    exported bytes via **IndexedDB** (binary-native; not base64/localStorage).
- [ ] `tests/db.test.mjs` (Node + vendored sql.js):
  - Fresh DB row counts for **all** seeded tables: `studios`=8, `voice_actors`=18, `anime`=10,
    `episodes`=12, `characters`=55, `factions`=14, `character_factions`=31, `items`=18,
    `character_items`=18, `tropes`=12, `character_tropes`=29, `genres`=14, `anime_genres`=27,
    `voice_actor_roles`=11.
  - **SCHEMA↔DDL consistency:** for every table, `SCHEMA[table]` equals the column names from
    `PRAGMA table_info(table)`; every `RELATIONSHIPS` entry corresponds to a real
    `PRAGMA foreign_key_list` row.
  - One smoke query **per JOIN type** (from the Join Opportunity Map) asserting a known row:
    e.g. SELF JOIN Goku→rival Vegeta; LEFT JOIN surfaces Wolfwood's NULL VA; RIGHT/FULL OUTER
    surfaces the member-less "Bounty Hunters Guild"; `sqlite_version()` ≥ 3.39.
  - `runQuery` classification: `SELECT * FROM nope` → `no_such_table`;
    `SELECT powerlevel FROM characters` → `no_such_column`; an ambiguous unqualified `id` across
    a join → `ambiguous_column`; and a success path never throws.

### Design & Constraints

**FK policy:** foreign keys OFF (default) — forgiving sandbox, seed insert-order is irrelevant,
`voice_actors` is still declared BEFORE `characters` for a clean forward reference. `is_human`/
`is_criminal` are 0/1; dates are ISO-8601 TEXT.

**`SCHEMA_SQL` (author exactly this):**
```sql
CREATE TABLE studios (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, country TEXT, founded_year INTEGER
);
CREATE TABLE voice_actors (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'Japanese'
);
CREATE TABLE anime (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, studio_id INTEGER,
  release_year INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'TV' CHECK (media_type IN ('TV','Film')),
  episode_count INTEGER,
  FOREIGN KEY (studio_id) REFERENCES studios(id)
);
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY, anime_id INTEGER NOT NULL, episode_number INTEGER NOT NULL,
  title TEXT, air_date TEXT,
  UNIQUE (anime_id, episode_number),
  FOREIGN KEY (anime_id) REFERENCES anime(id)
);
CREATE TABLE characters (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, anime_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hero','villain','anti-hero','supporting')),
  is_human INTEGER NOT NULL DEFAULT 1 CHECK (is_human IN (0,1)),
  rival_id INTEGER, mentor_id INTEGER, voice_actor_id INTEGER,
  FOREIGN KEY (anime_id) REFERENCES anime(id),
  FOREIGN KEY (rival_id) REFERENCES characters(id),
  FOREIGN KEY (mentor_id) REFERENCES characters(id),
  FOREIGN KEY (voice_actor_id) REFERENCES voice_actors(id)
);
CREATE TABLE factions (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, anime_id INTEGER,
  is_criminal INTEGER NOT NULL DEFAULT 0 CHECK (is_criminal IN (0,1)),
  FOREIGN KEY (anime_id) REFERENCES anime(id)
);
CREATE TABLE character_factions (
  character_id INTEGER NOT NULL, faction_id INTEGER NOT NULL, rank TEXT,
  PRIMARY KEY (character_id, faction_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (faction_id) REFERENCES factions(id)
);
CREATE TABLE items (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  item_type TEXT CHECK (item_type IN ('weapon','vehicle','gadget','artifact')),
  description TEXT
);
CREATE TABLE character_items (
  character_id INTEGER NOT NULL, item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1, notes TEXT,
  PRIMARY KEY (character_id, item_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);
CREATE TABLE tropes (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT
);
CREATE TABLE character_tropes (
  character_id INTEGER NOT NULL, trope_id INTEGER NOT NULL,
  PRIMARY KEY (character_id, trope_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (trope_id) REFERENCES tropes(id)
);
CREATE TABLE genres (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE
);
CREATE TABLE anime_genres (
  anime_id INTEGER NOT NULL, genre_id INTEGER NOT NULL,
  PRIMARY KEY (anime_id, genre_id),
  FOREIGN KEY (anime_id) REFERENCES anime(id),
  FOREIGN KEY (genre_id) REFERENCES genres(id)
);
CREATE TABLE voice_actor_roles (
  voice_actor_id INTEGER NOT NULL, character_id INTEGER NOT NULL,
  dub TEXT NOT NULL DEFAULT 'Japanese',
  PRIMARY KEY (voice_actor_id, character_id, dub),
  FOREIGN KEY (voice_actor_id) REFERENCES voice_actors(id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

**`SEED_SQL` (author exactly this; canon-verified; preserve the `''` SQLite quote-escaping —
emit `SEED_SQL` from a JS backtick template so the single-quotes stay literal):**
```sql
INSERT INTO studios (id,name,country,founded_year) VALUES
 (1,'Madhouse','Japan',1972),(2,'Sunrise','Japan',1972),(3,'Tokyo Movie Shinsha','Japan',1964),
 (4,'Gainax','Japan',1984),(5,'Studio Gallop','Japan',1978),(6,'Toei Animation','Japan',1948),
 (7,'Bones','Japan',1998),(8,'Wit Studio','Japan',2012);

INSERT INTO voice_actors (id,name,language) VALUES
 (1,'Masaya Onosaka','Japanese'),(2,'Show Hayami','Japanese'),(3,'Koichi Yamadera','Japanese'),
 (4,'Megumi Hayashibara','Japanese'),(5,'Unsho Ishizuka','Japanese'),(6,'Norio Wakamoto','Japanese'),
 (7,'Megumi Ogata','Japanese'),(8,'Yuko Miyamura','Japanese'),(9,'Fumihiko Tachiki','Japanese'),
 (10,'Masako Nozawa','Japanese'),(11,'Ryo Horikawa','Japanese'),(12,'Toshio Furukawa','Japanese'),
 (13,'Mami Koyama','Japanese'),(14,'Megumi Toyoguchi','Japanese'),(15,'Mitsuaki Madono','Japanese'),
 (16,'Mayo Suzukaze','Japanese'),(17,'Steve Blum','English'),(18,'Mitsuo Iwata','Japanese');

INSERT INTO anime (id,title,studio_id,release_year,media_type,episode_count) VALUES
 (1,'Trigun',1,1998,'TV',26),(2,'Cowboy Bebop',2,1998,'TV',26),(3,'Akira',3,1988,'Film',1),
 (4,'Neon Genesis Evangelion',4,1995,'TV',26),(5,'Black Lagoon',1,2006,'TV',24),
 (6,'Rurouni Kenshin',5,1996,'TV',95),(7,'Dragon Ball Z',6,1989,'TV',291),
 (8,'Fullmetal Alchemist: Brotherhood',7,2009,'TV',64),(9,'Attack on Titan',8,2013,'TV',25),
 (10,'Cowboy Bebop: The Movie',NULL,2001,'Film',1);

INSERT INTO genres (id,name) VALUES
 (1,'Action'),(2,'Sci-Fi'),(3,'Space Western'),(4,'Mecha'),(5,'Psychological'),(6,'Crime'),
 (7,'Historical'),(8,'Martial Arts'),(9,'Cyberpunk'),(10,'Fantasy'),(11,'Neo-noir'),
 (12,'Drama'),(13,'Adventure'),(14,'Post-apocalyptic');

INSERT INTO anime_genres (anime_id,genre_id) VALUES
 (1,1),(1,3),(1,2),(2,1),(2,3),(2,11),(3,9),(3,2),(3,5),(4,4),(4,5),(4,2),(5,1),(5,6),(5,12),
 (6,1),(6,7),(6,8),(7,1),(7,8),(7,13),(8,1),(8,10),(8,13),(9,1),(9,12),(9,14);
-- anime 10 intentionally has NO genre rows.

INSERT INTO characters (id,name,anime_id,role,is_human,rival_id,mentor_id,voice_actor_id) VALUES
 (1,'Vash the Stampede',1,'hero',0,2,NULL,1),(2,'Millions Knives',1,'villain',0,1,NULL,2),
 (3,'Nicholas D. Wolfwood',1,'anti-hero',1,NULL,NULL,NULL),(4,'Meryl Stryfe',1,'supporting',1,NULL,NULL,NULL),
 (5,'Milly Thompson',1,'supporting',1,NULL,NULL,NULL),(6,'Legato Bluesummers',1,'villain',1,NULL,NULL,NULL),
 (7,'Spike Spiegel',2,'hero',1,8,9,3),(8,'Vicious',2,'villain',1,7,NULL,6),
 (9,'Jet Black',2,'supporting',1,NULL,NULL,5),(10,'Faye Valentine',2,'anti-hero',1,NULL,NULL,4),
 (11,'Edward',2,'supporting',1,NULL,NULL,NULL),(12,'Ein',2,'supporting',0,NULL,NULL,NULL),
 (13,'Julia',2,'supporting',1,NULL,NULL,NULL),
 (14,'Shotaro Kaneda',3,'hero',1,15,NULL,18),(15,'Tetsuo Shima',3,'villain',1,14,NULL,NULL),
 (16,'Kei',3,'supporting',1,NULL,NULL,13),(17,'Colonel Shikishima',3,'supporting',1,NULL,NULL,NULL),
 (18,'Akira',3,'supporting',1,NULL,NULL,NULL),
 (19,'Shinji Ikari',4,'hero',1,21,NULL,7),(20,'Rei Ayanami',4,'supporting',1,NULL,NULL,4),
 (21,'Asuka Langley Soryu',4,'supporting',1,19,NULL,8),(22,'Gendo Ikari',4,'villain',1,NULL,NULL,9),
 (23,'Misato Katsuragi',4,'supporting',1,NULL,NULL,NULL),(24,'Kaworu Nagisa',4,'anti-hero',1,NULL,NULL,NULL),
 (25,'Ryoji Kaji',4,'supporting',1,NULL,NULL,NULL),
 (26,'Revy',5,'anti-hero',1,NULL,NULL,14),(27,'Rock',5,'hero',1,NULL,NULL,15),
 (28,'Dutch',5,'supporting',1,NULL,NULL,NULL),(29,'Benny',5,'supporting',1,NULL,NULL,NULL),
 (30,'Balalaika',5,'villain',1,NULL,NULL,13),(31,'Roberta',5,'anti-hero',1,NULL,NULL,NULL),
 (32,'Hiko Seijuro XIII',6,'supporting',1,NULL,NULL,NULL),(33,'Himura Kenshin',6,'hero',1,35,32,16),
 (34,'Kamiya Kaoru',6,'supporting',1,NULL,NULL,NULL),(35,'Makoto Shishio',6,'villain',1,33,NULL,NULL),
 (36,'Sagara Sanosuke',6,'supporting',1,NULL,NULL,NULL),(37,'Myojin Yahiko',6,'supporting',1,NULL,33,NULL),
 (38,'Saito Hajime',6,'anti-hero',1,33,NULL,NULL),
 (39,'Master Roshi',7,'supporting',1,NULL,NULL,NULL),(40,'Son Goku',7,'hero',0,41,39,10),
 (41,'Vegeta',7,'anti-hero',0,40,NULL,11),(42,'Piccolo',7,'anti-hero',0,NULL,NULL,12),
 (43,'Son Gohan',7,'hero',0,NULL,42,10),(44,'Frieza',7,'villain',0,NULL,NULL,NULL),
 (45,'Cell',7,'villain',0,NULL,NULL,6),(46,'Krillin',7,'supporting',1,NULL,39,NULL),
 (47,'Bulma',7,'supporting',1,NULL,NULL,NULL),
 (48,'Edward Elric',8,'hero',1,NULL,NULL,NULL),(49,'Alphonse Elric',8,'hero',1,NULL,NULL,NULL),
 (50,'Roy Mustang',8,'supporting',1,NULL,NULL,NULL),(51,'Father',8,'villain',0,NULL,NULL,NULL),
 (52,'Eren Yeager',9,'hero',1,NULL,NULL,NULL),(53,'Mikasa Ackerman',9,'supporting',1,NULL,NULL,NULL),
 (54,'Levi Ackerman',9,'supporting',1,NULL,NULL,NULL),(55,'Reiner Braun',9,'villain',1,NULL,NULL,NULL);

INSERT INTO factions (id,name,anime_id,is_criminal) VALUES
 (1,'Gung-Ho Guns',1,1),(2,'Eye of Michael',1,1),(3,'Bernardelli Insurance Society',1,0),
 (4,'Red Dragon Syndicate',2,1),(5,'The Capsules',3,0),(6,'NERV',4,0),(7,'SEELE',4,1),
 (8,'Lagoon Company',5,0),(9,'Hotel Moscow',5,1),(10,'Juppongatana',6,1),
 (11,'Shinsengumi (Meiji Police)',6,0),(12,'Z Fighters',7,0),(13,'Frieza Force',7,1),
 (14,'Bounty Hunters Guild',NULL,0);

INSERT INTO character_factions (character_id,faction_id,rank) VALUES
 (2,1,'Leader'),(6,1,'Lieutenant'),(3,2,'Member'),(3,1,'Infiltrator'),(4,3,'Investigator'),
 (5,3,'Investigator'),(7,4,'Former Member'),(8,4,'Boss'),(14,5,'Leader'),(15,5,'Member'),
 (19,6,'Pilot'),(20,6,'Pilot'),(21,6,'Pilot'),(22,6,'Commander'),(23,6,'Director of Operations'),
 (22,7,'Agent'),(25,6,'Inspector'),(25,7,'Spy'),(26,8,'Member'),(27,8,'Member'),(28,8,'Leader'),
 (29,8,'Member'),(30,9,'Leader'),(35,10,'Leader'),(38,11,'Officer'),(40,12,'Member'),
 (41,12,'Member'),(42,12,'Member'),(43,12,'Member'),(46,12,'Member'),(44,13,'Emperor');
-- faction 14 has no members; many characters have no faction.

INSERT INTO items (id,name,item_type,description) VALUES
 (1,'AGL Federal .45 Long Colt','weapon','Vash''s silver revolver'),
 (2,'The Punisher','weapon','Wolfwood''s cross-shaped weapon'),(3,'Derringer','weapon','Concealed pistol'),
 (4,'Jericho 941','weapon','Spike''s 9mm pistol'),(5,'Swordfish II','vehicle','Spike''s mono-racer ship'),
 (6,'Bebop','vehicle','The crew''s spaceship'),(7,'Glock 30','weapon','Faye''s pistol'),
 (8,'Red Motorcycle','vehicle','Kaneda''s iconic bike'),(9,'Katana','weapon','Single-edged sword'),
 (10,'Sakabato','weapon','Kenshin''s reverse-blade sword'),(11,'Mugenjin','weapon','Shishio''s katana'),
 (12,'Zanbato','weapon','Sanosuke''s giant sword'),
 (13,'Beretta 92FS "Sword Cutlass"','weapon','Revy''s twin pistols'),
 (14,'Power Pole (Nyoibo)','weapon','Goku''s extending staff'),
 (15,'Flying Nimbus (Kinto-un)','vehicle','Goku''s flying cloud'),
 (16,'Dragon Radar','gadget','Bulma''s Dragon Ball locator'),
 (17,'Dragon Balls','artifact','Seven wish-granting orbs'),(18,'Scouter','gadget','Power-level reader');

INSERT INTO character_items (character_id,item_id,quantity,notes) VALUES
 (1,1,1,'Custom Plant-tech revolver'),(3,2,1,'Conceals machine gun and rockets'),
 (4,3,50,'Hidden in her cloak'),(7,4,1,NULL),(7,5,1,'Mono-racer'),(9,6,1,'Captains the ship'),
 (10,7,1,NULL),(14,8,1,'Most famous bike in anime'),(8,9,1,'Vicious''s blade'),
 (33,10,1,'Vows never to kill'),(35,11,1,NULL),(36,12,1,NULL),(26,13,2,'Dual-wielded'),
 (40,14,1,'Gift from Grandpa Gohan'),(40,15,1,'Only the pure of heart may ride'),(47,16,1,NULL),
 (40,17,7,'Collects all seven'),(44,18,1,NULL);
-- anime 8 (FMA:B) and 9 (AoT) have NO items.

INSERT INTO tropes (id,name,description) VALUES
 (1,'The Gunslinger','Master of firearms'),(2,'Reluctant Hero','Avoids the call to action'),
 (3,'Tragic Villain','Antagonist with sympathetic backstory'),(4,'The Stoic','Rarely shows emotion'),
 (5,'Cool Big Bro','Older mentor figure'),(6,'Pacifist','Refuses to kill'),
 (7,'The Rival','Defined by competition with the hero'),(8,'Fallen Hero','Once good, now an antagonist'),
 (9,'Genki Girl','Energetic and upbeat'),(10,'The Atoner','Seeks redemption for past sins'),
 (11,'Anti-Villain','Villain with honorable traits'),(12,'Glass Cannon','Powerful but fragile');

INSERT INTO character_tropes (character_id,trope_id) VALUES
 (1,1),(1,2),(1,6),(2,3),(2,8),(3,1),(3,10),(7,1),(7,4),(8,7),(8,8),(9,5),(15,3),(15,7),
 (19,2),(19,4),(22,3),(26,1),(33,6),(33,10),(33,2),(35,3),(35,11),(40,2),(41,7),(41,8),
 (44,3),(5,9),(11,9);
-- trope 12 (Glass Cannon) assigned to NO character.

INSERT INTO voice_actor_roles (voice_actor_id,character_id,dub) VALUES
 (1,1,'Japanese'),(3,7,'Japanese'),(17,7,'English'),(4,10,'Japanese'),(4,20,'Japanese'),
 (6,8,'Japanese'),(6,45,'Japanese'),(10,40,'Japanese'),(10,43,'Japanese'),
 (13,16,'Japanese'),(13,30,'Japanese');

INSERT INTO episodes (id,anime_id,episode_number,title,air_date) VALUES
 (1,2,1,'Asteroid Blues','1998-04-03'),(2,2,2,'Stray Dog Strut','1998-04-24'),
 (3,2,3,'Honky Tonk Women','1998-05-01'),(4,1,1,'The $$60,000,000,000 Man','1998-04-01'),
 (5,1,2,'Truth of Mistake','1998-04-08'),(6,4,1,'Angel Attack','1995-10-04'),
 (7,4,2,'The Beast','1995-10-11'),(8,4,3,'A Transfer','1995-10-18'),
 (9,7,1,'The New Threat','1989-04-26'),(10,7,2,'Reunions','1989-05-03'),
 (11,5,1,'The Black Lagoon','2006-04-09'),(12,6,1,'The Handsome Swordsman of Legend','1996-01-10');
-- films (anime 3, 10) have no episodes.
```

**Error classification (`runQuery`):** substring-match the SQLite message — `no such table`→
`no_such_table`; `no such column`→`no_such_column`; `ambiguous column name`→`ambiguous_column`;
`syntax error`→`syntax`; else `other`. Keep `raw`.

**Join Opportunity Map (for tests + lessons):**
| JOIN type | Tables | Example intent |
|---|---|---|
| INNER | anime⋈studios | anime + studio (anime 10 drops out) |
| INNER+GROUP BY | characters⋈anime | characters per series |
| LEFT | characters⟕voice_actors | NULL VA: Wolfwood, Ein, Misato |
| LEFT+GROUP BY | anime⟕episodes | episodes per anime; films=0 |
| RIGHT | factions⟖character_factions | empty "Bounty Hunters Guild" |
| RIGHT | tropes⟖character_tropes | unused "Glass Cannon" |
| FULL OUTER | anime⟗studios | unmatched both sides |
| CROSS | characters×genres | every pairing |
| SELF | characters c⋈characters r ON c.rival_id=r.id | char + rival |
| SELF | characters c⋈characters m ON c.mentor_id=m.id | student + mentor |
| Multi (3+) | characters⋈character_items⋈items⋈anime | char, item, type, series |
| Multi M2M | voice_actors⋈voice_actor_roles⋈characters⋈anime | VAs across >1 series |
| JOIN+GROUP+HAVING | characters⋈character_factions⋈factions | factions with >2 members |

### Acceptance Criteria
- [ ] `data/schema.js` exports `SCHEMA_SQL`, `SEED_SQL`, `SCHEMA`, `RELATIONSHIPS`.
- [ ] `node tests/run-node.mjs` passes `db.test.mjs`: all 14 table counts; SCHEMA↔DDL + FK
      consistency; one query per JOIN type returns the asserted row; the 3 error classes;
      `sqlite_version()` ≥ 3.39; `runQuery` never throws.
- [ ] `freshDb` clones from a cached seed image (built+seeded once via `getSeedBytes`).
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
Phase 1.

---

## Phase 3 — Query workbench UI (editor, results, schema panel, explore)

### Goal
A usable SQL playground: a vendored CodeMirror editor with schema autocomplete, a result
renderer with the JOIN-teaching visualizations (driven by an explicit column→table map),
a schema/relationship panel, friendly errors, and an Explore (sandbox) mode with Reset.
Shippable on its own as a free-form anime SQL sandbox.

### Work Items
- [ ] **Vendor CodeMirror 6 via the one-time dev-tooling step (resolves the no-build tension):**
      add `@codemirror/state @codemirror/view @codemirror/commands @codemirror/language
      @codemirror/autocomplete @codemirror/lang-sql` (+ transitive `@lezer/*`) to the dev-only
      `package.json` devDependencies. Create `tools/cm6-entry.js` re-exporting exactly what the
      editor needs (`EditorView`, `EditorState`, `keymap`, `highlightSpecialChars`,
      `drawSelection`, `history`, `defaultKeymap`, `historyKeymap`, `sql`, `autocompletion`).
      Add an npm script `"vendor:cm6": "esbuild tools/cm6-entry.js --bundle --format=esm
      --outfile=vendor/codemirror.bundle.js"`. **Run it once and COMMIT `vendor/codemirror.bundle.js`**
      (a single self-contained ESM file → one `@codemirror/state` instance). The served site
      imports only `./vendor/codemirror.bundle.js`; it never touches `node_modules` or a CDN.
      Document in README that this is a one-time vendoring step, not a deploy build.
      - **Fallback (only if esbuild/network is unavailable):** an esm.sh import map in
        `index.html` pinning every `@codemirror/*` to ONE `@codemirror/state` via `?external=`.
        This is the single tolerated runtime CDN and must be flagged as a fallback in README.
- [ ] `js/editor.js` — create a CodeMirror editor (from the vendored bundle) with
      `@codemirror/lang-sql` fed the `SCHEMA` object for table/column autocomplete,
      `upperCaseKeywords:true`, and a `Mod-Enter` keybinding calling the run callback. Expose
      `getValue()`/`setValue()`.
- [ ] `js/results.js` — `renderResults(container, queryOutcome, opts)`:
  - `ok:false` → friendly error (Phase: `js/errors.js`).
  - `ok:true`, no rows (DML) → "N row(s) modified." from `rowsModified`.
  - `ok:true`, rows → `<table>`; HTML-escape every cell; NULL → `<span class="null">NULL</span>`
    (never blank); display cap **200 rows** with "Showing 200 of M" + "show all" toggle.
  - **JOIN-teaching viz, opt-in via `opts.columnTables` (an array: result-column-index →
    source table name):** color each column header by source table + a legend; flag rows where
    every column belonging to a designated "right" table (`opts.rightTables`) is NULL with
    `class="unmatched"`. **Caveat (document in code):** this is a presentation heuristic for
    curated lesson data — a genuinely matched right row whose selected cols are all NULL would
    be mislabeled; it is therefore used only when the caller supplies `columnTables`/`rightTables`
    (i.e. lesson mode). In Explore mode the map is usually absent → plain table, no coloring.
- [ ] `js/schema-panel.js` — render from `SCHEMA` + `RELATIONSHIPS`: tables, columns, PK/FK
      markers; click a table → insert its name at the cursor; click a column → insert
      `table.column`; `highlightTables(names)` hook for lesson spotlighting + FK link emphasis.
- [ ] `js/errors.js` — `friendlyError(error)`: `no_such_column`→"no column `X`" + Levenshtein-≤2
      suggestion from `SCHEMA`; `no_such_table`→list available tables; `ambiguous_column`→
      "qualify it like `characters.X`"; `syntax`→offending token + comma/keyword hint;
      `other`→raw.
- [ ] `js/app.js` — Explore mode: editor + Run + `Mod-Enter`, results pane, schema panel,
      **Reset database** (calls `resetDb`), and a "fresh each run" vs "persist my changes"
      (IndexedDB sandbox) toggle. Explore is the default route until lessons land in Phase 4.
- [ ] `tests/results.test.mjs` (Node): unit-test pure helpers — `friendlyError` per type incl.
      fuzzy suggestion; the escape helper; the unmatched-row detector given a `{columns,values}`
      + `columnTables` + `rightTables`.
- [ ] `tests/e2e/explore.spec.mjs` (Playwright/Chromium): load `/`, wait for engine ready, type
      `SELECT name, role FROM characters WHERE role='villain';`, press Ctrl+Enter, assert the
      table includes "Vicious" and "Millions Knives"; run an `UPDATE`, assert "row(s) modified";
      click **Reset**, assert the update is gone; verify visible NULL badges on a LEFT JOIN query.

### Design & Constraints
- **No runtime CDN** → the vendored CM6 bundle is the primary path; the import-map fallback is
  the only tolerated exception and must be README-flagged.
- **Escaping is mandatory.** **NULL visibility is pedagogy** (text "NULL" + italic + color — not
  color alone, for a11y).
- **Column→table provenance** is reliable only in lesson mode (the exercise declares
  `columnTables`); Explore mode does NOT ship a SQL parser — coloring is simply omitted when the
  map is absent. Do not guess provenance from raw SQL.

### Acceptance Criteria
- [ ] `node tests/run-node.mjs` passes `results.test.mjs` (friendlyError per type + fuzzy; escape;
      unmatched detection with a supplied map).
- [ ] `vendor/codemirror.bundle.js` is committed and the editor loads from it with NO
      `node_modules`/CDN reference in the served page (or, if the fallback was used, the README
      documents the esm.sh import map).
- [ ] The Explore page (served over `http://`) supports typing SQL, Run + `Ctrl/Cmd+Enter`,
      rendered tables with visible NULL badges, a schema panel listing all 14 tables with
      click-to-insert.
- [ ] `tests/e2e/explore.spec.mjs` passes under Playwright (Chromium): query→results;
      UPDATE→"rows modified"; Reset→reverted; LEFT JOIN shows NULL badges.
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
Phase 1, Phase 2.

---

## Phase 4 — Lesson + validation + scoring engine (incl. DML validation)

### Goal
The engine that turns the workbench into a course: a lesson data model (SELECT **and** DML
exercise types), a robust client-side validator (result-set comparison + post-mutation
verification for DML), progressive priced hints, "you're close" diagnostics, and an
XP/levels/streaks/badges progression persisted locally — proven end-to-end with 3 sample lessons.

### Work Items
- [ ] `lessons/README.md` (authoring contract) + `js/lessons.js` (loader) defining the lesson +
      exercise shapes (see Design). Two exercise kinds: **`query`** (validated by result-set
      comparison) and **`dml`** (validated by running the mutation then a `verifySql` SELECT).
- [ ] `js/validate.js`:
  - `expectedFor(SQL, exercise)` — clone a fresh seeded DB (`freshDb`); for a `query` exercise
    run `solution` and return its `{columns,values}`; for a `dml` exercise run `solution`
    (the canonical mutation) then `verifySql` and return that result.
  - `checkAnswer(SQL, exercise, userSql)`:
    - `query`: clone fresh DB, run `userSql`; on error → `correct:false` + `friendlyError`; else
      compare actual vs `expectedFor` (see comparison algorithm).
    - `dml`: clone fresh DB, run `userSql` (must be a successful mutation); on error →
      `correct:false`; else run `exercise.verifySql` on the mutated DB and compare to
      `expectedFor`. Optionally assert `rowsModified` matches the canonical mutation's count
      (when `exercise.expectRowsModified` is set).
    - returns `{ correct, diagnosis, message, nudge? }`.
  - **Comparison algorithm (exact):**
    1. If `actual.columns.length !== expected.columns.length` → `wrong_columns`. (A `SELECT *`
       that returns more columns than the prompt asked therefore fails — intended; teaches
       precise column selection. Document this policy.)
    2. Normalize each cell: `null`→a NULL sentinel; number→`Number`; string→trimmed string.
       **No cross-type coercion** (`'8000'` ≠ `8000`); because expected and actual query the
       SAME typed columns of the SAME schema, equivalent answers yield the same types, so this
       is safe — authors must not write prompts that mix a column's type.
    3. Build per-row tuples (column-position order; **ignore column header names** so aliases
       never fail a match).
    4. If `exercise.orderMatters` (only valid for `query`): compare the ordered tuple arrays
       element-by-element. Else compare **multisets** (JSON(tuple)→count maps).
    5. Verdict: `correct` iff equal under the order rule. On incorrect, classify the diagnosis:
       `wrong_columns` (from step 1); else if multisets are equal but the ordered compare failed
       AND `orderMatters` → `order_only`; else if actual ⊃ expected → `extra_rows`; actual ⊂
       expected → `missing_rows`; else `disjoint`. (`order_only` is ONLY reachable when
       `orderMatters` is true.)
  - **Soft nudge (non-blocking):** if `correct` and `exercise.requiredKeywords` are absent from
    the comment-stripped, lower-cased `userSql`, set `nudge` (e.g. "try a JOIN too") — never
    flips `correct`.
- [ ] `js/score.js` — progression + persistence (IndexedDB, localStorage fallback):
  - XP: bronze 10 / silver 25 / gold 50; **first-try +10** (no failed run, no hint);
    **JOIN-core lessons ×1.5** (lessons flagged `joinCore`); capstone 300; re-solving a solved
    exercise = 0.
  - Hints: −5 per hint from THAT exercise's award, floored at `base/2`; total XP never negative.
  - Levels: Academy Student 0 / Genin 150 / Chunin 400 / Jonin 800 / Query Sensei 1400 /
    SQL Hokage 2200+.
  - Daily streak from `lastActiveDate`; +1 "streak freeze" per 7-day streak.
  - Badges (event-triggered): "Inner Circle" (all INNER-JOIN exercises gold), "Left Behind"
    (solve the LEFT-JOIN `IS NULL` anti-join), "Cartographer" (first CROSS), "Narcissus" (first
    SELF JOIN), "No Hints Needed" (clear a lesson with 0 hints), "Flawless Victory" (every
    exercise in a lesson first-try), "Detective" (capstone), "Perfect Run" (all gold).
  - Persist `{ solvedExercises, xp, level, streak, freezes, badges, lastActiveDate }`;
    `getProgress()`, update helpers, "reset progress".
- [ ] `js/hints.js` — 3-level hints per exercise: L1 nudge (−2), L2 structural skeleton (−5),
      L3 near-answer + why (−10); reveal one at a time; show cost before spending.
- [ ] `js/lesson-runner.js` + `js/app.js` lesson UI: concept pane, schema panel with
      `highlightTables`, editor, Run + Check, tier badge, hints, validator verdict + diagnosis,
      per-lesson + overall progress bars, **gating** (a lesson's Bronze must be solved to unlock
      the next; Gold optional), and a lesson **map/home** with lock/complete state, XP, level,
      streak.
- [ ] **Per-scored-exercise clean slate:** every Check clones a fresh seeded DB (via the cached
      seed image) for both the canonical and the user run, so a prior Explore edit can't affect
      validation and DML answers start from known state.
- [ ] 3 **sample lessons** exercising the whole engine, incl. a DML exercise: Lesson 1
      (SELECT/FROM), Lesson 7 (INNER JOIN), Lesson 8 (LEFT JOIN incl. the `IS NULL` anti-join),
      plus one `dml` sample exercise (e.g. "give Wolfwood a voice actor via UPDATE; verify").
- [ ] `tests/validate.test.mjs` (Node): each diagnosis class (`wrong_columns`, `extra_rows`,
      `missing_rows`, `order_only`, `disjoint`); order-insensitive by default; `orderMatters`
      makes a reordered-equal result `order_only`; alias-agnostic (`SELECT name AS n` matches);
      `SELECT *` over-columns fails `wrong_columns`; a correct-but-keyword-missing answer sets
      `nudge` and stays `correct`; **a `dml` exercise: correct mutation → `correct:true` via
      `verifySql`; a wrong/no mutation → `correct:false`; a syntactically broken mutation →
      `correct:false` + error.**
- [ ] `tests/score.test.mjs` (Node): XP math (tiers, first-try, ×1.5, hint floor, re-solve 0);
      level thresholds; streak increment + freeze; a badge trigger (e.g. "Narcissus" on first
      self-join solve).
- [ ] `tests/e2e/lesson.spec.mjs` (Playwright/Chromium): play sample Lesson 7 — wrong query →
      diagnosis; correct INNER JOIN → "correct" + XP up; next lesson unlocks; reload → progress
      persisted.

### Design & Constraints

**Lesson/exercise shape (`js/lessons.js` consumes an array):**
```js
{
  id: 7, slug: 'inner-join', title: 'INNER JOIN', joinCore: true,
  concept: `...html...`, tables: ['characters','anime','studios'],
  exercises: [
    { kind:'query', tier:'bronze',
      prompt:'List each character name with the title of the anime they appear in.',
      starter:'SELECT c.name, a.title\nFROM characters c\nINNER JOIN anime a ON ____ = ____;',
      solution:'SELECT c.name, a.title FROM characters c JOIN anime a ON c.anime_id=a.id;',
      orderMatters:false, requiredKeywords:['join'],
      columnTables:['characters','anime'], rightTables:['anime'],
      commonMistake:'Every character has an anime, so an INNER JOIN drops nobody here.' },
    { kind:'dml', tier:'silver',
      prompt:'Give Nicholas D. Wolfwood the voice actor Show Hayami (id 2) using UPDATE.',
      solution:"UPDATE characters SET voice_actor_id=2 WHERE name='Nicholas D. Wolfwood';",
      verifySql:"SELECT voice_actor_id FROM characters WHERE name='Nicholas D. Wolfwood';",
      expectRowsModified:1,
      commonMistake:'Match on the exact name; a missing WHERE updates every row.' }
  ]
}
```

**Determinism:** forbid `RANDOM()`/time functions in exercises; clean-slate clone per Check; XP
once per exercise. "Multiple correct queries" means many query shapes → ONE result set (result
equality handles it); it does NOT mean multiple acceptable result sets.

### Acceptance Criteria
- [ ] `node tests/run-node.mjs` passes `validate.test.mjs` (all diagnosis classes; order rules;
      alias-agnostic; `SELECT *` policy; nudge; **DML correct/incorrect/error paths**) and
      `score.test.mjs` (full XP/level/streak/badge math).
- [ ] `tests/e2e/lesson.spec.mjs` passes: wrong→diagnosis, correct→XP+unlock, persistence across
      reload.
- [ ] Entering a scored exercise always starts from a fresh seeded clone (a prior Explore UPDATE
      does not affect validation).
- [ ] The 3 sample lessons (1, 7, 8) + the DML sample exercise are fully playable with hints,
      scoring, gating.
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
Phase 1, 2, 3.

---

## Phase 5 — Lesson content: basics & aggregation (lessons 1–6)

### Goal
Author the foundation curriculum (lessons 1–6) as data conforming to the Phase 4 schema, each
with a concept and ~4 tiered exercises, all mechanically validated.

### Work Items
- [ ] Author under `lessons/`: 1 SELECT & FROM · 2 WHERE · 3 ORDER BY / LIMIT / DISTINCT ·
      4 Expressions, aliases & CASE · 5 Aggregates (COUNT/SUM/AVG/MIN/MAX) · 6 GROUP BY & HAVING.
- [ ] Each lesson: concept text + ~4 exercises (1 bronze, 2 silver, 1 gold). Bronze gives a
      starter skeleton; gold is multi-construct/story-framed. Set `orderMatters` correctly; give
      every "sort by" prompt a **unique total order**.
- [ ] Wire lessons 1–6 into the lesson map with gating.
- [ ] Extend `tests/lessons.test.mjs` (the critical mechanical guard) to cover lessons 1–6 — see
      the shared test contract in the Design below.

### Design & Constraints
- The **canonical solution is the source of truth**; expected results are generated, never typed.
- **`tests/lessons.test.mjs` contract (applies to every authored exercise, all content phases):**
  in a fresh seeded clone — (a) `query` `solution` runs without error and `checkAnswer(solution)`
  → `correct:true`; (b) `dml` `solution` runs, then `verifySql` runs, and `checkAnswer(solution)`
  → `correct:true`; (c) expected result non-empty unless `allowEmpty:true`; (d) any
  `requiredKeywords` actually appear in the `solution`; (e) `columnTables.length` (when present)
  equals the solution's column count; (f) **order determinism:** for every `orderMatters:true`
  exercise, run the solution normally and again after `PRAGMA reverse_unordered_selects=ON` and
  require identical output (proves the ORDER BY fully determines order — catches incidental-order
  reliance / non-unique sorts).

### Acceptance Criteria
- [ ] Lessons 1–6 load via the Phase 4 loader and appear in the gated map.
- [ ] `node tests/run-node.mjs` passes `lessons.test.mjs` for every lesson-1–6 exercise (contract
      (a)–(f)).
- [ ] A learner can progress 1→6 with Bronze-to-advance gating intact.
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
Phase 4.

---

## Phase 6 — Lesson content: JOIN core (lessons 7–12)

### Goal
Author the headline JOIN curriculum (lessons 7–12) — the site's centerpiece — using the
deliberate data gaps for the OUTER-JOIN teaching moments. All mechanically validated.

### Work Items
- [ ] Author under `lessons/`, all flagged `joinCore:true`: 7 INNER JOIN · 8 LEFT/RIGHT OUTER
      (incl. the `IS NULL` anti-join) · 9 FULL OUTER & CROSS · 10 SELF JOIN ·
      11 Multi-table joins (3+ via junction) · 12 JOIN + aggregation.
- [ ] Each lesson: concept + ~4–5 exercises (extra gold allowed). Use the **Join Opportunity
      Map** (Phase 2) for canonical examples, e.g.: anti-join "characters with no items"; SELF
      JOIN rivals (Goku↔Vegeta) and mentors (Gohan→Piccolo, Kenshin→Hiko); multi-table
      character→character_items→items→anime; JOIN+GROUP "factions with >2 members"; LEFT+GROUP
      "episodes per anime, films = 0". Provide `columnTables`/`rightTables` so result coloring +
      unmatched highlighting fire. Provide soft `requiredKeywords` for join tiers.
- [ ] Ensure the badges tied to this content can trigger: "Inner Circle", "Left Behind",
      "Cartographer", "Narcissus" (verify the exercises exist that the Phase 4 badge logic keys on).
- [ ] Wire lessons 7–12 into the map; the capstone (Phase 7) unlocks after lesson 12.
- [ ] Extend `tests/lessons.test.mjs` to cover lessons 7–12 (same contract (a)–(f)); additionally
      assert each `joinCore` lesson contains the canonical anti-join / self-join / multi-table /
      join+aggregate exercise the badges + map depend on.

### Design & Constraints
- Reuse the deliberate gaps (NULL VAs, item-less anime, orphan faction, unused trope, studio-less
  / episode-less films) so OUTER joins reveal something real.
- Difficulty must genuinely escalate (bronze skeleton/2 tables → gold multi-construct, sometimes
  >1 correct query for the same result set).

### Acceptance Criteria
- [ ] Lessons 7–12 load, are tagged `joinCore`, and appear gated after lesson 6.
- [ ] `node tests/run-node.mjs` passes `lessons.test.mjs` for every lesson-7–12 exercise, incl.
      the canonical-exercise-presence assertions.
- [ ] The "Inner Circle", "Left Behind", "Cartographer", "Narcissus" badges are earnable from
      authored exercises (verified by the lesson tests referencing them).
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
Phase 4, Phase 5.

---

## Phase 7 — Lesson content: advanced (13–15) + capstone mystery

### Goal
Author the advanced lessons (subqueries, CTEs, DML) and the capstone "mystery" lesson that
requires combining joins + filtering + aggregation to identify a culprit.

### Work Items
- [ ] Author under `lessons/`: 13 Subqueries (scalar / `IN` / correlated) · 14 CTEs (WITH) ·
      15 INSERT / UPDATE / DELETE (use the Phase 4 **`dml`** exercise kind with `verifySql`).
      ~4 exercises each; same contract; DML exercises carry `solution` + `verifySql`
      (+ optional `expectRowsModified`).
- [ ] **Capstone — "The Tournament Murder":** a short narrative sets up a culprit hidden in the
      data; the learner uses schema exploration + multi-table joins + filtering + aggregation to
      find it. Implement as a lesson whose final exercise is a `query` whose canonical `solution`
      returns the culprit's identity (e.g. name); validated by the Phase 4 result-set comparison
      (no new mechanism). Provide an optional guided hint path (the 3-level hints) and a no-hints
      challenge path. Award **300 XP + "Detective"** on solve (Phase 4 scoring handles the
      special XP + badge). Unlocks only after lesson 12. The capstone's intermediate steps may be
      additional gated `query` exercises building toward the final accusation.
- [ ] Wire lessons 13–15 + capstone into the map (capstone last, post-lesson-12 gate).
- [ ] Extend `tests/lessons.test.mjs` to cover lessons 13–15 and the capstone (contract (a)–(f));
      assert the capstone's canonical solution returns a non-empty, unique culprit result and that
      it awards 300 XP + "Detective" via the scoring layer.

### Design & Constraints
- The capstone reuses the existing validator (result-set match to a canonical answer) — no new
  validation path. Keep its narrative anime-themed and self-contained.
- DML lessons must validate via post-mutation `verifySql` (never trust the empty DML result).

### Acceptance Criteria
- [ ] Lessons 13–15 + the capstone load and are gated correctly (capstone locked until lesson 12).
- [ ] `node tests/run-node.mjs` passes `lessons.test.mjs` for lessons 13–15 + capstone (contract
      (a)–(f); DML via `verifySql`; capstone awards 300 XP + "Detective").
- [ ] The full curriculum (1 → 15 → capstone) is playable with gating, scoring, and persistence.
- [ ] `bash scripts/test-all.sh` exits 0.

### Dependencies
Phase 4, Phase 6.

---

## Phase 8 — Polish: profile, mobile, a11y, cross-browser, final QA

### Goal
Add the profile/achievements screen, make the site mobile-friendly and accessible, do final QA
(gating-Chromium + a documented manual cross-browser pass), and a content/copy polish.

### Work Items
- [ ] **Profile / achievements screen:** total XP, current level + progress to next, daily streak
      (+ freezes), the badge collection (earned vs. locked), per-lesson completion, a "reset
      progress" control, and an end-of-capstone score screen.
- [ ] **Responsive / mobile:** layout reflows on small screens; editor uses ≥16px font (avoid iOS
      focus-zoom); result tables scroll horizontally; schema panel collapses.
- [ ] **Accessibility:** keyboard navigation through lessons/exercises; ARIA labels on the editor,
      run/check/hint controls, and result table; color is never the sole signal (NULL badges +
      column coloring also carry text/patterns); sufficient contrast; visible focus states.
- [ ] **Content polish:** copy pass on concepts/prompts; a landing/home hero; a short "How this
      works / View Source" note (the build-free source is a teaching asset).
- [ ] `tests/e2e/capstone.spec.mjs` (Chromium): capstone locked before lesson 12 complete,
      unlocked after; solving with the canonical query → "Detective" + 300 XP; profile reflects it.
- [ ] `tests/e2e/a11y.spec.mjs` (Chromium): key controls have accessible names; tab order reaches
      the editor and run button; NULL/coloring carry non-color signals.
- [ ] **Cross-browser:** the gating E2E suite runs **Chromium only** (the only installed browser).
      Add a README "manual cross-browser checklist" for Firefox/WebKit (incl. the import-map
      Safari ≥16.4 caveat — moot if the vendored CM6 bundle was used). Do NOT gate
      `scripts/test-all.sh` on uninstalled browsers; if a developer runs cross-browser, they
      `npx playwright install firefox webkit` first.
- [ ] Final full-curriculum smoke (Playwright Chromium and/or manual via the `playwright-cli`
      skill): progress 1 → capstone, confirming gating, scoring, persistence throughout.

### Design & Constraints
- No new runtime dependencies; stay build-free + vendored.
- Mobile + a11y are acceptance-gated, not optional.

### Acceptance Criteria
- [ ] The profile screen shows XP, level, streak, earned/locked badges, and updates after the
      capstone.
- [ ] On a mobile viewport (Playwright device emulation) the editor, results, schema panel, and
      lesson flow are usable (no zoom-on-focus; tables scroll).
- [ ] `tests/e2e/capstone.spec.mjs` and `tests/e2e/a11y.spec.mjs` pass under Chromium.
- [ ] README contains the manual cross-browser checklist; `scripts/test-all.sh` is Chromium-only
      and does not error on missing Firefox/WebKit.
- [ ] `bash scripts/test-all.sh` exits 0 (Node logic tests + full Chromium Playwright suite).

### Dependencies
Phase 7 (full curriculum), and Phases 3–4 (engine/UI).

---

## Plan Quality

**Drafting process:** /draft-plan with 2 rounds of adversarial review (round 1: reviewer +
devil's-advocate; round 2: focused verification of the rewrite) + verify-before-fix refinement.
**Convergence:** Converged at round 2. Round 1's 5 blockers / 10 majors / 8 minors were all
verified (the devil's advocate reproduced the empirical ones under Node) and dispositioned Fixed;
none rejected as non-reproducing. Round 2 empirically re-confirmed the high-risk fixes (sql.js
Node load, the esbuild CodeMirror vendoring, the `reverse_unordered_selects` determinism check,
the DML `verifySql` validation, the 8-phase DAG) and found **0 blockers / 0 majors** — only 3
minor/trivial polish notes, all applied (pin Playwright to the cached Chromium revision +
defensive `playwright install`; `fileURLToPath` instead of `.pathname`; stale wording).
**Remaining concerns:** Phases 5–7 are content-authoring-heavy (~64 exercises total); the
`tests/lessons.test.mjs` contract mechanically guards correctness/determinism but cannot judge
prose/pedagogical quality — a human content pass is advisable. Cross-browser (Firefox/WebKit) is
a manual step, not CI-gated, because only Chromium is installed.

### Round History
| Round | Reviewer Findings | Devil's Advocate Findings | Resolved |
|-------|-------------------|---------------------------|----------|
| 1 | 13 (2 blocker, 5 major, 6 minor) | 10 (3 blocker, 5 major, 2 minor) | All dispositioned (see disposition table) |
| 2 | 0 blocker, 0 major, 3 minor (verification pass) | — | 3 minor applied → Converged |

### Disposition table (round 1)
| # | Finding | Evidence | Disposition |
|---|---|---|---|
| B1 | sql.js `.mjs` doesn't exist; browser ESM-import of UMD → undefined | Verified (dist has no `.mjs`; UMD sets a global only via classic script; Node CJS-interop import works) | Fixed — Phase 1: browser uses classic `<script>`+global; Node uses `import` + absolute `locateFile` |
| B2 | Node `locateFile './vendor/'+f` is CWD-relative → ENOENT | Verified (DA reproduced) | Fixed — `tests/_sqljs.mjs` uses `new URL('../vendor/'+f, import.meta.url).pathname` |
| B3 | Vendored CM6 needs a bundler → conflicts with "no build" | Verified (CM6 meta-pkg not self-contained, lacks lang-sql; no bundler installed) | Fixed — dev-tooling carve-out: one-time `esbuild` vendoring → committed `vendor/codemirror.bundle.js`; esm.sh import-map fallback documented |
| B4 | DML lessons unvalidatable by result-set comparison | Verified (DML returns `[]`) | Fixed — Phase 4 `dml` exercise kind + post-mutation `verifySql` validation |
| M1 | import-map-vs-bundle decision deferred but already forced | Judgment | Fixed — decided now (vendored bundle); premature import-map scaffold removed from Phase 1 |
| M2 | Phase 5 too big; batching only optional | Judgment/scope | Fixed — split content into Phases 5/6/7 (basics / join core / advanced+capstone) |
| M3 | SCHEMA↔DDL sync untested; incomplete table-count coverage | Judgment | Fixed — Phase 2 tests assert SCHEMA↔`table_info`, FK↔`foreign_key_list`, all 14 table counts |
| M4 | Phase 3 coloring acceptance depends on Phase-4 `columnTables` | Verified (structural) | Fixed — Explore coloring is best-effort/omitted; user-visible JOIN coloring is lesson-mode; Phase 3 tests use a supplied map |
| M5 | Missing favicon → 404 fails "no console errors" | Judgment | Fixed — Phase 1 adds `assets/favicon.svg` + relative `<link rel=icon>` |
| M6 | Playwright unconfigured; runner ambiguity; no preview server | Verified (only chromium installed; no `playwright.config`) | Fixed — Phase 1 adds `@playwright/test` devDep + `playwright.config.mjs` with `webServer`; Chromium-only |
| M7 | Cross-browser acceptance unmeetable (Chromium-only) | Verified (`~/.cache/ms-playwright` has chromium only) | Fixed — Phase 8 gates Chromium only; Firefox/WebKit = documented manual checklist |
| M8 | Result-comparison edge cases (cross-type, `SELECT *`, tie-determinism, multiple-correct) | Judgment/spec gaps | Fixed — Phase 4 spec: no cross-type coercion (+rationale), `SELECT *` fails on column count, tie-determinism test via `reverse_unordered_selects`, multiple-correct clarified |
| m1 | `order_only` wording/reachability | Judgment | Fixed — stated `order_only` only when `orderMatters` true |
| m2 | LEFT-JOIN unmatched heuristic can mislabel | Judgment | Fixed — documented caveat; lesson-mode-only via supplied `rightTables` |
| m3 | clean-slate clone/perf unspecified | Judgment | Fixed — Phase 2 `getSeedBytes` cache + `freshDb` clone; validator clones |
| m4 | Root-serving exposes docs/plans, .claude, etc. | Verified (`.nojekyll` disables Jekyll dotfile-hiding) | Fixed — README documents accepted exposure; repo must hold no secrets (user chose root serving) |
| m5 | RIGHT/FULL OUTER JOIN support | Verified (sql.js 1.14.1 → SQLite 3.49.1) | No fix needed — added a `sqlite_version()` ≥ 3.39 test guard |
| m6 | `/run-plan` parseability + renumber after split | Judgment | Fixed — 8 phases, tracker + headings + dependencies renumbered consistently |
