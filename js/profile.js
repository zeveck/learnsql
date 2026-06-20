// Profile / achievements screen (Phase 8).
//
// A pure-presentation module rendering progress owned by js/app.js into the
// #/profile route. It reads its level + badge definitions straight from
// js/score.js (LEVELS, BADGE_META, ALL_BADGES, levelDetail) and the lesson list
// from js/lessons.js so it never drifts from the source of truth.
//
// Shows: total XP, current level + a progress bar to the next, the daily streak
// (+ streak freezes), the badge collection (earned vs. locked — every defined
// badge rendered; locked ones greyed with their criterion text), per-lesson
// completion, and a "reset progress" control (confirmed before it fires).
//
// Color is never the only signal: earned/locked carry a "✓ Earned" / "Locked"
// text label and an aria-label, and each stat carries a visible text caption.

import { LEVELS, levelDetail, ALL_BADGES, BADGE_META } from './score.js';
import { LESSONS, lessonComplete, lessonBronzeCleared, lessonUnlocked } from './lessons.js';
import { exerciseKey } from './score.js';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render the profile screen.
 *
 * @param {HTMLElement} host
 * @param {object} cfg
 *   - getProgress: () => progress
 *   - onReset:     () => Promise<void> | void   (re-render after a confirmed reset)
 */
export function renderProfile(host, cfg) {
  const { getProgress, onReset } = cfg;
  const progress = getProgress();
  const solved = progress.solvedExercises || {};
  const ld = levelDetail(progress.xp);
  const earned = new Set(progress.badges || []);

  // --- Badge collection (all defined badges; locked greyed w/ criterion). ---
  const badgeCards = ALL_BADGES.map((name) => {
    const meta = BADGE_META[name] || { emblem: '🏅', criteria: '' };
    const isEarned = earned.has(name);
    const state = isEarned ? 'earned' : 'locked';
    const label = isEarned ? '✓ Earned' : '🔒 Locked';
    return `
      <li class="badge-card ${state}" role="listitem"
          aria-label="${esc(name)} — ${isEarned ? 'earned' : 'locked'}: ${esc(meta.criteria)}">
        <span class="badge-emblem" aria-hidden="true">${meta.emblem}</span>
        <span class="badge-name">${esc(name)}</span>
        <span class="badge-state">${label}</span>
        <span class="badge-criteria">${esc(meta.criteria)}</span>
      </li>`;
  }).join('');

  // --- Per-lesson completion ------------------------------------------------
  const lessonRows = LESSONS.map((lesson) => {
    const total = (lesson.exercises || []).length;
    const done = (lesson.exercises || []).filter((_, i) => solved[exerciseKey(lesson.id, i)]).length;
    const complete = lessonComplete(lesson, solved, exerciseKey);
    const bronze = lessonBronzeCleared(lesson, solved, exerciseKey);
    const unlocked = lessonUnlocked(lesson, solved, exerciseKey);
    let status, statusCls;
    if (!unlocked) { status = '🔒 Locked'; statusCls = 'locked'; }
    else if (complete) { status = '✓ Complete'; statusCls = 'complete'; }
    else if (bronze) { status = 'Bronze cleared'; statusCls = 'partial'; }
    else if (done > 0) { status = 'In progress'; statusCls = 'partial'; }
    else { status = 'Not started'; statusCls = 'todo'; }
    return `
      <tr class="lesson-row ${statusCls}">
        <th scope="row">${esc(lesson.id)}. ${esc(lesson.title)}</th>
        <td>${done} / ${total}</td>
        <td><span class="lesson-status-text">${status}</span></td>
      </tr>`;
  }).join('');

  const earnedCount = (progress.badges || []).filter((b) => ALL_BADGES.includes(b)).length;

  host.innerHTML = `
    <section class="profile" aria-label="Your profile and achievements">
      <h2>Your Dossier</h2>

      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value">${progress.xp}</div>
          <div class="profile-stat-label">Total XP</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${esc(ld.level)}</div>
          <div class="profile-stat-label">Rank</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">🔥 ${progress.streak}</div>
          <div class="profile-stat-label">Day streak</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">❄️ ${progress.freezes}</div>
          <div class="profile-stat-label">Streak freezes</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">🏅 ${earnedCount} / ${ALL_BADGES.length}</div>
          <div class="profile-stat-label">Badges</div>
        </div>
      </div>

      <div class="level-progress">
        <label for="level-bar">
          ${ld.next
            ? `Progress to <strong>${esc(ld.next)}</strong> — ${Math.round(ld.progress * 100)}%`
            : `<strong>Max rank reached: ${esc(LEVELS[LEVELS.length - 1].name)}</strong>`}
        </label>
        <progress id="level-bar" max="1" value="${ld.progress}"
          aria-label="Level progress to next rank"></progress>
      </div>

      <h3>Badge collection</h3>
      <p class="profile-sub">Earned badges are highlighted; locked badges show how to earn them.</p>
      <ul class="badge-grid" role="list">${badgeCards}</ul>

      <h3>Lesson completion</h3>
      <div class="profile-table-wrap">
        <table class="profile-lessons">
          <thead>
            <tr><th scope="col">Lesson</th><th scope="col">Exercises</th><th scope="col">Status</th></tr>
          </thead>
          <tbody>${lessonRows}</tbody>
        </table>
      </div>

      <div class="profile-actions">
        <button type="button" id="profile-reset" class="btn btn-danger">Reset all progress</button>
      </div>
    </section>
  `;

  const resetBtn = host.querySelector('#profile-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = globalThis.confirm
        ? globalThis.confirm('Reset ALL progress? This wipes your XP, rank, streak, badges, and every solved exercise. This cannot be undone.')
        : true;
      if (!ok) return;
      await onReset();
    });
  }
}

/**
 * Render the dedicated end-of-capstone score screen.
 *
 * @param {object} cfg
 *   - lesson:      the capstone lesson
 *   - xpAwarded:   number awarded on the solve (0 if re-solved)
 *   - newBadges:   string[] badges newly earned (e.g. "Detective")
 *   - progress:    the post-solve progress object
 *   - culprit:     string|null the culprit's name (from the final result, optional)
 * @returns {string} HTML
 */
export function capstoneScoreScreen(cfg) {
  const { lesson, xpAwarded, newBadges = [], progress, culprit } = cfg;
  const ld = levelDetail(progress.xp);
  const badgeLine = newBadges.length
    ? `<div class="capstone-badges">🏅 Badge earned: <strong>${newBadges.map(esc).join(', ')}</strong></div>`
    : '';
  return `
    <div class="capstone-score" role="status" aria-live="polite">
      <h3>🕵️ Case closed!</h3>
      ${culprit ? `<p class="capstone-culprit">The killer was <strong>${esc(culprit)}</strong>.</p>` : ''}
      <p>You completed <strong>${esc(lesson.title)}</strong>.</p>
      ${xpAwarded > 0 ? `<div class="capstone-xp">+${xpAwarded} XP</div>` : '<div class="capstone-xp">(already solved — no new XP)</div>'}
      ${badgeLine}
      <p class="capstone-rank">Total: <strong>${progress.xp} XP</strong> · Rank <strong>${esc(ld.level)}</strong></p>
      <div class="capstone-actions">
        <a class="btn btn-primary" href="#/profile">View your dossier</a>
        <a class="btn" href="#/">Back to lesson map</a>
      </div>
    </div>
  `;
}
