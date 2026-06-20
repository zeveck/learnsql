// Lesson runner UI (Phase 4).
//
// Renders ONE lesson's exercises with: a concept pane, schema-panel
// highlighting, the CodeMirror editor, Run + Check, a tier badge, priced
// progressive hints, the validator verdict + diagnosis, and per-lesson +
// overall progress bars. On a correct Check it applies the solve through
// js/score.js (XP / level / streak / badges), persists, and unlocks the next
// lesson per the gating rules in js/lessons.js.
//
// Per-Check determinism: js/validate.checkAnswer ALWAYS runs on a fresh seeded
// clone for both the canonical and the user run — a prior Explore edit cannot
// affect validation.

import { createEditor } from './editor.js';
import { renderResults } from './results.js';
import { runQuery, freshDb } from './db.js';
import { checkAnswer } from './validate.js';
import { createHintState } from './hints.js';
import {
  applySolve,
  saveProgress,
  exerciseKey,
  levelDetail,
} from './score.js';
import {
  LESSONS,
  TIER_ORDER,
  lessonComplete,
  lessonBronzeCleared,
} from './lessons.js';
import { capstoneScoreScreen } from './profile.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Create a lesson runner.
 *
 * @param {object} cfg
 *   - host:        HTMLElement   container to render the lesson into
 *   - SQL:         object        the sql.js factory
 *   - schemaPanel: { highlightTables }  the shared schema panel controller
 *   - getProgress: () => progress current progress object (live ref)
 *   - setProgress: (p) => void   replace the live progress object
 *   - onProgress:  () => void    called after any progress change (re-render map)
 *   - onExit:      () => void    "back to lesson map"
 */
export function createLessonRunner(cfg) {
  const { host, SQL, schemaPanel, getProgress, setProgress, onProgress, onExit } = cfg;

  let lesson = null;
  let exIndex = 0;
  let editor = null;
  // Per-exercise attempt bookkeeping (reset when an exercise is entered).
  let attempt = { failed: false, hintState: null, hintsUsed: 0 };

  function key(idx = exIndex) {
    return exerciseKey(lesson.id, idx);
  }

  function currentExercise() {
    return lesson.exercises[exIndex];
  }

  /** Open a lesson at its first unsolved exercise (or the first). */
  function open(targetLesson) {
    lesson = targetLesson;
    const solved = getProgress().solvedExercises || {};
    const firstUnsolved = lesson.exercises.findIndex((_, i) => !solved[key(i)]);
    exIndex = firstUnsolved === -1 ? 0 : firstUnsolved;
    render();
  }

  function enterExercise(idx) {
    exIndex = idx;
    attempt = {
      failed: false,
      hintState: createHintState(currentExercise()),
      hintsUsed: 0,
    };
    render();
  }

  function overallProgressFraction() {
    const all = [];
    for (const l of LESSONS) for (let i = 0; i < l.exercises.length; i++) all.push(exerciseKey(l.id, i));
    const solved = getProgress().solvedExercises || {};
    const done = all.filter((k) => solved[k]).length;
    return all.length ? done / all.length : 0;
  }

  function lessonProgressFraction() {
    const solved = getProgress().solvedExercises || {};
    const total = lesson.exercises.length;
    const done = lesson.exercises.filter((_, i) => solved[key(i)]).length;
    return total ? done / total : 0;
  }

  function render() {
    if (!attempt.hintState) {
      attempt.hintState = createHintState(currentExercise());
    }
    const ex = currentExercise();
    const progress = getProgress();
    const solved = progress.solvedExercises || {};
    const isSolved = !!solved[key()];
    const ld = levelDetail(progress.xp);

    schemaPanel.highlightTables(lesson.tables || []);

    host.innerHTML = `
      <div class="lesson">
        <div class="lesson-top">
          <button type="button" class="btn lesson-back" id="lesson-back">&larr; Lesson map</button>
          <div class="lesson-stats">
            <span class="stat" title="Level">${esc(ld.level)}</span>
            <span class="stat" title="XP">${progress.xp} XP</span>
            <span class="stat" title="Daily streak">🔥 ${progress.streak}</span>
          </div>
        </div>

        <h2 class="lesson-title">
          ${esc(lesson.title)}
          ${lesson.joinCore ? '<span class="badge joincore">JOIN core ×1.5</span>' : ''}
        </h2>

        <div class="progress-bars">
          <label>This lesson
            <progress max="1" value="${lessonProgressFraction()}"></progress>
          </label>
          <label>Overall
            <progress max="1" value="${overallProgressFraction()}"></progress>
          </label>
        </div>

        <div class="lesson-concept">${lesson.concept || ''}</div>

        <div class="exercise-tabs" id="exercise-tabs"></div>

        <div class="exercise">
          <div class="exercise-head">
            <span class="badge tier-${esc(ex.tier)}">${esc(ex.tier)}</span>
            ${ex.kind === 'dml' ? '<span class="badge kind-dml">DML</span>' : ''}
            ${isSolved ? '<span class="badge solved">✓ solved</span>' : ''}
          </div>
          <div class="exercise-prompt">${ex.prompt}</div>

          <div class="editor-wrap"><div id="lesson-editor" class="editor" role="textbox" aria-multiline="true" aria-label="SQL answer editor"></div></div>

          <div class="toolbar" role="toolbar" aria-label="Exercise controls">
            <button id="lesson-run" type="button" class="btn" aria-label="Run your query without checking it">Run &#9654;</button>
            <button id="lesson-check" type="button" class="btn btn-primary" aria-label="Check your answer">Check answer</button>
            <button id="lesson-hint" type="button" class="btn btn-hint" aria-label="Reveal a hint (costs XP)">Hint</button>
            <span class="hint">Ctrl/Cmd+Enter to run</span>
          </div>

          <div id="lesson-hints" class="lesson-hints"></div>
          <div id="lesson-verdict" class="lesson-verdict" role="status" aria-live="polite"></div>
          <div id="lesson-result" class="result" role="region" aria-label="Query results"></div>
        </div>
      </div>
    `;

    host.querySelector('#lesson-back').addEventListener('click', () => onExit());

    // Exercise tab strip (with lock state — a later exercise is reachable only
    // when the prior tier is solved, mirroring intra-lesson progression).
    renderTabs();

    // Editor.
    const editorHost = host.querySelector('#lesson-editor');
    editor = createEditor(editorHost, {
      doc: ex.starter || ex.solution || '',
      onRun: () => doRun(),
    });

    host.querySelector('#lesson-run').addEventListener('click', () => doRun());
    host.querySelector('#lesson-check').addEventListener('click', () => doCheck());
    host.querySelector('#lesson-hint').addEventListener('click', () => doHint());

    renderHints();
    editor.focus();
  }

  function renderTabs() {
    const tabs = host.querySelector('#exercise-tabs');
    const solved = getProgress().solvedExercises || {};
    tabs.innerHTML = '';
    lesson.exercises.forEach((ex, i) => {
      // An exercise is reachable if it's the first, already solved, or the
      // previous one is solved.
      const unlocked = i === 0 || !!solved[key(i)] || !!solved[key(i - 1)];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'exercise-tab tier-' + ex.tier +
        (i === exIndex ? ' active' : '') +
        (solved[key(i)] ? ' done' : '') +
        (unlocked ? '' : ' locked');
      btn.textContent = `${i + 1}. ${ex.tier}` + (solved[key(i)] ? ' ✓' : unlocked ? '' : ' 🔒');
      btn.disabled = !unlocked;
      btn.addEventListener('click', () => unlocked && enterExercise(i));
      tabs.appendChild(btn);
    });
  }

  function doRun() {
    const sql = editor.getValue().trim();
    const resultEl = host.querySelector('#lesson-result');
    if (!sql) {
      renderResults(resultEl, null);
      return;
    }
    // Run on a fresh clone so an exploratory Run never mutates shared state.
    const db = freshDb(SQL);
    try {
      const outcome = runQuery(db, sql);
      renderResults(resultEl, outcome, {
        columnTables: currentExercise().columnTables,
        rightTables: currentExercise().rightTables,
      });
    } finally {
      db.close();
    }
  }

  function doCheck() {
    const ex = currentExercise();
    const userSql = editor.getValue();
    const verdict = checkAnswer(SQL, ex, userSql);
    const verdictEl = host.querySelector('#lesson-verdict');

    if (!verdict.correct) {
      attempt.failed = true;
      verdictEl.className = 'lesson-verdict incorrect';
      verdictEl.innerHTML =
        `<strong>Not quite.</strong> <span class="diagnosis">[${esc(verdict.diagnosis)}]</span> ` +
        esc(verdict.message) +
        (ex.commonMistake ? `<div class="common-mistake">💡 ${esc(ex.commonMistake)}</div>` : '');
      return;
    }

    // Correct — award through the scoring layer (idempotent per exercise).
    const progress = getProgress();
    const wasSolved = !!(progress.solvedExercises || {})[key()];

    const event = buildBadgeEvent(progress);
    const out = applySolve(progress, {
      key: key(),
      tier: ex.tier,
      firstTry: !attempt.failed && attempt.hintsUsed === 0,
      joinCore: !!lesson.joinCore,
      hintsUsed: attempt.hintsUsed,
      capstone: !!lesson.capstone,
      today: todayISO(),
      event,
    });

    setProgress(out.progress);
    saveProgress(out.progress);
    onProgress();

    verdictEl.className = 'lesson-verdict correct';
    const nowComplete = lessonComplete(lesson, out.progress.solvedExercises, exerciseKey);

    // Capstone: on completing the final accusation, show the dedicated score
    // screen instead of the plain "next" line.
    if ((lesson.capstone || lesson.isCapstone) && nowComplete) {
      const culprit = (verdict.actual && verdict.actual.values && verdict.actual.values[0])
        ? verdict.actual.values[0][0]
        : null;
      verdictEl.innerHTML = capstoneScoreScreen({
        lesson,
        xpAwarded: wasSolved ? 0 : out.xpAwarded,
        newBadges: out.newBadges,
        progress: out.progress,
        culprit,
      });
      renderTabs();
      const bars0 = host.querySelectorAll('.progress-bars progress');
      if (bars0[0]) bars0[0].value = lessonProgressFraction();
      if (bars0[1]) bars0[1].value = overallProgressFraction();
      return;
    }

    let html = `<strong>✓ Correct!</strong> ${esc(verdict.message)}`;
    if (!wasSolved && out.xpAwarded > 0) html += ` <span class="xp-gain">+${out.xpAwarded} XP</span>`;
    if (out.newBadges.length) html += `<div class="badges-earned">🏅 ${out.newBadges.map(esc).join(', ')}</div>`;
    if (verdict.nudge) html += `<div class="nudge">${esc(verdict.nudge)}</div>`;

    // Advance hint / unlock state.
    const nextIdx = exIndex + 1;
    if (nextIdx < lesson.exercises.length) {
      html += ` <button type="button" class="btn btn-primary" id="next-exercise">Next exercise &rarr;</button>`;
    } else if (nowComplete) {
      const li = LESSONS.findIndex((l) => l.id === lesson.id);
      const next = LESSONS[li + 1];
      if (next) html += ` <button type="button" class="btn btn-primary" id="next-lesson">Next lesson: ${esc(next.title)} &rarr;</button>`;
      else html += ` <button type="button" class="btn" id="to-map">Back to lesson map</button>`;
    }
    verdictEl.innerHTML = html;

    // Re-render tabs/progress to reflect the new solved state.
    renderTabs();
    host.querySelector('.progress-bars progress[value]').value = lessonProgressFraction();
    const bars = host.querySelectorAll('.progress-bars progress');
    if (bars[0]) bars[0].value = lessonProgressFraction();
    if (bars[1]) bars[1].value = overallProgressFraction();
    // Refresh the solved badge in the head if needed.
    const head = host.querySelector('.exercise-head');
    if (head && !head.querySelector('.solved')) {
      const b = document.createElement('span');
      b.className = 'badge solved';
      b.textContent = '✓ solved';
      head.appendChild(b);
    }

    const nb = verdictEl.querySelector('#next-exercise');
    if (nb) nb.addEventListener('click', () => enterExercise(exIndex + 1));
    const nl = verdictEl.querySelector('#next-lesson');
    if (nl) {
      nl.addEventListener('click', () => {
        const li = LESSONS.findIndex((l) => l.id === lesson.id);
        open(LESSONS[li + 1]);
      });
    }
    const tm = verdictEl.querySelector('#to-map');
    if (tm) tm.addEventListener('click', () => onExit());
  }

  /**
   * Build the badge-trigger context for the CURRENT solve, computed against the
   * progress AS IF this exercise is now solved.
   */
  function buildBadgeEvent(progress) {
    const ex = currentExercise();
    const solved = { ...(progress.solvedExercises || {}) };
    solved[key()] = true;

    const lessonNowComplete = lessonComplete(lesson, solved, exerciseKey);

    // No-hints / first-try-all are tracked per attempt across the lesson; we
    // approximate at lesson-completion using this attempt's flags for the final
    // exercise plus the simple heuristic that hints touched nothing this run.
    // (The strong, exact tracking is exercised by the score unit tests.)
    return {
      exercise: ex,
      lessonComplete: lessonNowComplete,
      lessonNoHints: lessonNowComplete && attempt.hintsUsed === 0,
      lessonFirstTryAll: lessonNowComplete && !attempt.failed && attempt.hintsUsed === 0,
      allGold: false,
      allInnerGold: false,
    };
  }

  function doHint() {
    const hs = attempt.hintState;
    if (!hs.canReveal()) return;
    const cost = hs.nextCost();
    // Confirm the spend (cost shown before spending).
    const ok = globalThis.confirm
      ? globalThis.confirm(`Reveal the next hint for −${cost} XP from this exercise's reward?`)
      : true;
    if (!ok) return;
    hs.reveal();
    attempt.hintsUsed = hs.revealedCount();
    renderHints();
  }

  function renderHints() {
    const el = host.querySelector('#lesson-hints');
    if (!el) return;
    const hs = attempt.hintState;
    const slots = hs.slots();
    let html = '';
    for (const s of slots) {
      if (s.revealed) {
        html += `<div class="hint-revealed">L${s.level} (−${s.cost} XP): ${esc(s.text || '')}</div>`;
      }
    }
    const nextCost = hs.nextCost();
    if (nextCost != null && hs.canReveal()) {
      html += `<div class="hint-next">Next hint costs −${nextCost} XP.</div>`;
    } else if (slots.length) {
      html += `<div class="hint-next">No more hints.</div>`;
    }
    el.innerHTML = html;
    // Disable the hint button when exhausted.
    const btn = host.querySelector('#lesson-hint');
    if (btn) btn.disabled = !hs.canReveal();
  }

  return { open, enterExercise };
}
