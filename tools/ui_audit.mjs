// UI layout audit: screenshots every screen of the app in es and en at two
// phone viewports and runs DOM checks (clipped text, text spilling out of its
// box, horizontal overflow, overlapping siblings, tiny fonts, small tap
// targets, line counts per locale) inside the page. Nothing under app/ is
// touched; the saved data is seeded through localStorage only.
//
//   node tools/ui_audit.mjs <outdir> [--locales es,en] [--vps 360x640,390x844]
//        [--base http://127.0.0.1:8766] [--flows title,skills,result,overlays,firstrun]
//
// Output: <outdir>/<locale>-<vp>-<screen>.png and <outdir>/findings-<locale>-<vp>.json
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'ui-audit';
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const BASE = opt('--base', 'http://127.0.0.1:8766');
const LOCALES = opt('--locales', 'es,en').split(',');
const VPS = opt('--vps', '360x640,390x844').split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { w, h, tag: s }; });
const FLOWS = new Set(opt('--flows', 'title,skills,result,overlays,firstrun').split(','));
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);

const SKILLS_TO_PLAY = ['g1-add-c', 'g2-vsub2-b', 'g3-vmul-2x2', 'g3-div-rem', 'g4-dec-add2', 'g5-frac-diff', 'g5-percent', 'g6-letter'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const daysAgo = (n, h = 17) => { const d = new Date(); d.setHours(h, 5 + n, 0, 0); d.setDate(d.getDate() - n); return d; };

// ---------------------------------------------------------------- seeded saved data
const skillRec = (extra = {}) => ({ n: 12, hist: [1, 1, 1, 1, 1, 1], mastered: true, masteredAt: daysAgo(10).getTime(), grantedAt: daysAgo(10).getTime(), lastOk: daysAgo(2).getTime(), stars: 1, recent: [], starDay: { 1: dayKey(daysAgo(10)) }, ...extra });
const times = (n, ms, c, ok = true, d = dayKey(daysAgo(2))) => Array.from({ length: n }, () => ({ t: ms, c, f: ok ? 1 : 0, m: ok ? 0 : 1, d }));
const record = (n, mode, extra = {}) => { const at = daysAgo(n, 15 + (extra.h || 0)); delete extra.h; return { id: `${at.getTime().toString(36)}x`, day: dayKey(at), at: at.getTime(), mode, count: 10, score: 100, ok: 10, ng: 1, firstRate: 0.9, timeMs: 150000, dopaL: 3.2, ...extra }; };

function richState() {
  const g1 = ['g1-compose10', 'g1-add-nc', 'g1-sub-nb', 'g1-add-c', 'g1-sub-b', 'g1-add3', 'g1-add-2d1', 'g1-sub-2d1'];
  const skills = {};
  for (const id of g1) skills[id] = skillRec();
  for (const id of ['g2-vadd2-nc', 'g2-vsub2-nb', 'g2-kuku25', 'g2-kuku34']) skills[id] = skillRec();
  skills['g1-add-nc'] = skillRec({ stars: 3, times: times(20, 2500, 1), starDay: { 1: dayKey(daysAgo(10)), 2: dayKey(daysAgo(6)), 3: dayKey(daysAgo(2)) } });
  skills['g1-add-c'] = skillRec({ stars: 2, times: times(14, 4000, 1) });
  skills['g2-vadd2-nc'] = skillRec({ stars: 1, times: [...times(8, 9000, 2), ...times(2, 9000, 2, false)] });
  // Rusty: mastered long ago and not touched since (session.js RUST.days = 21).
  skills['g1-compose10'] = skillRec({ lastOk: daysAgo(30).getTime(), masteredAt: daysAgo(35).getTime(), grantedAt: daysAgo(35).getTime() });
  skills['g2-vadd2-c'] = { n: 3, hist: [1, 0, 1], mastered: false, recent: [], lesson: daysAgo(3).getTime() };
  skills['g2-kuku67'] = { n: 1, hist: [1], mastered: false, recent: [], lesson: daysAgo(1).getTime() };
  const history = [
    record(0, 'level', { extraOk: 7, extraNg: 1, extraScore: 70, score: 170 }), record(0, 'practice', { skill: 'g2-kuku25', count: 6, ok: 6, h: 2 }),
    record(0, 'review', { count: 4, ok: 4, ng: 0, firstRate: 1, h: 3 }),
    record(1, 'grade', { grade: 2 }), record(2, 'level'), record(3, 'level', { extraOk: 4 }), record(5, 'grade', { grade: 1 }),
    record(6, 'level'), record(8, 'level'), record(12, 'grade', { grade: 1 }), record(13, 'level'),
  ];
  const t = daysAgo(3).getTime();
  const got = Object.fromEntries(['days-1', 'days-3', 'days-5', 'plays-1', 'plays-3', 'plays-5', 'plays-10', 'problems-10', 'problems-30', 'problems-50', 'problems-100', 'streak-3',
    'unlocked-3', 'unlocked-5', 'unlocked-10', 'mastered-1', 'mastered-3', 'mastered-5', 'mastered-10', 'combo-5', 'combo-10', 'firstTry-10', 'firstTry-50', 'extras-1', 'extras-3',
    'stickers-1', 'grade1-1', 'grade2-1', 'cells-100', 'minutes-10', 'minutes-30', 'dopa-2', 'dopa-3', 'perfects-1', 'gradeDone-1', 'starsTotal-5', 'starsTotal-10', 'hammer-1'].map((id) => [id, t]));
  return {
    version: 1, guideSeen: true, settings: { count: 10, sound: true, volume: 0.8, motion: null }, history,
    progress: { placed: true, skills, review: [{ skill: 'g2-vadd2-c', sig: 'x' }, { skill: 'g2-kuku67', sig: 'y' }] },
    stats: { problems: 132, cells: 410, firstTry: 96, misses: 22, plays: 12, modes: { level: 7, grade: 3, practice: 1, review: 1 }, perfects: 2, playMs: 42 * 60000, bestDopaL: 3.6, extras: 5, extraSolved: 31, extraBest: 8, maxCombo: 14, reviewSolved: 4, days: 9, lastDay: dayKey(daysAgo(0)), grades: { 1: 2, 2: 1 }, flags: {}, grew: 2, polished: 1 },
    trophies: { init: true, got, batch: [] },
    items: { hammer: 2, got: 3, used: 1, asked: null, log: [] },
    nocount: { [dayKey(daysAgo(4))]: true },
    bonus: { last: dayKey(daysAgo(0)), run: 3, stickers: { [dayKey(daysAgo(0))]: 'flower', [dayKey(daysAgo(1))]: 'heart', [dayKey(daysAgo(2))]: 'star' }, total: 3 },
    quests: { day: dayKey(daysAgo(0)), list: [{ id: 'play1', goal: 1, prog: 1, done: true }, { id: 'learn10', goal: 10, prog: 4, done: false }, { id: 'polish', goal: 3, prog: 1, done: false, skill: 'g1-compose10' }], rewarded: false, doneDays: { [dayKey(daysAgo(1))]: true } },
  };
}

// Two days played before a gap of one day, one hammer in hand: the title offers the hammer, then the login bonus, then the trophy batch.
function hammerState() {
  const st = richState();
  st.history = [record(2, 'level'), record(3, 'grade', { grade: 1 }), record(4, 'level'), record(9, 'level')];
  st.items = { hammer: 1, got: 1, used: 0, asked: null, log: [] };
  delete st.nocount; delete st.trophies;
  st.bonus = { last: dayKey(daysAgo(2)), run: 2, stickers: { [dayKey(daysAgo(2))]: 'heart', [dayKey(daysAgo(3))]: 'star' }, total: 2 };
  delete st.quests;
  st.stats.lastDay = dayKey(daysAgo(2));
  return st;
}

// Growth records for three grade-1 skills so the result screen can show "Mejoraste".
function resultState() {
  const st = richState();
  st.history = [record(1, 'level'), record(2, 'level'), record(25, 'grade', { grade: 1 }), record(40, 'level')];
  st.progress = { placed: true, review: [], skills: {
    'g1-add-nc': skillRec({ days: [{ d: dayKey(daysAgo(1)), n: 6, ms: 60000, f: 3, c: 6 }] }),
    'g1-add-c': skillRec({ days: [{ d: dayKey(daysAgo(25)), n: 5, ms: 5000, f: 2, c: 5 }] }),
    'g1-sub-b': skillRec({ days: [{ d: dayKey(daysAgo(40)), n: 5, ms: 150000, f: 2, c: 5 }, { d: dayKey(daysAgo(2)), n: 5, ms: 50000, f: 5, c: 5 }] }),
  } };
  delete st.quests;
  return st;
}

// ---------------------------------------------------------------- in-page DOM audit
const DECOR = '#paper, #rays-fallback, #bg, #fx-back, #fx, #actors, #cutins, #flash, .bunting, .ribbon-bg, .logo-burst, .logo-bits, .marquee, .cutin-band, .spot, .guide-shade, #guide-actor, .ground, .capsule-intro, .title-stage, .tree-links, .stamp, .hammer-fx, .finale-rocket, .finale-banner, .unit-slam, .big-stamp';
const GROUPS = ['.hud', '.hud2', '.tally', '.mode-row', '.grades', '.modes', '.quest-list', '.quest-list > li', '.quest-head', '.tr-filter', '.co-tabs', '.confirm-actions', '.guide-actions', '.actions', '.stats', '.cal-badges', '.card-top', '.lang-pick', '.pick', '.set-inline', '.tree-head', '.day-list > li', '.tr-series > summary', '.gb-row', '.gb-line', '#tree', '.bonus-card-grid', '.tg-list', '.tg-list > li', '.co-grid', '.tr-soon', '.cal-head', '.dopa', '.combo', '.si-card', '.hammer-card', '.modal-card', '.result-card', '.skill-news', '.quest-mini .quest-list > li', '.co-item', '.tr-series li', '.cal-grid', '.cal-week', '.tree-lanes', '.level-btn', '#screen-title'];
const PAIRS = [['#combo-box.on', '#card'], ['#combo-box.on', '.dopa'], ['.reach-tag', '.pad'], ['#toast', '#guide-card'], ['.node .stars', '.node'], ['.node .rust', '.node'], ['.co-now', '.co-mark'], ['.settings-btn', '.logo'], ['.help-btn', '.logo'], ['#guide-skip', '#guide-card'], ['#guide-recommend', '#guide-card'], ['#guide-skip', '.settings-btn'], ['.quest-pop', '.quest-card'], ['.clock', '.pips'], ['.demo-tag', '.clock']];

function auditPage(cfg) {
  const vw = innerWidth;
  const out = { vw, vh: innerHeight, clipped: [], textOut: [], offscreen: [], overlaps: [], smallFont: [], smallButtons: [], lines: [] };
  const isVis = (el) => { try { return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }); } catch { return el.offsetParent !== null; } };
  const SKIP_CLS = /^(is-active|on|active|has|press|just|holding|pop|stamped|now|hot|hurry|over|extra|ok|bad|pending|hint-glow|done|go|today|played|blank|got|open|current|complete|new|learning|mastered|locked|rusty|many)$/;
  const path = (el) => {
    const parts = []; let e = el; let depth = 0;
    while (e && e !== document.body && depth < 5) {
      if (e.id) { parts.unshift('#' + e.id); break; }
      let s = e.tagName.toLowerCase();
      const cls = [...e.classList].filter((c) => !SKIP_CLS.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      const p = e.parentElement;
      if (p) { const same = [...p.children].filter((x) => x.tagName === e.tagName); if (same.length > 1) s += `:nth-of-type(${same.indexOf(e) + 1})`; }
      parts.unshift(s); e = p; depth += 1;
    }
    return parts.join(' > ');
  };
  const text = (el) => (el.innerText != null ? el.innerText : el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  const scroller = (el, axis) => { for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); const o = axis === 'x' ? cs.overflowX : cs.overflowY; if (o === 'auto' || o === 'scroll') return e; } return null; };
  const blockOf = (el) => { let e = el; while (e && e !== document.body) { const d = getComputedStyle(e).display; if (d !== 'inline' && d !== 'contents') return e; e = e.parentElement; } return document.body; };
  const decor = (el) => cfg.decor && (el.matches(cfg.decor) || el.closest(cfg.decor));
  const els = [...document.querySelectorAll('body *')].filter((el) => !(el.namespaceURI === 'http://www.w3.org/2000/svg' && el.tagName !== 'svg'));
  for (const el of els) {
    if (!isVis(el) || decor(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const t = text(el);
    const sel = path(el);
    const hx = cs.overflowX === 'hidden' || cs.overflowX === 'clip', hy = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    const cx = hx && el.scrollWidth > el.clientWidth + 1, cy = hy && el.scrollHeight > el.clientHeight + 1;
    if ((cx || cy) && t) out.clipped.push({ sel, text: t, axis: cx && cy ? 'xy' : cx ? 'x' : 'y', sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight });
    if ((r.left < -1 || r.right > vw + 1) && !scroller(el, 'x') && (t || el.matches('button,input,a'))) out.offscreen.push({ sel, text: t, left: +r.left.toFixed(1), right: +r.right.toFixed(1) });
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (own.length) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 12) out.smallFont.push({ sel, text: t, fs });
      const range = document.createRange(); range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((q) => q.width > 0.5 && q.height > 0.5);
      const tops = []; for (const q of rects) if (!tops.some((y) => Math.abs(y - q.top) < q.height * 0.6)) tops.push(q.top);
      out.lines.push({ sel, text: t, lines: tops.length, w: +r.width.toFixed(0), fs });
      // Text wider than the block that holds it (nowrap text, long words): glyph rects vs the block's box, horizontally only.
      const blk = blockOf(el); const br = blk.getBoundingClientRect();
      const wide = rects.filter((q) => q.left < br.left - 1.5 || q.right > br.right + 1.5);
      if (wide.length) { const q = wide[0]; out.textOut.push({ kind: 'text', sel, text: t, block: path(blk), by: { l: +(br.left - q.left).toFixed(1), r: +(q.right - br.right).toFixed(1), t: 0, b: 0 }, blockH: +br.height.toFixed(1) }); }
    }
    // Element box outside an ancestor box (fixed-height buttons/nodes with too many lines, etc.).
    if (t && !['absolute', 'fixed'].includes(cs.position)) {
      let anc = el.parentElement; let level = 0;
      while (anc && anc !== document.body && level < 4) {
        const acs = getComputedStyle(anc);
        if (anc.matches('#app, .screen, .modal, #guide, .sheet-wrap, .sheet')) break;
        const ar = anc.getBoundingClientRect();
        const l = ar.left - r.left, rr = r.right - ar.right, tt = ar.top - r.top, b = r.bottom - ar.bottom;
        const sx = acs.overflowX === 'auto' || acs.overflowX === 'scroll', sy = acs.overflowY === 'auto' || acs.overflowY === 'scroll';
        if (((l > 2 || rr > 2) && !sx) || ((tt > 2 || b > 2) && !sy)) { out.textOut.push({ kind: 'box', sel, text: t, block: path(anc), by: { l: +l.toFixed(1), r: +rr.toFixed(1), t: +tt.toFixed(1), b: +b.toFixed(1) }, blockH: +ar.height.toFixed(1) }); break; }
        if (['absolute', 'fixed'].includes(acs.position)) break;
        anc = anc.parentElement; level += 1;
      }
    }
    if (el.matches('button, [role="button"], a.sub-btn, summary') && (r.width < 44 || r.height < 40)) out.smallButtons.push({ sel, text: t, w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
  }
  const seen = new Set();
  const inter = (a, b) => [Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)];
  const note = (group, x, y) => {
    const key = path(x) + '|' + path(y); if (seen.has(key)) return;
    const [ox, oy] = inter(x.getBoundingClientRect(), y.getBoundingClientRect());
    if (ox > 4 && oy > 4) { seen.add(key); out.overlaps.push({ group, a: path(x), at: text(x), b: path(y), bt: text(y), ox: +ox.toFixed(1), oy: +oy.toFixed(1) }); }
  };
  for (const g of cfg.groups) for (const parent of document.querySelectorAll(g)) {
    if (!isVis(parent)) continue;
    const kids = [...parent.children].filter((k) => isVis(k) && !decor(k) && !k.matches('svg, i.hold, .ring, .qbar, .combo-track, .marquee, .stars, .rust, .stamp, .reach-tag, .combo, .tree-links, .hold, .qchk, .cal-badges'));
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) note(g, kids[i], kids[j]);
  }
  for (const [sa, sb] of cfg.pairs) for (const a of document.querySelectorAll(sa)) for (const b of document.querySelectorAll(sb)) {
    if (a === b || a.contains(b) || b.contains(a) || !isVis(a) || !isVis(b)) continue;
    note(`${sa} × ${sb}`, a, b);
  }
  return out;
}

// Which characters of the Spanish/English texts are missing from the bundled fonts (they would fall back to a system font).
function glyphProbe() {
  const chars = 'áéíóúüñÁÉÍÓÚÜÑ¿¡«»ºª·–—‘’“”→☆★♪⌫‹›×÷−=+%?!/.,:;()0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const fonts = [['"Dela Gothic One"', 400], ['"Zen Maru Gothic"', 700], ['"Zen Maru Gothic"', 900]];
  const cv = document.createElement('canvas').getContext('2d');
  const missing = {};
  for (const [fam, w] of fonts) {
    const miss = [];
    for (const ch of chars) {
      cv.font = `${w} 40px ${fam}, serif`; const a = cv.measureText(ch).width;
      cv.font = `${w} 40px ${fam}, monospace`; const b = cv.measureText(ch).width;
      if (Math.abs(a - b) > 0.01) miss.push(ch);
    }
    missing[`${fam} ${w}`] = miss.join('');
  }
  return { status: document.fonts.status, loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`), missing };
}

// Every skill name in the current language, tried in the two fixed-width places that show it: the "Siguiente: «...»" line of the big button and the tree nodes.
async function skillNameProbe() {
  const { SKILLS } = await import('./js/skills.js');
  const { t } = await import('./js/i18n.js');
  const small = document.querySelector('#level-sub'); const btn = document.querySelector('#start');
  const keep = small.textContent; const res = [];
  for (const s of SKILLS) {
    small.textContent = t('title.nextSkill', { name: s.name });
    const sr = small.getBoundingClientRect(); const br = btn.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(small);
    const lines = new Set([...range.getClientRects()].filter((q) => q.width > 0.5).map((q) => Math.round(q.top)));
    res.push({ id: s.id, name: s.name, label: small.textContent, lines: lines.size, btnW: +br.width.toFixed(0), spillY: +(sr.bottom - br.bottom).toFixed(1), overVw: +(br.right - innerWidth).toFixed(1) });
  }
  small.textContent = keep;
  return res;
}

// ---------------------------------------------------------------- driver
async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const vp of VPS) for (const locale of LOCALES) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 2 });
      const ctx = { page, vp, locale, results: [], errors, probes: {} };
      const flows = [['title', titleFlow], ['skills', skillsFlow], ['result', resultFlow], ['overlays', overlaysFlow], ['firstrun', firstRunFlow]];
      for (const [name, fn] of flows) {
        if (!FLOWS.has(name)) continue;
        try { await fn(ctx); } catch (e) { console.error(`[${locale} ${vp.tag}] ${name} flow failed:`, e.message); ctx.results.push({ screen: `${name}-FAILED`, error: e.message }); }
      }
      // A partial run (--flows) keeps the captures of the flows it did not repeat.
      const file = join(OUT, `findings-${locale}-${vp.tag}.json`);
      let prev = null;
      try { prev = JSON.parse(await readFile(file, 'utf8')); } catch { /* first run */ }
      const kept = prev ? prev.results.filter((r) => !ctx.results.some((x) => x.screen === r.screen) && !r.screen.endsWith('-FAILED')) : [];
      await writeFile(file, JSON.stringify({ locale, vp: vp.tag, errors: [...(prev ? prev.errors : []), ...errors], probes: { ...(prev ? prev.probes : {}), ...ctx.probes }, results: [...kept, ...ctx.results] }, null, 1));
      await page.close();
      console.log(`done ${locale} ${vp.tag}: ${ctx.results.length} captures, ${errors.length} page errors`);
    }
  } finally { await browser.close(); }
}

const q = (params) => `${BASE}/app/?${params}`;
async function seed(ctx, state) {
  // Same origin, tiny document: set the saved data before the app boots.
  await ctx.page.goto(`${BASE}/app/fonts/OFL-DelaGothicOne.txt`, { waitUntil: 'domcontentloaded' });
  await ctx.page.evaluate((st, lang) => { localStorage.clear(); if (st) localStorage.setItem('capifiesta:v1', JSON.stringify(st)); localStorage.setItem('capifiesta:lang', lang); }, state, ctx.locale);
}
async function open(ctx, params, settle = 1000) {
  await ctx.page.goto(q(`lang=${ctx.locale}&${params}`), { waitUntil: 'networkidle0' });
  await ctx.page.evaluate(() => document.fonts.ready);
  await sleep(settle);
}
const vis = (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && e.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }); };
async function waitVis(ctx, sel, timeout = 8000) { await ctx.page.waitForFunction(vis, { timeout }, sel); }
async function click(ctx, sel, settle = 500) {
  await ctx.page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('no element ' + s); e.click(); }, sel);
  await sleep(settle);
}
async function shot(ctx, screen, extra = {}) {
  const file = join(OUT, `${ctx.locale}-${ctx.vp.tag}-${screen}.png`);
  await ctx.page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: ctx.vp.w, height: ctx.vp.h } });
  const audit = await ctx.page.evaluate(auditPage, { decor: DECOR, groups: GROUPS, pairs: PAIRS });
  ctx.results.push({ screen, file, ...extra, audit });
  process.stdout.write(`  ${ctx.locale} ${ctx.vp.tag} ${screen}: clip ${audit.clipped.length} spill ${audit.textOut.length} off ${audit.offscreen.length} ovl ${audit.overlaps.length} small ${audit.smallButtons.length}\n`);
  return audit;
}
async function dismiss(ctx) {
  for (let i = 0; i < 6; i++) {
    const c = await ctx.page.evaluate(() => { const v = (s) => { const e = document.querySelector(s); return e && !e.hidden && e.checkVisibility() ? e : null; }; const x = v('#guide-skip') || v('#bonus-ok') || v('#tg-ok') || v('#hammer-no'); if (x) { x.click(); return true; } return false; });
    if (!c) break;
    await sleep(700);
  }
}
async function scrollEl(ctx, sel, to) {
  await ctx.page.evaluate((s, y) => { const e = document.querySelector(s); e.scrollTop = y === 'end' ? e.scrollHeight : y; }, sel, to);
  await sleep(500);
}

// The play state as the answering loop needs it.
const readPlay = (page) => page.evaluate(() => {
  const S = window.__dopa.S; const p = S.problem; const st = p && p.steps && p.steps[S.step]; const card = document.querySelector('#card');
  return { screen: S.screen, ready: !!S.ready, lesson: !!S.lesson, qi: S.qi, N: S.N, mode: S.mode, step: S.step, nSteps: p ? p.steps.length : 0, digit: st ? String(st.digit) : null, solved: S.solved, misses: S.misses, extraSolved: S.extra ? S.extra.solved : 0, cardLesson: card.classList.contains('lesson'), cardGuided: card.classList.contains('guided') };
});
// Answers n problems by typing the expected digits; wrongOn(state) asks for `wrongTimes` slips first on that step.
async function answer(ctx, { n = 3, wrongOn = () => false, wrongTimes = 1, onLastStep = null, onProblem = null, timeout = 120000 } = {}) {
  let done = 0; let last = null; const wrong = new Map(); const t0 = Date.now();
  while (done < n && Date.now() - t0 < timeout) {
    const s = await readPlay(ctx.page);
    if (process.env.AUDIT_DEBUG) console.log('   ', JSON.stringify(s));
    if (s.screen !== 'play') return { done, s };
    if (s.lesson || s.cardLesson) { await ctx.page.keyboard.press('5'); await sleep(200); continue; }
    if (!s.ready || s.digit == null) { await sleep(90); continue; }
    const key = `${s.mode}:${s.mode === 'extra' ? s.extraSolved : s.qi}`;
    if (key !== last) { if (last !== null) done += 1; last = key; if (onProblem) await onProblem(s, done); if (done >= n) break; }
    if (!/^[0-9]$/.test(s.digit)) { console.warn('non-digit step', s.digit); return { done, s }; }
    const want = wrongOn(s) ? wrongTimes : 0; const wk = `${key}:${s.step}`; const wd = wrong.get(wk) || 0;
    if (wd < want) { await ctx.page.keyboard.press(String((Number(s.digit) + 3) % 10)); wrong.set(wk, wd + 1); await sleep(1250); continue; }
    if (onLastStep && s.mode !== 'extra' && s.qi === s.N - 1 && s.step === s.nSteps - 1) { await onLastStep(s); onLastStep = null; }
    await ctx.page.keyboard.press(s.digit);
    await sleep(170);
  }
  return { done, s: await readPlay(ctx.page) };
}

// `times` wrong digits on the current step, then stop (the 3rd slip brings the hint text under the card).
// After the third one the app shows the hint for ~1.2 s, then reveals and types the digit itself (main.js revealDigit).
async function slips(ctx, times = 3, lastWait = 450) {
  for (let i = 0; i < times;) {
    const s = await readPlay(ctx.page);
    if (s.screen !== 'play') return;
    if (!s.ready || !/^[0-9]$/.test(s.digit || '')) { await sleep(150); continue; }
    await ctx.page.keyboard.press(String((Number(s.digit) + 3) % 10));
    i += 1;
    await sleep(i < times ? 1400 : lastWait);
  }
}

// ---------------------------------------------------------------- flows
async function titleFlow(ctx) {
  await seed(ctx, richState());
  await open(ctx, 'capture&seed=7', 1400);
  ctx.probes.glyphs = await ctx.page.evaluate(glyphProbe);
  ctx.probes.skillNames = await ctx.page.evaluate(skillNameProbe);
  await shot(ctx, 'title-top');
  await scrollEl(ctx, '#screen-title', 'end');
  await shot(ctx, 'title-bottom');
  await scrollEl(ctx, '#screen-title', 0);
  // Synthetic: the longest "Siguiente: «skill»" label of this language in the big button (any skill can be the next one).
  const longest = ctx.probes.skillNames.reduce((a, b) => (b.label.length > a.label.length ? b : a));
  await ctx.page.evaluate((s) => { document.querySelector('#level-sub').textContent = s; }, longest.label);
  await sleep(200);
  await shot(ctx, 'title-longnext', { label: longest.label });
  await ctx.page.evaluate(() => { const el = document.querySelector('#level-sub'); el.textContent = el.dataset.keep || el.textContent; });
  await open(ctx, 'capture&seed=7', 1200);
  // settings, privacy, reset confirms
  await click(ctx, '#open-settings', 600);
  await shot(ctx, 'settings');
  await scrollEl(ctx, '#settings .modal-card', 'end');
  await shot(ctx, 'settings-bottom');
  await click(ctx, '#open-privacy', 600);
  await shot(ctx, 'privacy');
  await click(ctx, '#privacy-close', 400);
  await click(ctx, '#reset-data', 500);
  await shot(ctx, 'confirm-reset-1');
  await click(ctx, '#confirm-yes', 500);
  await shot(ctx, 'confirm-reset-2');
  await click(ctx, '#confirm-no', 400);
  await scrollEl(ctx, '#settings .modal-card', 0);
  await click(ctx, '#close-settings', 400);
  // how-to guide (all pages)
  await click(ctx, '#open-guide', 900);
  for (let i = 1; i <= 8; i++) {
    await shot(ctx, `howto-p${i}`);
    const last = await ctx.page.evaluate(() => document.querySelector('#guide-dots .current') === document.querySelector('#guide-dots i:last-child'));
    await click(ctx, '#guide-next', 800);
    if (last) break;
  }
  await sleep(600);
  await dismiss(ctx);
  // calendar day log
  await scrollEl(ctx, '#screen-title', 'end');
  await click(ctx, '.cal-day.played', 600);
  await shot(ctx, 'daylog');
  await click(ctx, '#close-day', 300);
  await scrollEl(ctx, '#screen-title', 0);
  // skill tree
  await click(ctx, '#open-tree', 1000);
  await waitVis(ctx, '#screen-tree');
  await scrollEl(ctx, '#tree-scroll', 0);
  await shot(ctx, 'tree-top');
  const treeH = await ctx.page.evaluate(() => { const e = document.querySelector('#tree-scroll'); return [e.scrollHeight, e.clientHeight]; });
  for (let y = treeH[1], k = 1; y < treeH[0] - 10; y += treeH[1], k++) { await scrollEl(ctx, '#tree-scroll', y); await shot(ctx, `tree-${k}`); }
  await scrollEl(ctx, '#tree-scroll', 'end');
  await shot(ctx, 'tree-bottom');
  // locked node -> toast (scroll it into view first so the toast sits over real content)
  await ctx.page.evaluate(() => { const n = [...document.querySelectorAll('.node.locked')].find((x) => x.querySelector('span:last-of-type').textContent.length > 12) || document.querySelector('.node.locked'); n.scrollIntoView({ block: 'center' }); n.click(); });
  await sleep(350);
  await shot(ctx, 'tree-toast');
  await sleep(2200);
  // mastered node -> skill info (the one with 3 stars has a "next star" text)
  await ctx.page.evaluate(() => { const n = document.querySelector('.node[data-id="g1-add-nc"]') || document.querySelector('.node.mastered'); n.scrollIntoView({ block: 'center' }); n.click(); });
  await sleep(600);
  await shot(ctx, 'skill-info');
  await click(ctx, '#si-close', 400);
  await ctx.page.evaluate(() => { const n = document.querySelector('.node[data-id="g2-vadd2-nc"]'); n.scrollIntoView({ block: 'center' }); n.click(); });
  await sleep(600);
  await shot(ctx, 'skill-info-2');
  await click(ctx, '#si-close', 400);
  // long press a mastered node -> erase confirm
  const box = await ctx.page.evaluate(() => { const n = document.querySelector('.node[data-id="g1-add-c"]'); n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await sleep(300);
  await ctx.page.mouse.move(box.x, box.y); await ctx.page.mouse.down(); await sleep(1100); await ctx.page.mouse.up();
  await sleep(500);
  if (await ctx.page.evaluate(vis, '#confirm')) { await shot(ctx, 'confirm-erase'); await click(ctx, '#confirm-no', 400); }
  await click(ctx, '#tree-back', 600);
  // trophies
  await click(ctx, '#open-trophy', 1000);
  await waitVis(ctx, '#screen-trophy');
  await shot(ctx, 'trophy-all');
  await ctx.page.evaluate(() => { const s = document.querySelector('.tr-series summary'); s.click(); });
  await sleep(500);
  await shot(ctx, 'trophy-open');
  await scrollEl(ctx, '#tr-scroll', 'end');
  await shot(ctx, 'trophy-bottom');
  await scrollEl(ctx, '#tr-scroll', 0);
  for (const f of ['got', 'next', 'soon']) { await click(ctx, `.tr-filter [data-f="${f}"]`, 500); await shot(ctx, `trophy-${f}`); }
  await click(ctx, '.tr-filter [data-f="all"]', 300);
  await click(ctx, '#trophy-back', 600);
  // collection
  await click(ctx, '#open-collect', 1000);
  await waitVis(ctx, '#screen-collect');
  const cats = await ctx.page.evaluate(() => [...document.querySelectorAll('#co-tabs button')].map((b) => b.dataset.cat));
  for (const c of cats) { await click(ctx, `#co-tabs [data-cat="${c}"]`, 600); await shot(ctx, `collect-${c}`); }
  await sleep(2500);
  await shot(ctx, 'collect-settled');
  await click(ctx, '#collect-back', 500);
}

async function skillsFlow(ctx) {
  await seed(ctx, richState());
  for (const id of SKILLS_TO_PLAY) {
    const count = id === 'g1-add-c' ? 14 : 10;
    await open(ctx, `capture&skill=${id}&seed=3&count=${count}`, 700);
    await click(ctx, '#start', 100);
    await waitVis(ctx, '#screen-play.is-active', 10000);
    await ctx.page.waitForFunction(() => window.__dopa.S.ready && window.__dopa.S.problem, { timeout: 15000 });
    await sleep(900);
    await shot(ctx, `play-${id}-0`, { skill: id });
    let r = await answer(ctx, { n: 3 });
    await sleep(500);
    await shot(ctx, `play-${id}-3`, { skill: id, state: r.s });
    // three slips on one digit: "casi" count, diagnosis / hint text under the card
    await slips(ctx, 3);
    await shot(ctx, `play-${id}-hint`, { skill: id, state: await readPlay(ctx.page) });
    await sleep(1600);
    await shot(ctx, `play-${id}-revealed`, { skill: id, state: await readPlay(ctx.page) });
    await answer(ctx, { n: 1, timeout: 30000 });
    await sleep(300);
    await shot(ctx, `play-${id}-5`, { skill: id });
  }
}

async function resultFlow(ctx) {
  // Grade-1 round of 6 (no ?skill so the growth records count); the first new skill brings a worked example.
  await seed(ctx, resultState());
  await open(ctx, 'capture&count=6&seed=11&extra=22', 700);
  await click(ctx, '.grades [data-grade="1"]', 100);
  await waitVis(ctx, '#screen-play.is-active', 10000);
  await sleep(2600);
  let s = await readPlay(ctx.page);
  if (s.cardLesson) { await shot(ctx, 'play-lesson'); }
  await ctx.page.waitForFunction(() => !window.__dopa.S.lesson && window.__dopa.S.ready, { timeout: 30000 });
  await sleep(400);
  s = await readPlay(ctx.page);
  if (s.cardGuided) await shot(ctx, 'play-guided');
  const inject = async () => ctx.page.evaluate(() => {
    const S = window.__dopa.S;
    Object.assign(S.sessionTimes, { 'g1-add-nc': { n: 5, ms: 6000, c: 5, f: 5 }, 'g1-add-c': { n: 4, ms: 9000, c: 4, f: 4 }, 'g1-sub-b': { n: 4, ms: 40000, c: 4, f: 4 } });
    S.newMastered = ['g1-add3']; S.newUnlocks = ['g2-vadd2-nc', 'g2-kuku25']; S.newStars = { 'g1-add-nc': 2 }; S.polished = ['g1-compose10'];
  });
  await answer(ctx, { n: 6, onLastStep: inject, timeout: 180000 });
  await waitVis(ctx, '#screen-result.is-active', 15000);
  await sleep(3200);
  if (await ctx.page.evaluate(vis, '#trophy-got')) { await shot(ctx, 'trophy-got-result'); await click(ctx, '#tg-ok', 600); }
  await shot(ctx, 'result-ok');
  await scrollEl(ctx, '#screen-result', 'end');
  await shot(ctx, 'result-ok-bottom');
  await scrollEl(ctx, '#screen-result', 0);
  await click(ctx, '#go-extra', 100);
  await waitVis(ctx, '#screen-play.is-active', 10000);
  await ctx.page.waitForFunction(() => window.__dopa.S.mode === 'extra' && window.__dopa.S.ready, { timeout: 15000 });
  await sleep(400);
  await shot(ctx, 'play-extra-0');
  await answer(ctx, { n: 3, timeout: 15000 });
  await shot(ctx, 'play-extra-3');
  await waitVis(ctx, '#screen-final.is-active', 40000);
  await sleep(2200);
  if (await ctx.page.evaluate(vis, '#trophy-got')) { await shot(ctx, 'trophy-got-final'); await click(ctx, '#tg-ok', 600); }
  await shot(ctx, 'final');
  await scrollEl(ctx, '#screen-final', 'end');
  await shot(ctx, 'final-bottom');
  await click(ctx, '#again', 800);
  await dismiss(ctx);
  // The failing variant: three slips out of six -> long "80%" line, review button, "Otra vez".
  await seed(ctx, resultState());
  await open(ctx, 'capture&count=6&seed=12', 700);
  await click(ctx, '.grades [data-grade="1"]', 100);
  await waitVis(ctx, '#screen-play.is-active', 10000);
  await ctx.page.waitForFunction(() => !window.__dopa.S.lesson && window.__dopa.S.ready, { timeout: 30000 });
  await answer(ctx, { n: 6, wrongOn: (s) => s.qi < 3 && s.step === 0, wrongTimes: 1, timeout: 180000 });
  await waitVis(ctx, '#screen-result.is-active', 15000);
  await sleep(3200);
  if (await ctx.page.evaluate(vis, '#trophy-got')) { await click(ctx, '#tg-ok', 600); }
  await shot(ctx, 'result-fail');
  await scrollEl(ctx, '#screen-result', 'end');
  await shot(ctx, 'result-fail-bottom');
}

async function overlaysFlow(ctx) {
  await seed(ctx, hammerState());
  await open(ctx, 'seed=5', 1800);
  if (await ctx.page.evaluate(vis, '#hammer')) { await shot(ctx, 'hammer'); await click(ctx, '#hammer-no', 1400); }
  if (await ctx.page.evaluate(vis, '#bonus')) { await shot(ctx, 'bonus'); await click(ctx, '#bonus-ok', 1600); }
  if (await ctx.page.evaluate(vis, '#trophy-got')) { await shot(ctx, 'trophy-got'); await scrollEl(ctx, '#trophy-got .modal-card', 'end'); await shot(ctx, 'trophy-got-bottom'); await click(ctx, '#tg-ok', 800); }
  await shot(ctx, 'title-after-overlays');
}

async function firstRunFlow(ctx) {
  await seed(ctx, null);
  await open(ctx, 'seed=1', 1600);
  for (let i = 1; i <= 8; i++) {
    if (!(await ctx.page.evaluate(vis, '#guide'))) break;
    await shot(ctx, `guide-p${i}`);
    await click(ctx, '#guide-next', 900);
  }
  await sleep(1200);
  if (await ctx.page.evaluate(vis, '#bonus')) { await shot(ctx, 'bonus-first'); await click(ctx, '#bonus-ok', 1200); }
  if (await ctx.page.evaluate(vis, '#trophy-got')) { await shot(ctx, 'trophy-got-first'); await click(ctx, '#tg-ok', 800); }
  await shot(ctx, 'title-fresh');
  await scrollEl(ctx, '#screen-title', 'end');
  await shot(ctx, 'title-fresh-bottom');
}

main().catch((e) => { console.error(e); process.exit(1); });
