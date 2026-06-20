// Anime SQL Academy — app shell + routing (Phase 4).
//
// Three views, switched client-side:
//   - #/        lesson map/home (lock/complete state, XP, level, streak)
//   - #/lesson/<id>  the lesson runner (concept, editor, Run/Check, hints, …)
//   - #/explore the free-form sandbox (Phase 3), still fully reachable
//
// The seeded engine, the schema panel, and the progress state are owned here and
// shared with the lesson runner. Every scored Check runs on a FRESH seeded clone
// inside js/validate.checkAnswer, independent of any Explore edits.

import {
  initEngine,
  freshDb,
  resetDb,
  runQuery,
  saveSandbox,
  loadSandbox,
} from './db.js';
import { createEditor } from './editor.js';
import { renderResults } from './results.js';
import { renderSchemaPanel } from './schema-panel.js';
import { createLessonRunner } from './lesson-runner.js';
import {
  LESSONS,
  getLesson,
  lessonMap,
} from './lessons.js';
import {
  getProgress as loadProgress,
  saveProgress,
  resetProgress,
  exerciseKey,
  levelDetail,
  emptyProgress,
} from './score.js';
import { renderProfile } from './profile.js';

const EXPLORE_STARTER = "SELECT name, role FROM characters WHERE role='villain';";

async function main() {
  const statusEl = document.getElementById('status');
  const schemaHost = document.getElementById('schema-panel');
  const schemaHostWrap = document.getElementById('schema-panel-host');
  const schemaToggle = document.getElementById('schema-toggle');
  const viewExplore = document.getElementById('view-explore');
  const viewMap = document.getElementById('view-map');
  const viewLesson = document.getElementById('view-lesson');
  const viewProfile = document.getElementById('view-profile');
  const navLessons = document.getElementById('nav-lessons');
  const navExplore = document.getElementById('nav-explore');
  const navProfile = document.getElementById('nav-profile');

  let SQL;
  let progress;
  try {
    SQL = await initEngine();
    progress = await loadProgress();
  } catch (err) {
    statusEl.textContent = 'Error loading SQL engine: ' + (err && err.message ? err.message : String(err));
    statusEl.classList.add('error');
    statusEl.dataset.ready = 'error';
    console.error(err);
    return;
  }

  statusEl.textContent = 'Ready.';
  statusEl.classList.add('ready');
  statusEl.dataset.ready = 'true';

  // Shared schema panel (the lesson runner highlights tables on it).
  const schemaPanel = renderSchemaPanel(schemaHost, {
    onInsert: (text) => {
      // Insert into whichever editor is active (explore or lesson).
      if (currentRoute().name === 'explore' && exploreEditor) exploreEditor.insertAtCursor(text);
    },
  });

  const getProgress = () => progress;
  const setProgress = (p) => {
    progress = p;
  };

  // Schema panel collapse toggle (chiefly for narrow viewports; works anywhere).
  if (schemaToggle && schemaHostWrap) {
    schemaToggle.addEventListener('click', () => {
      const collapsed = schemaHostWrap.classList.toggle('collapsed');
      schemaToggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  // --- Test seed hook -----------------------------------------------------
  // E2E specs (capstone / full-curriculum) need to reach a gated state WITHOUT
  // replaying 15 lessons. This hook persists a caller-supplied progress object
  // and refreshes the live state — it does NOT touch the gating logic itself
  // (it only writes the SAME solvedExercises map the runner would have written),
  // so the gate is exercised honestly against seeded "solved" data.
  globalThis.__animeSqlAcademy = {
    async seedProgress(partial) {
      const next = { ...emptyProgress(), ...(partial || {}) };
      await saveProgress(next);
      progress = next;
      return next;
    },
    /**
     * Convenience seeder for the gated E2E flows: mark every BRONZE exercise of
     * lessons whose id <= maxLessonId as solved (the exact solvedExercises map
     * the runner would have written by playing those bronzes), then persist.
     * It writes nothing the gate doesn't read, so the gate stays honest.
     */
    async seedBronzeThrough(maxLessonId) {
      const solvedExercises = {};
      for (const lesson of LESSONS) {
        if (lesson.id > maxLessonId) continue;
        (lesson.exercises || []).forEach((ex, i) => {
          if (ex.tier === 'bronze') solvedExercises[exerciseKey(lesson.id, i)] = true;
        });
      }
      const next = { ...emptyProgress(), solvedExercises, lastActiveDate: new Date().toISOString().slice(0, 10) };
      await saveProgress(next);
      progress = next;
      return next;
    },
    getProgress: () => progress,
    exerciseKey,
  };

  // --- Lesson runner ------------------------------------------------------
  const runner = createLessonRunner({
    host: viewLesson,
    SQL,
    schemaPanel,
    getProgress,
    setProgress,
    onProgress: () => {
      // Persisted inside the runner; just refresh the map if it's showing.
      if (currentRoute().name === 'map') renderMap();
    },
    onExit: () => {
      location.hash = '#/';
    },
  });

  // --- Explore (Phase 3 sandbox) -----------------------------------------
  let exploreEditor = null;
  let exploreDb = null;
  let exploreInited = false;

  async function initExplore() {
    if (exploreInited) return;
    exploreInited = true;
    const editorHost = viewExplore.querySelector('#editor');
    const resultEl = viewExplore.querySelector('#result');
    const runBtn = viewExplore.querySelector('#run-btn');
    const resetBtn = viewExplore.querySelector('#reset-btn');
    const persistToggle = viewExplore.querySelector('#persist-toggle');

    const restored = await loadSandbox(SQL);
    exploreDb = restored || freshDb(SQL);
    if (restored) persistToggle.checked = true;

    exploreEditor = createEditor(editorHost, { doc: EXPLORE_STARTER, onRun: () => run() });

    async function run() {
      const sql = exploreEditor.getValue().trim();
      if (!sql) {
        renderResults(resultEl, null);
        return;
      }
      if (!persistToggle.checked) {
        exploreDb.close();
        exploreDb = freshDb(SQL);
      }
      const outcome = runQuery(exploreDb, sql);
      renderResults(resultEl, outcome);
      if (persistToggle.checked && outcome.ok) {
        try { await saveSandbox(exploreDb); } catch (e) { console.warn('sandbox save failed', e); }
      }
    }
    runBtn.addEventListener('click', () => run());
    resetBtn.addEventListener('click', async () => {
      exploreDb.close();
      exploreDb = resetDb(SQL);
      if (persistToggle.checked) {
        try { await saveSandbox(exploreDb); } catch (e) { console.warn('sandbox save failed', e); }
      }
      renderResults(resultEl, null);
    });
    persistToggle.addEventListener('change', async () => {
      if (persistToggle.checked) {
        try { await saveSandbox(exploreDb); } catch (e) { console.warn('sandbox save failed', e); }
      }
    });
  }

  // --- Lesson map ---------------------------------------------------------
  function renderMap() {
    const ld = levelDetail(progress.xp);
    const map = lessonMap(progress.solvedExercises || {}, exerciseKey);

    const cards = map
      .map(({ lesson, complete, tiers, count }) => {
        const isCapstone = !!(lesson.capstone || lesson.isCapstone);
        const started = count.solved > 0;
        const cls =
          'lesson-card' +
          (complete ? ' complete' : '') +
          (isCapstone ? ' capstone' : '');

        const medals = renderMedals(tiers);

        // Status line: a clear ✓ Complete state (check glyph, not color alone),
        // else in-progress or a "not started" prompt.
        const status = complete
          ? '<span class="lesson-complete-flag">✓ Complete</span>'
          : started
            ? '<span class="lesson-card-status">In progress</span>'
            : '<span class="lesson-card-status">Not started</span>';

        const counter = `<span class="lesson-counter" aria-label="${count.solved} of ${count.total} exercises solved">${count.solved}/${count.total} solved</span>`;

        const ctaLabel = complete ? 'Review' : started ? 'Continue' : isCapstone ? 'Attempt finale' : 'Start';
        const cta = `<a class="btn ${isCapstone ? 'btn-capstone' : 'btn-primary'}" href="#/lesson/${lesson.id}">${ctaLabel}</a>`;

        return `
          <div class="${cls}" data-lesson="${lesson.id}">
            <div class="lesson-card-head">
              <span class="lesson-num">${isCapstone ? '★ Capstone' : 'Lesson ' + lesson.id}</span>
              ${lesson.joinCore ? '<span class="badge joincore">JOIN core</span>' : ''}
            </div>
            <h3>${escapeHtml(lesson.title)}</h3>
            <div class="lesson-card-progress">
              <div class="lesson-medals" role="img" aria-label="${medalAria(tiers)}">${medals}</div>
              <div class="lesson-card-meta">${status}${counter}</div>
            </div>
            ${cta}
          </div>`;
      })
      .join('');

    const started = Object.keys(progress.solvedExercises || {}).length > 0;

    viewMap.innerHTML = `
      <section class="hero" aria-label="Welcome">
        <h2 class="hero-title">Master SQL JOINs with anime &#9889;</h2>
        <p class="hero-line">Write real SQL against a nine-series anime database, watch the rows
          light up, and level up from Academy Student to SQL Hokage &mdash; one JOIN at a time.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" id="hero-start" href="#/lesson/1">${started ? 'Keep learning' : 'Start learning'} &rarr;</a>
          <a class="btn" id="hero-explore" href="#/explore">Free Explore &#9654;</a>
          <a class="btn" id="hero-profile" href="#/profile">Your dossier</a>
        </div>
        <p class="hero-note">Built completely client-side &mdash; no backend, no build step. SQL runs
          in your browser via sql.js (SQLite in WebAssembly). The whole site is plain HTML, CSS, and
          ES modules served straight from the repo, so
          <a href="./js/app.js" class="source-link" id="view-source">you can read the source right here</a>
          &mdash; the build-free code is part of the lesson. Use the browser dev tools to peek at any
          <code>js/</code> module or the <code>lessons/</code> data.</p>
      </section>

      <div class="map-header">
        <div>
          <h2>Lesson Map</h2>
          <p class="tagline">Every lesson is open — pick any you like, in any order. Light all three medals 🥉🥈🥇 to complete a lesson.</p>
        </div>
        <div class="map-stats">
          <div class="stat-big">${escapeHtml(ld.level)}</div>
          <div class="stat-sub">${progress.xp} XP${ld.next ? ` &middot; ${Math.round(ld.progress * 100)}% to ${escapeHtml(ld.next)}` : ' &middot; max level'}</div>
          <div class="stat-sub">🔥 ${progress.streak}-day streak &middot; ❄️ ${progress.freezes} freeze(s)</div>
          <div class="stat-sub">🏅 ${(progress.badges || []).length} badge(s)</div>
          <a class="btn btn-small" href="#/profile">View dossier &amp; badges</a>
        </div>
      </div>
      <div class="lesson-grid">${cards}</div>
    `;
  }

  // --- Profile ------------------------------------------------------------
  function renderProfileView() {
    renderProfile(viewProfile, {
      getProgress,
      onReset: async () => {
        progress = await resetProgress();
        renderProfileView();
      },
    });
  }

  // --- Routing ------------------------------------------------------------
  function currentRoute() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/lesson\/(\d+)/);
    if (m) return { name: 'lesson', id: Number(m[1]) };
    if (h.startsWith('#/explore')) return { name: 'explore' };
    if (h.startsWith('#/profile')) return { name: 'profile' };
    return { name: 'map' };
  }

  function show(el) {
    [viewExplore, viewMap, viewLesson, viewProfile].forEach((v) => v.classList.toggle('hidden', v !== el));
  }

  async function route() {
    const r = currentRoute();
    navLessons.classList.toggle('active', r.name === 'map' || r.name === 'lesson');
    navExplore.classList.toggle('active', r.name === 'explore');
    navProfile.classList.toggle('active', r.name === 'profile');

    if (r.name === 'explore') {
      show(viewExplore);
      await initExplore();
      schemaPanel.highlightTables([]);
      return;
    }
    if (r.name === 'profile') {
      show(viewProfile);
      schemaPanel.highlightTables([]);
      renderProfileView();
      return;
    }
    if (r.name === 'lesson') {
      const lesson = getLesson(r.id);
      if (!lesson) {
        location.hash = '#/';
        return;
      }
      show(viewLesson);
      runner.open(lesson);
      return;
    }
    // map
    show(viewMap);
    schemaPanel.highlightTables([]);
    renderMap();
  }

  navLessons.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '#/';
  });
  navExplore.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '#/explore';
  });
  navProfile.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '#/profile';
  });

  window.addEventListener('hashchange', () => route());
  await route();
}

// Per-tier medal display for a lesson card. Each medal carries a non-color
// signal (the medal emoji + a per-medal title/aria-label like "Bronze: solved"
// / "Gold: not yet"), so the lit/greyed distinction never relies on color alone.
const MEDAL_GLYPH = { bronze: '🥉', silver: '🥈', gold: '🥇' };
const MEDAL_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

function renderMedals(tiers) {
  return ['bronze', 'silver', 'gold']
    .map((tier) => {
      const t = tiers[tier] || { present: false, done: false, solved: 0, total: 0 };
      if (!t.present) {
        // Tier not authored for this lesson — render a neutral placeholder so the
        // three slots stay aligned, but mark it as "no tier".
        return `<span class="medal medal-absent" title="${MEDAL_LABEL[tier]}: not in this lesson" aria-hidden="true">${MEDAL_GLYPH[tier]}</span>`;
      }
      const state = t.done ? 'solved' : 'pending';
      const title = `${MEDAL_LABEL[tier]}: ${t.done ? 'solved' : 'not yet'}${t.total > 1 ? ` (${t.solved}/${t.total})` : ''}`;
      return `<span class="medal medal-${tier} medal-${state}" title="${title}">${MEDAL_GLYPH[tier]}</span>`;
    })
    .join('');
}

function medalAria(tiers) {
  return ['bronze', 'silver', 'gold']
    .filter((tier) => tiers[tier] && tiers[tier].present)
    .map((tier) => `${MEDAL_LABEL[tier]} ${tiers[tier].done ? 'solved' : 'not yet'}`)
    .join(', ');
}

/** Local escape (the renderer's escapeHtml is import-coupled to results.js). */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

main();
