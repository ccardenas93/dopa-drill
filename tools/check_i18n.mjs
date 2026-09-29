// Localization guard: checks that every t('key') used by the app exists in the
// dictionary, that every key has a Spanish (TABLE in i18n.js) and an English
// (i18n.en.js) string with the same {placeholders} and HTML tags, and that
// neither public language (es, en) renders leftover Japanese.
// Run: node tools/check_i18n.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const read = (p) => readFileSync(p, 'utf8');

const { t, setLocale, getLocale, nf, keys: allKeys, dictionary } = await import(join(app, 'js', 'i18n.js'));
const defined = new Set(allKeys());
const PUBLIC = ['es', 'en'];
const ja = dictionary('ja');
const dicts = Object.fromEntries(PUBLIC.map((loc) => [loc, dictionary(loc)]));
const { EN } = await import(join(app, 'js', 'i18n.en.js'));

const used = new Map();
const note = (key, where) => {
  const list = used.get(key) || [];
  list.push(where);
  used.set(key, list);
};

const htmlPath = join(app, 'index.html');
const html = read(htmlPath);
for (const m of html.matchAll(/data-i18n(?:-html|-aria|-title)?="([^"]+)"/g)) note(m[1], 'index.html');

for (const file of readdirSync(join(app, 'js'))) {
  if (file === 'i18n.js' || !file.endsWith('.js')) continue;
  const text = read(join(app, 'js', file));
  for (const m of text.matchAll(/(?<![\w.])t\(\s*'([^']+)'/g)) note(m[1], file);
  // Template keys like t(`p.place.${i + 1}`) are reported as a family.
  for (const m of text.matchAll(/(?<![\w.])t\(\s*`([^`]*)\$\{/g)) note(`${m[1]}…`, file);
}

const missing = [];
for (const [key, where] of used) {
  if (key.endsWith('…')) continue;
  if (!defined.has(key)) missing.push(`${key} (used in ${where.join(', ')})`);
}
// Template families: every prefix must cover at least one defined key.
for (const [key, where] of used) {
  if (!key.endsWith('…')) continue;
  const prefix = key.slice(0, -1);
  if (![...defined].some((k) => k.startsWith(prefix))) missing.push(`${key} (used in ${where.join(', ')})`);
}

// Every key in every public language, with the same placeholders and tags.
const untranslated = [];
const mismatched = [];
const holes = (s) => [...new Set((s.match(/\{\w+\}/g) || []))].sort().join(' ');
const tags = (s) => (s.match(/<\/?[a-z][^>]*>/gi) || []).map((x) => x.replace(/\s.*>$/, '>')).join('');
for (const k of defined) {
  for (const loc of PUBLIC) if (dicts[loc][k] === undefined) untranslated.push(`${loc}: ${k}`);
  const es = dicts.es[k]; const en = dicts.en[k];
  if (es === undefined || en === undefined) continue;
  if (holes(es) !== holes(en)) mismatched.push(`${k}: es "${holes(es)}" vs en "${holes(en)}"`);
  if (tags(es) !== tags(en)) mismatched.push(`${k}: HTML differs (es ${tags(es) || '-'} / en ${tags(en) || '-'})`);
  // Spanish is translated from the Japanese source: no invented placeholders.
  const jaHoles = new Set(ja[k].match(/\{\w+\}/g) || []);
  for (const h of es.match(/\{\w+\}/g) || []) if (!jaHoles.has(h) && !(k === 'cal.title' && h === '{month}')) mismatched.push(`${k}: ${h} is not in the Japanese source`);
}
const strayEnglish = Object.keys(EN).filter((k) => !defined.has(k));

// ------------------------------------------------------------- render smoke
const japanese = /[ぁ-んァ-ヶ一-龠]/;
// A local named `t` (a loop token, a timestamp, a position) would shadow the
// translator, so flag every t('…') call that sits inside such a scope.
function matchBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') { depth -= 1; if (!depth) return i; }
  }
  return text.length - 1;
}
function blockEnd(text, idx) {
  let depth = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (text[i] === '}') depth += 1;
    else if (text[i] === '{') { if (!depth) return matchBrace(text, i); depth -= 1; }
  }
  return text.length - 1;
}
const shadowsT = (decl) => /(^|[,(\s])t\s*(=|,|\)|$)/.test(decl.trim());
function shadowRanges(text) {
  const ranges = [];
  const push = (from, to) => ranges.push([from, to]);
  for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g)) {
    if (!shadowsT(m[1])) continue;
    push(m.index, blockEnd(text, m.index));
  }
  for (const m of text.matchAll(/\bfunction\s+[A-Za-z0-9_$]*\s*\(([^()]*)\)/g)) {
    if (!shadowsT(m[1])) continue;
    let i = m.index + m[0].length;
    while (/\s/.test(text[i])) i += 1;
    push(m.index, text[i] === '{' ? matchBrace(text, i) : (text.indexOf('\n', i) + 1 || text.length));
  }
  for (const m of text.matchAll(/\(([^()]*)\)\s*=>/g)) {
    if (!shadowsT(m[1])) continue;
    let i = m.index + m[0].length;
    while (/\s/.test(text[i])) i += 1;
    push(m.index, text[i] === '{' ? matchBrace(text, i) : (text.indexOf('\n', i) + 1 || text.length));
  }
  return ranges;
}
const shadowedCalls = [];
for (const file of readdirSync(join(app, 'js'))) {
  if (!file.endsWith('.js')) continue;
  const text = read(join(app, 'js', file));
  const ranges = shadowRanges(text);
  for (const m of text.matchAll(/(?<![\w.])t\(\s*['"`]/g)) {
    if (ranges.some(([a, b]) => m.index > a && m.index < b)) {
      const line = text.slice(0, m.index).split('\n').length;
      shadowedCalls.push(`${file}:${line}`);
    }
  }
}

const leaks = [];
const audit = (label, value) => {
  if (typeof value !== 'string') return;
  if (japanese.test(value)) leaks.push(`${label}: ${value}`);
};


const { makeRng, makeProblem, generate, BASIC_SETS, EXTRA_TIERS } = await import(join(app, 'js', 'problems.js'));
const { SKILLS } = await import(join(app, 'js', 'skills.js'));
const tr = await import(join(app, 'js', 'trophies.js'));
const ul = await import(join(app, 'js', 'unlocks.js'));
const { QUESTS, DYNAMIC } = await import(join(app, 'js', 'quests.js'));
const { fmtDopa, unitOf, unitLabel } = await import(join(app, 'js', 'scoring.js'));

function renderAudit(loc) {
  setLocale(loc, { persist: false, notify: false });
  if (getLocale() !== loc) throw new Error('setLocale did not switch');
  // Problems: one of every skill, plus the legacy column sets.
  const rng = makeRng(7);
  for (const sk of SKILLS) {
    for (let i = 0; i < 3; i++) {
      const p = makeProblem(sk.id, rng);
      audit(`[${loc}] ${sk.id} title`, p.title);
      audit(`[${loc}] ${sk.id} text`, p.text);
      audit(`[${loc}] ${sk.id} answer`, p.answer);
      audit(`[${loc}] ${sk.id} answerText`, p.answerText);
      for (const cell of p.cells || []) audit(`[${loc}] ${sk.id} cell`, cell.text);
      for (const st of p.steps || []) { audit(`[${loc}] ${sk.id} step`, st.label); audit(`[${loc}] ${sk.id} hint`, st.hint); audit(`[${loc}] ${sk.id} help`, st.help && st.help.text); }
    }
  }
  for (const tpl of [...new Set([...Object.values(BASIC_SETS).flat(), ...EXTRA_TIERS.flat()])]) {
    for (let i = 0; i < 20; i++) {
      const p = generate(tpl, rng);
      audit(`[${loc}] ${tpl} title`, p.title);
      for (const cell of p.cells) audit(`[${loc}] ${tpl} cell`, cell.text);
      for (const st of p.steps) { audit(`[${loc}] ${tpl} step`, st.label); audit(`[${loc}] ${tpl} help`, st.help && st.help.text); }
    }
  }

  // Trophies, collection and quests render from the current language too.
  for (const s of tr.SERIES) {
    audit(`[${loc}] series ${s.key}`, s.title);
    for (const item of s.items) { audit(`[${loc}] trophy ${item.id}`, item.name); audit(`[${loc}] trophy ${item.id}`, item.desc); }
  }
  for (const cat of tr.CATS) audit(`[${loc}] cat ${cat}`, tr.catLabel(cat));
  for (const it of ul.ITEMS) audit(`[${loc}] item ${it.id}`, it.name);
  for (const c of ul.CATS) audit(`[${loc}] co cat ${c.key}`, c.name);
  for (const q of QUESTS) audit(`[${loc}] quest ${q.id}`, q.text({ skill: SKILLS[0].id }));
  for (const q of DYNAMIC) audit(`[${loc}] quest ${q.id}`, q.text({ skill: SKILLS[0].id }));

  // Number and dopa formatting.
  audit(`[${loc}] nf`, nf(1234567));
  for (let L = 0; L < 12; L += 0.25) { audit(`[${loc}] dopa ${L}`, fmtDopa(L)); audit(`[${loc}] unit ${L}`, unitLabel(unitOf(L))); }
}
for (const loc of PUBLIC) renderAudit(loc);

const problems = [];
if (missing.length) problems.push(`missing dictionary keys:\n  ${missing.join('\n  ')}`);
if (shadowedCalls.length) problems.push(`t() shadowed by a local named t:\n  ${shadowedCalls.join('\n  ')}`);
if (untranslated.length) problems.push(`keys without a translation (add es to TABLE in i18n.js, en to i18n.en.js):\n  ${untranslated.join('\n  ')}`);
if (mismatched.length) problems.push(`placeholder or HTML mismatch:\n  ${mismatched.join('\n  ')}`);
if (strayEnglish.length) problems.push(`English keys not in TABLE (typo or stale?):\n  ${strayEnglish.join('\n  ')}`);
if (leaks.length) problems.push(`Japanese left in the es/en render:\n  ${leaks.slice(0, 40).join('\n  ')}`);

const total = defined.size;
if (problems.length) {
  console.error(problems.join('\n\n'));
  process.exit(1);
}
console.log(`i18n ok: ${total} keys in ${PUBLIC.join(' + ')}, ${used.size} referenced, no Japanese in the es/en render`);
