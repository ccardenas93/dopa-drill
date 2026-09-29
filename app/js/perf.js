// Quality governor. The show escalates with every answer, so a phone that is
// smooth on problem 1 can choke on problem 10. Instead of fixed settings, we
// watch real frame times and step the whole show down (or back up) a tier:
//
//   2 full   desktop-class: everything on
//   1 lite   phones: smaller backdrop at 30 fps, fewer particles and guests
//   0 low    struggling phones: minimal backdrop, few particles, no guests
//
// Each tier is a plain settings object; bg.js, fx.js and main.js read it.

export const TIERS = [
  { name: 'low', bgScale: 0.34, bgEvery: 2, fxDpr: 1, fxBudget: 0.35, fxMax: 0.4, crowd: 1, parade: 0, actorsMax: 4 },
  { name: 'lite', bgScale: 0.5, bgEvery: 2, fxDpr: 1.25, fxBudget: 0.6, fxMax: 0.6, crowd: 2, parade: 0.5, actorsMax: 7 },
  { name: 'full', bgScale: 1.25, bgEvery: 1, fxDpr: 2, fxBudget: 1, fxMax: 1, crowd: 4, parade: 1, actorsMax: 10 },
];

const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } };

/** Starting tier from what the device says about itself. */
export function initialTier(nav = globalThis.navigator || {}, isCoarse = coarse()) {
  if (!isCoarse) return 2;
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  return cores <= 4 || mem <= 3 ? 0 : 1;
}

export class Governor {
  constructor(tier = initialTier()) {
    this.max = tier; // never climb above what the device started with
    this.tier = tier;
    this.ema = 1000 / 60;
    this.slow = 0; this.fast = 0;
    this.listeners = new Set();
    this.frame = 0;
    this.drops = 0;
  }
  get q() { return TIERS[this.tier]; }
  onChange(fn) { this.listeners.add(fn); fn(this.q, this.tier); }
  set(tier) {
    tier = Math.max(0, Math.min(this.max, tier));
    if (tier === this.tier) return;
    this.tier = tier;
    this.slow = 0; this.fast = 0;
    for (const fn of this.listeners) fn(this.q, tier);
  }
  // Feed the real frame time (seconds). Hidden tabs and hitches over 250 ms
  // (loading, GC after a scene) are ignored so one spike cannot demote us.
  sample(dt, busy = true) {
    this.frame += 1;
    if (dt <= 0 || dt > 0.25) return;
    this.ema += (dt * 1000 - this.ema) * 0.08;
    if (!busy) return; // only judge while the show is actually running
    // ~1.5 s below 40 fps drops a tier; ~10 s at a steady 58+ fps climbs back.
    if (this.ema > 25) { this.slow += dt; this.fast = 0; } else if (this.ema < 17.2) { this.fast += dt; this.slow = 0; } else { this.slow = Math.max(0, this.slow - dt); }
    // Hysteresis: every drop makes the next climb slower (10 s, 30 s, 50 s…),
    // and after two drops the tier stays put, so the show does not oscillate
    // between tiers (each switch is itself a visible hitch).
    if (this.slow > 1.5 && this.tier > 0) {
      this.drops += 1;
      if (this.drops >= 2) this.max = this.tier - 1;
      this.set(this.tier - 1);
    } else if (this.fast > 10 + 20 * this.drops && this.tier < this.max) this.set(this.tier + 1);
  }
  /** True on the frames the backdrop should draw (30 fps on lite/low). */
  bgFrame() { return this.frame % this.q.bgEvery === 0; }
}
