// Capi the capybara: a rubber-hose mascot drawn as layered SVG in screen space.
// Shapes follow docs/mascot/capi.svg (unit space, feet at y=0); the original
// Capi drawing was removed from this fork for licensing reasons.
// Body parts are springs; actions are cancellable async routines.
import { Spring, tween, wait, lerp, clamp, rand, pick, quadPoint, easeOutQuad, easeInQuad, easeOutBack, easeInOutCubic, easeOutCubic, onFrame } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
export const INK = '#1b1d4d';
const CREAM = '#fff3e4';
export const PALETTES = {
  // The base look: caramel capybara (docs/mascot/capi.svg).
  capi: { body: '#d89a5b', inner: '#b67542', leg: '#d89a5b', cheek: '#efb09a' },
  pink: { body: '#ff97bf', inner: '#ffe6f0', leg: '#2f79f7', cheek: '#ffe6f0' },
  blue: { body: '#6fa0ff', inner: '#dde8ff', leg: '#ff97bf', cheek: '#ffd6e6' },
  yellow: { body: '#ffd452', inner: '#fff3c4', leg: '#2f79f7', cheek: '#ffd9c2' },
  mint: { body: '#5eddb8', inner: '#d6f8ec', leg: '#7b5cff', cheek: '#ffd6e6' },
  violet: { body: '#b793ff', inner: '#ede3ff', leg: '#ff97bf', cheek: '#ffd6e6' },
  // Unlockable colours for the hero (id041, id044).
  gold: { body: '#ffc53d', inner: '#fff1b8', leg: '#ff7ab6', cheek: '#ffd9c2' },
  snow: { body: '#f4f6ff', inner: '#dde4ff', leg: '#3b6bff', cheek: '#ffd6e6' },
  rainbow: { body: 'url(#dk-rainbow)', inner: '#fff4f9', leg: '#2f79f7', cheek: '#ffe6f0', flat: '#ff97bf' },
};

// Accessories drawn over the base shape (docs/mascot/acc-*.svg, fitted to the
// rig). Keys are the collection ids; head layers turn with the head, face layers
// sit over the eyes, back layers go behind the body.
const HAT_LIFT = 0;
export const COSTUMES = {
  cap: { head: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M -26 -119 L 0 -181 L 28 -119 Q 0 -113 -26 -119 Z" fill="#78B8B0" /><path d="M -15 -145 L 17 -144 M -22 -130 L 23 -129" fill="none" stroke="#FFF3E4" stroke-width="6"/><path d="M -26 -119 L 0 -181 L 28 -119" fill="none" /><ellipse cx="0" cy="-181" rx="7" ry="7" fill="#EFC16B" /></g>` }, // gorro-fiesta
  hachimaki: { head: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M 7 -57 L 25 -59 L 30 -29 L 15 -27 Z" fill="#DD7566" /><path d="M 14 -44 L 27 -46 M 17 -33 L 29 -35" fill="none" stroke="#FFF3E4" stroke-width="5"/><path d="M -29 -63 Q 0 -57 29 -63 L 27 -51 Q 0 -46 -27 -51 Z" fill="#DD7566" /><path d="M -15 -59 L -15 -52 M -2 -57 L -2 -51 M 11 -58 L 11 -51" fill="none" stroke="#FFF3E4" stroke-width="4"/></g>` }, // bufanda
  cape: { back: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M -28 -53 Q -42 -60 -45 -43 V -19 Q -44 -13 -35 -14 H 35 Q 44 -13 45 -19 V -43 Q 42 -60 28 -53 Z" fill="#57988A" /><path d="M -28 -50 Q -38 -49 -37 -28 M 28 -50 Q 38 -49 37 -28" fill="none" stroke="#FFF3E4" stroke-width="5"/><path d="M -44 -31 H -36 M 36 -31 H 44" fill="none" /></g>` }, // mochila
  glasses: { face: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="-38" cy="-94" rx="12" ry="12" fill="none" /><ellipse cx="38" cy="-94" rx="12" ry="12" fill="none" /><path d="M -26 -95 Q 0 -107 26 -95 M -50 -96 L -53 -100 M 50 -96 L 53 -100" fill="none" /><path d="M -44 -100 L -41 -103 M 32 -100 L 35 -103" fill="none" stroke="#FFF3E4"/></g>` }, // gafas
  ribbon: { head: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M -3 -57 Q -13 -67 -20 -63 L -20 -46 Q -12 -42 -3 -53 Z" fill="#DD7566" /><path d="M 3 -57 Q 13 -67 20 -63 L 20 -46 Q 12 -42 3 -53 Z" fill="#DD7566" /><ellipse cx="0" cy="-55" rx="5" ry="5" fill="#EFC16B" /></g>` }, // corbatin
  crown: { head: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M -36 -122 Q 0 -112 36 -122" fill="none" stroke="#477E60"/><path transform="rotate(-30 -29 -124)" d="M -29 -119 Q -41 -126 -33 -136 Q -21 -134 -29 -119 Z" fill="#78A77A"/><path transform="rotate(-15 -17 -124)" d="M -17 -119 Q -29 -126 -21 -136 Q -9 -134 -17 -119 Z" fill="#78A77A"/><path transform="rotate(15 18 -124)" d="M 18 -119 Q 6 -126 14 -136 Q 26 -134 18 -119 Z" fill="#78A77A"/><path transform="rotate(30 30 -124)" d="M 30 -119 Q 18 -126 26 -136 Q 38 -134 30 -119 Z" fill="#78A77A"/><ellipse cx="0" cy="-131" rx="12" ry="10" fill="#F4A044" /><path d="M 0 -141 L 1 -146" fill="none" /><path d="M 1 -145 Q 7 -153 14 -146 Q 8 -139 1 -145 Z" fill="#78A77A" /></g>` }, // corona-hojas
  wizard: { head: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M -33 -126 L -26 -149 Q -2 -156 25 -149 L 34 -125 Z" fill="#EEC57E" /><path d="M -31 -134 Q 0 -128 31 -134 L 34 -125 H -34 Z" fill="#57988A" /><path d="M -48 -125 Q 0 -137 48 -125 Q 53 -120 44 -117 Q 0 -111 -44 -117 Q -53 -120 -48 -125 Z" fill="#EEC57E" /><ellipse cx="30.0" cy="-136.0" rx="4.5" ry="4.5" fill="#FFF3E4" /><ellipse cx="25.854101966249686" cy="-130.29366090222908" rx="4.5" ry="4.5" fill="#FFF3E4" /><ellipse cx="19.145898033750317" cy="-132.47328848624517" rx="4.5" ry="4.5" fill="#FFF3E4" /><ellipse cx="19.145898033750314" cy="-139.52671151375483" rx="4.5" ry="4.5" fill="#FFF3E4" /><ellipse cx="25.854101966249683" cy="-141.70633909777092" rx="4.5" ry="4.5" fill="#FFF3E4" /><ellipse cx="24" cy="-136" rx="3.5" ry="3.5" fill="#EDAB46" /></g>` }, // sombrero-flor
  headphones: { head: `<g fill="none" stroke="#1B1D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M -54 -92 V -106 C -54 -144 54 -144 54 -106 V -92" fill="none" stroke-width="9"/><path d="M -54 -96 V -107 C -54 -141 54 -141 54 -107 V -96" fill="none" stroke="#78B8B0" stroke-width="3"/><path d="M -55 -105 Q -62 -105 -62 -98 V -85 Q -62 -78 -54 -78 H -49 V -105 Z" fill="#78B8B0" /><path d="M 55 -105 Q 62 -105 62 -98 V -85 Q 62 -78 54 -78 H 49 V -105 Z" fill="#78B8B0" /></g>` }, // auriculares
};

const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

// Outlines use the class "dk-l" (stroke width from --dkw); expression
// strokes use "dk-f", slightly heavier so faces stay readable when small.
const L = 'class="dk-l"';
const F = 'class="dk-f"';
// Eye rings use a thinner line so the white ring stays visible, as in the drawing.
const T = 'class="dk-t"';
const EYE = {
  // Capi's resting look: a heavy lid over a small dark eye (the capybara "chill").
  open: () => `<path d="M-5 0 Q0 1 5 0 L5 2 Q0 8 -5 2Z" fill="${INK}"/><ellipse cy="2" rx="2" ry="2.5" fill="${INK}"/><path d="M-6 -1 L6 0" fill="none" ${F}/>`,
  wide: () => `<circle r="7" fill="#fff" ${T}/><ellipse cy=".5" rx="3.6" ry="4.4" fill="${INK}"/><circle cx="-1.4" cy="-2" r="1.3" fill="#fff"/>`,
  happy: () => `<path d="M-7 2 Q0 -6 7 2" fill="none" ${F}/>`,
  closed: () => `<path d="M-7 -1 Q0 5 7 -1" fill="none" ${F}/>`,
  x: () => `<path d="M-5 -5 L5 5 M5 -5 L-5 5" fill="none" ${F}/>`,
  swirl: () => `<g transform="scale(.72)"><path d="M0 0 m0 -1.3 a1.3 1.3 0 1 1 -1.3 1.3 a3.4 3.4 0 1 1 3.4 3.4 a5.7 5.7 0 1 1 -5.7 -5.7 a8.3 8.3 0 1 1 8.3 8.3" fill="none" ${L}/></g>`,
  star: () => `<g transform="scale(.72)"><path d="M0 -12 L3.5 -3.8 L12 -3.6 L5.3 1.9 L7.6 10.3 L0 5.5 L-7.6 10.3 L-5.3 1.9 L-12 -3.6 L-3.5 -3.8Z" fill="#ffd23f" ${L}/></g>`,
  heart: () => `<g transform="scale(.72)"><path d="M0 9.6 C-14.4 -1.2 -10.8 -13.2 -4.3 -11.4 C-1.9 -10.8 0 -8.4 0 -6.5 C0 -8.4 1.9 -10.8 4.3 -11.4 C10.8 -13.2 14.4 -1.2 0 9.6Z" fill="#ff2d7a" ${L}/></g>`,
  tight: () => `<path d="M-6 -4 L4 0 L-6 4" fill="none" ${F}/>`,
};
// Brow pose per eye expression: lift (up) and tilt (degrees, inner ends up when > 0).
const BROW = { happy: [1, 0], star: [1.2, 0], heart: [1, 0], wide: [1.6, 0], x: [0.4, 18], swirl: [0.2, 14], tight: [0, -16], closed: [0, 8] };
const MOUTH = {
  smile: `<path d="M-8.1 -1.3 C-4.9 3 4.9 3 8.1 -1.3" fill="none" ${L}/>`,
  cat: `<path d="M-9 -1 Q-4.5 5 0 0 Q4.5 5 9 -1" fill="none" ${L}/>`,
  grin: `<path d="M-10 -3 Q0 -1 10 -3 Q9 12 0 12 Q-9 12 -10 -3Z" fill="#7a1840" ${L}/><path d="M-5 8 Q0 4 5 8 Q3 11.5 0 11.6 Q-3 11.5 -5 8Z" fill="#ff7aa8"/>`,
  o: `<ellipse rx="4.6" ry="5.8" fill="#7a1840" ${L}/>`,
  big: `<ellipse rx="9" ry="11" fill="#7a1840" ${L}/><ellipse cy="5" rx="5.5" ry="4" fill="#ff7aa8"/>`,
  wobble: `<path d="M-10 1 L-6 -3 L-2 2 L2 -3 L6 2 L10 -2" fill="none" ${L}/>`,
  flat: `<path d="M-6 0 L6 0" fill="none" ${L}/>`,
  puff: `<path d="M-3 0 L3 0" fill="none" ${L}/>`,
};

export const G = {
  // Left foot (the right one is mirrored): a short flat paw resting on y=0.
  foot: 'M-30 -17 Q-39 -12 -37 -5 Q-37 -1.5 -32 -1.5 H-16 Q-11 -1.5 -12 -7 L-15 -17Z',
  footPivot: { x: 22, y: -14 },
  // Barrel body; the top edge sits under the head so there is no drawn seam.
  bodyFill: 'M-21 -66 Q-29 -58 -33 -44 C-41 -15 -31 -10 0 -10 C31 -10 41 -15 33 -44 Q29 -58 21 -66Z',
  bodyLine: 'M-21 -66 Q-29 -58 -33 -44 C-41 -15 -31 -10 0 -10 C31 -10 41 -15 33 -44 Q29 -58 21 -66',
  bellyPath: 'M-17 -45 Q0 -53 17 -45 Q24 -33 20 -21 Q0 -14 -20 -21 Q-24 -33 -17 -45Z',
  // Wide, flat capybara head with the cream muzzle band, nose and whiskers.
  headFill: 'M-30 -119 Q-46 -119 -50 -106 L-57 -85 Q-61 -63 -39 -62 H39 Q61 -63 57 -85 L50 -106 Q46 -119 30 -119Z',
  headLine: 'M-30 -119 Q-46 -119 -50 -106 L-57 -85 Q-61 -63 -39 -62 H39 Q61 -63 57 -85 L50 -106 Q46 -119 30 -119Z',
  face: 'M-41 -87 H41 Q54 -87 54 -78 V-74 Q54 -62 40 -62 H-40 Q-54 -62 -54 -74 V-78 Q-54 -87 -41 -87Z',
  nose: { cy: -85, rx: 14, ry: 5 },
  nostril: { x: 7, cy: -85.5, rx: 2.5, ry: 1.2, fill: '#9a6846' },
  whiskers: 'M-44 -78 L-52 -80 M-44 -73 L-53 -72 M44 -78 L52 -80 M44 -73 L53 -72',
  head: { cy: -90, r: 57 },
  neckY: -63,
  // Small ears at the back corners of the head; they wiggle around their own centre.
  ear: { x: 47, cy: -112, rx: 7, ry: 8, irx: 3, iry: 4, pivot: 47 },
  eye: { x: 38, y: -94 },
  brow: { x: 13, y: -111, rx: 3.6, ry: 1.4 },
  mouthY: -73.5,
  cheek: { x: 31, y: -79, rx: 5.8, ry: 2.7 },
  shoulder: { x: 26, y: -48 },
  rest: { x: 38, y: -35 },
  arm: 4.6,
  hand: 10,
};

// Outline width in unit space: thin like the drawing, with a pixel floor.
const lineFor = (S) => clamp(1.7 / S, 1.4, 3.2);

// Static parts shared by the live actor and the sprite image.
const earSVG = (p, s) => `<ellipse ${L} cx="${s * G.ear.x}" cy="${G.ear.cy}" rx="${G.ear.rx}" ry="${G.ear.ry}" fill="${p.body}"/><ellipse cx="${s * G.ear.x}" cy="${G.ear.cy}" rx="${G.ear.irx}" ry="${G.ear.iry}" fill="${p.inner}"/>`;
const footSVG = (p, s) => `<path ${L} d="${G.foot}" fill="${p.flat || p.body}"${s > 0 ? ' transform="scale(-1 1)"' : ''}/>`;
const bodySVG = (p) => `<path d="${G.bodyFill}" fill="${p.body}"/><path ${L} d="${G.bodyLine}" fill="none"/><path d="${G.bellyPath}" fill="${CREAM}"/>`;
const headSVG = (p) => `<path d="${G.headFill}" fill="${p.body}"/><path ${L} d="${G.headLine}" fill="none"/><path d="${G.face}" fill="${CREAM}"/><ellipse cy="${G.nose.cy}" rx="${G.nose.rx}" ry="${G.nose.ry}" fill="${INK}"/><ellipse cx="${-G.nostril.x}" cy="${G.nostril.cy}" rx="${G.nostril.rx}" ry="${G.nostril.ry}" fill="${G.nostril.fill}"/><ellipse cx="${G.nostril.x}" cy="${G.nostril.cy}" rx="${G.nostril.rx}" ry="${G.nostril.ry}" fill="${G.nostril.fill}"/><path ${L} d="${G.whiskers}" fill="none"/>`;
const STYLE = `.dk-l,.dk-f,.dk-t{stroke:${INK};stroke-linecap:round;stroke-linejoin:round}.dk-l{stroke-width:var(--dkw)}.dk-f{stroke-width:calc(var(--dkw) * 1.5)}.dk-t{stroke-width:calc(var(--dkw) * 0.55)}`;

let uid = 0;

// Writes an SVG attribute only when it changed: most of the rig holds still
// between frames, and every write invalidates style/paint in the WebView.
function setA(el, name, v) {
  const c = el.__a || (el.__a = {});
  if (c[name] === v) return;
  c[name] = v;
  el.setAttribute(name, v);
}

export class Mascot {
  constructor(layer, { scale = 0.7, palette = 'capi', front } = {}) {
    this.layer = layer;
    this.S = scale;
    this.lw = lineFor(scale);
    this.pal = PALETTES[palette];
    this.id = uid++;
    this.x = 0; this.y = 0;
    this.home = { x: 0, y: 0 };
    this.ground = null;
    this.rot = 0;
    this.lift = 0;
    this.sq = new Spring(1, 260, 11);
    this.lean = new Spring(0, 120, 12);
    this.tilt = new Spring(0, 160, 10);
    this.earL = new Spring(0, 180, 7);
    this.earR = new Spring(0, 180, 7);
    this.stretchX = 1; this.stretchY = 1;
    this.look = { x: 0, y: 0 }; this.lookTarget = { x: 0, y: 0 };
    this.eyes = null; this.mouth = null;
    this.baseEyes = 'open'; this.baseMouth = 'smile';
    this.blinkAt = performance.now() + 1800; this.blinkK = 0;
    this.browLift = new Spring(0, 220, 14);
    this.browTilt = new Spring(0, 220, 14);
    this.cheekPuff = 0;
    this.visible = true;
    this.opacity = 1;
    this.bob = 0;
    this.shake = 0;
    this.hands = [this.makeHand(-1), this.makeHand(1)];
    this.token = 0;
    this.busy = false;
    this.build(front);
  }

  makeHand(side) { return { side, mode: 'rest', x: 0, y: 0, job: 0, carry: null, raise: 0 }; }

  build(front) {
    const p = this.pal;
    this.front = front;
    this.root = el('g', { class: 'dk' }, this.layer);
    this.root.style.setProperty('--dkw', this.lw);
    this.shadow = el('ellipse', { rx: 40, ry: 7, fill: INK, opacity: 0.14 }, this.root);
    this.bodyG = el('g', {}, this.root);
    this.backG = el('g', {}, this.bodyG);
    this.feet = [-1, 1].map((s) => { const g = el('g', {}, this.bodyG); g.innerHTML = footSVG(p, s); return g; });
    el('g', {}, this.bodyG).innerHTML = bodySVG(p);
    this.headG = el('g', {}, this.bodyG);
    this.earGs = [-1, 1].map((s) => { const g = el('g', {}, this.headG); g.innerHTML = earSVG(p, s); return { g, s }; });
    el('g', {}, this.headG).innerHTML = headSVG(p);
    this.face = el('g', {}, this.headG);
    this.cheeks = [-1, 1].map((s) => el('ellipse', { cx: s * G.cheek.x, cy: G.cheek.y, rx: G.cheek.rx, ry: G.cheek.ry, fill: p.cheek }, this.face));
    this.brows = [-1, 1].map(() => el('ellipse', { rx: G.brow.rx, ry: G.brow.ry, fill: INK }, this.face));
    this.eyeGs = [-1, 1].map(() => el('g', {}, this.face));
    this.irises = [];
    this.mouthG = el('g', { transform: `translate(0 ${G.mouthY})` }, this.face);
    this.sweat = el('path', { d: 'M0 -12 Q6 -2 0 2 Q-6 -2 0 -12Z', fill: '#8fd3ff', class: 'dk-l', opacity: 0 }, this.face);
    this.faceWear = el('g', {}, this.headG);
    this.headWear = el('g', {}, this.headG);
    this.armsFront = el('g', { class: 'dk-arms' }, front || this.root);
    // A gradient body colour cannot paint a thin stroke well; arms use a flat colour.
    const armCol = p.flat || p.body;
    this.arms = this.hands.map(() => ({
      out: el('path', { fill: 'none', stroke: INK, 'stroke-linecap': 'round' }, this.armsFront),
      inn: el('path', { fill: 'none', stroke: armCol, 'stroke-linecap': 'round' }, this.armsFront),
      hand: el('circle', { fill: armCol, stroke: INK }, this.armsFront),
      digit: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'dk-digit' }, this.armsFront),
    }));
    const svg = this.layer.ownerSVGElement || this.layer;
    if (!document.getElementById('dk-style')) el('style', { id: 'dk-style' }, svg).textContent = STYLE;
    if (!document.getElementById('dk-rainbow')) {
      const defs = el('defs', {}, svg);
      defs.innerHTML = '<linearGradient id="dk-rainbow" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff97bf"/><stop offset=".33" stop-color="#ffd452"/><stop offset=".66" stop-color="#5eddb8"/><stop offset="1" stop-color="#8fb4ff"/></linearGradient>';
    }
    this.eyes = null; this.mouth = null;
    this.setFace(this.baseEyes || 'open', this.baseMouth || 'smile', true);
    this.setCostume(this.costume || null);
  }

  // Unlockable look (id041, id044): recolour by rebuilding; costumes are layered.
  setPalette(name) {
    const pal = PALETTES[name] || PALETTES.capi;
    if (pal === this.pal) return;
    this.pal = pal;
    const vis = this.visible;
    this.root.remove(); this.armsFront.remove();
    this.build(this.front);
    this.visible = vis;
  }
  setCostume(id) {
    this.costume = id && COSTUMES[id] ? id : null;
    const c = this.costume ? COSTUMES[this.costume] : {};
    this.headWear.innerHTML = c.head ? `<g transform="translate(0 ${HAT_LIFT})">${c.head}</g>` : '';
    this.faceWear.innerHTML = c.face || '';
    this.backG.innerHTML = c.back || '';
  }

  setFace(eyes, mouth, base = false) {
    if (eyes && eyes !== this.eyes) {
      this.eyes = eyes;
      this.eyeGs.forEach((g, i) => {
        const kind = eyes === 'wink' ? (i ? 'happy' : 'open') : eyes;
        // The right eye mirrors so pointed shapes face each other.
        g.innerHTML = `<g transform="scale(${i && kind === 'tight' ? -1 : 1} 1)">${EYE[kind](this.pal)}</g>`;
      });
      this.irises = this.eyeGs.map((g) => g.querySelector('.dk-iris'));
      const [lift, tilt] = BROW[eyes === 'wink' ? 'happy' : eyes] || [0, 0];
      this.browLift.target = lift; this.browTilt.target = tilt;
    }
    if (mouth && mouth !== this.mouth) { this.mouth = mouth; this.mouthG.innerHTML = MOUTH[mouth]; }
    if (base) { this.baseEyes = eyes || this.baseEyes; this.baseMouth = mouth || this.baseMouth; }
  }
  resetFace() { this.setFace(this.baseEyes, this.baseMouth); this.cheekPuff = 0; this.sweat.setAttribute('opacity', 0); }

  // Local (unit) coordinates -> screen.
  toScreen(lx, ly) {
    const S = this.S;
    const sy = this.sq.value * this.stretchY;
    const sx = this.stretchX / Math.sqrt(Math.max(0.2, this.sq.value));
    const pc = 60 * S;
    const px = lx * S * sx; const py = ly * S * sy + pc;
    const a = ((this.rot + this.lean.value) * Math.PI) / 180;
    const c = Math.cos(a); const s = Math.sin(a);
    return { x: this.x + px * c - py * s, y: this.y - this.lift + px * s + py * c - pc };
  }
  shoulder(side) { return this.toScreen(side * G.shoulder.x, G.shoulder.y); }
  // Raised hands go up past the ears, clear of the face.
  restHand(side, h) { return this.toScreen(side * (G.rest.x + h.raise * 34), G.rest.y - h.raise * 120); }
  get headCenter() { return this.toScreen(0, G.head.cy); }

  place(x, y) { this.x = x; this.y = y; this.home = { x, y }; this.ground = y; }

  update(dt, t, ctx = {}) {
    this.sq.step(dt); this.lean.step(dt); this.tilt.step(dt); this.earL.step(dt); this.earR.step(dt);
    this.browLift.step(dt); this.browTilt.step(dt);
    this.look.x = lerp(this.look.x, this.lookTarget.x, Math.min(1, dt * 10));
    this.look.y = lerp(this.look.y, this.lookTarget.y, Math.min(1, dt * 10));
    // blink
    if (t > this.blinkAt) { this.blinkK = 1; this.blinkAt = t + rand(1800, 4200); }
    this.blinkK = Math.max(0, this.blinkK - dt * 7);
    const blink = this.eyes === 'open' ? 1 - Math.sin(this.blinkK * Math.PI) * 0.92 : 1;

    const breath = Math.sin(t / 520 + this.id) * 0.018;
    const beat = ctx.beat || 0;
    const sy = (this.sq.value + breath + this.bob * beat * 0.06) * this.stretchY;
    const sx = this.stretchX / Math.sqrt(Math.max(0.2, this.sq.value + breath));
    const S = this.S;
    const pc = 60 * S;
    const shakeX = this.shake ? Math.sin(t / 22) * this.shake : 0;
    const bx = this.x + shakeX; const by = this.y - this.lift;
    const rot = this.rot + this.lean.value;
    setA(this.root, 'opacity', this.opacity);
    // Arms live in a separate front layer, so hide them together with the body.
    this.root.style.display = this.visible ? '' : 'none';
    this.armsFront.style.display = this.visible ? '' : 'none';
    if (!this.visible) return;
    setA(this.armsFront, 'opacity', this.opacity);
    setA(this.bodyG, 'transform', `translate(${bx} ${by - pc}) rotate(${rot}) translate(0 ${pc}) scale(${S * sx} ${S * sy})`);
    const gy = this.ground ?? this.y;
    const hk = clamp(1 - (gy - by) / 400, 0.2, 1);
    setA(this.shadow, 'transform', `translate(${bx} ${gy + 2}) scale(${S * hk * sx} ${S * hk})`);
    setA(this.headG, 'transform', `rotate(${this.tilt.value} 0 ${G.neckY})`);
    this.earGs.forEach(({ g, s }) => {
      const a = (s < 0 ? -this.earL.value : this.earR.value);
      setA(g, 'transform', `rotate(${a} ${s * G.ear.pivot} ${G.ear.cy})`);
    });
    const lx = this.look.x * 1.6; const ly = this.look.y * 1.4;
    this.eyeGs.forEach((g, i) => {
      const s = i ? 1 : -1;
      setA(g, 'transform', `translate(${s * G.eye.x + lx} ${G.eye.y + ly}) scale(1 ${blink})`);
    });
    // Irises roll inside the white ring toward the look target.
    this.irises.forEach((ir) => { if (ir) setA(ir, 'transform', `translate(${this.look.x * 2.2} ${this.look.y * 2})`); });
    this.brows.forEach((b, i) => {
      const s = i ? 1 : -1;
      setA(b, 'transform', `translate(${s * G.brow.x + lx} ${G.brow.y + ly - this.browLift.value * 4}) rotate(${-s * this.browTilt.value})`);
    });
    setA(this.mouthG, 'transform', `translate(${lx * 0.6} ${G.mouthY + ly * 0.5})`);
    this.cheeks.forEach((c, i) => {
      const k = 1 + this.cheekPuff * 0.7;
      setA(c, 'rx', G.cheek.rx * k); setA(c, 'ry', G.cheek.ry * k);
      setA(c, 'cx', (i ? 1 : -1) * (G.cheek.x + this.cheekPuff * 3) + lx * 0.4);
    });
    this.feet.forEach((f, i) => {
      const s = i ? 1 : -1;
      const kick = this.lift > 4 ? Math.sin(t / 60 + i * 2) * 4 : 0;
      setA(f, 'transform', `translate(0 ${kick}) rotate(${this.lift > 4 ? s * 14 : 0} ${s * G.footPivot.x} ${G.footPivot.y})`);
    });

    // arms
    const lpx = this.lw * S;
    this.hands.forEach((h, i) => {
      const sh = this.shoulder(h.side);
      if (h.mode === 'rest') {
        const r = this.restHand(h.side, h);
        const sway = Math.sin(t / 400 + i * 1.3) * 1.5 * S;
        h.x = r.x + sway; h.y = r.y;
      }
      const a = this.arms[i];
      const dx = h.x - sh.x; const dy = h.y - sh.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; const ny = dx / len;
      const bend = h.mode === 'rest' ? 0 : h.side * Math.min(60, len * 0.22);
      // Resting arms hang down in a short curve, like the drawing.
      const droop = h.mode === 'rest' ? len * 0.35 : Math.min(40, len * 0.08);
      const c = { x: (sh.x + h.x) / 2 + nx * bend, y: (sh.y + h.y) / 2 + ny * bend + droop };
      const d = `M${sh.x} ${sh.y} Q${c.x} ${c.y} ${h.x} ${h.y}`;
      const w = Math.max(3, G.arm * S * Math.min(1, Math.sqrt(40 * S / len)));
      setA(a.out, 'd', d); setA(a.out, 'stroke-width', w + 2 * lpx);
      setA(a.inn, 'd', d); setA(a.inn, 'stroke-width', w);
      setA(a.hand, 'cx', h.x); setA(a.hand, 'cy', h.y);
      setA(a.hand, 'r', G.hand * S); setA(a.hand, 'stroke-width', lpx);
      if (h.carry != null) {
        a.digit.textContent = h.carry;
        setA(a.digit, 'x', h.x); setA(a.digit, 'y', h.y - 20 * S - 10);
        setA(a.digit, 'font-size', Math.max(26, 40 * S));
        a.digit.style.display = '';
      } else a.digit.style.display = 'none';
    });
  }

  lookAt(pt) {
    if (!pt) { this.lookTarget = { x: 0, y: 0 }; return; }
    const hc = this.headCenter;
    const dx = pt.x - hc.x; const dy = pt.y - hc.y;
    const d = Math.hypot(dx, dy) || 1;
    this.lookTarget = { x: dx / d, y: dy / d };
  }

  // ---------------------------------------------------------------- hands
  freeHand(pt) {
    const h = this.hands.slice().sort((a, b) => (a.job ? 1 : 0) - (b.job ? 1 : 0) || Math.abs((pt.x - this.x) - a.side * 60) - Math.abs((pt.x - this.x) - b.side * 60))[0];
    return h;
  }

  // Grab a digit from a key and put it into a cell.
  async carry(from, to, digit, { E = 0, onGrab, onPlace } = {}) {
    const h = this.freeHand(from);
    if (h.job && h.cancel) h.cancel();
    const job = ++uid;
    let placed = false;
    const finish = () => { if (!placed) { placed = true; h.carry = null; onPlace && onPlace(); } };
    h.job = job; h.cancel = finish;
    const alive = () => h.job === job;
    h.mode = 'free';
    const s0 = { x: h.x, y: h.y };
    this.lookAt(from);
    this.lean.target = clamp((from.x - this.x) / 20, -12, 12);
    const reach = 80 + 40 * (1 - E);
    await tween(reach, (k) => { h.x = lerp(s0.x, from.x, k); h.y = lerp(s0.y, from.y, k); }, easeOutQuad);
    if (!alive()) return;
    h.carry = digit; onGrab && onGrab();
    this.lookAt(to);
    const c = { x: (from.x + to.x) / 2 + (this.x - (from.x + to.x) / 2) * 0.2, y: Math.min(from.y, to.y) - 60 - 40 * E };
    await tween(150 + 40 * (1 - E), (k) => { const q = quadPoint(from, c, to, k); if (alive()) { h.x = q.x; h.y = q.y; } }, easeInOutCubic);
    if (!alive()) return;
    finish();
    const r = this.restHand(h.side, h);
    const p0 = { x: h.x, y: h.y };
    await tween(150, (k) => { if (alive()) { const rr = this.restHand(h.side, h); h.x = lerp(p0.x, rr.x, k); h.y = lerp(p0.y, rr.y, k); } }, easeOutCubic);
    if (alive()) { h.mode = 'rest'; h.job = 0; h.cancel = null; this.lean.target = 0; }
    void r;
  }

  // Swipe a wrong digit away (Backspace).
  async swipe(pt) {
    const h = this.freeHand(pt);
    if (h.job && h.cancel) h.cancel();
    const job = ++uid; h.job = job; h.mode = 'free';
    const alive = () => h.job === job;
    const s0 = { x: h.x, y: h.y };
    await tween(90, (k) => { h.x = lerp(s0.x, pt.x - 30, k); h.y = lerp(s0.y, pt.y, k); });
    await tween(120, (k) => { if (alive()) { h.x = pt.x - 30 + 60 * k; h.y = pt.y - Math.sin(k * Math.PI) * 10; } });
    const p0 = { x: h.x, y: h.y };
    await tween(140, (k) => { if (alive()) { const r = this.restHand(h.side, h); h.x = lerp(p0.x, r.x, k); h.y = lerp(p0.y, r.y, k); } });
    if (alive()) { h.mode = 'rest'; h.job = 0; }
  }

  // ---------------------------------------------------------------- body actions
  begin() { this.token += 1; const tk = this.token; return () => tk === this.token; }

  async hop(height = 30, dur = 360, { spin = 0, flip = 0, to = null, audio } = {}) {
    const ok = this.begin();
    this.sq.value = 0.82; this.sq.velocity = 0;
    await wait(55);
    if (!ok()) return false;
    audio && audio.jump(height / 120);
    this.sq.value = 1.18;
    const x0 = this.x; const y0 = this.y; const tx = to ? to.x : x0; const ty = to ? to.y : y0;
    const r0 = this.rot;
    await tween(dur, (k) => {
      if (!ok()) return;
      this.x = lerp(x0, tx, k); this.y = lerp(y0, ty, k);
      this.lift = Math.sin(k * Math.PI) * height;
      this.rot = r0 + spin * easeInOutCubic(k) + flip * k;
    }, (k) => k);
    if (!ok()) return false;
    this.lift = 0; this.rot = 0;
    this.sq.value = 0.72; this.sq.velocity = 2;
    this.earL.kick(-420); this.earR.kick(-420);
    audio && audio.land();
    return true;
  }

  async clap(times = 3, audio) {
    const ok = this.begin();
    const hs = this.hands;
    hs.forEach((h) => { h.mode = 'free'; });
    for (let i = 0; i < times && ok(); i++) {
      const c = this.toScreen(0, -178);
      const o = [this.toScreen(-80, -164), this.toScreen(80, -164)];
      await tween(70, (k) => hs.forEach((h, j) => { if (ok() && !h.job) { h.x = lerp(o[j].x, c.x + (j ? 8 : -8), k); h.y = lerp(o[j].y, c.y, k); } }), easeInQuad);
      if (!ok()) return;
      audio && audio.clapHands();
      if (this.S < 1.5) this.sq.kick(-1.2);
      await tween(90, (k) => hs.forEach((h, j) => { if (ok() && !h.job) { h.x = lerp(c.x + (j ? 8 : -8), o[j].x, k); h.y = lerp(c.y, o[j].y, k); } }), easeOutQuad);
    }
    if (ok()) hs.forEach((h) => { if (!h.job) h.mode = 'rest'; });
  }

  async celebrate(E, { big = false, audio, variant } = {}) {
    const moves = big
      ? ['backflip', 'spinjump', 'starjump', 'clapjump', 'twirl']
      : ['hop', 'hop', 'earflap', 'clapjump', 'twirl'];
    const move = variant || pick(moves.slice(0, Math.max(2, Math.ceil(moves.length * (0.35 + E)))));
    this.setFace(pick(['happy', 'happy', 'star', 'wink']), pick(['grin', 'big', 'cat']));
    this.earL.kick(600); this.earR.kick(600);
    const hMul = 0.6 + E * 1.6;
    if (move === 'hop') await this.hop(22 * hMul, 300, { audio });
    else if (move === 'earflap') { for (let i = 0; i < 3; i++) { this.earL.kick(900); this.earR.kick(-900); this.tilt.kick(i % 2 ? 200 : -200); await wait(110); } }
    else if (move === 'clapjump') { this.hands.forEach((h) => { h.raise = 1; }); this.hop(30 * hMul, 380, { audio }); await this.clap(2 + Math.round(E * 2), audio); this.hands.forEach((h) => { h.raise = 0; }); }
    else if (move === 'twirl') await this.hop(26 * hMul, 460, { spin: 360, audio });
    else if (move === 'backflip') await this.hop(70 * hMul, 620, { flip: -360, audio });
    else if (move === 'spinjump') await this.hop(60 * hMul, 560, { spin: 720, audio });
    else if (move === 'starjump') {
      this.hands.forEach((h) => { h.raise = 1; });
      this.stretchX = 1.2;
      await this.hop(50 * hMul, 520, { audio });
      this.stretchX = 1;
      this.hands.forEach((h) => { h.raise = 0; });
    }
    await wait(250);
    this.resetFace();
  }

  // Comic, non-punishing reactions to a wrong digit. Gentle ones are used
  // early; bigger slapstick unlocks as the show intensifies. The same
  // reaction is not repeated twice in a row.
  async hurt(E, from, { audio, variant } = {}) {
    const ok = this.begin();
    const pool = ['squash', 'boing', 'deflate', 'earspin'];
    if (E >= 0.3) pool.push('pancake', 'dizzy', 'flop', 'roll');
    if (E >= 0.6) pool.push('knockoff', 'headbutt');
    const choices = pool.filter((v) => v !== this.lastHurt);
    const move = variant || pick(choices);
    this.lastHurt = move;
    this.setFace(pick(['x', 'swirl']), pick(['wobble', 'o']));
    this.earL.kick(-1200); this.earR.kick(-1100);
    const dir = from && from.x > this.x ? -1 : 1;
    const x0 = this.x; const y0 = this.y;
    const restore = () => { this.stretchX = 1; this.stretchY = 1; this.rot = 0; this.lift = 0; this.shake = 0; };
    if (move === 'squash') {
      this.sq.value = 0.6; this.sq.velocity = 0;
      this.tilt.kick(dir * 500);
      await wait(420);
    } else if (move === 'boing') {
      // Springy accordion: squashes and bounces up and down.
      for (let i = 0; i < 3 && ok(); i++) {
        await tween(90, (k) => { if (ok()) this.stretchY = lerp(1, 0.55, k); }, easeOutQuad);
        audio && audio.jump(0.3 + i * 0.1);
        await tween(140, (k) => { if (ok()) { this.stretchY = lerp(0.55, 1.35 - i * 0.1, k); this.lift = Math.sin(k * Math.PI) * (30 - i * 8); } }, easeOutQuad);
      }
      this.lift = 0;
      await tween(160, (k) => { if (ok()) this.stretchY = lerp(1.15, 1, k); }, easeOutBack);
    } else if (move === 'deflate') {
      // Shrinks like a balloon losing air, then pops back.
      await tween(360, (k) => { if (ok()) { this.stretchX = lerp(1, 0.55, k); this.stretchY = lerp(1, 0.5, k); this.shake = 2 * (1 - k); } }, easeOutQuad);
      this.shake = 0;
      await wait(160);
      audio && audio.jump(0.8);
      await tween(280, (k) => { if (ok()) { this.stretchX = lerp(0.55, 1, k); this.stretchY = lerp(0.5, 1, k); } }, easeOutBack);
    } else if (move === 'earspin') {
      // Ears whirl like propellers and lift the body a little.
      for (let i = 0; i < 8 && ok(); i++) { this.earL.kick(1400); this.earR.kick(-1400); this.tilt.kick(i % 2 ? 260 : -260); this.lift = Math.sin((i / 8) * Math.PI) * 26; await wait(60); }
      this.lift = 0;
      this.sq.value = 0.75;
    } else if (move === 'pancake') {
      await tween(90, (k) => { if (ok()) { this.stretchY = lerp(1, 0.32, k); this.stretchX = lerp(1, 1.7, k); } });
      this.shake = 3;
      await wait(380);
      this.shake = 0;
      await tween(260, (k) => { if (ok()) { this.stretchY = lerp(0.32, 1, k); this.stretchX = lerp(1.7, 1, k); } }, easeOutBack);
    } else if (move === 'dizzy') {
      // Plops down, head wobbles in circles, then hops back up.
      this.setFace('swirl', 'wobble');
      await tween(140, (k) => { if (ok()) { this.stretchY = lerp(1, 0.7, k); this.stretchX = lerp(1, 1.18, k); } }, easeOutQuad);
      await tween(640, (k) => { if (ok()) { this.tilt.target = Math.sin(k * Math.PI * 4) * 14; this.lean.target = Math.cos(k * Math.PI * 4) * 6; } });
      this.tilt.target = 0; this.lean.target = 0;
      await tween(200, (k) => { if (ok()) { this.stretchY = lerp(0.7, 1, k); this.stretchX = lerp(1.18, 1, k); } }, easeOutBack);
    } else if (move === 'flop') {
      // Falls over backwards, legs kick in the air, springs upright.
      await tween(180, (k) => { if (ok()) { this.rot = dir * -90 * k; this.lift = Math.sin(k * Math.PI) * 18; } }, easeOutQuad);
      audio && audio.land();
      await tween(420, (k) => { if (ok()) this.rot = dir * (-90 + Math.sin(k * Math.PI * 5) * 6); });
      audio && audio.jump(0.6);
      await tween(240, (k) => { if (ok()) { this.rot = dir * -90 * (1 - k); this.lift = Math.sin(k * Math.PI) * 30; } }, easeOutBack);
    } else if (move === 'roll') {
      // Rolls away like a ball and rolls back.
      await tween(360, (k) => { if (ok()) { this.x = x0 + dir * 90 * k; this.rot = dir * 360 * k; this.stretchY = 0.85; } }, easeOutQuad);
      await tween(360, (k) => { if (ok()) { this.x = x0 + dir * 90 * (1 - k); this.rot = dir * 360 * (1 - k); } }, easeInOutCubic);
      this.x = x0;
    } else if (move === 'headbutt') {
      // Bops the wrong digit away with the head.
      await tween(110, (k) => { if (ok()) { this.lean.target = -dir * 18 * k; this.lift = k * 20; } });
      audio && audio.jump(1);
      this.sq.value = 1.25;
      await tween(180, (k) => { if (ok()) { this.lean.target = -dir * 18 * (1 - k); this.lift = 20 + Math.sin(k * Math.PI) * 40; } }, easeOutQuad);
      await tween(160, (k) => { if (ok()) this.lift = 20 * (1 - k); }, easeInQuad);
      this.lean.target = 0;
      this.sq.value = 0.7;
      audio && audio.land();
    } else {
      // Knocked off-stage, spins, and bounces back.
      audio && audio.jump(1.5);
      await tween(420, (k) => { if (ok()) { this.x = x0 + dir * 170 * k; this.lift = Math.sin(k * Math.PI) * 140; this.rot = dir * 540 * k; } }, (k) => k);
      this.rot = 0;
      await tween(360, (k) => { if (ok()) { this.x = lerp(x0 + dir * 170, x0, k); this.lift = Math.sin(k * Math.PI) * 60; } }, easeOutQuad);
      this.x = x0; this.y = y0;
      this.sq.value = 0.55;
      audio && audio.land();
    }
    restore();
    if (!ok()) return;
    // Shake it off.
    this.setFace('closed', 'flat');
    for (let i = 0; i < 4; i++) { this.tilt.kick(i % 2 ? 700 : -700); this.earL.kick(500); this.earR.kick(-500); await wait(70); }
    this.resetFace();
    this.setFace('open', 'smile');
  }

  // Point at a place on screen with one stretched arm (hint gesture).
  async point(pt, hold = 900, { staticPose = false } = {}) {
    const h = this.freeHand(pt);
    if (h.job && h.cancel) h.cancel();
    const job = ++uid; h.job = job; h.mode = 'free';
    const alive = () => h.job === job;
    this.lookAt(pt);
    this.setFace('open', 'o');
    const s0 = { x: h.x, y: h.y };
    const target = { x: lerp(this.x, pt.x, 0.82), y: lerp(this.y - 60 * this.S, pt.y, 0.82) };
    if (staticPose) {
      h.x = target.x; h.y = target.y;
      this.look = { ...this.lookTarget };
      return;
    }
    await tween(220, (k) => { if (alive()) { h.x = lerp(s0.x, target.x, k); h.y = lerp(s0.y, target.y, k); } }, easeOutBack);
    for (let i = 0; i < 3 && alive(); i++) {
      await tween(hold / 6, (k) => { if (alive()) { h.x = target.x + Math.sin(k * Math.PI) * 8; } });
      await tween(hold / 6, () => {});
    }
    const p0 = { x: h.x, y: h.y };
    await tween(200, (k) => { if (alive()) { const r = this.restHand(h.side, h); h.x = lerp(p0.x, r.x, k); h.y = lerp(p0.y, r.y, k); } });
    if (alive()) { h.mode = 'rest'; h.job = 0; this.resetFace(); }
  }

  async reachPose(on) {
    if (on) {
      this.begin();
      this.setFace('wide', 'puff');
      this.cheekPuff = 1;
      this.sweat.setAttribute('opacity', 1);
      this.sweat.setAttribute('transform', 'translate(46 -130)');
      this.shake = 1.4;
      this.hands.forEach((h) => { h.raise = 0.55; });
    } else {
      this.shake = 0;
      this.cheekPuff = 0;
      this.sweat.setAttribute('opacity', 0);
      this.hands.forEach((h) => { h.raise = 0; });
      this.resetFace();
    }
  }

  async leapTo(pt, height = 80, { audio, spin = 0 } = {}) {
    const landed = await this.hop(height, 480, { to: pt, audio, spin });
    if (landed) this.ground = pt.y;
    return landed;
  }

  destroy() { this.root.remove(); this.armsFront.remove(); }
}

// Standalone sprite image of Capi for canvas particles (cheering pose).
export function mascotSprite(palette = 'capi', size = 128) {
  const p = PALETTES[palette] || PALETTES.capi;
  const { eye, cheek, shoulder, brow } = G;
  const tip = (s) => ({ x: s * 66, y: -150 });
  const arm = (s) => `M${s * shoulder.x} ${shoulder.y} Q${s * 62} ${shoulder.y - 20} ${tip(s).x} ${tip(s).y}`;
  const svg = `<svg xmlns="${NS}" viewBox="-110 -170 220 176" width="${size}" height="${size * 176 / 220}">
  <style>svg{--dkw:3.4}${STYLE}</style>
  ${footSVG(p, -1)}${footSVG(p, 1)}${bodySVG(p)}${earSVG(p, -1)}${earSVG(p, 1)}${headSVG(p)}
  ${[-1, 1].map((s) => `<ellipse cx="${s * cheek.x}" cy="${cheek.y}" rx="${cheek.rx}" ry="${cheek.ry}" fill="${p.cheek}"/><ellipse cx="${s * brow.x}" cy="${brow.y - 4}" rx="${brow.rx}" ry="${brow.ry}" fill="${INK}"/><g transform="translate(${s * eye.x} ${eye.y})">${EYE.happy()}</g>`).join('')}
  <g transform="translate(0 ${G.mouthY})">${MOUTH.grin}</g>
  ${[-1, 1].map((s) => `<path d="${arm(s)}" fill="none" stroke="${INK}" stroke-width="${G.arm + 6.8}" stroke-linecap="round"/><path d="${arm(s)}" fill="none" stroke="${p.body}" stroke-width="${G.arm}" stroke-linecap="round"/><circle class="dk-l" cx="${tip(s).x}" cy="${tip(s).y}" r="${G.hand}" fill="${p.body}"/>`).join('')}
  </svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img;
}

// Static SVG markup of Capi with a colour and costume (collection thumbnails).
export function mascotSVG(palette = 'capi', costume = null) {
  const p = PALETTES[palette] || PALETTES.capi;
  const c = (costume && COSTUMES[costume]) || {};
  const { eye, cheek, brow } = G;
  const armCol = p.flat || p.body;
  const rb = p.body.startsWith('url(') ? '<defs><linearGradient id="dk-rainbow" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff97bf"/><stop offset=".33" stop-color="#ffd452"/><stop offset=".66" stop-color="#5eddb8"/><stop offset="1" stop-color="#8fb4ff"/></linearGradient></defs>' : '';
  return `<svg xmlns="${NS}" viewBox="-112 -232 224 240" aria-hidden="true">${rb}<style>svg{--dkw:3.4}${STYLE}</style>
  ${c.back || ''}${footSVG(p, -1)}${footSVG(p, 1)}${bodySVG(p)}${earSVG(p, -1)}${earSVG(p, 1)}${headSVG(p)}
  ${[-1, 1].map((s) => `<ellipse cx="${s * cheek.x}" cy="${cheek.y}" rx="${cheek.rx}" ry="${cheek.ry}" fill="${p.cheek}"/><ellipse cx="${s * brow.x}" cy="${brow.y}" rx="${brow.rx}" ry="${brow.ry}" fill="${INK}"/><g transform="translate(${s * eye.x} ${eye.y})">${EYE.open(p.body.startsWith('url(') ? { body: armCol } : p)}</g>`).join('')}
  <g transform="translate(0 ${G.mouthY})">${MOUTH.smile}</g>
  ${[-1, 1].map((s) => `<circle class="dk-l" cx="${s * G.rest.x}" cy="${G.rest.y}" r="${G.hand}" fill="${armCol}"/>`).join('')}
  ${c.face || ''}${c.head ? `<g transform="translate(0 ${HAT_LIFT})">${c.head}</g>` : ''}</svg>`;
}

export function startActors(list, getCtx) {
  return onFrame((dt, t) => { const ctx = getCtx(); for (const a of list) a.update(dt, t, ctx); });
}
