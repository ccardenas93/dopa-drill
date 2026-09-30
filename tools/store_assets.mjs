// Play Store graphics: icon 512×512, feature graphic 1024×500 and phone
// screenshots 1080×1920 (title, game, skill tree, trophies) in es and en.
// Uses the installed Google Chrome through puppeteer-core; nothing is
// downloaded. Output: store/play/. Run: npm run store
//   CHROME=/path/to/chrome node tools/store_assets.mjs   (other binary)
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'store', 'play');
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
if (!CHROME) { console.error('Chrome not found: set CHROME=/path/to/chrome'); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
function serve(root) {
  return new Promise((resolve) => {
    const srv = createServer(async (req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(root, p));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      let body;
      try { body = await readFile(file); } catch { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function dismiss(page) {
  // First-run guide, login bonus and trophy pop-ups sit over the title screen.
  for (let i = 0; i < 6; i++) {
    const clicked = await page.evaluate(() => {
      const vis = (sel) => { const el = document.querySelector(sel); return el && !el.hidden && el.offsetParent !== null ? el : null; };
      const b = vis('#guide-skip') || vis('#bonus-ok') || vis('#tg-ok') || vis('#hammer-no');
      if (b) { b.click(); return true; }
      return false;
    });
    if (!clicked) break;
    await sleep(700);
  }
}
async function shot(page, name, { w, h, dsf = 1, url, ready, settle = 1200, transparent = false }) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dsf });
  await page.goto(url, { waitUntil: 'networkidle0' });
  if (ready) await page.waitForFunction(ready, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(settle);
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', file);
}

const { srv, base } = await serve(ROOT);
await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.warn('page error:', e.message));

  await shot(page, 'icon-512', { w: 512, h: 512, url: `${base}/store/icon.html`, settle: 400 });
  // Logo on transparent background, 2× (1280×840), Latin and the original Japanese.
  const logoReady = () => document.body.dataset.ready === '1';
  await shot(page, 'logo-transparent', { w: 700, h: 520, dsf: 2, url: `${base}/store/logo.html`, ready: logoReady, settle: 600, transparent: true });
  await shot(page, 'logo-transparent-ja', { w: 700, h: 520, dsf: 2, url: `${base}/store/logo.html?lang=ja`, ready: logoReady, settle: 600, transparent: true });
  for (const lang of ['es', 'en']) {
    await shot(page, `feature-1024x500-${lang}`, { w: 1024, h: 500, url: `${base}/store/feature.html?lang=${lang}`, ready: logoReady, settle: 600 });
  }

  // Phone screenshots: 360×640 CSS px at 3× = 1080×1920.
  const PH = { w: 360, h: 640, dsf: 3 };
  for (const lang of ['es', 'en']) {
    const app = `${base}/app/?lang=${lang}&seed=7`;
    const title = async () => {
      await page.setViewport({ width: PH.w, height: PH.h, deviceScaleFactor: PH.dsf });
      await page.goto(app, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      await sleep(900);
      await dismiss(page);
      await sleep(600);
    };
    const snap = async (name) => {
      const file = join(OUT, `shot-${lang}-${name}.png`);
      await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: PH.w, height: PH.h } });
      console.log('wrote', file);
    };
    await title();
    await snap('1-title');
    await page.click('#start');
    // First run asks the child's grade before the placement round: answer "3.º".
    await page.waitForSelector('#grade-ask [data-ga="3"]', { visible: true, timeout: 5000 }).then((b) => b.click()).catch(() => {});
    await page.waitForSelector('#screen-play.is-active', { timeout: 15000 });
    await sleep(2600);
    await snap('2-play');
    await title();
    await page.click('#open-tree');
    await page.waitForSelector('#screen-tree.is-active', { timeout: 15000 });
    await sleep(900);
    await snap('3-tree');
    await title();
    await page.click('#open-trophy');
    await page.waitForSelector('#screen-trophy.is-active', { timeout: 15000 });
    await sleep(900);
    await snap('4-trophies');
  }
} finally {
  await browser.close();
  srv.close();
}
