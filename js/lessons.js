// Lesson loader (Phase 4; gating removed Phase 9).
//
// The deployed site is build-free with no directory listing, so lessons are
// imported EXPLICITLY here (each lesson is a default-exported data object under
// lessons/). As content phases land, add their modules to LESSON_MODULES — the
// ordering, lookup, and progress helpers below work over whatever is registered.
//
// ACCESS MODEL: every lesson (including the capstone) is freely openable in any
// order — there is NO sequential gating and NO intra-lesson tier lock. Learners
// can do whichever lessons they want. The helpers below only describe PROGRESS
// (which tiers are solved, whether a lesson is complete) so the map can show
// per-lesson completion indicators; they never lock anything.
//
// See lessons/README.md for the authoring contract (the exact lesson + exercise
// shape, the two exercise kinds, and the fields the validator/scorer consume).

import lesson01 from '../lessons/lesson-01-select.js';
import lesson02 from '../lessons/lesson-02-where.js';
import lesson03 from '../lessons/lesson-03-order-limit-distinct.js';
import lesson04 from '../lessons/lesson-04-expressions-case.js';
import lesson05 from '../lessons/lesson-05-aggregates.js';
import lesson06 from '../lessons/lesson-06-group-by-having.js';
import lesson07 from '../lessons/lesson-07-inner-join.js';
import lesson08 from '../lessons/lesson-08-left-join.js';
import lesson09 from '../lessons/lesson-09-full-cross-join.js';
import lesson10 from '../lessons/lesson-10-self-join.js';
import lesson11 from '../lessons/lesson-11-multi-join.js';
import lesson12 from '../lessons/lesson-12-join-aggregation.js';
import lesson13 from '../lessons/lesson-13-subqueries.js';
import lesson14 from '../lessons/lesson-14-ctes.js';
import lesson15 from '../lessons/lesson-15-dml.js';
import capstone from '../lessons/lesson-16-capstone-tournament-murder.js';

/** All registered lesson modules (unsorted). The capstone is registered LAST. */
const LESSON_MODULES = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  lesson07,
  lesson08,
  lesson09,
  lesson10,
  lesson11,
  lesson12,
  lesson13,
  lesson14,
  lesson15,
  capstone,
];

/** Lessons sorted by ascending id (the suggested play order; NOT a gate). */
export const LESSONS = LESSON_MODULES.slice().sort((a, b) => a.id - b.id);

/** Look up a lesson by numeric id. */
export function getLesson(id) {
  return LESSONS.find((l) => l.id === id) || null;
}

/** Look up a lesson by slug. */
export function getLessonBySlug(slug) {
  return LESSONS.find((l) => l.slug === slug) || null;
}

/** Every (lesson, exercise, index) triple — handy for the mechanical guard. */
export function allExercises() {
  const out = [];
  for (const lesson of LESSONS) {
    (lesson.exercises || []).forEach((exercise, index) => {
      out.push({ lesson, exercise, index });
    });
  }
  return out;
}

/** The tiers an exercise can carry, in difficulty order. */
export const TIER_ORDER = ['bronze', 'silver', 'gold'];

/**
 * Has every BRONZE exercise of a lesson been solved? (A lesson with no bronze
 * exercises falls back to "its first exercise solved".) This is a pure PROGRESS
 * readout — it no longer gates anything; the map uses it to light the 🥉 medal.
 *
 * @param {object} lesson
 * @param {object} solvedExercises map of exerciseKey -> true
 * @param {(lessonId:number, idx:number)=>string} keyFn
 */
export function lessonBronzeCleared(lesson, solvedExercises, keyFn) {
  const ex = lesson.exercises || [];
  const bronze = ex
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.tier === 'bronze');
  const required = bronze.length ? bronze : ex.length ? [{ e: ex[0], i: 0 }] : [];
  if (required.length === 0) return true;
  return required.every(({ i }) => !!solvedExercises[keyFn(lesson.id, i)]);
}

/**
 * Is a lesson fully complete (every exercise solved)?
 */
export function lessonComplete(lesson, solvedExercises, keyFn) {
  const ex = lesson.exercises || [];
  if (ex.length === 0) return false;
  return ex.every((_, i) => !!solvedExercises[keyFn(lesson.id, i)]);
}

/**
 * Every lesson is freely accessible — there is NO sequential gating. This helper
 * is retained (always true) so older callers/tests have a stable answer: a
 * lesson is never locked, regardless of progress.
 */
export function lessonUnlocked(/* lesson, solvedExercises, keyFn */) {
  return true;
}

/**
 * Per-tier completion state for a lesson, used to light the card's medals.
 *
 * For each tier present in the lesson, returns { present, total, solved, done }:
 *   - present: the tier has at least one exercise
 *   - total:   how many exercises of that tier
 *   - solved:  how many of them are solved
 *   - done:    every exercise of that tier is solved (and at least one exists)
 * A tier with no exercises is { present:false, total:0, solved:0, done:false }.
 *
 * @param {object} lesson
 * @param {object} solvedExercises map of exerciseKey -> true
 * @param {(lessonId:number, idx:number)=>string} keyFn
 */
export function lessonTierState(lesson, solvedExercises, keyFn) {
  const ex = lesson.exercises || [];
  const out = {};
  for (const tier of TIER_ORDER) {
    const idxs = ex.map((e, i) => ({ e, i })).filter(({ e }) => e.tier === tier);
    const solved = idxs.filter(({ i }) => !!solvedExercises[keyFn(lesson.id, i)]).length;
    out[tier] = {
      present: idxs.length > 0,
      total: idxs.length,
      solved,
      done: idxs.length > 0 && solved === idxs.length,
    };
  }
  return out;
}

/** How many of a lesson's exercises are solved (and the total). */
export function lessonSolvedCount(lesson, solvedExercises, keyFn) {
  const ex = lesson.exercises || [];
  const solved = ex.filter((_, i) => !!solvedExercises[keyFn(lesson.id, i)]).length;
  return { solved, total: ex.length };
}

/**
 * A map view for the lesson home. Every lesson is accessible (unlocked:true) —
 * the view carries PROGRESS only: per-tier medal state, the solved/total
 * counter, and whether the lesson is fully complete.
 */
export function lessonMap(solvedExercises, keyFn) {
  return LESSONS.map((lesson) => ({
    lesson,
    unlocked: true,
    bronzeCleared: lessonBronzeCleared(lesson, solvedExercises, keyFn),
    complete: lessonComplete(lesson, solvedExercises, keyFn),
    tiers: lessonTierState(lesson, solvedExercises, keyFn),
    count: lessonSolvedCount(lesson, solvedExercises, keyFn),
  }));
}
