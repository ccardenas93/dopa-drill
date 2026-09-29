// Trophies (id036): many small achievements, like the ones in mobile games.
// Each series is one measure with rising steps; every step is a trophy.
// Days and streaks get dense steps; volume series get wide ones so long
// sessions are not pushed too hard (docs/SPEC.md 14.7). Nothing is
// random, conditions are always shown (except a few secrets), and a trophy,
// once earned, is kept.
//
// Order matters on screen: categories follow CATS, and inside a category the
// series are listed in the order a player normally reaches them (first day,
// first round, first skill... before the long-haul goals). Trophy ids are
// `${series}-${step}` and never depend on that order, so saved data is safe.
import { SKILLS, LANES, laneLabel } from './skills.js';
import { isUnlocked, isMastered, starsOf } from './session.js';
import { t, tp, nf, getLocale } from './i18n.js';

export const CATS = ['つづける', 'たくさん', 'スキル', 'せいちょう', 'エクストラ', 'コンボ', 'せいかく', 'ドパ', 'ふくしゅう', 'がくねん', 'コレクション', 'ひみつ'];

// Categories stay as the source strings (they double as saved-data keys);
// only the label shown on screen is translated.
const CAT_KEYS = {
  'つづける': 'trophy.cat.keep', 'たくさん': 'trophy.cat.volume', 'スキル': 'trophy.cat.skill',
  'せいちょう': 'trophy.cat.growth', 'エクストラ': 'trophy.cat.extra', 'コンボ': 'trophy.cat.combo',
  'せいかく': 'trophy.cat.accuracy', 'ドパ': 'trophy.cat.dopa', 'ふくしゅう': 'trophy.cat.review',
  'がくねん': 'trophy.cat.grade', 'コレクション': 'trophy.cat.collection', 'ひみつ': 'trophy.cat.secret',
};
export const catLabel = (cat) => t(CAT_KEYS[cat] || 'trophy.cat.keep');

const fmt = (n) => nf(n);
const DOPA_LABEL = {
  ja: { 2: '100', 3: '1000', 4: '1万', 5: '10万', 6: '100万', 7: '1000万', 8: '1億', 9: '10億' },
  es: { 2: '100', 3: '1.000', 4: '10 mil', 5: '100 mil', 6: '1 millón', 7: '10 millones', 8: '100 millones', 9: '1.000 millones' },
  en: { 2: '100', 3: '1,000', 4: '10,000', 5: '100,000', 6: '1 million', 7: '10 million', 8: '100 million', 9: '1 billion' },
};
const dopaLabel = (v) => (DOPA_LABEL[getLocale()] || DOPA_LABEL.ja)[v] || String(v);
const RANKS = ['bronze', 'silver', 'gold', 'rainbow'];
export const RANK_NAME = { bronze: 'どう', silver: 'ぎん', gold: 'きん', rainbow: 'にじ', secret: 'ひみつ' };
const RANK_KEYS = { bronze: 'trophy.rank.bronze', silver: 'trophy.rank.silver', gold: 'trophy.rank.gold', rainbow: 'trophy.rank.rainbow', secret: 'trophy.rank.secret' };
export const rankLabel = (rank) => t(RANK_KEYS[rank] || RANK_KEYS.bronze);

// Rank by position in its series: first ~30% bronze, then silver, gold, and the last step rainbow.
function rankAt(i, n) {
  if (n === 1) return 'gold';
  if (i === n - 1) return 'rainbow';
  return RANKS[Math.min(2, Math.floor((i / (n - 1)) * 3.3))];
}

// Label helpers. Steps that can be 1 go through tp() so Spanish and English
// agree in number ("1 día jugado" / "3 días jugados"); the rest use t().
const one = (key, n, vars = {}) => tp(n, key, { n, ...vars });
const many = (key, n, vars = {}) => t(key, { n, ...vars });
const counted = (key, cat, titleKey, metric, steps, { big = false, plural = false, titleVars } = {}) => {
  const num = (v) => (big ? fmt(v) : v);
  const label = (k) => (v) => (plural ? one(k, v, { n: num(v) }) : many(k, v, { n: num(v) }));
  return { key, cat, titleKey, titleVars, metric, steps, name: label(`trophy.${titleKey.split('.')[1]}.name`), desc: label(`trophy.${titleKey.split('.')[1]}.desc`) };
};

// A series: { key, cat, titleKey, metric, steps, name(v), desc(v) } or explicit
// items that carry their own name()/desc() functions. Every label is produced
// while rendering, so the list follows the current language.
const SERIES_DEFS = [
  // ---- つづける / Constancia: the first day, then the habit.
  counted('days', 'つづける', 'trophy.days.title', 'days', [1, 3, 5, 7, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1000], { big: true, plural: true }),
  counted('streak', 'つづける', 'trophy.streak.title', 'bestStreak', [3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365]),
  counted('questDays', 'つづける', 'trophy.questDays.title', 'questDays', [1, 3, 7, 14, 30, 50, 100, 200, 365], { plural: true }),
  counted('questRun', 'つづける', 'trophy.questRun.title', 'questRun', [2, 3, 5, 7, 14, 30]),
  counted('stickers', 'つづける', 'trophy.stickers.title', 'stickers', [1, 7, 14, 30, 50, 100, 200, 365], { big: true, plural: true }),
  counted('crowns', 'つづける', 'trophy.crowns.title', 'crowns', [1, 3, 5, 10, 20, 52], { big: true, plural: true }),
  { key: 'hammer', cat: 'つづける', titleKey: 'trophy.hammer.title', metric: 'hammerUsed', steps: [1, 3, 10], name: (v) => (v === 1 ? t('trophy.hammer.nameFirst') : t('trophy.hammer.name', { n: v })), desc: (v) => one('trophy.hammer.desc', v) },

  // ---- たくさん / Cantidad: rounds, problems, digits, time.
  counted('plays', 'たくさん', 'trophy.plays.title', 'plays', [1, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000], { big: true, plural: true }),
  counted('problems', 'たくさん', 'trophy.problems.title', 'problems', [10, 30, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000, 30000, 50000, 100000], { big: true }),
  counted('cells', 'たくさん', 'trophy.cells.title', 'cells', [100, 500, 1000, 3000, 5000, 10000, 30000, 50000, 100000, 300000], { big: true }),
  { key: 'minutes', cat: 'たくさん', titleKey: 'trophy.minutes.title', metric: 'minutes', steps: [10, 30, 60, 120, 300, 600, 1200, 3000],
    name: (v) => (v >= 60 ? one('trophy.minutes.nameHours', v / 60) : many('trophy.minutes.nameMins', v)),
    desc: (v) => (v >= 60 ? one('trophy.minutes.descHours', v / 60) : many('trophy.minutes.descMins', v)) },

  // ---- スキル / Habilidades: unlock, collect stars, master, then whole grades and lanes.
  counted('unlocked', 'スキル', 'trophy.unlocked.title', 'unlocked', [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58]),
  counted('starsTotal', 'スキル', 'trophy.starsTotal.title', 'starsTotal', [5, 10, 25, 50, 75, 100, 150, 200, 250, 290]),
  counted('mastered', 'スキル', 'trophy.mastered.title', 'mastered', [1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58], { plural: true }),
  { key: 'star5', cat: 'スキル', titleKey: 'trophy.star5.title', metric: 'star5', steps: [1, 3, 5, 10, 20, 30, 58], name: (v) => many('trophy.star5.name', v), desc: (v) => one('trophy.star5.desc', v) },
  { key: 'gradeStar3', cat: 'スキル', titleKey: 'trophy.gradeStar3.title', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeStar3-${g}`, metric: `gradeStar3${g}`, need: 1, name: () => t('trophy.gradeStar3.name', { g }), desc: () => t('trophy.gradeStar3.desc', { g }) })) },
  { key: 'gradeDone', cat: 'スキル', titleKey: 'trophy.gradeDone.title', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeDone-${g}`, metric: `gradeDone${g}`, need: 1, name: () => t('trophy.gradeDone.name', { g }), desc: () => t('trophy.gradeDone.desc', { g }) })) },
  { key: 'laneDone', cat: 'スキル', titleKey: 'trophy.laneDone.title', items: LANES.map((l, i) => ({ id: `laneDone-${i}`, metric: `laneDone${i}`, need: 1, name: () => t('trophy.laneDone.name', { lane: laneLabel(i) }), desc: () => t('trophy.laneDone.desc', { lane: laneLabel(i) }) })) },

  // ---- せいちょう / Progreso: improvements, polishing rust, time capsules.
  counted('grew', 'せいちょう', 'trophy.grew.title', 'grew', [1, 5, 10, 30, 50, 100], { plural: true }),
  counted('polished', 'せいちょう', 'trophy.polished.title', 'polished', [1, 3, 5, 10, 30, 50], { plural: true }),
  counted('capsules', 'せいちょう', 'trophy.capsules.title', 'capsules', [1, 3, 5, 10, 30], { plural: true }),
  counted('capsuleFaster', 'せいちょう', 'trophy.capsuleFaster.title', 'capsuleFaster', [1, 5, 10], { plural: true }),

  // ---- エクストラ
  counted('extras', 'エクストラ', 'trophy.extras.title', 'extras', [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], { plural: true }),
  counted('extraBest', 'エクストラ', 'trophy.extraBest.title', 'extraBest', [3, 5, 7, 10, 12, 15, 18, 20, 23, 25, 30]),
  counted('extraSolved', 'エクストラ', 'trophy.extraSolved.title', 'extraSolved', [10, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000], { big: true }),

  // ---- コンボ
  counted('combo', 'コンボ', 'trophy.combo.title', 'maxCombo', [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300]),

  // ---- せいかく / Precisión
  { key: 'perfects', cat: 'せいかく', titleKey: 'trophy.perfects.title', metric: 'perfects', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => many('trophy.perfects.name', v), desc: (v) => one('trophy.perfects.desc', v) },
  counted('firstTry', 'せいかく', 'trophy.firstTry.title', 'firstTry', [10, 50, 100, 300, 500, 1000, 3000, 5000, 10000, 30000], { big: true }),

  // ---- ドパ
  { key: 'dopa', cat: 'ドパ', titleKey: 'trophy.dopa.title', metric: 'bestDopaL', steps: [2, 3, 4, 5, 6, 7, 8, 9], name: (v) => t('trophy.dopa.name', { u: dopaLabel(v) }), desc: (v) => t('trophy.dopa.desc', { u: dopaLabel(v) }) },

  // ---- ふくしゅう / Repaso
  { key: 'review', cat: 'ふくしゅう', titleKey: 'trophy.review.title', metric: 'reviewSolved', steps: [1, 5, 10, 30, 50, 100, 200, 300], name: (v) => many('trophy.review.name', v), desc: (v) => one('trophy.review.desc', v) },

  // ---- がくねん / Grados: one series per grade, 1st to 6th.
  ...[1, 2, 3, 4, 5, 6].map((g) => ({ key: `grade${g}`, cat: 'がくねん', titleKey: 'trophy.grade.title', titleVars: { g }, metric: `gradePlays${g}`, steps: [1, 10, 30], name: (v) => one('trophy.grade.name', v, { g }), desc: (v) => one('trophy.grade.desc', v, { g }) })),

  // ---- コレクション
  counted('items', 'コレクション', 'trophy.items.title', 'itemsOwned', [10, 20, 30, 40, 47]),
  counted('catComplete', 'コレクション', 'trophy.catComplete.title', 'catComplete', [1, 3, 5, 8], { plural: true }),

  // ---- ひみつ / Secretos
  { key: 'secret', cat: 'ひみつ', titleKey: 'trophy.secret.title', items: [
    { id: 'secret-perfect14', metric: 'flag:perfect14', need: 1, nameKey: 'trophy.secret.perfect14.name', descKey: 'trophy.secret.perfect14.desc', secret: true },
    { id: 'secret-extraClean', metric: 'flag:extraClean', need: 1, nameKey: 'trophy.secret.extraClean.name', descKey: 'trophy.secret.extraClean.desc', secret: true },
    { id: 'secret-sunday', metric: 'flag:sunday', need: 1, nameKey: 'trophy.secret.sunday.name', descKey: 'trophy.secret.sunday.desc', secret: true },
    { id: 'secret-newyear', metric: 'flag:newyear', need: 1, nameKey: 'trophy.secret.newyear.name', descKey: 'trophy.secret.newyear.desc', secret: true },
    { id: 'secret-comeback', metric: 'flag:comeback', need: 1, nameKey: 'trophy.secret.comeback.name', descKey: 'trophy.secret.comeback.desc', secret: true },
    { id: 'secret-allmodes', metric: 'allModes', need: 1, nameKey: 'trophy.secret.allmodes.name', descKey: 'trophy.secret.allmodes.desc', secret: true },
  ] },
];

// Other features may add their own series with addSeries() (id045).
export const SERIES = [];
export const TROPHIES = [];
export const TROPHY = {};
export function addSeries(def) {
  const src = def.items ? def.items : def.steps.map((v) => ({ v }));
  const items = src.map((entry, i, a) => {
    const v = entry.v;
    const it = {
      id: entry.id || `${def.key}-${v}`,
      metric: entry.metric || def.metric,
      need: entry.need !== undefined ? entry.need : v,
      rank: entry.secret ? 'secret' : rankAt(i, a.length),
      series: def.key,
      cat: def.cat,
      reward: null,
    };
    if (entry.secret) it.secret = true;
    const label = (field, entryKey, entryFn) => (entry[entryKey]
      ? () => t(entry[entryKey])
      : entry[entryFn] ? () => entry[entryFn]() : () => def[field](v));
    Object.defineProperty(it, 'name', { get: label('name', 'nameKey', 'name'), enumerable: true });
    Object.defineProperty(it, 'desc', { get: label('desc', 'descKey', 'desc'), enumerable: true });
    return it;
  });
  const series = { key: def.key, cat: def.cat, items };
  Object.defineProperty(series, 'title', { get: () => t(def.titleKey, def.titleVars), enumerable: true });
  SERIES.push(series);
  for (const it of series.items) { TROPHIES.push(it); TROPHY[it.id] = it; }
  return series;
}
SERIES_DEFS.forEach(addSeries);

// Numbers every trophy is measured against, from the saved state.
// snap: { stats, prog, bestStreak, stickers, crowns, ...extra metrics }
export function trophyMetrics(snap) {
  const s = snap.stats || {};
  const prog = snap.prog || { skills: {} };
  const m = {
    bestStreak: snap.bestStreak || 0, days: s.days || 0, stickers: snap.stickers || 0, crowns: snap.crowns || 0,
    problems: s.problems || 0, cells: s.cells || 0, plays: s.plays || 0, minutes: Math.floor((s.playMs || 0) / 60000),
    unlocked: SKILLS.filter((x) => isUnlocked(prog, x.id)).length, mastered: SKILLS.filter((x) => isMastered(prog, x.id)).length,
    extras: s.extras || 0, extraBest: s.extraBest || 0, extraSolved: s.extraSolved || 0, maxCombo: s.maxCombo || 0,
    perfects: s.perfects || 0, firstTry: s.firstTry || 0, bestDopaL: Math.floor((s.bestDopaL || 0) + 1e-9), reviewSolved: s.reviewSolved || 0,
  };
  const stars = Object.fromEntries(SKILLS.map((x) => [x.id, starsOf(prog, x.id)]));
  m.starsTotal = Object.values(stars).reduce((a, b) => a + b, 0);
  m.star5 = Object.values(stars).filter((n) => n >= 5).length;
  m.polished = s.polished || 0; m.capsules = s.capsules || 0; m.capsuleFaster = s.capsuleFaster || 0; m.grew = s.grew || 0;
  for (let g = 1; g <= 6; g++) {
    m[`gradeStar3${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => stars[x.id] >= 3) ? 1 : 0;
    m[`gradeDone${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => isMastered(prog, x.id)) ? 1 : 0;
    m[`gradePlays${g}`] = (s.grades || {})[g] || 0;
  }
  LANES.forEach((_, i) => { m[`laneDone${i}`] = SKILLS.filter((x) => x.lane === i).every((x) => isMastered(prog, x.id)) ? 1 : 0; });
  for (const [k, v] of Object.entries(s.flags || {})) if (v) m[`flag:${k}`] = 1;
  const modes = s.modes || {};
  m.allModes = ['level', 'grade', 'practice', 'review'].every((k) => modes[k]) ? 1 : 0;
  Object.assign(m, snap.extra || {});
  return m;
}
export const valueOf = (m, metric) => m[metric] || 0;

// Earn every trophy whose condition is met. Returns the new ones (in list order).
// `state` is the saved { got: { id: time } }; the first call earns what the
// existing records already reach and marks them as a batch.
export function evaluate(state, metrics, at = Date.now()) {
  state.got = state.got || {};
  const fresh = [];
  for (const t of TROPHIES) {
    if (state.got[t.id]) continue;
    if (valueOf(metrics, t.metric) >= t.need) { state.got[t.id] = at; fresh.push(t); }
  }
  if (!state.init) { state.init = true; state.batch = fresh.map((t) => t.id); return []; }
  return fresh;
}

export const earnedCount = (state) => TROPHIES.filter((t) => state.got && state.got[t.id]).length;

// Progress of one series for the list screen.
export function seriesView(series, state, metrics) {
  const got = series.items.filter((t) => state.got && state.got[t.id]);
  const next = series.items.find((t) => !(state.got && state.got[t.id]));
  const top = got[got.length - 1] || null;
  return { series, got, next, top, value: next ? valueOf(metrics, next.metric) : null };
}
