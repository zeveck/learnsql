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
} from './score.js';

const EXPLORE_STARTER = "SELECT name, role FROM characters WHERE role='villain';";

async function main() {
  const statusEl = document.getElementById('status');
  const schemaHost = document.getElementById('schema-panel');
  const viewExplore = document.getElementById('view-explore');
  const viewMap = document.getElementById('view-map');
  const viewLesson = document.getElementById('view-lesson');
  const navLessons = document.getElementById('nav-lessons');
  const navExplore = document.getElementById('nav-explore');

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
      .map(({ lesson, unlocked, complete, bronzeCleared }) => {
        const cls = 'lesson-card' + (unlocked ? '' : ' locked') + (complete ? ' complete' : '');
        const status = !unlocked ? '🔒 Locked' : complete ? '✓ Complete' : bronzeCleared ? 'In progress' : 'Unlocked';
        const cta = unlocked
          ? `<a class="btn btn-primary" href="#/lesson/${lesson.id}">${complete ? 'Review' : 'Start'}</a>`
          : `<span class="btn disabled">Locked</span>`;
        return `
          <div class="${cls}" data-lesson="${lesson.id}">
            <div class="lesson-card-head">
              <span class="lesson-num">Lesson ${lesson.id}</span>
              ${lesson.joinCore ? '<span class="badge joincore">JOIN core</span>' : ''}
            </div>
            <h3>${escapeHtml(lesson.title)}</h3>
            <div class="lesson-card-status">${status}</div>
            ${cta}
          </div>`;
      })
      .join('');

    viewMap.innerHTML = `
      <div class="map-header">
        <div>
          <h2>Lesson Map</h2>
          <p class="tagline">Clear each lesson's Bronze to unlock the next.</p>
        </div>
        <div class="map-stats">
          <div class="stat-big">${escapeHtml(ld.level)}</div>
          <div class="stat-sub">${progress.xp} XP${ld.next ? ` &middot; ${Math.round(ld.progress * 100)}% to ${escapeHtml(ld.next)}` : ' &middot; max level'}</div>
          <div class="stat-sub">🔥 ${progress.streak}-day streak &middot; ❄️ ${progress.freezes} freeze(s)</div>
          <div class="stat-sub">🏅 ${(progress.badges || []).length} badge(s)</div>
          <button type="button" id="reset-progress" class="btn btn-small">Reset progress</button>
        </div>
      </div>
      <div class="lesson-grid">${cards}</div>
    `;

    const rp = viewMap.querySelector('#reset-progress');
    if (rp) {
      rp.addEventListener('click', async () => {
        const ok = globalThis.confirm ? globalThis.confirm('Reset all XP, badges, and lesson progress?') : true;
        if (!ok) return;
        progress = await resetProgress();
        renderMap();
      });
    }
  }

  // --- Routing ------------------------------------------------------------
  function currentRoute() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/lesson\/(\d+)/);
    if (m) return { name: 'lesson', id: Number(m[1]) };
    if (h.startsWith('#/explore')) return { name: 'explore' };
    return { name: 'map' };
  }

  function show(el) {
    [viewExplore, viewMap, viewLesson].forEach((v) => v.classList.toggle('hidden', v !== el));
  }

  async function route() {
    const r = currentRoute();
    navLessons.classList.toggle('active', r.name !== 'explore');
    navExplore.classList.toggle('active', r.name === 'explore');

    if (r.name === 'explore') {
      show(viewExplore);
      await initExplore();
      schemaPanel.highlightTables([]);
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

  window.addEventListener('hashchange', () => route());
  await route();
}

/** Local escape (the renderer's escapeHtml is import-coupled to results.js). */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

main();
