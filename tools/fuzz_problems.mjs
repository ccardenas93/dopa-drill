// Fuzzer for the problem generators (app/js/problems.js). For both public
// locales it generates thousands of problems per skill (makeProblem) and per
// legacy template (generate) and checks each one independently of the
// generator: the answer recomputed from the problem text and cells, the
// column algorithms (carries, borrows, partial products, long-division
// steps), keypad feasibility (every step is one digit 0-9 into an input
// cell), the skill's stated ranges (docs/curriculum.md), text hygiene, the
// variety of signatures and the determinism of the seeds.
// Run: node tools/fuzz_problems.mjs [--per-skill 2000] [--per-template 500] [--seeds 11,22,33,44] [--examples 3] [--json out.json]
// Exit code 1 when a hard failure (wrong answer, impossible input, range violation) is found.
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const t0 = performance.now();
const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'js');
const load = (f) => import(pathToFileURL(join(app, f)).href);
const { makeRng, makeProblem, generate, signature, BASIC_SETS, EXTRA_TIERS } = await load('problems.js');
const { SKILLS, SKILL } = await load('skills.js');
const { setLocale } = await load('i18n.js');

// ------------------------------------------------------------------ options
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def; };
const PER_SKILL = Number(opt('per-skill', 2000));
const PER_TEMPLATE = Number(opt('per-template', 500));
const SEEDS = String(opt('seeds', '11,22,33,44')).split(',').map(Number);
const EXAMPLES = Number(opt('examples', 3));
const JSON_OUT = opt('json', null);
const LOCALES = ['es', 'en'];
const TEMPLATES = [...new Set([...Object.values(BASIC_SETS).flat(), ...EXTRA_TIERS.flat()])];
const LOW_VARIETY = 30;

// ------------------------------------------------------------------ small math helpers (independent of problems.js)
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const ndig = (n) => String(n).length;
const fmtDec = (n, p) => { const s = String(n).padStart(p + 1, '0'); return p ? `${s.slice(0, -p)}.${s.slice(-p)}` : s; };
// "12.34" -> { n: 1234, p: 2 } (integer scaled by 10^p)
const parseDec = (s) => { const m = /^(\d+)(?:\.(\d+))?$/.exec(s); return m ? { n: Number(m[1] + (m[2] || '')), p: (m[2] || '').length, s } : null; };
const scaleTo = (d, P) => d.n * 10 ** (P - d.p);
const decVal = (d) => d.n / 10 ** d.p;
const rat = (n, d) => { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const ratAdd = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const ratSub = (a, b) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
const ratMul = (a, b) => rat(a.n * b.n, a.d * b.d);
const ratDiv = (a, b) => rat(a.n * b.d, a.d * b.n);
const ints = (s) => (String(s).match(/\d+/g) || []).map(Number);
function carriesOf(a, b) { let c = 0; let n = 0; while (a > 0 || b > 0) { const s = (a % 10) + (b % 10) + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
function borrowsOf(a, b) { let br = 0; let n = 0; while (a > 0) { const x = (a % 10) - br - (b % 10); br = x < 0 ? 1 : 0; n += br; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
const inR = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const inRange = (v, r) => (Array.isArray(r) ? inR(v, r[0], r[1]) : v === r);

// Order-of-operations evaluator for "2+3×4", "2×(3+4)", "(5−2)×3".
function evalExpr(src) {
  let i = 0;
  const peek = () => src[i];
  const num = () => { const m = /^\d+/.exec(src.slice(i)); if (!m) throw new Error(`expr ${src}`); i += m[0].length; return Number(m[0]); };
  const factor = () => { if (peek() === '(') { i++; const v = expr(); if (src[i++] !== ')') throw new Error(`expr ${src}`); return v; } return num(); };
  const term = () => { let v = factor(); while (peek() === '×') { i++; v *= factor(); } return v; };
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '−') { const o = src[i++]; const w = term(); v = o === '+' ? v + w : v - w; } return v; };
  const v = expr();
  if (i !== src.length) throw new Error(`expr ${src}`);
  return v;
}

// ------------------------------------------------------------------ answer parsing
// Structured view of an answer string in the current locale.
function parseAnswer(s) {
  let m;
  if ((m = /^(\d+) ([^\d\s]+) (\d+)$/.exec(s))) return { type: 'rem', q: +m[1], r: +m[3], word: m[2], value: +m[1], typed: m[1] + m[3] };
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return { type: 'mixed', w: +m[1], n: +m[2], d: +m[3], value: +m[1] + m[2] / m[3], typed: m[1] + m[2] + m[3] };
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return { type: 'frac', n: +m[1], d: +m[2], value: m[1] / m[2], typed: m[1] + m[2] };
  if ((m = /^(\d+)\.(\d+)$/.exec(s))) return { type: 'dec', dec: parseDec(s), value: Number(s), typed: m[1] + m[2] };
  if ((m = /^\d+$/.exec(s))) return { type: 'int', value: Number(s), typed: s };
  return { type: 'bad', value: NaN, typed: '' };
}
const fmtRat = (r, mixed) => (mixed && r.n > r.d ? { type: 'mixed', w: Math.floor(r.n / r.d), n: r.n % r.d, d: r.d } : { type: 'frac', n: r.n, d: r.d });
const sameAnswer = (a, b) => {
  if (a.type !== b.type) return false;
  if (a.type === 'rem') return a.q === b.q && a.r === b.r;
  if (a.type === 'mixed') return a.w === b.w && a.n === b.n && a.d === b.d;
  if (a.type === 'frac') return a.n === b.n && a.d === b.d;
  if (a.type === 'dec') return !!(a.dec && b.dec) && a.dec.s === b.dec.s;
  return a.value === b.value;
};
const showAnswer = (e) => (e.type === 'rem' ? `${e.q} r ${e.r}` : e.type === 'mixed' ? `${e.w} ${e.n}/${e.d}` : e.type === 'frac' ? `${e.n}/${e.d}` : e.type === 'dec' ? (e.dec ? e.dec.s : String(e.value)) : String(e.value));

// ------------------------------------------------------------------ cell helpers
const isDot = (c) => c.text === '.';
const rowCells = (p, r, filter = () => true) => p.cells.filter((c) => c.r === r && c.kind !== 'mark' && (p.kind === 'h' || c.kind !== 'op') && filter(c)).sort((a, b) => a.c - b.c || (isDot(a) ? 1 : 0) - (isDot(b) ? 1 : 0));
const rowText = (p, r, filter) => rowCells(p, r, filter).map((c) => c.text).join('');
const cellById = (p) => new Map(p.cells.map((c) => [c.id, c]));

// ------------------------------------------------------------------ per-problem checks
// Each check pushes { cat, msg } into `out`. Categories: wrong (answer), input (keypad feasibility), range, text, structure, soft.
function checkStructure(p, out) {
  const byId = cellById(p);
  if (byId.size !== p.cells.length) out.push({ cat: 'structure', msg: 'duplicate cell ids' });
  const lineIds = new Set((p.lines || []).map((l) => l.id).filter(Boolean));
  const typedCells = new Map();
  if (!p.steps.length) out.push({ cat: 'input', msg: 'no steps' });
  for (const [i, st] of p.steps.entries()) {
    if (!/^[0-9]$/.test(String(st.digit))) out.push({ cat: 'input', msg: `step ${i} expects "${st.digit}" (not a single digit 0-9)` });
    const cell = byId.get(st.cell);
    if (!cell) out.push({ cat: 'input', msg: `step ${i} targets missing cell ${st.cell}` });
    else {
      if (cell.kind !== 'input') out.push({ cat: 'input', msg: `step ${i} targets non-input cell ${st.cell} (${cell.kind})` });
      if (String(cell.text) !== String(st.digit)) out.push({ cat: 'input', msg: `step ${i} digit ${st.digit} differs from cell text ${cell.text}` });
    }
    if (typedCells.has(st.cell)) out.push({ cat: 'input', msg: `cell ${st.cell} typed twice` });
    typedCells.set(st.cell, i);
    for (const id of st.after || []) if (!byId.has(id) && !lineIds.has(id)) out.push({ cat: 'structure', msg: `step ${i} reveals unknown ${id}` });
    if (!st.label) out.push({ cat: 'text', msg: `step ${i} has no label` });
    if (st.help && st.help.ids) for (const id of st.help.ids) if (!byId.has(id)) out.push({ cat: 'soft', msg: `help id ${id} not a cell` });
  }
  for (const c of p.cells) {
    if (c.kind === 'input' && !typedCells.has(c.id)) out.push({ cat: 'input', msg: `input cell ${c.id} never typed` });
    if (c.kind === 'input' && !/^[0-9]$/.test(String(c.text))) out.push({ cat: 'input', msg: `input cell ${c.id} holds "${c.text}"` });
    if (c.kind === 'carry' && c.text !== '1') out.push({ cat: 'input', msg: `carry cell ${c.id} shows "${c.text}" (only 1 is possible with two addends)` });
    if (c.kind === 'word' && !String(c.text).trim()) out.push({ cat: 'text', msg: `empty word cell ${c.id}` });
    if (c.kind === 'given' && /^0\d/.test(String(c.text))) out.push({ cat: 'text', msg: `given cell ${c.id} has a leading zero "${c.text}"` });
    if (c.r < 0 || c.r >= p.rows || c.c < 0 || c.c + (c.cs || 1) > p.cols) out.push({ cat: 'structure', msg: `cell ${c.id} outside the ${p.cols}x${p.rows} grid` });
  }
}

const CJK = /[　-ヿ㐀-䶿一-鿿＀-￯]/;
function checkTexts(p, out) {
  const fields = [['title', p.title], ['text', p.text], ['answer', p.answer], ['answerText', p.answerText]];
  p.steps.forEach((st, i) => { fields.push([`step${i}.label`, st.label]); if (st.hint) fields.push([`step${i}.hint`, st.hint]); if (st.help) fields.push([`step${i}.help`, st.help.text]); });
  for (const c of p.cells) if (c.kind === 'word') fields.push([`cell ${c.id}`, c.text]);
  for (const [name, v] of fields) {
    const s = String(v);
    if (v === undefined || v === null || v === '') { out.push({ cat: 'text', msg: `${name} is empty` }); continue; }
    if (CJK.test(s)) out.push({ cat: 'text', msg: `${name} contains Japanese: "${s}"` });
    if (/undefined|NaN|null|\[object/.test(s)) out.push({ cat: 'text', msg: `${name} contains a bad token: "${s}"` });
    if (/ {2}/.test(s)) out.push({ cat: 'text', msg: `${name} has a double space: "${s}"` });
    if (/\{\w+\}/.test(s)) out.push({ cat: 'text', msg: `${name} has an unfilled placeholder: "${s}"` });
    if (/^\s|\s$/.test(s)) out.push({ cat: 'text', msg: `${name} has leading/trailing whitespace: "${s}"` });
    if (/-\d/.test(s)) out.push({ cat: 'text', msg: `${name} shows a negative number: "${s}"` });
  }
  if ((p.answerText.match(/=/g) || []).length >= 2) out.push({ cat: 'text', msg: `answerText has two "=": "${p.answerText}"` });
  if (/(^|[^\d.])0 \d+\/\d+/.test(p.text)) out.push({ cat: 'text', msg: `text shows a mixed number with whole part 0: "${p.text}"` });
  for (const n of p.text.match(/\d[\d.]*/g) || []) { if (/^0\d/.test(n)) out.push({ cat: 'text', msg: `leading zero in text: "${p.text}"` }); if (/\.\d*0$/.test(n) || /\.$/.test(n)) out.push({ cat: 'text', msg: `decimal with trailing zero in text: "${p.text}"` }); }
  if (/^0\d/.test(p.answer)) out.push({ cat: 'text', msg: `leading zero in answer "${p.answer}"` });
}

// --- column addition: rows 1 and 2 given, row 3 typed right to left, carries in row 0.
function checkAdd(p, a, b, out) {
  const P = Math.max(a.p, b.p);
  const A = scaleTo(a, P); const B = scaleTo(b, P); const sum = A + B;
  const expected = fmtDec(sum, P);
  if (rowText(p, 1) !== a.s) out.push({ cat: 'wrong', msg: `row 1 shows "${rowText(p, 1)}" but text says ${a.s}` });
  if (rowText(p, 2) !== b.s) out.push({ cat: 'wrong', msg: `row 2 shows "${rowText(p, 2)}" but text says ${b.s}` });
  if (rowText(p, 3) !== expected) out.push({ cat: 'wrong', msg: `answer row shows "${rowText(p, 3)}", expected ${expected}` });
  const typed = p.steps.map((s) => s.digit).reverse().join('');
  if (typed !== expected.replace('.', '')) out.push({ cat: 'wrong', msg: `typed digits ${typed} do not spell ${expected}` });
  const inputs = rowCells(p, 3, (c) => c.kind === 'input');
  if (inputs.length !== expected.replace('.', '').length) out.push({ cat: 'input', msg: `${inputs.length} input cells for a ${expected.replace('.', '').length}-digit answer` });
  // Column simulation: carries are 0/1, each carry cell sits one column left of the column that produced it.
  const ad = String(A).split('').reverse().map(Number); const bd = String(B).split('').reverse().map(Number);
  const carryCells = new Set(p.cells.filter((c) => c.kind === 'carry').map((c) => c.c));
  let carry = 0;
  const cols = p.cols;
  for (let i = 0; i < p.steps.length; i++) {
    const st = p.steps[i]; const c = cols - 1 - i;
    const s = (ad[i] || 0) + (bd[i] || 0) + carry;
    if (String(s % 10) !== st.digit) out.push({ cat: 'wrong', msg: `column ${i}: ${ad[i] || 0}+${bd[i] || 0}+${carry} gives ${s % 10}, step expects ${st.digit}` });
    if (st.cell !== `s${c}`) out.push({ cat: 'input', msg: `step ${i} typed into ${st.cell}, expected s${c}` });
    const co = s >= 10 ? 1 : 0;
    const shouldMark = !!(co && i < p.steps.length - 1);
    if (shouldMark !== carryCells.has(c - 1)) out.push({ cat: 'wrong', msg: `carry mark at column ${c - 1} ${shouldMark ? 'missing' : 'unexpected'}` });
    if (shouldMark && !(st.after || []).includes(`k${c - 1}`)) out.push({ cat: 'structure', msg: `carry k${c - 1} not revealed by its step` });
    if (st.help && /^\d+( \+ \d+)*$/.test(st.help.text)) { const hs = ints(st.help.text).reduce((x, y) => x + y, 0); if (hs !== s) out.push({ cat: 'wrong', msg: `help "${st.help.text}" sums to ${hs}, column sum is ${s}` }); }
    if (st.diag && (st.diag.sum !== s || st.diag.carryIn !== !!carry)) out.push({ cat: 'wrong', msg: `diag ${JSON.stringify(st.diag)} disagrees with column ${i} (sum ${s}, carryIn ${!!carry})` });
    carry = co;
  }
  return { type: 'dec', dec: parseDec(expected), value: decVal({ n: sum, p: P }) };
}

// --- column subtraction: standard borrow marks (9s over skipped zeros, top digit + 10).
function checkSub(p, a, b, out) {
  const P = Math.max(a.p, b.p);
  const A = scaleTo(a, P); const B = scaleTo(b, P);
  if (A < B) out.push({ cat: 'range', msg: `negative result ${a.s} − ${b.s}` });
  const res = A - B; const expected = fmtDec(res, P);
  if (rowText(p, 1) !== a.s) out.push({ cat: 'wrong', msg: `row 1 shows "${rowText(p, 1)}" but text says ${a.s}` });
  if (rowText(p, 2) !== b.s) out.push({ cat: 'wrong', msg: `row 2 shows "${rowText(p, 2)}" but text says ${b.s}` });
  if (rowText(p, 3) !== expected) out.push({ cat: 'wrong', msg: `answer row shows "${rowText(p, 3)}", expected ${expected}` });
  const typed = p.steps.map((s) => s.digit).reverse().join('');
  if (typed !== expected.replace('.', '')) out.push({ cat: 'wrong', msg: `typed digits ${typed} do not spell ${expected}` });
  const inputs = rowCells(p, 3, (c) => c.kind === 'input');
  if (inputs.length !== expected.replace('.', '').length) out.push({ cat: 'input', msg: `${inputs.length} input cells for a ${expected.replace('.', '').length}-digit answer` });
  // Simulation with the same conventions: cur[c] per column (1-based), b digits right-aligned.
  const as = String(A).padStart(P + 1, '0'); const bs = String(B).padStart(P + 1, '0');
  const cols = as.length + 1;
  const cur = [null, ...as.split('').map(Number)];
  const bAt = (c) => { const i = c - (cols - bs.length); return i >= 0 ? Number(bs[i]) : 0; };
  for (let i = 0; i < p.steps.length; i++) {
    const st = p.steps[i]; const c = cols - 1 - i;
    const marks = [];
    if (cur[c] < bAt(c)) {
      let k = c - 1;
      while (k >= 1 && cur[k] === 0) { cur[k] = 9; marks.push({ c: k, text: '9' }); k -= 1; }
      if (k < 1) { out.push({ cat: 'wrong', msg: `borrow runs past the leftmost digit at column ${c}` }); break; }
      cur[k] -= 1; marks.push({ c: k, text: String(cur[k]) });
      cur[c] += 10; marks.push({ c, text: String(cur[c]) });
    }
    const d = cur[c] - bAt(c);
    if (d < 0 || d > 9) out.push({ cat: 'wrong', msg: `column ${i}: ${cur[c]} − ${bAt(c)} is not a digit` });
    if (String(d) !== st.digit) out.push({ cat: 'wrong', msg: `column ${i}: ${cur[c]} − ${bAt(c)} = ${d}, step expects ${st.digit}` });
    if (st.cell !== `s${c}`) out.push({ cat: 'input', msg: `step ${i} typed into ${st.cell}, expected s${c}` });
    if (JSON.stringify(st.marks || []) !== JSON.stringify(marks)) out.push({ cat: 'wrong', msg: `borrow marks ${JSON.stringify(st.marks)} differ from the standard algorithm ${JSON.stringify(marks)}` });
    for (const m of marks) if (!(Number(m.text) >= 0 && Number(m.text) <= 19)) out.push({ cat: 'wrong', msg: `borrow mark "${m.text}" out of range` });
    if (st.help) { const hn = ints(st.help.text); if (hn.length !== 2 || hn[0] - hn[1] !== d) out.push({ cat: 'wrong', msg: `help "${st.help.text}" does not compute the digit ${d}` }); }
    if (st.diag && (st.diag.top !== cur[c] || st.diag.bottom !== bAt(c) || st.diag.borrowed !== (marks.length > 0))) out.push({ cat: 'wrong', msg: `diag ${JSON.stringify(st.diag)} disagrees with column ${i}` });
  }
  return { type: 'dec', dec: parseDec(expected), value: decVal({ n: res, p: P }) };
}

// --- column multiplication: partial rows for each digit of b, then the sum row.
function checkMul(p, a, b, out) {
  const A = a.n; const B = b.n; const P = a.p + b.p; const prod = A * B;
  const expected = fmtDec(prod, P);
  if (rowText(p, 1) !== a.s) out.push({ cat: 'wrong', msg: `row 1 shows "${rowText(p, 1)}" but text says ${a.s}` });
  if (rowText(p, 2) !== b.s) out.push({ cat: 'wrong', msg: `row 2 shows "${rowText(p, 2)}" but text says ${b.s}` });
  const bd = String(B).split('').reverse().map(Number);
  const lastRow = bd.length === 1 ? 3 : 5;
  if (rowText(p, lastRow) !== expected) out.push({ cat: 'wrong', msg: `product row shows "${rowText(p, lastRow)}", expected ${expected}` });
  const inputs = rowCells(p, lastRow, (c) => c.kind === 'input');
  if (inputs.length !== String(prod).length) out.push({ cat: 'input', msg: `${inputs.length} input cells for a ${String(prod).length}-digit product` });
  // Expected step sequence with per-step numbers that the help text must mention.
  const exp = [];
  const partial = (f, row, shift) => {
    const ad = String(A).split('').reverse().map(Number);
    let carry = 0; const part = String(A * f);
    for (let i = 0; i < part.length; i++) {
      const x = ad[i];
      const v = x !== undefined ? x * f + carry : carry;
      const digit = String(v % 10);
      if (digit !== part[part.length - 1 - i]) out.push({ cat: 'wrong', msg: `partial ${A}×${f} digit ${i} mismatch` });
      exp.push({ digit, row, col: p.cols - 1 - shift - i, nums: x !== undefined ? [x, f, ...(carry ? [carry] : [])] : [carry] });
      carry = Math.floor(v / 10);
    }
    if (rowText(p, row, (c) => c.kind === 'input') !== part) out.push({ cat: 'wrong', msg: `partial row ${row} shows "${rowText(p, row, (c) => c.kind === 'input')}", expected ${part}` });
  };
  if (bd.length === 1) partial(B, 3, 0);
  else {
    if (bd.length !== 2) out.push({ cat: 'range', msg: `multiplier ${B} has ${bd.length} digits (layout supports 1-2)` });
    partial(bd[0], 3, 0); partial(bd[1], 4, 1);
    const p1 = A * bd[0]; const p2 = A * bd[1] * 10; const ps = String(prod);
    let carry = 0;
    for (let i = 0; i < ps.length; i++) {
      const x = Math.floor(p1 / 10 ** i) % 10; const y = i ? Math.floor(p2 / 10 ** i) % 10 : 0;
      const s = x + y + carry;
      if (s > 19) out.push({ cat: 'wrong', msg: `sum-row column ${i} carry above 1` });
      exp.push({ digit: String(s % 10), row: 5, col: p.cols - 1 - i, nums: [x, ...(i ? [y] : []), ...(carry ? [carry] : [])] });
      carry = Math.floor(s / 10);
    }
  }
  if (exp.length !== p.steps.length) out.push({ cat: 'input', msg: `${p.steps.length} steps, expected ${exp.length}` });
  const byId = cellById(p);
  exp.forEach((e, i) => {
    const st = p.steps[i]; if (!st) return;
    if (st.digit !== e.digit) out.push({ cat: 'wrong', msg: `step ${i} expects ${st.digit}, algorithm gives ${e.digit}` });
    const cell = byId.get(st.cell);
    if (!cell || cell.r !== e.row || cell.c !== e.col) out.push({ cat: 'input', msg: `step ${i} at ${cell && `r${cell.r}c${cell.c}`}, expected r${e.row}c${e.col}` });
    if (st.help && JSON.stringify(ints(st.help.text)) !== JSON.stringify(e.nums)) out.push({ cat: 'wrong', msg: `step ${i} help "${st.help.text}" should mention ${e.nums.join(', ')}` });
  });
  if (P) {
    const dot = p.cells.find((c) => c.id === 'dotp');
    if (!dot || dot.r !== lastRow || dot.c !== p.cols - 1 - P) out.push({ cat: 'wrong', msg: 'product decimal point misplaced' });
    if (!(p.steps.at(-1)?.after || []).includes('dotp')) out.push({ cat: 'structure', msg: 'product point not revealed by the last step' });
  }
  return { type: P ? 'dec' : 'int', dec: parseDec(expected), value: decVal({ n: prod, p: P }) };
}

// --- long division: quotient digit, (product auto), remainder digits, bring-down, ...
function checkDiv(p, D, d, out, remWordCheck) {
  if (d === 0) { out.push({ cat: 'range', msg: 'division by zero' }); return { type: 'bad', value: NaN }; }
  const q = Math.floor(D / d); const rem = D % d;
  const Ds = String(D); const off = String(d).length; const cols = off + Ds.length;
  if (p.cols !== cols) out.push({ cat: 'structure', msg: `grid has ${p.cols} columns, expected ${cols}` });
  if (rowText(p, 1) !== `${d}${D}`) out.push({ cat: 'wrong', msg: `row 1 shows "${rowText(p, 1)}" for ${D} ÷ ${d}` });
  const qCells = rowCells(p, 0, (c) => c.kind === 'input');
  if (qCells.map((c) => c.text).join('') !== String(q)) out.push({ cat: 'wrong', msg: `quotient row "${qCells.map((c) => c.text).join('')}", expected ${q}` });
  if (qCells.length !== ndig(q)) out.push({ cat: 'input', msg: `${qCells.length} quotient cells for a ${ndig(q)}-digit quotient` });
  if (p.rem !== rem) out.push({ cat: 'wrong', msg: `p.rem ${p.rem}, expected ${rem}` });
  if (rem >= d) out.push({ cat: 'range', msg: `remainder ${rem} not below divisor ${d}` });
  const byId = cellById(p);
  const exp = []; // { digit, id, kind: 'q'|'r', nums }
  let k = 1; while (Number(Ds.slice(0, k)) < d && k < Ds.length) k += 1;
  let cur = Number(Ds.slice(0, k)); let col = off + k - 1; let rowP = 1;
  for (;;) {
    const qd = Math.floor(cur / d);
    if (qd > 9) out.push({ cat: 'wrong', msg: `quotient digit ${qd} at column ${col} is not a digit` });
    exp.push({ digit: String(qd), id: `q${col}`, kind: 'q', cur, d });
    const last = col === cols - 1;
    let r = cur;
    if (qd > 0) {
      const m = qd * d; const pr = rowP + 1;
      const ms = String(m);
      for (let i = 0; i < ms.length; i++) { const cell = byId.get(`m${pr}_${col - (ms.length - 1 - i)}`); if (!cell || cell.text !== ms[i] || cell.kind !== 'auto') out.push({ cat: 'wrong', msg: `product ${m} not shown at row ${pr} under column ${col}` }); }
      r = cur - m; rowP = pr + 1;
      if (r === 0 && last) { const z = byId.get(`z${rowP}_${col}`); if (!z || z.text !== '0') out.push({ cat: 'wrong', msg: 'final 0 of an exact division missing' }); } else if (r > 0) {
        const rs = String(r);
        for (let i = rs.length - 1; i >= 0; i--) exp.push({ digit: rs[i], id: `r${rowP}_${col - (rs.length - 1 - i)}`, kind: 'r', cur, m, r });
      }
    }
    if (last) break;
    const next = Ds[col - off + 1];
    const bd = byId.get(`bd${rowP}_${col + 1}`);
    if (!bd || bd.text !== next || bd.kind !== 'auto') out.push({ cat: 'wrong', msg: `bring-down of ${next} at row ${rowP} column ${col + 1} missing` });
    cur = r * 10 + Number(next); col += 1;
  }
  if (exp.length !== p.steps.length) out.push({ cat: 'input', msg: `${p.steps.length} steps, algorithm needs ${exp.length}` });
  exp.forEach((e, i) => {
    const st = p.steps[i]; if (!st) return;
    if (st.digit !== e.digit || st.cell !== e.id) out.push({ cat: 'wrong', msg: `step ${i}: ${st.digit}@${st.cell}, algorithm ${e.digit}@${e.id}` });
    if (e.kind === 'q') {
      const hn = ints(st.hint || ''); if (!(hn.length === 2 && hn.includes(e.cur) && hn.includes(e.d))) out.push({ cat: 'wrong', msg: `quotient hint "${st.hint}" should mention ${e.cur} and ${e.d}` });
      if (st.diag && (st.diag.cur !== e.cur || st.diag.d !== e.d)) out.push({ cat: 'wrong', msg: `diag ${JSON.stringify(st.diag)} disagrees (cur ${e.cur}, d ${e.d})` });
      if (st.help) { const nums = ints(st.help.text); if (!nums.includes(e.d) || nums.slice(1).some((v, j, arr) => j && v !== arr[j - 1] + e.d)) out.push({ cat: 'wrong', msg: `table help "${st.help.text}" is not the ${e.d} times table` }); }
    } else {
      const hn = ints(st.hint || ''); if (hn.length !== 2 || hn[0] - hn[1] !== e.r) out.push({ cat: 'wrong', msg: `remainder hint "${st.hint}" should compute ${e.cur} − ${e.m} = ${e.r}` });
    }
  });
  const parsed = parseAnswer(p.answer);
  const expAns = rem ? { type: 'rem', q, r: rem, value: q } : { type: 'int', value: q };
  if (!sameAnswer(parsed, expAns)) out.push({ cat: 'wrong', msg: `answer "${p.answer}", expected ${showAnswer(expAns)}` });
  if (rem && remWordCheck) remWordCheck(parsed.word);
  return { ...expAns, value: q + rem / d };
}

// --- horizontal layouts: recompute from the text per generator, check typed order and the cells.
const REM_WORDS = { es: 'resto', en: 'R' };
function hTyped(parsed) { return parsed.typed; }
function checkH(p, gen, params, loc, out) {
  const text = p.text;
  const num2 = (re) => { const m = re.exec(text); return m ? m.slice(1) : null; };
  let exp = null; // structured expected answer
  const info = { nums: ints(text) };
  const bad = (msg) => out.push({ cat: 'wrong', msg });
  const range = (cond, msg) => { if (!cond) out.push({ cat: 'range', msg }); };
  const eq = (loc === 'es' || loc === 'en') ? '=' : '＝';
  const row0 = rowText(p, 0);
  switch (gen) {
    case 'compose': {
      const m = num2(/^(\d+) \+ (\d+) = (\d+)$/); if (!m) return bad(`unparsable compose text "${text}"`);
      const [a, x, total] = m.map(Number);
      exp = { type: 'int', value: total - a };
      if (x !== total - a) bad(`${a} + ${x} ≠ ${total}`);
      range(total === params.total && inR(a, 1, total - 1), `compose ${a} of ${total}`);
      if (row0 !== `${a}+${x}${eq}${total}`) bad(`cells read "${row0}"`);
      break;
    }
    case 'hadd': case 'hsub': {
      const m = num2(gen === 'hadd' ? /^(\d+) \+ (\d+)$/ : /^(\d+) − (\d+)$/); if (!m) return bad(`unparsable ${gen} text "${text}"`);
      const [x, y] = m.map(Number);
      const v = gen === 'hadd' ? x + y : x - y;
      exp = { type: 'int', value: v };
      if (row0 !== `${x}${gen === 'hadd' ? '+' : '−'}${y}${eq}${v}`) bad(`cells read "${row0}"`);
      const tens = params.tensToo && x % 10 === 0 && y % 10 === 0;
      if (gen === 'hadd') {
        const okPlain = (inRange(x, params.a) && inRange(y, params.b)) || (!params.tensToo && inRange(y, params.a) && inRange(x, params.b));
        range(tens ? inR(x, 10, 80) && inR(y, 10, 90 - x) : okPlain, `operands ${x}, ${y} outside ${JSON.stringify(params)}`);
        const c = carriesOf(x, y);
        range(params.carry === 'none' ? c === 0 : c >= 1, `carry rule "${params.carry}" broken by ${x} + ${y}`);
        range(v <= 99, `sum ${v} above 99 in a grade-1 skill`);
      } else {
        range(tens ? inR(x, 20, 90) && inR(y, 10, x - 10) : inRange(x, params.a) && inRange(y, params.b), `operands ${x}, ${y} outside ${JSON.stringify(params)}`);
        range(y < x, `${x} − ${y} is not positive`);
        const br = borrowsOf(x, y);
        range(params.borrow === 'none' ? br === 0 : br >= 1, `borrow rule "${params.borrow}" broken by ${x} − ${y}`);
      }
      break;
    }
    case 'add3': {
      const m = /^(\d)([+−])(\d)([+−])(\d)$/.exec(text); if (!m) return bad(`unparsable add3 text "${text}"`);
      const a = +m[1]; const b = +m[3]; const c = +m[5];
      const s1 = m[2] === '+' ? a + b : a - b; const s2 = m[4] === '+' ? s1 + c : s1 - c;
      exp = { type: 'int', value: s2 };
      range(s1 >= 0 && s2 >= 0 && s2 <= 20, `intermediate ${s1} / result ${s2} outside 0..20`);
      range([a, b, c].every((v) => inR(v, 1, 9)), 'operands outside 1..9');
      if (row0 !== `${text}${eq}${s2}`) bad(`cells read "${row0}"`);
      const hn = ints(p.steps[0]?.help?.text || ''); if (hn.length && JSON.stringify(hn) !== JSON.stringify([a, b, s1])) bad(`help "${p.steps[0]?.help?.text}" should show ${a} ${m[2]} ${b} = ${s1}`);
      break;
    }
    case 'kuku': case 'mulTens': {
      const m = num2(/^(\d+) × (\d+)$/); if (!m) return bad(`unparsable × text "${text}"`);
      const [a, b] = m.map(Number);
      exp = { type: 'int', value: a * b };
      if (row0 !== `${a}×${b}${eq}${a * b}`) bad(`cells read "${row0}"`);
      if (gen === 'kuku') range(params.dans.includes(a) && inR(b, 1, 9), `${a} × ${b} outside tables ${params.dans}`);
      else range(a % 10 === 0 && inR(a, 10, 90) && inR(b, 2, 9), `${a} × ${b} outside tens × 2..9`);
      break;
    }
    case 'fracOf': {
      const m = num2(/^1\/(\d+) (?:de|of) (\d+)$/); if (!m) return bad(`unparsable fracOf text "${text}"`);
      const [d, n] = m.map(Number);
      if (n % d) bad(`${n} is not a multiple of ${d}`);
      exp = { type: 'int', value: n / d };
      range(params.dens.includes(d) && inR(n / d, 1, 9), `1/${d} of ${n} outside dens ${params.dens} × 1..9`);
      break;
    }
    case 'div': case 'divTens': case 'divRem': {
      const m = num2(/^(\d+) ÷ (\d+)$/); if (!m) return bad(`unparsable ÷ text "${text}"`);
      const [D, d] = m.map(Number);
      if (d === 0) return out.push({ cat: 'range', msg: 'division by zero' });
      const q = Math.floor(D / d); const r = D % d;
      if (gen === 'divRem') {
        exp = { type: 'rem', q, r, value: q };
        range(inR(d, 2, 9) && inR(q, 1, 9) && inR(r, 1, d - 1), `${D} ÷ ${d}: divisor 2..9, quotient 1..9, remainder 1..d-1 expected`);
        const parsed = parseAnswer(p.answer); if (parsed.type === 'rem' && parsed.word !== REM_WORDS[loc]) out.push({ cat: 'text', msg: `remainder word "${parsed.word}"` });
        if (row0 !== `${D}÷${d}${eq}${q}${REM_WORDS[loc]}${r}`) bad(`cells read "${row0}"`);
        if (p.steps.length !== ndig(q) + ndig(r)) out.push({ cat: 'input', msg: `${p.steps.length} steps for quotient ${q} and remainder ${r}` });
      } else {
        if (r) bad(`${D} ÷ ${d} is not exact (skill requires exact division)`);
        exp = { type: 'int', value: q };
        if (row0 !== `${D}÷${d}${eq}${q}`) bad(`cells read "${row0}"`);
        if (gen === 'div') range(inR(d, 2, 9) && inR(q, 1, 9), `${D} ÷ ${d} outside the 2..9 tables`);
        else range(inR(d, 2, 9) && D <= 99 && (Math.floor(D / 10) * 10) % d === 0 && (D % 10) % d === 0, `${D} ÷ ${d} is not a digit-by-digit division within 99`);
      }
      break;
    }
    case 'decDivInt': {
      const m = num2(/^(\d+\.\d) ÷ (\d+)$/); if (!m) return bad(`unparsable text "${text}"`);
      const D = parseDec(m[0]); const d = Number(m[1]);
      if (D.n % d) bad(`${D.s} ÷ ${d} is not a terminating tenth`);
      const qn = D.n / d;
      exp = { type: 'dec', dec: parseDec(fmtDec(qn, 1)), value: qn / 10 };
      range(inR(d, 2, 9) && inR(qn, 11, 99) && qn % 10 !== 0 && D.n % 10 !== 0 && D.n <= 999, `${D.s} ÷ ${d} outside divisor 2..9, quotient 1.1..9.9 without trailing zero`);
      if (row0 !== `${D.s}÷${d}${eq}${fmtDec(qn, 1)}`) bad(`cells read "${row0}"`);
      break;
    }
    case 'decDivDec': {
      const m = num2(/^(\d+\.\d) ÷ (\d+\.\d)$/); if (!m) return bad(`unparsable text "${text}"`);
      const A = parseDec(m[0]); const B = parseDec(m[1]);
      if (A.n % B.n) bad(`${A.s} ÷ ${B.s} is not a whole number`);
      exp = { type: 'int', value: A.n / B.n };
      range((inR(B.n, 2, 9) || inR(B.n, 11, 29)) && inR(A.n / B.n, 2, 9), `${A.s} ÷ ${B.s} outside divisor 0.2..0.9 / 1.1..2.9, quotient 2..9`);
      if (row0 !== `${A.s}÷${B.s}${eq}${A.n / B.n}`) bad(`cells read "${row0}"`);
      break;
    }
    case 'gcdlcm': {
      const m = num2(/(\d+) (?:y|and) (\d+)$/); if (!m) return bad(`unparsable gcd/lcm text "${text}"`);
      const [a, b] = m.map(Number);
      const v = params.kind === 'gcd' ? gcd(a, b) : lcm(a, b);
      exp = { type: 'int', value: v };
      range(a !== b && a >= 4 && b >= 4 && a <= 54 && b <= 54 && inR(v, 2, 99), `${params.kind} of ${a}, ${b} = ${v} outside the stated range`);
      if (!row0.endsWith(`${a}${loc === 'es' ? 'y' : 'and'}${b}${eq}${v}`)) bad(`cells read "${row0}"`);
      break;
    }
    case 'order': {
      let v; try { v = evalExpr(text); } catch { return bad(`unparsable expression "${text}"`); }
      exp = { type: 'int', value: v };
      range(v > 0 && v <= 999, `result ${v} outside 1..999`);
      const ns = ints(text);
      if (/^\d+−\d+×\d+$/.test(text)) { const [x, b, c] = ns; range(inR(b, 2, 9) && inR(c, 2, 9) && inR(x, b * c + 1, b * c + 30), `${text}: x should be product+1..product+30`); } else range(ns.length === 3 && ns.every((n) => inR(n, 2, 9)), `operands ${ns} outside 2..9`);
      if (row0 !== `${text}${eq}${v}`) bad(`cells read "${row0}"`);
      break;
    }
    case 'round': {
      const n = ints(text)[0];
      const pl = /\b(decenas|ten)\b/.test(text) ? 1 : /\b(centenas|hundred)\b/.test(text) ? 2 : /\b(millares|thousand)\b/.test(text) ? 3 : 0;
      if (!pl) return bad(`no rounding place in "${text}"`);
      const unit = 10 ** pl; const v = Math.floor((n + unit / 2) / unit) * unit;
      exp = { type: 'int', value: v };
      range(inR(n, 1001, 99999) && pl <= Math.min(3, ndig(n) - 2), `${n} to 10^${pl} outside the stated range`);
      range(ndig(v) === ndig(n), `rounded ${v} changes the digit count of ${n}`);
      if (row0 !== `${n}→${v}`) bad(`cells read "${row0}"`);
      const placeWord = loc === 'es' ? ['', 'decenas', 'centenas', 'millares'][pl] : ['', 'ten', 'hundred', 'thousand'][pl];
      if (!p.title.toLowerCase().includes(placeWord)) out.push({ cat: 'text', msg: `title "${p.title}" does not name the place (${placeWord})` });
      break;
    }
    case 'percent': {
      const m = num2(/^(\d+)% (?:de|of) (\d+)$/); if (!m) return bad(`unparsable percent text "${text}"`);
      const [pc, base] = m.map(Number);
      const v = (base * pc) / 100;
      if (!Number.isInteger(v)) bad(`${pc}% of ${base} is not a whole number`);
      exp = { type: 'int', value: v };
      range([20, 40, 50, 60, 80, 100, 200, 300, 400, 500].includes(base) && [5, 10, 20, 25, 30, 40, 50, 60, 75].includes(pc) && v > 0, `${pc}% of ${base} outside the stated sets`);
      if (row0 !== `${pc}%${loc === 'es' ? 'de' : 'of'}${base}${eq}${v}`) bad(`cells read "${row0}"`);
      break;
    }
    case 'ratio': {
      const m = /^(\d+):(\d+)=(\d+):(\d+)$/.exec(row0); if (!m) return bad(`cells read "${row0}", expected x:y=X:Y`);
      const [x, y, X, Y] = m.slice(1).map(Number);
      if (X * y !== Y * x) bad(`${x}:${y} ≠ ${X}:${Y}`);
      const firstInput = p.cells.filter((c) => c.kind === 'input').sort((a, b) => a.c - b.c)[0];
      const secondColon = p.cells.filter((c) => c.kind === 'op' && c.text === ':').sort((a, b) => b.c - a.c)[0];
      const hiddenLeft = firstInput && secondColon && firstInput.c < secondColon.c;
      const v = hiddenLeft ? X : Y;
      exp = { type: 'int', value: v };
      info.k = X / x;
      range((text === `${x}:${y} = ?:${Y}` || text === `${x}:${y} = ${X}:?`) && gcd(x, y) === 1 && x !== y && inR(x, 1, 9) && inR(y, 1, 9) && inR(X / x, 2, 9), `${row0} outside reduced 1..9 ratios × 2..9`);
      const hint = p.steps[0]?.help?.text; if (hint && !ints(hint).includes(X / x)) bad(`ratio help "${hint}" should name the factor ${X / x}`);
      if (!/=/.test(text)) out.push({ cat: 'text', msg: `answerText "${p.answerText}" does not say which side is missing` });
      break;
    }
    case 'letter': {
      const m = /^x([×+−])(\d+)=(\d+)$/.exec(text); if (!m) return bad(`unparsable letter text "${text}"`);
      const a = +m[2]; const b = +m[3];
      const v = m[1] === '×' ? b / a : m[1] === '+' ? b - a : b + a;
      if (!Number.isInteger(v) || v <= 0) bad(`x${m[1]}${a}=${b} has no positive whole solution`);
      exp = { type: 'int', value: v };
      if (m[1] === '×') range(inR(a, 2, 9) && inR(v, 2, 12), `x×${a}=${b} outside a 2..9, x 2..12`);
      else if (m[1] === '+') range(inR(a, 6, 27) && a % 3 === 0 && inR(v, 2, 12), `x+${a}=${b} outside a in {6..27 step 3}, x 2..12`);
      else range(inR(a, 2, 9) && inR(b, 2, 12), `x−${a}=${b} outside a 2..9, result 2..12`);
      if (rowText(p, 0) !== text || rowText(p, 1) !== `x${eq}${v}`) bad(`cells read "${rowText(p, 0)}" / "${rowText(p, 1)}"`);
      const hn = ints(p.steps[0]?.help?.text || ''); if (hn.length === 2 && (m[1] === '×' ? hn[0] / hn[1] : m[1] === '+' ? hn[0] - hn[1] : hn[0] + hn[1]) !== v) bad(`letter help "${p.steps[0]?.help?.text}" does not give ${v}`);
      break;
    }
    case 'frac': exp = checkFrac(p, params, loc, out, info); if (!exp) return; break;
    case 'pow10': {
      const m = /^(\d+) ([×÷]) (\d+)$/.exec(p.text); if (!m) return bad(`unexpected text "${p.text}"`);
      const a = +m[1]; const k = +m[3];
      range([10, 100].includes(k) && (m[2] === '×' ? inR(a, 2, 99) && a % 10 !== 0 : a % k === 0 && inR(a / k, 2, 99) && (a / k) % 10 !== 0), `pow10 ${p.text}`);
      exp = { type: 'int', value: m[2] === '×' ? a * k : a / k }; break;
    }
    case 'multiples': {
      let m = /^multiple of (\d+) ≥ (\d+)$|^múltiplo de (\d+) ≥ (\d+)$/.exec(p.text);
      if (m) { const a = +(m[1] ?? m[3]); const lo = +(m[2] ?? m[4]); range(inR(a, 3, 9) && lo % a !== 0, `multiple ${p.text}`); exp = { type: 'int', value: Math.ceil(lo / a) * a }; break; }
      m = /^divisors of (\d+)$|^divisores de (\d+)$/.exec(p.text); if (!m) return bad(`unexpected text "${p.text}"`);
      const n = +(m[1] ?? m[2]); let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++;
      range(inR(c, 3, 9), `divisors ${p.text}`); exp = { type: 'int', value: c }; break;
    }
    default: return out.push({ cat: 'structure', msg: `no checker for generator ${gen}` });
  }
  if (!exp) return;
  const parsed = parseAnswer(p.answer);
  if (parsed.type === 'bad') bad(`unparsable answer "${p.answer}"`);
  else if (!sameAnswer(parsed, exp)) bad(`answer "${p.answer}", recomputed ${showAnswer(exp)}`);
  // Keypad order: whole part, denominator, numerator; quotient then remainder; decimals without the point.
  const typed = p.steps.map((s) => s.digit).join('');
  if (typed !== hTyped(parsed)) out.push({ cat: 'input', msg: `typed "${typed}" but the keypad order for ${p.answer} is "${hTyped(parsed)}"` });
  const inputs = p.cells.filter((c) => c.kind === 'input').length;
  if (inputs !== hTyped(parsed).length) out.push({ cat: 'input', msg: `${inputs} input cells for answer ${p.answer}` });
  if (parsed.type === 'mixed' || parsed.type === 'frac') {
    // Denominator cells sit one row under the numerator cells, same columns.
    const nCells = p.cells.filter((c) => c.kind === 'input' && c.cls === 'frac-n'); const dCells = p.cells.filter((c) => c.kind === 'input' && c.cls === 'frac-d');
    const nText = nCells.sort((a, b) => a.c - b.c).map((c) => c.text).join(''); const dText = dCells.sort((a, b) => a.c - b.c).map((c) => c.text).join('');
    if (nText !== String(parsed.n) || dText !== String(parsed.d)) bad(`fraction cells ${nText}/${dText} differ from ${p.answer}`);
    if (nCells.length && dCells.length && !(dCells[0].r === nCells[0].r + 1)) out.push({ cat: 'structure', msg: 'denominator not under the numerator' });
    if (parsed.type === 'mixed' && parsed.w === 0) out.push({ cat: 'text', msg: `mixed answer with whole 0: ${p.answer}` });
  }
  if (parsed.type === 'dec' && /0$/.test(p.answer)) out.push({ cat: 'range', msg: `decimal answer ${p.answer} ends in 0 (generator says excluded)` });
  return { ...exp, value: parsed.type === 'rem' ? parsed.q + parsed.r / (info.nums[1] || 1) : parsed.value, info };
}

function checkFrac(p, params, loc, out, info) {
  const text = p.text;
  const bad = (msg) => out.push({ cat: 'wrong', msg });
  const range = (cond, msg) => { if (!cond) out.push({ cat: 'range', msg }); };
  let m;
  if (params.op === 'reduce') {
    m = /^(\d+)\/(\d+)$/.exec(text); if (!m) return bad(`unparsable reduce text "${text}"`);
    const n = +m[1]; const d = +m[2]; const r = rat(n, d);
    range(gcd(n, d) >= 2 && gcd(n, d) <= 6 && inR(r.d, 2, 9) && r.n < r.d, `${text} is not a proper fraction scaled by 2..6 from a denominator 2..9`);
    return { type: 'frac', n: r.n, d: r.d, value: r.n / r.d };
  }
  if (params.op === 'addsub') {
    m = /^(?:(\d+) )?(\d+)\/(\d+) ([+−]) (?:(\d+) )?(\d+)\/(\d+)$/.exec(text); if (!m) return bad(`unparsable fraction text "${text}"`);
    const w1 = +(m[1] || 0); const n1 = +m[2]; const d1 = +m[3]; const add = m[4] === '+'; const w2 = +(m[5] || 0); const n2 = +m[6]; const d2 = +m[7];
    const A = { n: w1 * d1 + n1, d: d1 }; const B = { n: w2 * d2 + n2, d: d2 };
    const R = add ? ratAdd(A, B) : ratSub(A, B);
    if (R.n <= 0) out.push({ cat: 'range', msg: `${text} is not positive` });
    if (params.same) {
      if (d1 !== d2) bad(`denominators differ in a same-denominator skill: ${text}`);
      const res = add ? A.n + B.n : A.n - B.n; // kept over d, unreduced
      range(inR(d1, 3, 12) && inR(n1, 1, d1 - 1) && inR(n2, 1, d2 - 1), `${text} outside denominators 3..12 with proper parts`);
      if (params.mixed) {
        if (loc === 'ja') range(inR(w1, 1, 4) && inR(w2, 0, 3) && res % d1 !== 0 && gcd(res % d1, d1) === 1, `${text}: whole parts 1..4 / 0..3, non-integer result with an irreducible fraction part expected`);
        else range(w1 === 0 && w2 === 0 && res > d1 && gcd(res, d1) === 1, `${text}: es/en mixed skill expects two proper fractions whose irreducible sum passes 1`);
        return res >= d1 && loc === 'ja' ? { type: 'mixed', w: Math.floor(res / d1), n: res % d1, d: d1, value: res / d1 } : { type: 'frac', n: res, d: d1, value: res / d1 };
      }
      if (params.maxOne) range(res > 0 && res < d1, `${text} = ${res}/${d1} is not below 1`);
      if (m[1] || m[5]) bad(`whole numbers in a plain fraction skill: ${text}`);
      return { type: 'frac', n: res, d: d1, value: res / d1 };
    }
    range(d1 !== d2 && inR(d1, 2, 9) && inR(d2, 2, 9) && gcd(n1, d1) === 1 && gcd(n2, d2) === 1 && lcm(d1, d2) <= 36 && R.n < R.d, `${text} outside irreducible proper fractions, unlike denominators 2..9, lcm ≤ 36, result < 1`);
    return { type: 'frac', n: R.n, d: R.d, value: R.n / R.d };
  }
  if (params.op === 'muldivInt') {
    m = /^(\d+)\/(\d+) ([×÷]) (\d+)$/.exec(text); if (!m) return bad(`unparsable text "${text}"`);
    const n = +m[1]; const d = +m[2]; const k = +m[4];
    const R = m[3] === '×' ? rat(n * k, d) : rat(n, d * k);
    range(inR(d, 2, 9) && inR(n, 1, d - 1) && gcd(n, d) === 1 && inR(k, 2, 9) && R.d !== 1, `${text} outside proper irreducible × ÷ 2..9 with a non-integer result`);
    return { ...fmtRat(R, loc === 'ja'), value: R.n / R.d };
  }
  if (params.op === 'mul' || params.op === 'div') {
    m = /^(\d+)\/(\d+) ([×÷]) (\d+)\/(\d+)$/.exec(text); if (!m) return bad(`unparsable text "${text}"`);
    const A = { n: +m[1], d: +m[2] }; const B = { n: +m[4], d: +m[5] };
    if ((m[3] === '×') !== (params.op === 'mul')) bad(`operator ${m[3]} in a ${params.op} skill`);
    const R = m[3] === '×' ? ratMul(A, B) : ratDiv(A, B);
    range(inR(A.d, 2, 9) && inR(B.d, 2, 9) && inR(A.n, 1, 9) && inR(B.n, 1, 9) && gcd(A.n, A.d) === 1 && gcd(B.n, B.d) === 1 && A.n !== A.d && B.n !== B.d && R.d !== 1 && R.n <= 99 && R.d <= 99, `${text} outside the stated range (irreducible, non-integer, parts ≤ 99)`);
    return { ...fmtRat(R, loc === 'ja'), value: R.n / R.d };
  }
  if (params.op === 'decimal') {
    m = /^(\d\.\d) × (\d+)\/(\d+)$/.exec(text); if (!m) return bad(`unparsable text "${text}"`);
    const tv = parseDec(m[1]); const n = +m[2]; const d = +m[3];
    const R = ratMul({ n: tv.n, d: 10 }, { n, d });
    range([2, 4, 5, 6, 8].includes(tv.n) && inR(d, 2, 9) && inR(n, 1, d - 1) && gcd(n, d) === 1 && R.d !== 1 && R.n <= 99 && R.d <= 99, `${text} outside the stated range`);
    info.decimal = true;
    return { type: 'frac', n: R.n, d: R.d, value: R.n / R.d };
  }
  return bad(`unknown frac op ${params.op}`);
}

// --- skill-level range rules for the column generators.
function checkColumnRange(p, gen, params, a, b, out) {
  const range = (cond, msg) => { if (!cond) out.push({ cat: 'range', msg }); };
  if (gen === 'vadd') {
    const s = a.n + b.n; const c = carriesOf(a.n, b.n);
    range(inRange(ndig(a.n), params.da) && inRange(ndig(b.n), params.db), `${a.s} + ${b.s}: digit counts outside da ${JSON.stringify(params.da)} / db ${JSON.stringify(params.db)}`);
    range(ndig(s) <= params.maxDigits, `sum ${s} has more than ${params.maxDigits} digits`);
    range(params.carry === 'none' ? c === 0 : params.carry === 'some' ? c >= 1 : c >= 2, `carry rule "${params.carry}" broken by ${a.s} + ${b.s} (${c} carries)`);
  } else if (gen === 'vsub') {
    const br = borrowsOf(a.n, b.n);
    range(inRange(ndig(a.n), params.da) && inRange(ndig(b.n), params.db), `${a.s} − ${b.s}: digit counts outside da ${JSON.stringify(params.da)} / db ${JSON.stringify(params.db)}`);
    range(!params.aMax || a.n <= params.aMax, `${a.n} above aMax ${params.aMax}`);
    range(b.n < a.n, `${a.s} − ${b.s} not positive`);
    range(params.borrow === 'none' ? br === 0 : params.borrow === 'some' ? br >= 1 : br >= 2, `borrow rule "${params.borrow}" broken by ${a.s} − ${b.s} (${br} borrows)`);
  } else if (gen === 'vmul') {
    const P = (params.pa || 0) + (params.pb || 0); const prod = a.n * b.n;
    range(ndig(a.n) === params.da && a.p === (params.pa || 0) && b.p === (params.pb || 0), `${a.s} × ${b.s}: digits/places outside ${JSON.stringify(params)}`);
    range(params.db === 1 ? inR(b.n, 2, 9) : ndig(b.n) === params.db && b.n % 10 !== 0, `multiplier ${b.s} outside db ${params.db}`);
    range(a.n % 10 !== 0, `multiplicand ${a.s} ends in 0`);
    if (P) range(prod % 10 !== 0 && prod >= 10 ** P, `decimal product ${fmtDec(prod, P)} ends in 0 or is below 1`);
  } else if (gen === 'vdec') {
    const pa = params.places; const isSub = p.kind === 'sub';
    range(params.op === 'addsub' || (params.op === 'sub') === isSub, `${p.kind} problem in a ${params.op} skill`);
    range(a.p === pa && (b.p === pa || (pa === 2 && b.p === 1)), `${a.s} ${isSub ? '−' : '+'} ${b.s}: decimal places outside places ${pa}`);
    range(inR(a.n, 10 ** pa + 1, 3 * 10 ** (pa + 1) - 1) && inR(b.n, 1, 2 * 10 ** (b.p + 1) - 1), `${a.s}, ${b.s} outside the stated magnitudes`);
    range(a.n % 10 !== 0 && b.n % 10 !== 0, `operand ends in 0: ${a.s}, ${b.s}`);
    const P = Math.max(a.p, b.p); const res = isSub ? scaleTo(a, P) - scaleTo(b, P) : scaleTo(a, P) + scaleTo(b, P);
    range(res % 10 !== 0, `result ${fmtDec(res, P)} ends in 0 (generator says excluded)`);
    if (isSub) range(b.p <= a.p, 'subtrahend has more decimal places than the minuend');
  } else if (gen === 'vdiv') {
    const D = a.n; const d = b.n; const q = Math.floor(D / d);
    range(ndig(D) === params.dd, `dividend ${D} is not ${params.dd} digits`);
    range(params.ds === 1 ? inR(d, 2, 9) : inR(d, 11, 49), `divisor ${d} outside ds ${params.ds}`);
    range(D >= 2 * d, `${D} ÷ ${d}: dividend below twice the divisor`);
    if (params.ds === 2 && params.dd === 2) range(q <= 9, `${D} ÷ ${d}: quotient ${q} has two digits`);
  }
}

// Template (legacy) ranges from generate().
function checkTemplateRange(tpl, p, a, b, out) {
  const range = (cond, msg) => { if (!cond) out.push({ cat: 'range', msg }); };
  const A = a.n; const B = b.n;
  switch (tpl) {
    case 'add2': range(inR(A, 12, 68) && inR(B, 12, 77) && A + B < 100 && carriesOf(A, B) === 1 && A % 10 && B % 10, `add2 ${A} + ${B}`); break;
    case 'add3': range(inR(A, 120, 780) && inR(B, 120, 879) && A + B < 1000 && carriesOf(A, B) >= 2, `add3 ${A} + ${B}`); break;
    case 'add4': range(inR(A, 1200, 7800) && inR(B, 1200, 8799) && A + B < 10000 && carriesOf(A, B) >= 2, `add4 ${A} + ${B}`); break;
    case 'sub2': range(inR(A, 31, 98) && inR(B, 12, A - 10) && borrowsOf(A, B) === 1 && A - B >= 10, `sub2 ${A} − ${B}`); break;
    case 'sub3': range(inR(A, 120, 980) && inR(B, 25, A - 20) && borrowsOf(A, B) >= 1 && A - B >= 10, `sub3 ${A} − ${B}`); break;
    case 'sub3z': range(A > 150 && A % 100 >= 1 && A % 100 <= 9 && inR(B, 102, A - 50) && borrowsOf(A, B) >= 2 && Math.floor(B / 10) % 10 > 0, `sub3z ${A} − ${B}`); break;
    case 'sub4': range(inR(A, 2000, 9800) && inR(B, 300, A - 100) && borrowsOf(A, B) >= 2 && A - B >= 100, `sub4 ${A} − ${B}`); break;
    case 'div2': range(inR(B, 2, 4) && A % B === 0 && inR(A / B, 12, 49) && A < 100 && Math.floor(A / 10) >= B && (A / B) % 10, `div2 ${A} ÷ ${B}`); break;
    case 'div3': range(inR(B, 3, 9) && A % B === 0 && inR(A / B, 12, 99) && inR(A, 100, 999) && Math.floor(A / 100) < B && (A / B) % 10, `div3 ${A} ÷ ${B}`); break;
    default: out.push({ cat: 'structure', msg: `unknown template ${tpl}` });
  }
}

// Full check of one problem. Returns { issues, value } where value is the answer magnitude.
function checkProblem(p, ctx) {
  const out = [];
  checkStructure(p, out);
  checkTexts(p, out);
  let res = null;
  if (p.kind === 'add' || p.kind === 'sub' || p.kind === 'mul' || p.kind === 'div') {
    const m = /^(\d+(?:\.\d+)?) ([+−×÷]) (\d+(?:\.\d+)?)$/.exec(p.text);
    if (!m) out.push({ cat: 'wrong', msg: `unparsable column text "${p.text}"` });
    else {
      const a = parseDec(m[1]); const b = parseDec(m[3]);
      const opOf = { add: '+', sub: '−', mul: '×', div: '÷' };
      if (opOf[p.kind] !== m[2]) out.push({ cat: 'wrong', msg: `kind ${p.kind} but text uses ${m[2]}` });
      if (p.kind === 'add') res = checkAdd(p, a, b, out);
      else if (p.kind === 'sub') res = checkSub(p, a, b, out);
      else if (p.kind === 'mul') res = checkMul(p, a, b, out);
      else res = checkDiv(p, a.n, b.n, out, (w) => { if (w !== REM_WORDS[ctx.loc]) out.push({ cat: 'text', msg: `remainder word "${w}"` }); });
      if (res && p.kind !== 'div') { const parsed = parseAnswer(p.answer); const expS = res.dec.s; if (parsed.type === 'bad' || p.answer !== expS) out.push({ cat: 'wrong', msg: `answer "${p.answer}", recomputed ${expS}` }); if (/\.\d*0$/.test(p.answer)) out.push({ cat: 'range', msg: `decimal answer ${p.answer} ends in 0 (generator says excluded)` }); }
      if (ctx.gen) checkColumnRange(p, ctx.gen, ctx.params, a, b, out);
      if (ctx.template) checkTemplateRange(ctx.template, p, a, b, out);
      if (p.kind === 'div' && !p.rem && !p.cells.some((c) => c.id.startsWith('z'))) out.push({ cat: 'ux', msg: 'exact division whose last quotient digit is 0 never shows the final remainder 0' });
    }
  } else if (p.kind === 'h') {
    res = checkH(p, ctx.gen, ctx.params, ctx.loc, out);
  } else out.push({ cat: 'structure', msg: `unknown kind ${p.kind}` });
  // Grade-level sanity independent of the generator params.
  if (ctx.skill) {
    const g = ctx.skill.grade; const v = res && Number.isFinite(res.value) ? res.value : NaN;
    const nums = ints(p.text.replace(/\d+\.\d+/g, (d) => String(Math.round(Number(d)))));
    const maxOperand = Math.max(...nums, 0);
    const cap = { 1: 99, 2: 999, 3: 9999, 4: 99999, 5: 99999, 6: 99999 }[g];
    if (maxOperand > cap) out.push({ cat: 'range', msg: `operand ${maxOperand} too large for grade ${g}` });
    if (Number.isFinite(v) && v > cap * 100) out.push({ cat: 'range', msg: `answer ${v} too large for grade ${g}` });
    if (/^g1-(add-nc|add-c|add3)$/.test(ctx.skill.id) && v > 20) out.push({ cat: 'range', msg: `grade-1 sum ${v} above 20` });
    if (Number.isFinite(v) && v < 0) out.push({ cat: 'range', msg: `negative answer ${v}` });
  }
  return { issues: out, value: res ? res.value : NaN, key: `${p.text}|${p.answer}|${p.steps.map((s) => s.digit).join('')}` };
}

const HARD = new Set(['wrong', 'input', 'range', 'structure']);

// ------------------------------------------------------------------ self-test: every mutation of a valid problem must be caught
if (argv.includes('--self-test')) {
  setLocale('es', { persist: false, notify: false });
  const hardOf = (p, ctx) => checkProblem(p, ctx).issues.filter((i) => HARD.has(i.cat));
  const mutations = {
    'step digit +1 (cell too)': (p) => { const st = p.steps[p.steps.length >> 1]; st.digit = String((Number(st.digit) + 1) % 10); p.cells.find((c) => c.id === st.cell).text = st.digit; },
    'answer last digit +1': (p) => { const i = p.answer.search(/\d(?!.*\d)/); p.answer = p.answer.slice(0, i) + ((Number(p.answer[i]) + 1) % 10) + p.answer.slice(i + 1); },
    'text first number +1': (p) => { p.text = p.text.replace(/\d+/, (n) => String(Number(n) + 1)); },
    'drop last step': (p) => { p.steps.pop(); },
    'carry cell removed': (p) => { const i = p.cells.findIndex((c) => c.kind === 'carry'); if (i < 0) return false; p.cells.splice(i, 1); },
    'borrow mark altered': (p) => { const st = p.steps.find((s) => s.marks && s.marks.length); if (!st) return false; st.marks[0].text = String(Number(st.marks[0].text) + 1); },
    'division product altered': (p) => { const c = p.cells.find((x) => /^m\d+_\d+$/.test(x.id)); if (!c) return false; c.text = String((Number(c.text) + 1) % 10); },
    'input cell text ≠ step': (p) => { const c = p.cells.find((x) => x.kind === 'input'); c.text = String((Number(c.text) + 1) % 10); },
    'Japanese in title': (p, cat) => { p.title += ' たしざん'; cat.want = 'text'; },
    'placeholder in label': (p, cat) => { p.steps[0].label = 'Cociente: {place}'; cat.want = 'text'; },
  };
  const tally = {};
  let missed = 0;
  for (const sk of SKILLS) {
    const rng = makeRng(5);
    for (let i = 0; i < 12; i++) {
      const base = makeProblem(sk.id, rng);
      const ctx = { loc: 'es', gen: sk.gen[0], params: sk.gen[1], skill: sk };
      if (hardOf(base, ctx).length) { console.log(`self-test: baseline problem already fails (${sk.id} "${base.text}")`); missed += 1; continue; }
      for (const [name, mutate] of Object.entries(mutations)) {
        const p = structuredClone(base); const cat = { want: null };
        if (mutate(p, cat) === false) continue;
        const issues = checkProblem(p, ctx).issues;
        const caught = cat.want ? issues.some((x) => x.cat === cat.want) : issues.some((x) => HARD.has(x.cat));
        const tl = tally[name] || (tally[name] = { caught: 0, missed: 0 });
        if (caught) tl.caught += 1; else { tl.missed += 1; missed += 1; if (tl.missed <= 3) console.log(`self-test MISSED: ${name} on ${sk.id} "${base.text}" → "${p.answer}"`); }
      }
    }
  }
  console.log('| mutation | caught | missed |\n| --- | ---: | ---: |');
  for (const [name, tl] of Object.entries(tally)) console.log(`| ${name} | ${tl.caught} | ${tl.missed} |`);
  console.log(missed ? `self-test: ${missed} mutations slipped through` : 'self-test: every mutation was caught');
  process.exit(missed ? 1 : 0);
}

// ------------------------------------------------------------------ run
const report = { locales: {}, determinism: [], crossLocale: [], elapsedMs: 0, config: { PER_SKILL, PER_TEMPLATE, SEEDS } };
const strip = (p) => JSON.stringify({ t: p.text, a: p.answer, s: p.steps.map((s) => s.cell + s.digit), c: p.cells.map((c) => `${c.id}:${c.r},${c.c}:${c.text}`) });
const median = (arr) => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fmtV = (v) => (Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')) : '-');
const digitSeq = (p) => `${p.text.replace(/[^\d./]+/g, ' ').trim()}|${p.steps.map((s) => s.digit).join('')}`;

const failures = new Map(); // `${cat}|${msg-kind}` -> { cat, count, examples: [] }
const noteIssue = (loc, unit, seed, index, p, issue) => {
  const kind = issue.msg.replace(/"[^"]*"/g, '"…"').replace(/\d+(\.\d+)?/g, '#');
  const k = `${issue.cat}|${unit}|${kind}`;
  const f = failures.get(k) || { cat: issue.cat, unit, kind, count: 0, examples: [] };
  f.count += 1;
  if (f.examples.length < EXAMPLES) f.examples.push({ loc, unit, seed, index, text: p.text, answer: p.answer, title: p.title, msg: issue.msg });
  failures.set(k, f);
};

const perSeed = Math.ceil(PER_SKILL / SEEDS.length);
const perSeedT = Math.ceil(PER_TEMPLATE / SEEDS.length);
for (const loc of LOCALES) {
  setLocale(loc, { persist: false, notify: false });
  const L = { skills: {}, templates: {} };
  report.locales[loc] = L;
  for (const sk of SKILLS) {
    const [gen, params] = sk.gen;
    const sigs = new Set(); const keys = new Set(); const values = [];
    let softCount = 0; let n = 0;
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      for (let i = 0; i < perSeed; i++) {
        let p;
        try { p = makeProblem(sk.id, rng); } catch (e) { noteIssue(loc, sk.id, seed, i, { text: '', answer: '', title: '' }, { cat: 'structure', msg: `generator threw: ${e.message}` }); continue; }
        n += 1;
        const { issues, value, key } = checkProblem(p, { loc, gen, params, skill: sk });
        for (const is of issues) { if (is.cat === 'soft') softCount += 1; else noteIssue(loc, sk.id, seed, i, p, is); }
        sigs.add(signature(p)); keys.add(key); values.push(value);
      }
    }
    L.skills[sk.id] = { n, grade: sk.grade, gen, sigs: sigs.size, keys: keys.size, min: Math.min(...values), median: median(values), max: Math.max(...values), soft: softCount };
  }
  for (const tpl of TEMPLATES) {
    const sigs = new Set(); const values = []; let n = 0;
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      for (let i = 0; i < perSeedT; i++) {
        let p;
        try { p = generate(tpl, rng); } catch (e) { noteIssue(loc, `tpl:${tpl}`, seed, i, { text: '', answer: '', title: '' }, { cat: 'structure', msg: `generator threw: ${e.message}` }); continue; }
        n += 1;
        const { issues, value } = checkProblem(p, { loc, template: tpl });
        for (const is of issues) if (is.cat !== 'soft') noteIssue(loc, `tpl:${tpl}`, seed, i, p, is);
        if (tpl.startsWith('div') && p.rem) noteIssue(loc, `tpl:${tpl}`, seed, i, p, { cat: 'range', msg: 'template division must be exact' });
        sigs.add(signature(p)); values.push(value);
      }
    }
    L.templates[tpl] = { n, sigs: sigs.size, min: Math.min(...values), median: median(values), max: Math.max(...values) };
  }
  // Determinism: the same seed twice must give the same sequence.
  const units = [...SKILLS.map((s) => ['skill', s.id]), ...TEMPLATES.map((t) => ['tpl', t])];
  for (const [kind, id] of units) {
    const run = () => { const rng = makeRng(4242); const seq = []; for (let i = 0; i < 40; i++) seq.push(strip(kind === 'skill' ? makeProblem(id, rng) : generate(id, rng))); return seq.join('\n'); };
    if (run() !== run()) report.determinism.push({ loc, id, msg: 'seed 4242 gave two different sequences' });
  }
}
// The locales only change words: with one seed, both must produce the same numbers and keystrokes.
{
  const seqs = {};
  for (const loc of LOCALES) {
    setLocale(loc, { persist: false, notify: false });
    seqs[loc] = {};
    for (const sk of SKILLS) { const rng = makeRng(7); seqs[loc][sk.id] = Array.from({ length: 30 }, () => digitSeq(makeProblem(sk.id, rng))); }
  }
  for (const sk of SKILLS) {
    const a = seqs.es[sk.id]; const b = seqs.en[sk.id];
    const i = a.findIndex((x, j) => x !== b[j]);
    if (i >= 0) report.crossLocale.push({ id: sk.id, index: i, es: a[i], en: b[i] });
  }
}
report.elapsedMs = Math.round(performance.now() - t0);

// ------------------------------------------------------------------ markdown report
const lines = [];
const P = (s = '') => lines.push(s);
const fl = [...failures.values()];
const hard = fl.filter((f) => HARD.has(f.cat));
const textIssues = fl.filter((f) => f.cat === 'text' || f.cat === 'ux');
const totalGen = LOCALES.length * (SKILLS.length * perSeed * SEEDS.length + TEMPLATES.length * perSeedT * SEEDS.length);
P('# Problem generator fuzz report');
P();
P(`Generated ${totalGen.toLocaleString('en-US')} problems (${SKILLS.length} skills × ${perSeed * SEEDS.length} + ${TEMPLATES.length} templates × ${perSeedT * SEEDS.length}, locales ${LOCALES.join('/')}, seeds ${SEEDS.join(', ')}) in ${(report.elapsedMs / 1000).toFixed(1)} s.`);
P();
P(`Rerun: \`node tools/fuzz_problems.mjs --per-skill ${PER_SKILL} --per-template ${PER_TEMPLATE} --seeds ${SEEDS.join(',')}\` (reproduce one example: \`makeRng(seed)\` then call the generator \`index + 1\` times in that locale).`);
P();
P('## (a) Hard failures: wrong answers, impossible inputs, range violations');
P();
if (!hard.length) P('None. Every answer recomputed from the text/cells matched, every step is a single digit into an existing input cell, carries are 0/1, borrow marks follow the standard algorithm, long-division steps match a reference simulation, and every problem stayed inside its skill\'s stated ranges.');
else {
  P('| category | skill / template | issue (pattern) | count | examples (locale, seed, index: text → answer, detail) |');
  P('| --- | --- | --- | ---: | --- |');
  for (const f of hard.sort((x, y) => y.count - x.count)) P(`| ${f.cat} | ${f.unit} | ${f.kind} | ${f.count} | ${f.examples.map((e) => `${e.loc} s${e.seed} #${e.index}: "${e.text}" → "${e.answer}" (${e.msg})`).join('<br>')} |`);
}
P();
P('## Determinism');
P();
if (!report.determinism.length && !report.crossLocale.length) P('OK: for every skill and template the same seed yields the same sequence (cells, steps, texts), and es/en produce the same numbers and keystrokes for the same seed.');
for (const d of report.determinism) P(`- ${d.loc} ${d.id}: ${d.msg}`);
for (const d of report.crossLocale) P(`- ${d.id} diverges between locales at #${d.index}: es "${d.es}" vs en "${d.en}"`);
P();
P('## (b) Low-variety skills (distinct signatures over the generated set, per locale)');
P();
P('Signatures are `title|text` (what the repeat-avoidance uses); "distinct problems" also counts the answer and keystrokes, so a gap between the two means the signature hides different problems behind one text.');
P();
P(`| skill | grade | generator | distinct signatures (es / en) | distinct problems (es / en) | note |`);
P('| --- | ---: | --- | ---: | ---: | --- |');
const lows = [];
for (const sk of SKILLS) {
  const es = report.locales.es.skills[sk.id]; const en = report.locales.en.skills[sk.id];
  const low = Math.min(es.sigs, en.sigs) < LOW_VARIETY; const collapse = es.keys > es.sigs * 1.05;
  if (low || collapse) lows.push(`| ${sk.id} | ${sk.grade} | ${es.gen} | ${es.sigs} / ${en.sigs} | ${es.keys} / ${en.keys} | ${[low ? `fewer than ${LOW_VARIETY} distinct problems` : '', collapse ? 'signature collapses distinct problems' : ''].filter(Boolean).join('; ')} |`);
}
if (lows.length) lines.push(...lows); else P(`| (none below ${LOW_VARIETY}) | | | | | |`);
P();
P('Templates (legacy basic set):');
P();
P('| template | distinct signatures (es) | answer min / median / max |');
P('| --- | ---: | --- |');
for (const tpl of TEMPLATES) { const s = report.locales.es.templates[tpl]; P(`| ${tpl} | ${s.sigs} | ${fmtV(s.min)} / ${fmtV(s.median)} / ${fmtV(s.max)} |`); }
P();
P('## (c) Answer magnitude per skill (es run; en is identical)');
P();
P('Answer value = the number the child ends up with (fractions and mixed numbers as their value, "q r r" divisions as q + r/d). Rows marked ⚠ have an unusual range for the grade.');
P();
P('| skill | grade | generator | min | median | max | distinct sigs | flag |');
P('| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |');
const flagRange = (sk, s) => {
  const f = [];
  if (sk.grade === 1 && s.max > 99) f.push('grade-1 answer above 99');
  if (sk.grade === 2 && s.max > 999) f.push('grade-2 answer above 999');
  if (/kuku/.test(sk.id) && s.max > 81) f.push('above 9×9');
  if (s.max === s.min) f.push('constant answer');
  if (s.min === 0) f.push('answer 0 occurs');
  return f.join('; ');
};
for (const sk of SKILLS) { const s = report.locales.es.skills[sk.id]; const flag = flagRange(sk, s); P(`| ${sk.id} | ${sk.grade} | ${s.gen} | ${fmtV(s.min)} | ${fmtV(s.median)} | ${fmtV(s.max)} | ${s.sigs} | ${flag ? `⚠ ${flag}` : ''} |`); }
P();
P('## (d) Text issues (Japanese leftovers, undefined/NaN/null, double spaces, unfilled placeholders, odd answer texts)');
P();
if (!textIssues.length) P('None.');
else {
  P('| skill / template | issue (pattern) | count | examples |');
  P('| --- | --- | ---: | --- |');
  for (const f of textIssues.sort((x, y) => y.count - x.count)) P(`| ${f.unit} | ${f.kind} | ${f.count} | ${f.examples.map((e) => `${e.loc} s${e.seed} #${e.index}: ${e.msg}`).join('<br>')} |`);
}
const softTotal = Object.values(report.locales.es.skills).reduce((s, x) => s + x.soft, 0);
P();
P(`Soft notes: ${softTotal} help-highlight ids (es run) point at cells that do not exist (e.g. \`b1\` when the subtrahend is shorter); the UI filters them, so nothing breaks.`);
P();
P(`Elapsed: ${(report.elapsedMs / 1000).toFixed(1)} s. Hard failures: ${hard.reduce((s, f) => s + f.count, 0)}. Text issues: ${textIssues.reduce((s, f) => s + f.count, 0)}.`);

console.log(lines.join('\n'));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ ...report, failures: fl }, null, 2));
process.exitCode = hard.length || report.determinism.length ? 1 : 0;
