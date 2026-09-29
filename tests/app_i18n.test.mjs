// Public languages (es, en), start-up detection and fallbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale, getLocale, initialLocale, deviceLocale, localeTag, nf, isJapanese, keys, dictionary, PUBLIC_LOCALES } from '../app/js/i18n.js';
import { fmtDopa, unitOf, unitLabel } from '../app/js/scoring.js';
import { makeProblem, makeRng } from '../app/js/problems.js';

const nav = (...languages) => ({ languages, language: languages[0] });

test('only Spanish and English are offered', () => {
  assert.deepEqual(PUBLIC_LOCALES, ['es', 'en']);
});

test('device language: any Spanish variant is Spanish, everything else English', () => {
  assert.equal(deviceLocale(nav('es-MX', 'en-US')), 'es');
  assert.equal(deviceLocale(nav('es')), 'es');
  assert.equal(deviceLocale(nav('en-GB')), 'en');
  assert.equal(deviceLocale(nav('ja-JP')), 'en');
  assert.equal(deviceLocale(nav('pt-BR', 'es-ES')), 'en');
  assert.equal(deviceLocale({}), 'en');
});

test('?lang= wins, and Japanese is reachable only that way', () => {
  assert.equal(initialLocale('?lang=ja', nav('es-ES')), 'ja');
  assert.equal(initialLocale('?lang=en', nav('es-ES')), 'en');
  assert.equal(initialLocale('?lang=xx', nav('ja-JP')), 'en');
});

test('English never falls back to Japanese', () => {
  setLocale('en', { persist: false, notify: false });
  try {
    assert.equal(getLocale(), 'en');
    assert.equal(localeTag(), 'en-US');
    assert.equal(nf(1234567), '1,234,567');
    assert.equal(isJapanese(), false);
    const en = dictionary('en');
    assert.deepEqual(keys().filter((k) => en[k] === undefined), []);
    assert.equal(t('settings.language'), 'Language');
    assert.equal(fmtDopa(6.4), '2.5 million');
    assert.equal(unitOf(3.5), 'thousand');
    assert.equal(unitLabel('hundred'), '100');
  } finally {
    setLocale('es', { persist: false, notify: false });
  }
});

test('English problems use the western word order', () => {
  setLocale('en', { persist: false, notify: false });
  try {
    const rng = makeRng(5);
    const p = makeProblem('g5-percent', rng);
    const words = p.cells.map((c) => c.text).join(' ');
    assert.match(words, /% of/);
    const r = makeProblem('g3-div-rem', rng);
    assert.match(r.answer, / R /);
  } finally {
    setLocale('es', { persist: false, notify: false });
  }
});
