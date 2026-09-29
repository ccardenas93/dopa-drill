import test from 'node:test';
import assert from 'node:assert/strict';
import { Governor, initialTier } from '../app/js/perf.js';

const run = (g, fps, secs) => { for (let t = 0; t < secs; t += 1 / fps) g.sample(1 / fps); };

test('initial tier: desktop full, phones lite, small phones low', () => {
  assert.equal(initialTier({ hardwareConcurrency: 8, deviceMemory: 8 }, false), 2);
  assert.equal(initialTier({ hardwareConcurrency: 8, deviceMemory: 8 }, true), 1);
  assert.equal(initialTier({ hardwareConcurrency: 4, deviceMemory: 4 }, true), 0);
});

test('slow frames drop a tier; steady fast frames climb back, slower after each drop', () => {
  const g = new Governor(2);
  run(g, 35, 3);
  assert.equal(g.tier, 1);
  run(g, 60, 20);
  assert.equal(g.tier, 1); // one drop: the climb needs 30 s
  run(g, 60, 15);
  assert.equal(g.tier, 2);
});

test('after two drops the governor stops climbing', () => {
  const g = new Governor(2);
  run(g, 35, 3); run(g, 60, 35); run(g, 35, 3);
  assert.equal(g.tier, 1);
  run(g, 60, 120);
  assert.equal(g.tier, 1);
});
