// Problem generation and layouts. Every problem is a small grid of cells
// (digits, operators, lines) plus an ordered list of input steps; each step
// is one digit typed into one cell. Layout families:
//   column add/sub (with decimals), column multiplication, long division,
//   and horizontal expressions (integers, decimals, fractions, remainders).
import { SKILL } from './skills.js';
import { t, isJapanese } from './i18n.js';

const ops = () => ({
  plus: t('p.op.plus'), minus: t('p.op.minus'), times: t('p.op.times'),
  div: t('p.op.div'), eq: t('p.op.eq'), colon: t('p.op.colon'),
});
// Japanese words are about half a digit wide in the sheet; Latin ones are not.
const wordWidth = (text) => (isJapanese() ? Math.max(1, Math.ceil(text.length / 2)) : Math.max(1, text.length));
const wordToken = (key) => ({ w: t(`p.word.${key}`), wKey: key });

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const placeName = (i) => t(`p.place.${i + 1}`);
const decPlaceName = (i) => t(`p.decPlace.${i + 1}`);
const digits = (n) => String(n).split('').map(Number);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
// Multiples of d up to the first one above n (hint for "how many d in n").
const table = (d, n) => { const out = []; for (let k = 1; k <= 9; k++) { out.push(d * k); if (d * k > n) break; } return t('p.help.table', { d, list: out.join(' ') }); };
// Decimal string for an integer scaled by 10^p (1234, 2 -> "12.34").
const decStr = (n, p) => { if (!p) return String(n); const s = String(n).padStart(p + 1, '0'); return `${s.slice(0, -p)}.${s.slice(-p)}`; };

function carries(a, b) {
  let c = 0; let n = 0;
  while (a > 0 || b > 0) { const s = (a % 10) + (b % 10) + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); }
  return n;
}
function borrows(a, b) {
  let br = 0; let n = 0;
  while (a > 0) { const t = (a % 10) - br - (b % 10); br = t < 0 ? 1 : 0; n += br; a = Math.floor(a / 10); b = Math.floor(b / 10); }
  return n;
}
const hasZeroBorrow = (a, b) => { const as = String(a); const bs = String(b).padStart(as.length, '0'); for (let i = 1; i < as.length - 1; i++) if (as[i] === '0' && bs[i] === '0' && Number(as[as.length - 1]) < Number(bs[bs.length - 1])) return true; return false; };

// ================================================================ column add / sub
// a, b are integers scaled by 10^pa / 10^pb; the decimal point is aligned.
function buildAdd(a, b, pa = 0, pb = 0) {
  const P = Math.max(pa, pb);
  const A = a * 10 ** (P - pa); const B = b * 10 ** (P - pb);
  const sum = A + B;
  const as = decDigits(A, P); const bs = decDigits(B, P); const ss = decDigits(sum, P);
  const W = Math.max(as.length, bs.length, ss.length);
  const cols = W + 1;
  const cells = [];
  // Hide padded trailing zeros of the shorter decimal.
  const shown = (str, p, i) => i < str.length - (P - p);
  as.forEach((d, i) => { if (shown(as, pa, i)) cells.push({ id: `a${cols - as.length + i}`, r: 1, c: cols - as.length + i, text: d, kind: 'given' }); });
  bs.forEach((d, i) => { if (shown(bs, pb, i)) cells.push({ id: `b${cols - bs.length + i}`, r: 2, c: cols - bs.length + i, text: d, kind: 'given' }); });
  cells.push({ id: 'op', r: 2, c: cols - Math.max(as.length, bs.length) - 1, text: ops().plus, kind: 'op' });
  if (P) addDots(cells, cols - 1 - P, [1, 2, 3]);
  const steps = [];
  let carry = 0;
  const ad = as.slice().reverse().map(Number); const bd = bs.slice().reverse().map(Number);
  for (let i = 0; i < ss.length; i++) {
    const c = cols - 1 - i;
    const s = (ad[i] || 0) + (bd[i] || 0) + carry;
    const carryIn = carry;
    carry = s >= 10 ? 1 : 0;
    const terms = [ad[i], bd[i]].filter((x, k) => x !== undefined && (k === 0 ? shown(as, pa, as.length - 1 - i) : shown(bs, pb, bs.length - 1 - i)));
    const help = { ids: [`a${c}`, `b${c}`, ...(carryIn ? [`k${c}`] : [])], text: terms.length ? `${terms.join(` ${ops().plus} `)}${carryIn ? ` ${ops().plus} 1` : ''}` : t('p.step.carryOne') };
    const digit = ss[ss.length - 1 - i];
    cells.push({ id: `s${c}`, r: 3, c, text: digit, kind: 'input' });
    const after = [];
    if (carry && i < ss.length - 1) { cells.push({ id: `k${c - 1}`, r: 0, c: c - 1, text: '1', kind: 'carry', small: true }); after.push(`k${c - 1}`); }
    steps.push({ cell: `s${c}`, digit, label: placeLabel(i, P), after, carryFrom: after.length ? c : null, help, diag: { kind: 'add', carryIn: !!carryIn, sum: s } });
  }
  const text = `${decStr(a, pa)} + ${decStr(b, pb)}`;
  return { kind: 'add', a, b, answer: decStr(sum, P), text, title: P ? t('p.title.addDec') : t('p.title.add'), rows: 4, cols, cells, lines: [{ r: 2, c0: 0, c1: cols - 1 }], steps, bracket: null };
}

function buildSub(a, b, pa = 0, pb = 0) {
  const P = Math.max(pa, pb);
  const A = a * 10 ** (P - pa); const B = b * 10 ** (P - pb);
  const res = A - B;
  const as = decDigits(A, P); const bs = decDigits(B, P);
  const rsFull = decDigits(res, P);
  const W = as.length;
  const cols = W + 1;
  const cells = [];
  const shown = (str, p, i) => i < str.length - (P - p);
  as.forEach((d, i) => { if (shown(as, pa, i)) cells.push({ id: `a${i + 1}`, r: 1, c: i + 1, text: d, kind: 'given' }); });
  bs.forEach((d, i) => { if (shown(bs, pb, i)) cells.push({ id: `b${cols - bs.length + i}`, r: 2, c: cols - bs.length + i, text: d, kind: 'given' }); });
  cells.push({ id: 'op', r: 2, c: 0, text: ops().minus, kind: 'op' });
  if (P) addDots(cells, cols - 1 - P, [1, 2, 3]);
  const cur = [null, ...as.map(Number)];
  const bcol = (c) => { const i = c - (cols - bs.length); return i >= 0 ? Number(bs[i]) : 0; };
  const steps = [];
  for (let i = 0; i < rsFull.length; i++) {
    const c = cols - 1 - i;
    const marks = [];
    // Diagnosis data (lessons.js): did this column lend 1, does it borrow?
    const lent = cur[c] === Number(as[c - 1]) - 1;
    const borrowed = cur[c] < bcol(c);
    if (borrowed) {
      let k = c - 1;
      while (cur[k] === 0) { cur[k] = 9; marks.push({ c: k, text: '9' }); k -= 1; }
      cur[k] -= 1; marks.push({ c: k, text: String(cur[k]) });
      cur[c] += 10; marks.push({ c, text: String(cur[c]) });
    }
    const digit = rsFull[rsFull.length - 1 - i];
    cells.push({ id: `s${c}`, r: 3, c, text: digit, kind: 'input' });
    const help = { ids: [`a${c}`, `b${c}`, `m${c}`], text: `${cur[c]} ${ops().minus} ${bcol(c)}` };
    steps.push({ cell: `s${c}`, digit, label: placeLabel(i, P), after: [], marks, help, diag: { kind: 'sub', top: cur[c], bottom: bcol(c), borrowed, lent } });
  }
  for (let c = 1; c < cols; c++) cells.push({ id: `m${c}`, r: 0, c, text: '', kind: 'mark', small: true });
  const text = `${decStr(a, pa)} − ${decStr(b, pb)}`;
  return { kind: 'sub', a, b, answer: decStr(res, P), text, title: P ? t('p.title.subDec') : t('p.title.sub'), rows: 4, cols, cells, lines: [{ r: 2, c0: 0, c1: cols - 1 }], steps, bracket: null };
}

// Digits of a scaled decimal, with at least one digit before the point.
function decDigits(n, p) { return String(n).padStart(p + 1, '0').split(''); }
function placeLabel(i, P) { return i < P ? decPlaceName(P - 1 - i) : placeName(i - P); }
// Decimal points sit on the right edge of the ones column in each row.
function addDots(cells, c, rows, hidden = false) { rows.forEach((r) => cells.push({ id: `dot${r}`, r, c, text: '.', kind: hidden ? 'auto' : 'dot' })); }

// ================================================================ column multiplication
// a × b with b of 1 or 2 digits; pa/pb decimal places (product point is placed at the end).
function buildMul(a, b, pa = 0, pb = 0) {
  const prod = a * b;
  const as = String(a); const bs = String(b); const ps = String(prod);
  const cols = Math.max(ps.length, as.length, bs.length + 1) + 1;
  const cells = [];
  [...as].forEach((d, i) => cells.push({ id: `a${cols - as.length + i}`, r: 1, c: cols - as.length + i, text: d, kind: 'given' }));
  [...bs].forEach((d, i) => cells.push({ id: `b${cols - bs.length + i}`, r: 2, c: cols - bs.length + i, text: d, kind: 'given' }));
  cells.push({ id: 'op', r: 2, c: cols - Math.max(as.length, bs.length) - 1, text: ops().times, kind: 'op' });
  if (pa) cells.push({ id: 'dota', r: 1, c: cols - 1 - pa, text: '.', kind: 'dot' });
  if (pb) cells.push({ id: 'dotb', r: 2, c: cols - 1 - pb, text: '.', kind: 'dot' });
  const lines = [{ r: 2, c0: 0, c1: cols - 1 }];
  const steps = [];
  const bd = digits(b).reverse();
  const partialRow = (row, factor, shift, tag) => {
    const part = String(a * factor);
    let carry = 0;
    const ad = digits(a).reverse();
    for (let i = 0; i < part.length; i++) {
      const c = cols - 1 - shift - i;
      const digit = part[part.length - 1 - i];
      cells.push({ id: `${tag}${c}`, r: row, c, text: digit, kind: 'input' });
      const x = ad[i];
      const help = x !== undefined ? { ids: [`a${c + shift}`, `b${cols - 1 - shift}`], text: `${x} ${ops().times} ${factor}${carry ? ` ${ops().plus} ${carry}` : ''}` } : { ids: [], text: t('p.step.carryN', { n: carry }) };
      carry = x !== undefined ? Math.floor((x * factor + carry) / 10) : 0;
      steps.push({ cell: `${tag}${c}`, digit, label: t('p.step.timesFactor', { f: factor }), after: [], help });
    }
  };
  if (bs.length === 1) {
    partialRow(3, b, 0, 's');
  } else {
    partialRow(3, bd[0], 0, 'p');
    partialRow(4, bd[1], 1, 'q');
    lines.push({ r: 4, c0: 0, c1: cols - 1 });
    const p1 = a * bd[0]; const p2 = a * bd[1] * 10;
    let carry = 0;
    for (let i = 0; i < ps.length; i++) {
      const c = cols - 1 - i;
      const x = Math.floor(p1 / 10 ** i) % 10; const y = i ? Math.floor(p2 / 10 ** i) % 10 : 0;
      const digit = ps[ps.length - 1 - i];
      cells.push({ id: `s${c}`, r: 5, c, text: digit, kind: 'input' });
      const help = { ids: [`p${c}`, `q${c}`], text: `${x}${i ? ` ${ops().plus} ${y}` : ''}${carry ? ` ${ops().plus} ${carry}` : ''}` };
      carry = Math.floor((x + y + carry) / 10);
      steps.push({ cell: `s${c}`, digit, label: t('p.step.addPlace', { place: placeName(i) }), after: [], help });
    }
  }
  const P = pa + pb;
  const lastRow = bs.length === 1 ? 3 : 5;
  if (P) { cells.push({ id: 'dotp', r: lastRow, c: cols - 1 - P, text: '.', kind: 'auto' }); steps[steps.length - 1].after.push('dotp'); }
  const text = `${decStr(a, pa)} × ${decStr(b, pb)}`;
  return { kind: 'mul', a, b, answer: decStr(prod, P), text, title: P ? t('p.title.mulDec') : t('p.title.mul'), rows: lastRow + 1, cols, cells, lines, steps, bracket: null };
}

// ================================================================ long division
// D ÷ d (d of 1-2 digits), integer quotient, remainder allowed.
function buildDiv(D, d) {
  const Ds = String(D); const ds = String(d);
  const off = ds.length; // dividend columns start after the divisor
  const cols = off + Ds.length;
  const cells = [];
  [...ds].forEach((x, i) => cells.push({ id: `dv${i}`, r: 1, c: i, text: x, kind: 'given' }));
  [...Ds].forEach((x, i) => cells.push({ id: `D${i + 1}`, r: 1, c: off + i, text: x, kind: 'given' }));
  const q = Math.floor(D / d); const rem = D % d;
  // First partial dividend: fewest leading digits that are >= d.
  let k = 1;
  while (Number(Ds.slice(0, k)) < d && k < Ds.length) k += 1;
  let cur = Number(Ds.slice(0, k));
  let col = off + k - 1;
  let rowP = 1; // row holding the current partial dividend
  const steps = [];
  const lines = [];
  const place = (n, endCol, r, prefix, kind) => digits(n).map((x, i, arr) => {
    const c = endCol - (arr.length - 1 - i);
    const id = `${prefix}${r}_${c}`;
    cells.push({ id, r, c, text: String(x), kind });
    return id;
  });
  const divIds = [...ds].map((_, i) => `dv${i}`);
  for (;;) {
    const qd = Math.floor(cur / d);
    const qid = `q${col}`;
    cells.push({ id: qid, r: 0, c: col, text: String(qd), kind: 'input' });
    const last = col === cols - 1;
    const qStep = { cell: qid, digit: String(qd), label: t('p.step.quotientPlace', { place: placeName(cols - 1 - col) }), hint: t('p.help.divHowMany', { cur, d }), after: [], help: { ids: divIds, text: table(d, cur) }, diag: { kind: 'divq', cur, d } };
    steps.push(qStep);
    let r = cur;
    if (qd > 0) {
      const m = qd * d;
      const pr = rowP + 1;
      const mids = place(m, col, pr, 'm', 'auto');
      const lid = `L${pr}`;
      lines.push({ id: lid, r: pr, c0: col - String(Math.max(m, cur)).length + 1, c1: col, hidden: true });
      qStep.after.push(...mids, lid);
      r = cur - m;
      rowP = pr + 1;
      // Remainder of this subtraction, typed right to left (omitted when 0 and more digits follow).
      if (r === 0 && last) {
        // Exact division: the final 0 appears on its own.
        const zid = `z${rowP}_${col}`;
        cells.push({ id: zid, r: rowP, c: col, text: '0', kind: 'auto' });
        qStep.after.push(zid);
      } else if (r > 0) {
        const rs = String(r);
        for (let i = rs.length - 1; i >= 0; i--) {
          const c = col - (rs.length - 1 - i);
          const id = `r${rowP}_${c}`;
          cells.push({ id, r: rowP, c, text: rs[i], kind: 'input' });
          steps.push({ cell: id, digit: rs[i], label: t('p.step.afterSub'), hint: `${cur} ${ops().minus} ${m}`, after: [], help: { ids: mids, text: `${cur} ${ops().minus} ${m}` } });
        }
      }
    }
    if (last) break;
    // Bring down the next digit beside the remainder.
    const nextDigit = Ds[col - off + 1];
    const bid = `bd${rowP}_${col + 1}`;
    cells.push({ id: bid, r: rowP, c: col + 1, text: nextDigit, kind: 'auto', drop: `D${col - off + 2}` });
    steps[steps.length - 1].after.push(bid);
    cur = r * 10 + Number(nextDigit);
    col += 1;
  }
  const row = rowP;
  const rows = row + 1;
  const answer = rem ? t('p.answer.remainder', { q, r: rem }) : String(q);
  return {
    kind: 'div', a: D, b: d, answer, text: `${D} ÷ ${d}`, title: t('p.title.div'), rows, cols, cells, lines, steps,
    bracket: { r: 1, c0: off, c1: cols - 1 }, rem,
  };
}

// ================================================================ horizontal expressions
// tokens: { n: '12' } given number, { op: '＋' }, { w: 'あまり' } word,
// { ans: '12.5' } answer (digits typed left to right, point auto),
// { f: [n, d, whole?] } given fraction, { fa: [n, d, whole?] } answer fraction,
// { br: true } line break.
function buildH(tokens, meta) {
  const hasFrac = tokens.some((t) => t.f || t.fa);
  const cells = []; const lines = []; const steps = [];
  const rowH = hasFrac ? 2 : 1;
  let r = 0; let c = 0; let maxC = 0;
  let uid = 0;
  const id = (p) => `${p}${uid++}`;
  const span = { rs: rowH };
  const ansIds = [];
  for (const tok of tokens) {
    if (tok.br) { maxC = Math.max(maxC, c); c = 0; r += rowH; continue; }
    if (tok.n !== undefined || tok.op !== undefined || tok.w !== undefined) {
      const text = String(tok.n ?? tok.op ?? tok.w);
      const kind = tok.n !== undefined ? 'given' : tok.op !== undefined ? 'op' : 'word';
      const w = kind === 'word' ? wordWidth(text) : kind === 'given' ? text.replace('.', '').length : 1;
      const cid = id(kind[0]);
      cells.push({ id: cid, r, c, cs: w, ...span, text, kind });
      if (kind === 'given') ansIds.push(cid);
      c += w;
    } else if (tok.ans !== undefined) {
      const s = String(tok.ans);
      for (const ch of s) {
        if (ch === '.') { cells.push({ id: id('dot'), r, c: c - 1, ...span, text: '.', kind: 'dot' }); continue; }
        const cid = id('x');
        cells.push({ id: cid, r, c, ...span, text: ch, kind: 'input' });
        steps.push({ cell: cid, digit: ch, label: tok.label || t('p.step.answer'), after: [], help: meta.help ? { ids: [...ansIds], text: meta.help } : null });
        c += 1;
      }
    } else if (tok.f || tok.fa) {
      const [n, d, whole] = tok.f || tok.fa;
      const given = !!tok.f;
      if (whole) {
        const ws = String(whole);
        if (given) { cells.push({ id: id('w'), r, c, cs: ws.length, ...span, text: ws, kind: 'given' }); c += ws.length; } else {
          for (const ch of ws) { const cid = id('x'); cells.push({ id: cid, r, c, ...span, text: ch, kind: 'input' }); steps.push({ cell: cid, digit: ch, label: t('p.step.integerPart'), after: [], help: meta.help ? { ids: [], text: meta.help } : null }); c += 1; }
        }
      }
      const ns = String(n); const dsx = String(d);
      const w = Math.max(ns.length, dsx.length);
      lines.push({ r, c0: c, c1: c + w - 1, frac: true });
      if (given) {
        cells.push({ id: id('n'), r, c, cs: w, text: ns, kind: 'given', cls: 'frac-n' });
        cells.push({ id: id('d'), r: r + 1, c, cs: w, text: dsx, kind: 'given', cls: 'frac-d' });
      } else {
        // Denominator first, then numerator (as taught in school).
        const put = (str, row, label, cls) => [...str].forEach((ch, i) => {
          const cid = id('x');
          cells.push({ id: cid, r: row, c: c + w - str.length + i, text: ch, kind: 'input', cls });
          steps.push({ cell: cid, digit: ch, label, after: [], help: meta.help ? { ids: [], text: meta.help } : null });
        });
        put(dsx, r + 1, t('p.step.denominator'), 'frac-d');
        put(ns, r, t('p.step.numerator'), 'frac-n');
      }
      c += w;
    }
    maxC = Math.max(maxC, c);
  }
  return { kind: 'h', rows: r + rowH, cols: Math.max(maxC, c), cells, lines, steps, bracket: null, ...meta };
}

// ================================================================ generators
const R = (rng) => (a, b) => a + Math.floor(rng() * (b - a + 1));
const pickOf = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const range = (v, rng) => (Array.isArray(v) ? R(rng)(v[0], v[1]) : v);
const nDigit = (r, n) => r(10 ** (n - 1), 10 ** n - 1);
const reduce = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
// Fraction answer token, as a mixed number when requested.
function fracAns(n, d, mixed) {
  [n, d] = reduce(n, d);
  if (mixed && n > d) return { fa: [n % d, d, Math.floor(n / d)], text: t('p.text.mixed', { w: Math.floor(n / d), n: n % d, d }) };
  return { fa: [n, d], text: `${n}/${d}` };
}
const fracTok = (n, d, whole) => ({ f: [n, d, whole] });

const GEN = {
  compose(rng, { total }) {
    const a = R(rng)(1, total - 1);
    if (!isJapanese()) {
      // "7 + □ = 10" reads better than a literal translation of the Japanese.
      return buildH([{ n: a }, { op: ops().plus }, { ans: total - a }, { op: ops().eq }, { n: total }], {
        title: t('p.title.compose'), text: `${a} + ${total - a} = ${total}`, answerText: `${a} + ${total - a} = ${total}`,
        answer: String(total - a), help: t('p.help.compose', { a, total }),
      });
    }
    return buildH([{ n: total }, wordToken('is'), { n: a }, wordToken('and'), { ans: total - a }], { title: t('p.title.compose'), text: t('p.text.compose', { total, a }), answer: String(total - a), help: t('p.help.compose', { a, total }) });
  },
  hadd(rng, { a, b, carry, tensToo }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      let x; let y;
      if (tensToo && rng() < 0.3) { x = r(1, 8) * 10; y = r(1, 9 - x / 10) * 10; } else { x = range(a, rng); y = range(b, rng); }
      const c = carries(x, y);
      if (carry === 'none' && c) continue;
      if (carry === 'yes' && !c) continue;
      if (rng() < 0.5 && !tensToo) [x, y] = [y, x];
      const help = carry === 'yes' ? t('p.help.carryTo10', { x, n: 10 - (x % 10) }) : t('p.help.addPlain', { x, y });
      return buildH([{ n: x }, { op: ops().plus }, { n: y }, { op: ops().eq }, { ans: x + y }], { title: t('p.title.add'), text: `${x} + ${y}`, answer: String(x + y), help });
    }
    throw new Error('hadd');
  },
  hsub(rng, { a, b, borrow, tensToo }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      let x; let y;
      if (tensToo && rng() < 0.3) { x = r(2, 9) * 10; y = r(1, x / 10 - 1) * 10; } else { x = range(a, rng); y = range(b, rng); }
      if (y >= x) continue;
      const br = borrows(x, y);
      if (borrow === 'none' && br) continue;
      if (borrow === 'yes' && !br) continue;
      const help = borrow === 'yes' ? t('p.help.sub10', { y, r: 10 - y }) : t('p.help.subPlain', { x, y });
      return buildH([{ n: x }, { op: ops().minus }, { n: y }, { op: ops().eq }, { ans: x - y }], { title: t('p.title.sub'), text: `${x} − ${y}`, answer: String(x - y), help });
    }
    throw new Error('hsub');
  },
  add3(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const a = r(1, 9); const b = r(1, 9); const c = r(1, 9);
      const o1 = rng() < 0.6 ? ops().plus : ops().minus; const o2 = rng() < 0.6 ? ops().plus : ops().minus;
      const s1 = o1 === ops().plus ? a + b : a - b; if (s1 < 0) continue;
      const s2 = o2 === ops().plus ? s1 + c : s1 - c; if (s2 < 0 || s2 > 20) continue;
      return buildH([{ n: a }, { op: o1 }, { n: b }, { op: o2 }, { n: c }, { op: ops().eq }, { ans: s2 }], { title: t('p.title.add3'), text: `${a}${o1}${b}${o2}${c}`, answer: String(s2), help: t('p.help.first', { a, op: o1, b, s: s1 }) });
    }
    throw new Error('add3');
  },
  kuku(rng, { dans }) {
    const a = pickOf(rng, dans); const b = R(rng)(1, 9);
    return buildH([{ n: a }, { op: ops().times }, { n: b }, { op: ops().eq }, { ans: a * b }], { title: t('p.title.mul'), text: `${a} × ${b}`, answer: String(a * b), help: table(a, a * (b - 1)) });
  },
  mulTens(rng) {
    const a = R(rng)(1, 9) * 10; const b = R(rng)(2, 9);
    return buildH([{ n: a }, { op: ops().times }, { n: b }, { op: ops().eq }, { ans: a * b }], { title: t('p.title.mul'), text: `${a} × ${b}`, answer: String(a * b), help: t('p.help.mulTens', { a: a / 10, b }) });
  },
  fracOf(rng, { dens }) {
    const d = pickOf(rng, dens); const q = R(rng)(1, 9);
    const toks = !isJapanese()
      ? [fracTok(1, d), wordToken('of'), { n: q * d }, wordToken('is'), { ans: q }]
      : [{ n: q * d }, wordToken('of'), fracTok(1, d), wordToken('is'), { ans: q }];
    return buildH(toks, { title: t('p.title.frac'), text: t('p.text.fracOf', { n: q * d, d }), answer: String(q), help: t('p.help.splitFrac', { n: q * d, d }) });
  },
  div(rng) {
    const d = R(rng)(2, 9); const q = R(rng)(1, 9);
    return buildH([{ n: q * d }, { op: ops().div }, { n: d }, { op: ops().eq }, { ans: q }], { title: t('p.title.div'), text: `${q * d} ÷ ${d}`, answer: String(q), help: table(d, q * d) });
  },
  divRem(rng) {
    const d = R(rng)(2, 9); const q = R(rng)(1, 9); const rem = R(rng)(1, d - 1);
    const D = q * d + rem;
    return buildH([{ n: D }, { op: ops().div }, { n: d }, { op: ops().eq }, { ans: q, label: t('p.step.quotient') }, wordToken('remainder'), { ans: rem, label: t('p.step.remainder') }], { title: t('p.title.divRem'), text: `${D} ÷ ${d}`, answer: t('p.answer.remainder', { q, r: rem }), help: table(d, D) });
  },
  divTens(rng) {
    const r = R(rng);
    for (let g = 0; g < 200; g++) {
      const d = r(2, 9);
      if (rng() < 0.5) { const q = r(1, 9); if (q * d * 10 > 99) continue; return buildH([{ n: q * d * 10 }, { op: ops().div }, { n: d }, { op: ops().eq }, { ans: q * 10 }], { title: t('p.title.div'), text: `${q * d * 10} ÷ ${d}`, answer: String(q * 10), help: t('p.help.divTensPart', { a: q * d, b: d }) }); }
      const tn = r(1, 4); const o = r(1, 4); const D = (tn * 10 + o) * d; if (D > 99 || Math.floor(D / 10) % d || (D % 10) % d) continue;
      return buildH([{ n: D }, { op: ops().div }, { n: d }, { op: ops().eq }, { ans: D / d }], { title: t('p.title.div'), text: `${D} ÷ ${d}`, answer: String(D / d), help: t('p.help.divTensSplit', { a: Math.floor(D / 10) * 10, b: d, c: D % 10 }) });
    }
    throw new Error('divTens');
  },
  vadd(rng, { da, db, carry, maxDigits }) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      const a = nDigit(r, range(da, rng)); const b = nDigit(r, range(db, rng));
      const s = a + b; const c = carries(a, b);
      if (String(s).length > maxDigits) continue;
      if (carry === 'none' && c) continue;
      if (carry === 'some' && !c) continue;
      if (carry === 'many' && c < 2) continue;
      return buildAdd(a, b);
    }
    throw new Error('vadd');
  },
  vsub(rng, { da, db, borrow, aMax }) {
    const r = R(rng);
    for (let g = 0; g < 800; g++) {
      let a = nDigit(r, range(da, rng)); const b = nDigit(r, range(db, rng));
      if (borrow === 'zero' && rng() < 0.6) a = Math.floor(a / 100) * 100 + r(0, 9);
      if (aMax && a > aMax) continue;
      if (b >= a) continue;
      const br = borrows(a, b);
      if (borrow === 'none' && br) continue;
      if (borrow === 'some' && !br) continue;
      if (borrow === 'zero' && !(br >= 2 && (hasZeroBorrow(a, b) || rng() < 0.3))) continue;
      return buildSub(a, b);
    }
    throw new Error('vsub');
  },
  vmul(rng, { da, db, pa = 0, pb = 0 }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const a = nDigit(r, da); const b = db === 1 ? r(2, 9) : nDigit(r, db);
      if (a % 10 === 0 || (db > 1 && b % 10 === 0)) continue;
      const P = pa + pb; const prod = a * b;
      if (P && (prod % 10 === 0 || prod < 10 ** P)) continue;
      return buildMul(a, b, pa, pb);
    }
    throw new Error('vmul');
  },
  vdiv(rng, { dd, ds }) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      const d = ds === 1 ? r(2, 9) : r(11, 49);
      const D = nDigit(r, dd);
      if (D < d * 2) continue;
      const q = Math.floor(D / d);
      if (ds === 2 && dd === 2 && q > 9) continue;
      if (String(q).length < dd - ds && rng() < 0.5) continue;
      return buildDiv(D, d);
    }
    throw new Error('vdiv');
  },
  vdec(rng, { op, places }) {
    const r = R(rng);
    const o = op === 'addsub' ? (rng() < 0.5 ? 'add' : 'sub') : op;
    for (let g = 0; g < 600; g++) {
      const pa = places; const pb = places === 2 && rng() < 0.4 ? 1 : places;
      const a = r(10 ** pa + 1, 10 ** (pa + 1) * 3 - 1); const b = r(10 ** pb * 0 + 1, 10 ** (pb + 1) * 2 - 1);
      if (a % 10 === 0 || b % 10 === 0) continue;
      const P = Math.max(pa, pb);
      const A = a * 10 ** (P - pa); const B = b * 10 ** (P - pb);
      if (o === 'add') { if ((A + B) % 10 === 0) continue; return buildAdd(a, b, pa, pb); }
      if (A <= B || (A - B) % 10 === 0 || pb > pa) continue;
      return buildSub(a, b, pa, pb);
    }
    throw new Error('vdec');
  },
  decDivInt(rng) {
    const r = R(rng);
    for (let g = 0; g < 200; g++) {
      const d = r(2, 9); const q = r(11, 99); if (q % 10 === 0) continue;
      const D = q * d; if (D % 10 === 0 || D > 999) continue;
      return buildH([{ n: decStr(D, 1) }, { op: ops().div }, { n: d }, { op: ops().eq }, { ans: decStr(q, 1) }], { title: t('p.title.divDec'), text: `${decStr(D, 1)} ÷ ${d}`, answer: decStr(q, 1), help: t('p.help.decDivThink', { a: D, b: d }) });
    }
    throw new Error('decDivInt');
  },
  decDivDec(rng) {
    const r = R(rng);
    const d = r(2, 9); const q = r(2, 9);
    if (rng() < 0.5) { const D = d * q; return buildH([{ n: decStr(D, 1) }, { op: ops().div }, { n: decStr(d, 1) }, { op: ops().eq }, { ans: q }], { title: t('p.title.divDec'), text: `${decStr(D, 1)} ÷ ${decStr(d, 1)}`, answer: String(q), help: t('p.help.decDivSame', { a: D, b: d }) }); }
    const d2 = r(11, 29); const D2 = d2 * q;
    return buildH([{ n: decStr(D2, 1) }, { op: ops().div }, { n: decStr(d2, 1) }, { op: ops().eq }, { ans: q }], { title: t('p.title.divDec'), text: `${decStr(D2, 1)} ÷ ${decStr(d2, 1)}`, answer: String(q), help: t('p.help.decDivSame', { a: D2, b: d2 }) });
  },
  gcdlcm(rng, { kind }) {
    const r = R(rng);
    for (let g = 0; g < 200; g++) {
      const k = r(2, 9); const a = k * r(1, 6); const b = k * r(1, 6);
      if (a === b || a < 4 || b < 4) continue;
      const ans = kind === 'gcd' ? gcd(a, b) : lcm(a, b);
      if (ans === 1 || ans > 99) continue;
      const w = kind === 'gcd' ? t('p.short.gcd') : t('p.short.lcm');
      const wTitle = kind === 'gcd' ? t('p.title.gcd') : t('p.title.lcm');
      const help = kind === 'gcd' ? t('p.help.gcd') : t('p.help.lcm', { n: Math.max(a, b) });
      const toks = !isJapanese()
        ? [{ w }, { w: t('p.word.of') }, { n: a }, { w: t('p.word.and') }, { n: b }, { op: ops().eq }, { ans }]
        : [{ n: a }, { w: t('p.word.and') }, { n: b }, { w: t('p.word.of') }, { br: true }, { w }, { op: ops().eq }, { ans }];
      return buildH(toks, { title: wTitle, text: t('p.text.gcdlcm', { a, b, w: wTitle }), answer: String(ans), help });
    }
    throw new Error('gcdlcm');
  },
  order(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const a = r(2, 9); const b = r(2, 9); const c = r(2, 9);
      const form = r(0, 3);
      let toks; let ans; let help;
      if (form === 0) { ans = a + b * c; toks = [{ n: a }, { op: ops().plus }, { n: b }, { op: ops().times }, { n: c }]; help = t('p.help.orderFirst', { a: b, op: ops().times, b: c }); }
      else if (form === 1) { ans = a * (b + c); toks = [{ n: a }, { op: ops().times }, { op: '(' }, { n: b }, { op: ops().plus }, { n: c }, { op: ')' }]; help = t('p.help.orderFirst', { a: b, op: ops().plus, b: c }); }
      else if (form === 2) { if (a <= b) continue; ans = (a - b) * c; toks = [{ op: '(' }, { n: a }, { op: ops().minus }, { n: b }, { op: ')' }, { op: ops().times }, { n: c }]; help = t('p.help.orderFirst', { a, op: ops().minus, b }); }
      else { const bc = b * c; const x = r(bc + 1, bc + 30); ans = x - bc; toks = [{ n: x }, { op: ops().minus }, { n: b }, { op: ops().times }, { n: c }]; help = t('p.help.orderFirst', { a: b, op: ops().times, b: c }); }
      if (ans <= 0 || ans > 999) continue;
      return buildH([...toks, { op: ops().eq }, { ans }], { title: t('p.title.order'), text: toks.map((tk) => tk.n ?? tk.op).join(''), answer: String(ans), help });
    }
    throw new Error('order');
  },
  round(rng) {
    const r = R(rng);
    const n = r(1001, 99999); const len = String(n).length;
    const pl = r(1, Math.min(3, len - 2));
    const unit = 10 ** pl; const ans = Math.round(n / unit) * unit;
    if (String(ans).length > len) return GEN.round(rng);
    const place = t(`p.round.place.${pl}`);
    const digitPlace = t(`p.round.digit.${pl}`);
    const toks = !isJapanese()
      ? [{ n }, { op: '→' }, { ans }]
      : [{ n }, { w: t('p.word.to') }, { br: true }, { w: place }, { op: '→' }, { ans }];
    // The Spanish and English sheets have no room for the place words, so the title carries them.
    const approx = t('p.word.approx', { place });
    const title = !isJapanese() ? approx[0].toUpperCase() + approx.slice(1) : t('p.title.round');
    return buildH(toks, { title, text: t('p.text.round', { n, place }), answer: String(ans), help: t('p.help.round', { place: digitPlace }) });
  },
  percent(rng) {
    const r = R(rng);
    for (let g = 0; g < 200; g++) {
      const base = pickOf(rng, [20, 40, 50, 60, 80, 100, 200, 300, 400, 500]); const p = pickOf(rng, [5, 10, 20, 25, 30, 40, 50, 60, 75]);
      const ans = (base * p) / 100; if (!Number.isInteger(ans) || ans === 0) continue;
      const toks = !isJapanese()
        ? [{ n: p }, { op: '%' }, wordToken('of'), { n: base }, { op: ops().eq }, { ans }]
        : [{ n: base }, wordToken('of'), { n: p }, { op: '%' }, { op: ops().eq }, { ans }];
      return buildH(toks, { title: t('p.title.percent'), text: t('p.text.percent', { n: base, p }), answer: String(ans), help: t('p.help.percent', { a: base, b: p / 100 }) });
    }
    throw new Error('percent');
  },
  ratio(rng) {
    const r = R(rng);
    const a = r(1, 9); const b = r(1, 9); if (a === b) return GEN.ratio(rng);
    const [x, y] = reduce(a, b); const k = r(2, 9);
    const hideLeft = rng() < 0.5;
    const toks = hideLeft ? [{ n: x }, { op: ops().colon }, { n: y }, { op: ops().eq }, { ans: x * k }, { op: ops().colon }, { n: y * k }] : [{ n: x }, { op: ops().colon }, { n: y }, { op: ops().eq }, { n: x * k }, { op: ops().colon }, { ans: y * k }];
    return buildH(toks, { title: t('p.title.ratio'), text: `${x}:${y}`, answer: String(hideLeft ? x * k : y * k), help: t('p.help.ratio', { k }) });
  },
  letter(rng) {
    const r = R(rng);
    const x = r(2, 12); const a = r(2, 9);
    const form = r(0, 2);
    let toks; let help;
    if (form === 0) { toks = [{ n: 'x' }, { op: ops().times }, { n: a }, { op: ops().eq }, { n: x * a }]; help = `${x * a} ${ops().div} ${a}`; }
    else if (form === 1) { toks = [{ n: 'x' }, { op: ops().plus }, { n: a * 3 }, { op: ops().eq }, { n: x + a * 3 }]; help = `${x + a * 3} ${ops().minus} ${a * 3}`; }
    else { toks = [{ n: 'x' }, { op: ops().minus }, { n: a }, { op: ops().eq }, { n: x }]; help = `${x} ${ops().plus} ${a}`; return buildH([...toks, { br: true }, { n: 'x' }, { op: ops().eq }, { ans: x + a }], { title: t('p.title.letter'), text: toks.map((tk) => tk.n ?? tk.op ?? tk.w).join(''), answer: String(x + a), help }); }
    return buildH([...toks, { br: true }, { n: 'x' }, { op: ops().eq }, { ans: x }], { title: t('p.title.letter'), text: toks.map((tk) => tk.n ?? tk.op ?? tk.w).join(''), answer: String(x), help });
  },
  frac(rng, { op, same, maxOne, mixed }) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      if (op === 'reduce') {
        const d = r(2, 9); const n = r(1, d - 1); const k = r(2, 6); if (gcd(n, d) !== 1) continue;
        return buildH([fracTok(n * k, d * k), { op: ops().eq }, { fa: [n, d] }], { title: t('p.title.reduce'), text: `${n * k}/${d * k}`, answer: `${n}/${d}`, help: t('p.help.reduce', { k }) });
      }
      if (op === 'addsub' && same) {
        const d = r(3, 12); const add = rng() < 0.55;
        if (mixed) {
          const w1 = r(1, 4); const w2 = r(0, 3); const n1 = r(1, d - 1); const n2 = r(1, d - 1);
          const A = w1 * d + n1; const B = w2 * d + n2;
          const res = add ? A + B : A - B; if (res <= 0 || res % d === 0) continue;
          if (gcd(res % d, d) !== 1 && res % d) continue;
          const t1 = fracTok(n1, d, w1); const t2 = fracTok(n2, d, w2 || undefined);
          const fa = { fa: [res % d, d, Math.floor(res / d) || undefined] };
          const text = `${t('p.text.mixed', { w: w1, n: n1, d })} ${add ? '+' : '−'} ${t('p.text.mixed', { w: w2, n: n2, d })}`;
          return buildH([t1, { op: add ? ops().plus : ops().minus }, t2, { op: ops().eq }, fa], { title: t('p.title.fracAddSub'), text, answer: res >= d ? t('p.text.mixed', { w: Math.floor(res / d), n: res % d, d }) : `${res}/${d}`, help: t('p.help.fracSameDen', { d }) });
        }
        const n1 = r(1, d - 1); const n2 = r(1, d - 1);
        const res = add ? n1 + n2 : n1 - n2;
        if (res <= 0 || (maxOne && res >= d)) continue;
        return buildH([fracTok(n1, d), { op: add ? ops().plus : ops().minus }, fracTok(n2, d), { op: ops().eq }, { fa: [res, d] }], { title: t('p.title.fracAddSub'), text: `${n1}/${d} ${add ? '+' : '−'} ${n2}/${d}`, answer: `${res}/${d}`, help: t('p.help.fracSameDen', { d }) });
      }
      if (op === 'addsub') {
        const d1 = r(2, 9); const d2 = r(2, 9); if (d1 === d2) continue;
        const n1 = r(1, d1 - 1); const n2 = r(1, d2 - 1); if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) continue;
        const add = rng() < 0.55; const L = lcm(d1, d2); if (L > 36) continue;
        const res = add ? n1 * (L / d1) + n2 * (L / d2) : n1 * (L / d1) - n2 * (L / d2);
        if (res <= 0 || res >= L) continue;
        const [rn, rd] = reduce(res, L);
        return buildH([fracTok(n1, d1), { op: add ? ops().plus : ops().minus }, fracTok(n2, d2), { op: ops().eq }, { fa: [rn, rd] }], { title: t('p.title.fracAddSub'), text: `${n1}/${d1} ${add ? '+' : '−'} ${n2}/${d2}`, answer: `${rn}/${rd}`, help: t('p.help.fracCommon', { d: L }) });
      }
      if (op === 'muldivInt') {
        const d = r(2, 9); const n = r(1, d - 1); const k = r(2, 9); if (gcd(n, d) !== 1) continue;
        const mul = rng() < 0.5;
        const [rn, rd] = mul ? reduce(n * k, d) : reduce(n, d * k);
        if (rd === 1) continue;
        const a = fracAns(rn, rd, true);
        return buildH([fracTok(n, d), { op: mul ? ops().times : ops().div }, { n: k }, { op: ops().eq }, a], { title: t('p.title.fracInt'), text: `${n}/${d} ${mul ? '×' : '÷'} ${k}`, answer: a.text, help: mul ? t('p.help.fracMulInt', { k }) : t('p.help.fracDivInt', { k }) });
      }
      if (op === 'mul' || op === 'div') {
        const d1 = r(2, 9); const n1 = r(1, 9); const d2 = r(2, 9); const n2 = r(1, 9);
        if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1 || n1 === d1 || n2 === d2) continue;
        const [rn, rd] = op === 'mul' ? reduce(n1 * n2, d1 * d2) : reduce(n1 * d2, d1 * n2);
        if (rd === 1 || rn > 99 || rd > 99) continue;
        const a = fracAns(rn, rd, true);
        return buildH([fracTok(n1, d1), { op: op === 'mul' ? ops().times : ops().div }, fracTok(n2, d2), { op: ops().eq }, a], { title: op === 'mul' ? t('p.title.fracMul') : t('p.title.fracDiv'), text: `${n1}/${d1} ${op === 'mul' ? '×' : '÷'} ${n2}/${d2}`, answer: a.text, help: op === 'mul' ? t('p.help.fracMul') : t('p.help.fracDiv', { n: n2, d: d2 }) });
      }
      if (op === 'decimal') {
        const tv = pickOf(rng, [2, 4, 5, 6, 8]); const d = r(2, 9); const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
        const [rn, rd] = reduce(tv * n, 10 * d);
        if (rd === 1 || rn > 99 || rd > 99) continue;
        return buildH([{ n: decStr(tv, 1) }, { op: ops().times }, fracTok(n, d), { op: ops().eq }, { fa: [rn, rd] }], { title: t('p.title.fracDec'), text: `${decStr(tv, 1)} × ${n}/${d}`, answer: `${rn}/${rd}`, help: t('p.help.fracDec', { a: decStr(tv, 1), n: tv, d: 10 }) });
      }
    }
    throw new Error(`frac ${op}`);
  },
};

// Signature used to avoid repeats.
export const signature = (p) => `${p.title}|${p.text}`;

// Make one problem for a skill, avoiding signatures in `recent` when possible.
export function makeProblem(skillId, rng, recent = null) {
  const sk = SKILL[skillId];
  if (!sk) throw new Error(`unknown skill ${skillId}`);
  const [name, params] = sk.gen;
  let p;
  for (let tries = 0; tries < 40; tries++) {
    p = GEN[name](rng, params);
    if (!recent || !recent.has(signature(p))) break;
  }
  p.skill = skillId;
  return finalize(p);
}

function finalize(p) {
  p.answerText = p.answerText || `${p.text} ${ops().eq} ${p.answer}`;
  return p;
}

// ================================================================ legacy templates (fixed basic set)
export const BASIC_SETS = {
  6: ['add2', 'add2', 'sub2', 'div2', 'add3', 'div3'],
  10: ['add2', 'add2', 'sub2', 'sub3', 'div2', 'div3', 'add3', 'sub3z', 'div3', 'div3'],
  14: ['add2', 'add2', 'sub2', 'add2', 'sub3', 'div2', 'div2', 'add3', 'sub3', 'div3', 'sub3z', 'add3', 'div3', 'div3'],
};
export const EXTRA_TIERS = [['add3', 'sub3'], ['div3', 'sub3z'], ['add4', 'div3'], ['sub4', 'add4'], ['sub4', 'div3']];

export function generate(template, rng, fixed) {
  const r = (a, b) => a + Math.floor(rng() * (b - a + 1));
  if (fixed) return finalize(fixed.kind === 'add' ? buildAdd(fixed.a, fixed.b) : fixed.kind === 'sub' ? buildSub(fixed.a, fixed.b) : buildDiv(fixed.a, fixed.b));
  for (let guard = 0; guard < 500; guard++) {
    let a; let b;
    switch (template) {
      case 'add2': a = r(12, 68); b = r(12, 89 - a); if (a + b < 100 && carries(a, b) === 1 && a % 10 && b % 10) return finalize(buildAdd(a, b)); break;
      case 'add3': a = r(120, 780); b = r(120, 999 - a); if (a + b < 1000 && carries(a, b) >= 2) return finalize(buildAdd(a, b)); break;
      case 'add4': a = r(1200, 7800); b = r(1200, 9999 - a); if (a + b < 10000 && carries(a, b) >= 2) return finalize(buildAdd(a, b)); break;
      case 'sub2': a = r(31, 98); b = r(12, a - 10); if (borrows(a, b) === 1 && a - b >= 10) return finalize(buildSub(a, b)); break;
      case 'sub3': a = r(120, 980); b = r(25, a - 20); if (borrows(a, b) >= 1 && a - b >= 10) return finalize(buildSub(a, b)); break;
      case 'sub3z': a = r(1, 9) * 100 + r(1, 9); b = r(102, a - 50); if (a > 150 && borrows(a, b) >= 2 && Math.floor(b / 10) % 10 > 0) return finalize(buildSub(a, b)); break;
      case 'sub4': a = r(2000, 9800); b = r(300, a - 100); if (borrows(a, b) >= 2 && a - b >= 100) return finalize(buildSub(a, b)); break;
      case 'div2': { const d = r(2, 4); const q = r(12, 49); a = q * d; if (a < 100 && Math.floor(a / 10) >= d && q % 10) return finalize(buildDiv(a, d)); break; }
      case 'div3': { const d = r(3, 9); const q = r(12, 99); a = q * d; if (a >= 100 && a < 1000 && Math.floor(a / 100) < d && q % 10) return finalize(buildDiv(a, d)); break; }
      default: throw new Error(`unknown template ${template}`);
    }
  }
  throw new Error(`failed to generate ${template}`);
}

export const _internal = { buildAdd, buildSub, buildMul, buildDiv, buildH, GEN, decStr };
