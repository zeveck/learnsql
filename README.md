# Anime SQL Academy

A fun, fully **client-side** website that teaches SQL — with a heavy emphasis on JOINs —
using an anime-themed mock SQLite database. Learners write real SQL in the browser, see
live results, and work through a tiered lesson curriculum. Served as a static site via
GitHub Pages at **`sql.synapticnoise.com`**.

This repository is at **Phase 1**: the static-site skeleton, dev-only tooling, and a sql.js
engine smoke test that runs in both the browser and headless Node.

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
css/styles.css         styles
js/db.js               initEngine() — reads globalThis.initSqlJs
js/app.js              smoke: build a table, run a SELECT, render it
assets/favicon.svg     favicon (referenced relatively; no 404)
vendor/                committed runtime assets (sql.js 1.14.1) — ARE served
data/                  database schema/seed (later phases)
lessons/               lesson content (later phases)
tests/                 Node logic tests + Playwright e2e
scripts/test-all.sh    full test command
tools/                 one-time dev-tooling scripts (later phases)
CNAME / .nojekyll      GitHub Pages config
```

## Dev-tooling carve-out

"No build step" governs the **deployed site**, NOT the development environment. A **dev-only
`package.json`** (`private: true`) exists for tooling that is **never loaded by the site and
never deployed**:

- `@playwright/test` — the E2E test runner. It is **pinned to `1.61.0`** so its bundled
  Chromium revision (1228) matches the browser pre-installed in this dev environment.
- `esbuild` — used in a later phase to produce a committed `vendor/codemirror.bundle.js`.

`node_modules/` is gitignored and never served. The **committed `vendor/` files ARE served**
(they are the vendored runtime assets). The site's own runtime imports resolve only to
`./vendor/*` and `./js/*` — no `node_modules`, no CDN.

## Tests

- **Logic tests (Node):** `node tests/run-node.mjs` — a zero-dependency runner discovers and
  runs `tests/*.test.mjs` using the vendored sql.js, exiting non-zero on any failure.
- **End-to-end (Playwright / Chromium only):** `npx playwright test` — a `webServer` block
  launches `python3 -m http.server` as the static preview.
- **Full test command:** `bash scripts/test-all.sh` (runs the Node tests, then Playwright).

## Accepted exposure (root serving)

Serving from the repo root + `.nojekyll` means the **entire committed repo is publicly fetchable**
at the domain (e.g. `/docs/plans/SQL.md`, `/tests/...`, `/scripts/...`). This is acceptable for
an open teaching project, but it means **the repo must contain no secrets** — keep none here.

## Deploying to GitHub Pages (human-only steps)

These steps cannot be automated and must be done by a human with account access:

1. **DNS** at the `synapticnoise.com` provider: add a **CNAME record**, host `sql`, value
   `<account>.github.io` (the account host only — **NO** repo, **NO** path). Up to 24h to
   propagate.
2. **Create the GitHub repo**, add `origin`, and push `main`.
3. **Settings → Pages → Source** = **Deploy from a branch**, Branch **`main`**, Folder
   **`/ (root)`**.
4. **Settings → Pages → Custom domain** = `sql.synapticnoise.com`, **Save** (await the green
   DNS check).
5. After the certificate provisions (up to 24h), tick **Enforce HTTPS**.
6. **Verify** that `https://sql.synapticnoise.com/CNAME` returns the domain and that the
   `.wasm` loads as `application/wasm`.
