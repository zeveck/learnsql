# Anime SQL Academy

A fun, fully **client-side** website that teaches SQL — with a heavy emphasis on JOINs —
using an anime-themed mock SQLite database. Learners write real SQL in the browser, see
live results, and work through a tiered lesson curriculum. Served as a static site via
GitHub Pages at **`learnsql.synapticnoise.com`** (repo: `zeveck/learnsql`).

The full curriculum (15 lessons + a capstone mystery), the scoring/progression system, a
profile/achievements screen, and a free-form Explore sandbox are all live. The site is
mobile-friendly and keyboard/screen-reader accessible.

## Architecture

- **No backend.** Everything runs in the browser. SQL executes via **sql.js** (SQLite compiled
  to WASM, single-threaded — needs no COOP/COEP headers, which GitHub Pages cannot set).
- **The deployed site is build-free.** It is exactly the committed static files (HTML + CSS +
  ES modules) plus the committed `vendor/` assets. Deploying is `git push` → live; the browser
  loads only relative-path local files (no runtime CDN, no bundler output, no server).
- **Served from the repository ROOT** of `main`. `index.html`, `CNAME`, `.nojekyll`,
  `assets/favicon.svg`, and the asset directories (`css/`, `js/`, `data/`, `lessons/`,
  `vendor/`) all live at repo root.
- **Relative asset URLs everywhere** (`./vendor/...`, `./js/...`) so the site also works at the
  raw `*.github.io/<repo>/` fallback URL, not only at the custom-domain root.

### sql.js — two distinct load paths

sql.js's `sql-wasm.js` is a **UMD** build. The two environments load it differently and **do
not share the `locateFile` string**:

- **Browser:** a CLASSIC `<script src="./vendor/sql-wasm.js">` (an ES-module `import` of it
  resolves to `undefined`). It sets `globalThis.initSqlJs`; `js/db.js` then calls
  `initSqlJs({ locateFile: f => './vendor/' + f })` (page-relative).
- **Node (tests):** `import initSqlJs from '../vendor/sql-wasm.js'` (Node's CJS→ESM interop
  makes the UMD default-importable). `locateFile` MUST return an **absolute** path via
  `fileURLToPath(new URL('../vendor/' + f, import.meta.url))`, because sql.js resolves a
  relative return value against `process.cwd()`, not the test file.

### Result rendering contract

`db.exec(sql)` → `[{ columns, values }]` (an empty `[]` for no-row statements). **Every cell is
HTML-escaped** before insertion.

## Repository layout

```
index.html             entry page (loads vendor/sql-wasm.js, then js/app.js)
css/styles.css         styles (incl. responsive + a11y focus states)
js/app.js              app shell + hash routing (map / lesson / explore / profile)
js/db.js               initEngine(), freshDb, runQuery, sandbox persistence
js/editor.js           CodeMirror 6 editor wrapper (vendored bundle)
js/results.js          result renderer (NULL badges, JOIN coloring + legend)
js/schema-panel.js     schema/relationship panel (click-to-insert)
js/lessons.js          lesson loader + gating helpers
js/lesson-runner.js    lesson UI (concept, editor, Run/Check, hints, scoring)
js/validate.js         answer validator (result-set + DML verifySql)
js/score.js            XP / levels / streaks / badges + progress persistence
js/profile.js          profile/achievements screen + capstone score screen
js/hints.js            progressive priced hints
js/errors.js           friendly SQL error messages
assets/favicon.svg     favicon (referenced relatively; no 404)
vendor/                committed runtime assets (sql.js 1.14.1, CodeMirror bundle)
data/schema.js         database schema/seed + SCHEMA/RELATIONSHIPS metadata
lessons/               lesson content (15 lessons + capstone)
tests/                 Node logic tests + Playwright e2e
scripts/test-all.sh    full test command
tools/                 one-time dev-tooling scripts (CodeMirror vendoring)
CNAME / .nojekyll      GitHub Pages config
```

## Dev-tooling carve-out

"No build step" governs the **deployed site**, NOT the development environment. A **dev-only
`package.json`** (`private: true`) exists for tooling that is **never loaded by the site and
never deployed**:

- `@playwright/test` — the E2E test runner. It is **pinned to `1.61.0`** so its bundled
  Chromium revision (1228) matches the browser pre-installed in this dev environment.
- `esbuild` + the `@codemirror/*` packages — used in a **one-time vendoring step** (NOT a deploy
  build) to produce the committed `vendor/codemirror.bundle.js`.

`node_modules/` is gitignored and never served. The **committed `vendor/` files ARE served**
(they are the vendored runtime assets). The site's own runtime imports resolve only to
`./vendor/*` and `./js/*` — no `node_modules`, no CDN.

### Vendoring CodeMirror 6 (one-time, re-run only to update)

The browser editor is CodeMirror 6, which is normally consumed as npm packages. To keep the
**deployed site build-free**, we bundle it ONCE into a single self-contained ESM file that is
committed and served:

```sh
npm install        # installs the dev-only @codemirror/* packages + esbuild
npm run vendor:cm6 # esbuild bundles tools/cm6-entry.js -> vendor/codemirror.bundle.js
```

`tools/cm6-entry.js` re-exports exactly the APIs `js/editor.js` needs. esbuild produces a single
ESM file, guaranteeing **one** `@codemirror/state` instance (a duplicated state module breaks
CodeMirror). The served site imports ONLY `./vendor/codemirror.bundle.js` — never `node_modules`,
never a CDN. Re-run `npm run vendor:cm6` and re-commit the bundle only to update CodeMirror.

(Fallback, NOT currently used: if esbuild/network were unavailable, an esm.sh import map in
`index.html` pinning every `@codemirror/*` to one `@codemirror/state` via `?external=` would be
the single tolerated runtime CDN. The vendored bundle is the primary, committed path.)

## Tests

- **Logic tests (Node):** `node tests/run-node.mjs` — a zero-dependency runner discovers and
  runs `tests/*.test.mjs` using the vendored sql.js, exiting non-zero on any failure.
- **End-to-end (Playwright / Chromium only):** `npx playwright test` — a `webServer` block
  launches `python3 -m http.server` as the static preview.
- **Full test command:** `bash scripts/test-all.sh` (runs the Node tests, then Playwright).

The E2E suite covers the workbench smoke test, Explore mode, the lesson runner, the capstone
gating + scoring, a full-curriculum gating/scoring/persistence smoke, accessibility (accessible
names, tab order, non-color NULL/legend signals), and a mobile-viewport pass.

### Manual cross-browser checklist (Firefox / WebKit)

The gating CI run is **Chromium-only** because Chromium is the only browser installed in this
dev environment (`.devcontainer/setup.sh` installs Chromium). `scripts/test-all.sh` therefore
runs Playwright against Chromium only and **does not** depend on Firefox/WebKit being present.

To do a manual cross-browser pass, a developer first installs the extra browsers, then runs the
suite against them explicitly (these commands are NOT part of `test-all.sh`):

```sh
npx playwright install firefox webkit
npx playwright test --project=chromium            # the gating default
npx playwright test --browser=firefox             # manual
npx playwright test --browser=webkit              # manual (Safari engine)
```

Manually verify in **Firefox** and **WebKit/Safari**:

- [ ] The SQL engine loads (sql.js WASM) and a query renders a result table.
- [ ] The CodeMirror editor mounts, accepts input, and `Ctrl/Cmd+Enter` runs the query.
- [ ] Lesson flow: open a lesson, type an answer, Check → verdict; gating unlocks the next lesson.
- [ ] The capstone unlocks after lesson 15 and its score screen shows on solve.
- [ ] The profile screen renders XP, level, streak, and the earned/locked badge grid.
- [ ] **Mobile / responsive** (use the browser's responsive design mode): the editor font is
      ≥16px (no focus-zoom on iOS Safari), result tables scroll horizontally, the schema panel
      collapses behind its toggle, and the lesson flow is usable.
- [ ] **Accessibility:** keyboard-only navigation reaches the editor and Run/Check/Hint controls;
      focus outlines are visible; NULL cells show the literal text "NULL"; the JOIN legend names
      its source tables as text.

**Safari import-map caveat (moot here):** ES-module import maps require Safari ≥16.4. This site
does **not** use an import map — CodeMirror is shipped as a single committed `vendor/`
bundle — so the caveat does not apply. (It would only matter under the documented, unused
esm.sh import-map fallback.)

## Accepted exposure (root serving)

Serving from the repo root + `.nojekyll` means the **entire committed repo is publicly fetchable**
at the domain (e.g. `/docs/plans/SQL.md`, `/tests/...`, `/scripts/...`). This is acceptable for
an open teaching project, but it means **the repo must contain no secrets** — keep none here.

## Deploying to GitHub Pages (human-only steps)

The repo (`zeveck/learnsql`), the push of `main`, the Pages source (Deploy from a branch,
`main`, `/ (root)`), and the custom domain (`learnsql.synapticnoise.com`) are already
configured. Only these remain for a human with account/DNS access:

1. **DNS** at the `synapticnoise.com` provider: add a **CNAME record**, host `learnsql`, value
   `zeveck.github.io` (the account host only — **NO** repo, **NO** path). Up to 24h to
   propagate. Until this resolves, GitHub Pages will show a DNS-check warning on the custom
   domain — that's expected.
2. After DNS resolves and the certificate provisions (up to 24h), tick **Settings → Pages →
   Enforce HTTPS**.
3. **Verify** that `https://learnsql.synapticnoise.com/CNAME` returns the domain and that the
   `.wasm` loads as `application/wasm`. (Before DNS, the site is also reachable at
   `https://zeveck.github.io/learnsql/`.)
