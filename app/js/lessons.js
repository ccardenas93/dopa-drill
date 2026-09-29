// Teaching layer: a worked example the first time a skill appears, a few
// guided tries with the method on screen, and error messages that say what
// probably went wrong instead of only "almost".
//
// Pure helpers only; main.js owns the screen. Per-skill state lives in the
// saved progress record: `lesson` (timestamp the example was shown).

// Guided tries after the example; they do not count toward mastery.
export const GUIDED_N = 2;

const recOf = (prog, id) => prog.skills[id] || (prog.skills[id] = { n: 0, hist: [], mastered: false, recent: [] });

/** A skill gets its example the first time it is ever played. */
export function needsLesson(prog, id) {
  const r = prog.skills[id];
  return !!id && !(r && (r.n || r.lesson || r.mastered));
}

export function markLesson(prog, id, at = Date.now()) {
  recOf(prog, id).lesson = at;
}

/** The first GUIDED_N attempts after the example show the method upfront. */
export function isGuided(prog, id) {
  const r = prog.skills[id];
  return !!(r && r.lesson && !r.mastered && r.n < GUIDED_N);
}

/**
 * Explain a wrong digit using the step's `diag` data (set by problems.js).
 * Returns { key, vars } for t(), or null when there is nothing specific to say.
 */
export function diagnose(st, key) {
  const d = st && st.diag;
  const got = Number(key);
  const want = Number(st && st.digit);
  if (!d || !Number.isInteger(got) || !Number.isInteger(want)) return null;
  switch (d.kind) {
    case 'add':
      // 7 + 5 with a carried 1 answered as 2 instead of 3.
      if (d.carryIn && got === (want + 9) % 10) return { key: 'diag.forgotCarry' };
      // Wrote the tens of the column sum instead of the ones: 7 + 5 -> "1".
      if (d.sum >= 10 && got === Math.floor(d.sum / 10) && got !== want) return { key: 'diag.wroteTens', vars: { sum: d.sum, ones: want } };
      return null;
    case 'sub':
      // 3 − 5 turned around into 5 − 3 instead of borrowing.
      if (d.borrowed && got === d.bottom - (d.top - 10) && got !== want) return { key: 'diag.subReversed', vars: { a: d.top - 10, b: d.bottom } };
      // This column lent 1 to its right-hand neighbour and it was forgotten.
      if (d.lent && got === (want + 1) % 10) return { key: 'diag.forgotLent' };
      return null;
    case 'divq':
      if (got * d.d > d.cur) return { key: 'diag.divTooBig', vars: { q: got, d: d.d, p: got * d.d, cur: d.cur } };
      if ((got + 1) * d.d <= d.cur) return { key: 'diag.divTooSmall', vars: { q: got, d: d.d, p: got * d.d, cur: d.cur } };
      return null;
    default:
      return null;
  }
}
