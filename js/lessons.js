// Lesson loader (Phase 4).
//
// The deployed site is build-free with no directory listing, so lessons are
// imported EXPLICITLY here (each lesson is a default-exported data object under
// lessons/). As content phases land, add their modules to LESSON_MODULES — the
// ordering, lookup, and gating helpers below work over whatever is registered.
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

/** All registered lesson modules (unsorted). */
const LESSON_MODULES = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  lesson07,
  lesson08,
];

/** Lessons sorted by ascending id (the play order + gating order). */
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
 * Is a lesson's Bronze requirement satisfied? A lesson is "passed enough to
 * advance" once every BRONZE exercise in it is solved (Gold is optional). A
 * lesson with no bronze exercises requires its first exercise solved.
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
 * Is a lesson unlocked? The first lesson is always unlocked; any later lesson
 * unlocks once the PREVIOUS lesson (by play order) has its Bronze cleared.
 */
export function lessonUnlocked(lesson, solvedExercises, keyFn) {
  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  if (idx <= 0) return true;
  const prev = LESSONS[idx - 1];
  return lessonBronzeCleared(prev, solvedExercises, keyFn);
}

/**
 * A map view for the lesson home: each lesson with its unlocked/complete state
 * and bronze-cleared flag.
 */
export function lessonMap(solvedExercises, keyFn) {
  return LESSONS.map((lesson) => ({
    lesson,
    unlocked: lessonUnlocked(lesson, solvedExercises, keyFn),
    bronzeCleared: lessonBronzeCleared(lesson, solvedExercises, keyFn),
    complete: lessonComplete(lesson, solvedExercises, keyFn),
  }));
}
