// End-to-end check of the localization: boots app/index.html + app/js/main.js
// in jsdom, plays a full round plus the extra, visits every screen, switches
// language from Settings and back, and fails if any Japanese is left on screen
// in a public language (es, en).
//
// jsdom is not a dependency of this repository (the game itself needs none),
// so point JSDOM_PATH at an installed copy, or install jsdom and rerun:
//   JSDOM_PATH=/path/to/jsdom/lib/api.js node tools/dom_smoke.mjs
//   SMOKE_LANG=en node tools/dom_smoke.mjs      # same run in English
//   SMOKE_LANG=ja node tools/dom_smoke.mjs      # source language (no leak check)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

let JSDOM;
try {
  ({ JSDOM } = await import(process.env.JSDOM_PATH || 'jsdom'));
} catch {
  console.log('dom smoke skipped: jsdom not found (set JSDOM_PATH)');
  process.exit(0);
}

const target = process.env.SMOKE_LANG || 'es';
const root = pathToFileURL(`${import.meta.dirname}/../`).href;
const html = readFileSync(new URL('app/index.html', root), 'utf8');
// A short extra keeps the second half of the run quick.
// The app ships in Spanish and English; `?lang=ja` keeps the source language reachable.
const dom = new JSDOM(html, { url: `http://localhost/?extra=2&lang=${target}`, pretendToBeVisual: true });
const { window } = dom;

// jsdom has no canvas, no SVG geometry and no fonts; stub what the show needs.
const ctxStub = new Proxy({}, {
  get: (t, key) => {
    if (key === 'canvas') return {};
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => ctxStub;
  },
  set: () => true,
});
window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
window.Element.prototype.scrollTo = window.Element.prototype.scrollTo || function () {};
window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
window.SVGElement.prototype.getTotalLength = window.SVGElement.prototype.getTotalLength || function () { return 120; };
Object.defineProperty(window.document, 'fonts', { value: { ready: Promise.resolve() } });

const globals = {
  window, document: window.document, navigator: window.navigator, location: window.location,
  localStorage: window.localStorage, innerWidth: 1280, innerHeight: 800,
  requestAnimationFrame: (cb) => window.requestAnimationFrame(cb),
  cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
  matchMedia: window.matchMedia ? window.matchMedia.bind(window) : () => ({ matches: false }),
  addEventListener: window.addEventListener.bind(window),
  removeEventListener: window.removeEventListener.bind(window),
  getComputedStyle: window.getComputedStyle.bind(window),
  Image: window.Image, Event: window.Event, MouseEvent: window.MouseEvent, KeyboardEvent: window.KeyboardEvent,
};
for (const [k, v] of Object.entries(globals)) Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true });

const failures = [];
process.on('uncaughtException', (e) => { console.error('uncaught:', e.stack); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('unhandled:', e && e.stack ? e.stack : e); process.exit(1); });
process.on('exit', (code) => { if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; } });

await import(new URL('app/js/main.js', root).href);
const i18n = await import(new URL('app/js/i18n.js', root).href);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => window.document.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const key = (k) => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true }));
const japanese = /[ぁ-んァ-ヶ一-龠]/;

// Only the current screen counts: the other screens and hidden dialogs keep
// their start-up placeholders until they are shown.
const scan = (label) => {
  const screen = window.document.querySelector(`#screen-${window.__dopa.S.screen}`);
  const clone = screen && screen.cloneNode(true);
  if (clone) clone.querySelectorAll('#logo').forEach((el) => el.remove());
  const parts = [clone, window.document.querySelector('#guide:not([hidden])'),
    ...[...window.document.querySelectorAll('.modal:not([hidden])')]];
  const text = parts.filter(Boolean).map((el) => el.textContent).join(' ')
    .replace(/日本語/g, 'Japanese').replace(/\s+/g, ' ').trim();
  const leftovers = [...new Set((text.match(/[^\s]*[ぁ-んァ-ヶ一-龠][^\s]*/g) || []))];
  if (target !== 'ja' && leftovers.length) failures.push(`${label}: Japanese visible: ${leftovers.join(' / ')}`);
  return text;
};

const play = async (stop) => {
  for (let guard = 0; guard < 4000; guard++) {
    await sleep(20);
    const S = window.__dopa.S;
    if (S.screen === stop) return;
    if (S.screen !== 'play' || !S.ready || !S.problem) continue;
    const st = S.problem.steps[S.step];
    if (!st) continue;
    // One slip every so often, to exercise the "almost" path too.
    if (guard % 23 === 5 && !S.wrongInQ) key(String((Number(st.digit) + 3) % 10));
    else key(st.digit);
  }
};

await sleep(150);
if (!$('#guide').hidden) click($('#guide-skip'));
await sleep(80);
$('#motion').value = '0'; // reduced motion: the run stays quick and deterministic
$('#motion').dispatchEvent(new window.Event('input', { bubbles: true }));
await sleep(60);
if (window.document.documentElement.lang !== target) failures.push(`start-up language is ${window.document.documentElement.lang}, expected ${target}`);

console.log(`[title] ${scan('title')}`);
click($('#open-trophy'));
await sleep(150);
console.log(`[trophies] ${scan('trophies').slice(0, 200)}`);
click($('#trophy-back'));
await sleep(120);
click($('#open-tree'));
await sleep(150);
console.log(`[tree] ${scan('tree').slice(0, 160)}`);
click($('#tree-back'));
await sleep(120);
click($('#open-collect'));
await sleep(150);
console.log(`[collection] ${scan('collection').slice(0, 160)}`);
click($('#collect-back'));
await sleep(120);

// Language switch from Settings: everything JS drew must follow, then back.
if (target !== 'ja') {
  const other = target === 'es' ? 'en' : 'es';
  const checkTitle = (loc) => {
    const doc = window.document;
    if (doc.documentElement.lang !== loc) failures.push(`after switching: lang is ${doc.documentElement.lang}, expected ${loc}`);
    const month = i18n.t(`month.${new Date().getMonth() + 1}`);
    if (!$('#cal-title').textContent.includes(month)) failures.push(`${loc}: calendar title not redrawn (${$('#cal-title').textContent})`);
    const sound = $('[data-toggle="sound"] b').textContent;
    if (sound !== i18n.t('settings.on') && sound !== i18n.t('settings.off')) failures.push(`${loc}: sound toggle not redrawn (${sound})`);
    if ($(`.lang-pick [data-lang="${loc}"]`).getAttribute('aria-checked') !== 'true') failures.push(`${loc}: language picker not updated`);
  };
  click($('#open-settings'));
  await sleep(80);
  click($(`.lang-pick [data-lang="${other}"]`));
  await sleep(60);
  checkTitle(other);
  if (window.localStorage.getItem('dopa-drill:lang') !== other) failures.push('language choice was not saved');
  console.log(`[settings ${other}] ${scan(`settings ${other}`).slice(0, 200)}`);
  click($('#close-settings'));
  await sleep(80);
  console.log(`[title ${other}] ${scan(`title ${other}`).slice(0, 200)}`);
  click($('#open-settings'));
  await sleep(80);
  click($(`.lang-pick [data-lang="${target}"]`));
  await sleep(60);
  checkTitle(target);
  click($('#close-settings'));
  await sleep(80);
}

click($('.pick [data-count="6"]'));
await sleep(60);
click($('#start'));
await play('result');
await sleep(500);
console.log(`[result] ${scan('result').slice(0, 260)}`);

if (!$('#go-extra').hidden) {
  click($('#go-extra'));
  await play('final');
  await sleep(900);
  console.log(`[final] ${scan('final').slice(0, 260)}`);
  click($('#again'));
  await sleep(900);
}
if (!$('#bonus').hidden) { scan('bonus'); click($('#bonus-ok')); await sleep(300); }
if ($('#day-log').hidden && $('.cal-day.played')) { click($('.cal-day.played')); await sleep(200); console.log(`[day log] ${scan('day log').slice(0, 160)}`); }

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`dom smoke ok (${target})`);
process.exit(0);
