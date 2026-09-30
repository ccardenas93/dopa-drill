// Pure scoring and "dopa" curves (kept separate from the director for testing).
import { getLocale, localeTag, nf } from './i18n.js';

export const BASIC_SCORE = 100;
export const EXTRA_BASE = 10;

// Points for the k-th (0-based) extra problem grow gently: 10, 15, 20, ...
// A very fast player (20-25 extra problems in 90 s) ends in the 1000s.
export const EXTRA_STEP = 5;
export const extraPoints = (k) => EXTRA_BASE + EXTRA_STEP * k;
export const extraTotal = (n) => EXTRA_BASE * n + EXTRA_STEP * (n * (n - 1)) / 2;

// Dopa is tracked as log10 and grows one answer cell at a time. The base
// curves below are what a player with no combo gets; combos multiply each
// step (see comboMult), so a steady combo lands back near the old targets.
// Without combo the basic set ends near 10^2.3 (about 200); a full combo
// doubles every step after 20 cells and ends near 1万.
export const BASIC_DOPA_L = 2.3;
export function basicDopaL(frac) {
  const f = Math.min(1, Math.max(0, frac));
  return BASIC_DOPA_L * f ** 1.15;
}
// Extra problems follow a saturating curve on top of the basic set.
const EXTRA_SPAN = 3.0; const EXTRA_TAU = 10;
export const extraDopaL = (n) => BASIC_DOPA_L + EXTRA_SPAN * (1 - Math.exp(-n / EXTRA_TAU));
export const extraProblemGain = (k) => extraDopaL(k + 1) - extraDopaL(k);
// Hard ceiling: about 12億, whatever the combo.
export const DOPA_MAX_L = 9.08;

// ---------------------------------------------------------------- combo
// One combo per correct answer cell, carried across problems. It does not
// change the score; it only makes dopa grow faster: the multiplier rises
// evenly from x1.0 and tops out at x2.0 at 20 combo.
export const COMBO_DOPA = { max: 2, full: 20 };
export const comboMult = (combo) => 1 + (COMBO_DOPA.max - 1) * Math.min(1, Math.max(0, combo) / COMBO_DOPA.full);
export const comboMaxed = (combo) => combo >= COMBO_DOPA.full;

// Add one answer cell's worth of dopa. `base` is the no-combo step (log10).
export function addDopa(L, base, combo) {
  return Math.min(DOPA_MAX_L, L + Math.max(0.003, base) * comboMult(combo));
}

// Time allowed to enter the next answer cell before the combo breaks
// (provisional). Harder skills (higher grade) get longer; the first cell of
// a problem adds time to read it.
export const COMBO_TIME = { base: 3000, perGrade: 600, read: 2500 };
export function comboWindowMs(grade = 3, first = false) {
  const g = Math.min(6, Math.max(1, grade || 3));
  return COMBO_TIME.base + COMBO_TIME.perGrade * (g - 1) + (first ? COMBO_TIME.read : 0);
}
// Milestones worth a bigger show: 10, 20, 30, 50, 75, 100, then every 50.
export const comboMilestone = (c) => [10, 20, 30, 50, 75].includes(c) || (c >= 100 && c % 50 === 0);

const UNITS = [[68, '無量大数'], [64, '不可思議'], [60, '那由他'], [56, '阿僧祇'], [52, '恒河沙'], [48, '極'], [44, '載'], [40, '正'], [36, '澗'], [32, '溝'], [28, '穣'], [24, '秭'], [20, '垓'], [16, '京'], [12, '兆'], [8, '億'], [4, '万']];
// Milestones below 万 are celebrated but not used as display units.
const MILESTONES = [[3, '千'], [2, '百']];

// Western locales name the big numbers with words. Spanish uses the long
// scale (millón 10^6, billón 10^12; "mil millones" stands in for 10^9, as in
// everyday use); English uses the short scale.
const WESTERN = {
  es: {
    units: [[12, 'billón'], [9, 'mil millones'], [6, 'millón'], [3, 'mil']],
    milestones: [[2, 'cien']],
    plural: { 'millón': 'millones', 'billón': 'billones' },
    labels: { '∞': '∞', cien: '100', mil: '1.000', 'millón': '1 millón', 'mil millones': 'mil millones', 'billón': '1 billón' },
    small: 'cien',
  },
  en: {
    units: [[12, 'trillion'], [9, 'billion'], [6, 'million'], [3, 'thousand']],
    milestones: [[2, 'hundred']],
    plural: {},
    labels: { '∞': '∞', hundred: '100', thousand: '1,000', million: '1 million', billion: '1 billion', trillion: '1 trillion' },
    small: 'hundred',
  },
};
const western = () => WESTERN[getLocale()];
// Compact unit names for the narrow HUD box ("5.3K", "2 M"); the result and
// final screens keep the spelled-out names.
const SHORT = {
  es: { 'millón': ' M', 'millones': ' M', 'mil millones': ' mil M', 'billón': ' B', 'billones': ' B' },
  en: { thousand: 'K', million: 'M', billion: 'B', trillion: 'T' },
};

export function fmtDopa(L, short = false) {
  if (!Number.isFinite(L) || L >= 72) return '∞';
  const w = western();
  if (w) {
    if (L < 3) return nf(Math.round(10 ** L));
    const u = w.units.find(([e]) => L >= e - 1e-9) || w.units[w.units.length - 1];
    const m = 10 ** (L - u[0]);
    const num = m < 10
      ? Number(m.toFixed(1)).toLocaleString(localeTag(), { maximumFractionDigits: 1 })
      : nf(Math.floor(m));
    const name = m >= 2 ? (w.plural[u[1]] || u[1]) : u[1];
    const sh = short ? SHORT[getLocale()]?.[name] : undefined;
    return sh !== undefined ? `${num}${sh}` : `${num} ${name}`;
  }
  if (L < 4) return nf(Math.round(10 ** L));
  const u = UNITS.find(([e]) => L >= e - 1e-9);
  const m = 10 ** (L - u[0]);
  return (m < 10 ? m.toFixed(1) : String(Math.floor(m))) + u[1];
}

export function unitOf(L) {
  if (L >= 72) return '∞';
  const w = western();
  if (w) {
    const u = w.units.find(([e]) => L >= e - 1e-9) || w.milestones.find(([e]) => L >= e - 1e-9);
    return u ? u[1] : '';
  }
  // Between 万 and 億, each extra digit is its own milestone (10万, 100万, 1000万).
  if (L >= 4 && L < 8) return ['万', '十万', '百万', '千万'][Math.floor(L + 1e-9) - 4];
  const u = UNITS.find(([e]) => L >= e - 1e-9) || MILESTONES.find(([e]) => L >= e - 1e-9);
  return u ? u[1] : '';
}

const LABELS = { '∞': '∞', 百: '100', 千: '1000', 十万: '10万', 百万: '100万', 千万: '1000万' };
export const unitLabel = (u) => { const w = western(); return w ? (w.labels[u] || `1 ${u}`) : (LABELS[u] || `1${u}`); };

// The smallest unit is shown as a plain number, without the big slam.
export const isSmallUnit = (u) => { const w = western(); return w ? u === w.small : u === '百'; };
