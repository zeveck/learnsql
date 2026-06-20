// Priced, progressive hints (Phase 4).
//
// Each exercise may declare up to three hints, revealed ONE AT A TIME, each with
// an XP cost shown BEFORE the learner spends it:
//   L1 nudge              -2
//   L2 structural skeleton -5
//   L3 near-answer + why  -10
//
// The hint text comes from the exercise; if a level's text is absent we still
// expose the slot with a generic fallback so the gating/cost model is uniform.
// This module is pure (no DOM) so the cost/availability model is testable.

export const HINT_COSTS = [2, 5, 10];

/**
 * Normalize an exercise's hints into a 3-slot array of { level, cost, text }.
 * `exercise.hints` may be an array of strings or an array of { text } objects.
 */
export function hintsFor(exercise) {
  const raw = (exercise && exercise.hints) || [];
  const out = [];
  for (let i = 0; i < HINT_COSTS.length; i++) {
    const h = raw[i];
    let text;
    if (typeof h === 'string') text = h;
    else if (h && typeof h.text === 'string') text = h.text;
    else text = null;
    out.push({ level: i + 1, cost: HINT_COSTS[i], text });
  }
  return out;
}

/** The cost of revealing the NEXT hint given how many are already revealed. */
export function nextHintCost(revealedCount) {
  if (revealedCount >= HINT_COSTS.length) return null;
  return HINT_COSTS[revealedCount];
}

/** Total XP cost of `revealedCount` hints (for display). */
export function totalHintCost(revealedCount) {
  let sum = 0;
  for (let i = 0; i < Math.min(revealedCount, HINT_COSTS.length); i++) sum += HINT_COSTS[i];
  return sum;
}

/**
 * Stateful hint controller for one exercise instance.
 * Reveals one hint at a time; reports the next cost so the UI can confirm
 * "Reveal hint (−N XP)?" before spending.
 */
export function createHintState(exercise) {
  const hints = hintsFor(exercise);
  let revealed = 0;
  return {
    /** All slots (text hidden until revealed). */
    slots: () => hints.map((h, i) => ({ ...h, revealed: i < revealed })),
    /** Count revealed so far. */
    revealedCount: () => revealed,
    /** Cost of the next reveal, or null when exhausted. */
    nextCost: () => nextHintCost(revealed),
    /** Whether another hint can be revealed. */
    canReveal: () => revealed < hints.length && hints[revealed] != null,
    /** Reveal the next hint; returns it (with text) or null when exhausted. */
    reveal: () => {
      if (revealed >= hints.length) return null;
      const h = hints[revealed];
      revealed += 1;
      return { ...h, text: h.text || 'No further hint for this exercise.' };
    },
    /** Total XP that will be deducted for the hints revealed so far. */
    totalCost: () => totalHintCost(revealed),
  };
}
