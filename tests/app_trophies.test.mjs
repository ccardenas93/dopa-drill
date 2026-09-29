// Trophies (id036).
import test from 'node:test';
import assert from 'node:assert/strict';
import { TROPHIES, TROPHY, SERIES, CATS, trophyMetrics, evaluate, seriesView, earnedCount } from '../app/js/trophies.js';
import { emptyProgress, masterWithAncestors } from '../app/js/session.js';
import { emptyStats } from '../app/js/growth.js';
import { SKILLS } from '../app/js/skills.js';

test('the catalogue: more than 100 trophies, unique ids, rising steps, known categories', () => {
  assert.ok(TROPHIES.length >= 100, `${TROPHIES.length}`);
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
  for (const s of SERIES) {
    assert.ok(CATS.includes(s.cat), s.cat);
    const byMetric = {};
    for (const t of s.items) { if (byMetric[t.metric] != null) assert.ok(t.need > byMetric[t.metric], t.id); byMetric[t.metric] = t.need; }
    assert.ok(s.items.every((t) => t.name && t.desc && t.rank), s.key);
  }
  // Streak and day series are denser than raw volume ones.
  const steps = (k) => SERIES.find((s) => s.key === k).items.length;
  assert.ok(steps('days') >= steps('plays'));
});

test('labels agree in number and series come in reach order', async () => {
  const { setLocale } = await import('../app/js/i18n.js');
  const byId = (id) => TROPHY[id];
  setLocale('es', { persist: false, notify: false });
  try {
    assert.equal(byId('days-1').name, '1 día jugado');
    assert.equal(byId('days-3').name, '3 días jugados');
    assert.equal(byId('plays-1').desc, 'Termina 1 ronda completa');
    assert.equal(byId('mastered-1').desc, 'Domina 1 habilidad');
    assert.equal(byId('minutes-60').name, '1 hora en total');
    assert.equal(byId('minutes-120').name, '2 horas en total');
    assert.equal(byId('grade1-1').name, '1 partida en 1º');
    assert.equal(byId('extras-1').desc, 'Llega al Extra 1 vez');
    setLocale('en', { persist: false, notify: false });
    assert.equal(byId('days-1').name, '1 day played');
    assert.equal(byId('capsules-1').desc, 'Open 1 time capsule');
    assert.equal(byId('capsules-3').desc, 'Open 3 time capsules');
  } finally {
    setLocale('es', { persist: false, notify: false });
  }
  // Inside a category the first series is the one a new player reaches first.
  const keysIn = (cat) => SERIES.filter((s) => s.cat === cat).map((s) => s.key);
  assert.equal(keysIn('つづける')[0], 'days');
  assert.equal(keysIn('たくさん')[0], 'plays');
  assert.deepEqual(keysIn('スキル').slice(0, 3), ['unlocked', 'starsTotal', 'mastered']);
  assert.deepEqual(keysIn('がくねん'), ['grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6']);
  // Ranks rise along every series: bronze before silver before gold, rainbow last.
  const order = { bronze: 0, silver: 1, gold: 2, rainbow: 3 };
  for (const s of SERIES.filter((x) => x.cat !== 'ひみつ')) {
    const ranks = s.items.map((t) => order[t.rank]);
    for (let i = 1; i < ranks.length; i++) assert.ok(ranks[i] >= ranks[i - 1], `${s.key} rank order`);
    if (ranks.length > 1) assert.equal(ranks[ranks.length - 1], 3, `${s.key} ends in rainbow`);
  }
});

test('earning: conditions met, kept forever, first run is a quiet batch', () => {
  const stats = emptyStats();
  Object.assign(stats, { problems: 120, plays: 6, days: 4, maxCombo: 12, bestDopaL: 4.3, playMs: 40 * 60000, flags: { sunday: true } });
  const prog = emptyProgress();
  masterWithAncestors(prog, 'g1-add-c');
  const m = trophyMetrics({ stats, prog, bestStreak: 3, stickers: 4 });
  const st = {};
  assert.deepEqual(evaluate(st, m, 1), []); // first call: batch, no pop-ups
  assert.ok(st.batch.includes('problems-100') && st.batch.includes('streak-3') && st.batch.includes('dopa-4') && st.batch.includes('secret-sunday'));
  assert.ok(!st.got['problems-200'] && !st.got['dopa-5']);
  assert.ok(st.got['mastered-3'] && st.got['unlocked-5']);
  stats.problems = 205;
  assert.deepEqual(evaluate(st, trophyMetrics({ stats, prog, bestStreak: 1 }), 2).map((t) => t.id), ['problems-200']);
  assert.ok(st.got['streak-3']); // kept after the streak broke
  const v = seriesView(SERIES.find((s) => s.key === 'problems'), st, trophyMetrics({ stats, prog }));
  assert.equal(v.top.id, 'problems-200');
  assert.equal(v.next.id, 'problems-300');
  assert.equal(v.value, 205);
  assert.equal(earnedCount(st), Object.keys(st.got).length);
});

test('grade and lane completion, all modes', () => {
  const prog = emptyProgress();
  for (const s of SKILLS.filter((x) => x.grade === 1)) masterWithAncestors(prog, s.id);
  const stats = emptyStats();
  stats.modes = { level: 1, grade: 2, practice: 1, review: 1 };
  const m = trophyMetrics({ stats, prog });
  assert.equal(m.gradeDone1, 1);
  assert.equal(m.gradeDone2, 0);
  assert.equal(m.allModes, 1);
  assert.ok(TROPHY['gradeDone-1'] && TROPHY['secret-allmodes'].secret);
});

test('expanded catalogue (id045): 300+, new series measured, rewards all resolvable', async () => {
  const { ITEMS } = await import('../app/js/unlocks.js');
  assert.ok(TROPHIES.length >= 300, `${TROPHIES.length}`);
  for (const it of ITEMS.filter((x) => !x.base)) assert.equal(TROPHY[it.trophy].reward, it.id);
  assert.ok(Math.max(...SERIES.find((s) => s.key === 'items').items.map((x) => x.need)) <= ITEMS.length);
  const prog = emptyProgress();
  for (const s of SKILLS.filter((x) => x.grade === 1)) { masterWithAncestors(prog, s.id); prog.skills[s.id].stars = 3; }
  prog.skills['g1-add-nc'].stars = 5;
  const stats = { ...emptyStats(), polished: 2, capsules: 1, capsuleFaster: 1, grew: 5 };
  const m = trophyMetrics({ stats, prog, extra: { questDays: 7, questRun: 3, hammerUsed: 1, itemsOwned: 12, catComplete: 1 } });
  assert.equal(m.starsTotal, 3 * SKILLS.filter((x) => x.grade === 1).length + 2);
  assert.equal(m.star5, 1);
  assert.equal(m.gradeStar31, 1);
  const st = { init: true };
  const got = evaluate(st, m).map((t) => t.id);
  for (const id of ['questDays-7', 'questRun-3', 'hammer-1', 'starsTotal-5', 'star5-1', 'gradeStar3-1', 'polished-1', 'capsules-1', 'capsuleFaster-1', 'grew-5', 'items-10', 'catComplete-1']) assert.ok(got.includes(id), id);
});
