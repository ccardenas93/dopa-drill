// Launcher icons from app/icon.svg (the mascot's face) with the installed
// Chrome via puppeteer-core: Android mipmaps (ic_launcher, ic_launcher_round,
// adaptive ic_launcher_foreground) and the iOS 1024 icon. Run: npm run icons
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
const BLUE = '#3B6BFF';
const svg = readFileSync(join(ROOT, 'app', 'icon.svg'), 'utf8');
const data = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// size: canvas px; face: face width as a fraction of the canvas; bg: css color or 'transparent'.
const html = (size, face, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${bg}}
body{display:grid;place-items:center}img{width:${Math.round(size * face)}px;height:auto;display:block}
</style></head><body><img src="${data}"></body></html>`;

const ANDROID = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = [];
for (const [d, k] of Object.entries(DENS)) {
  const dir = join(ANDROID, `mipmap-${d}`);
  jobs.push({ file: join(dir, 'ic_launcher.png'), size: 48 * k, face: 0.84, bg: BLUE });
  jobs.push({ file: join(dir, 'ic_launcher_round.png'), size: 48 * k, face: 0.78, bg: BLUE });
  // Adaptive foreground: 108dp canvas, content inside the central 66% safe zone.
  jobs.push({ file: join(dir, 'ic_launcher_foreground.png'), size: 108 * k, face: 0.56, bg: 'transparent' });
}
jobs.push({ file: join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'), size: 1024, face: 0.84, bg: BLUE });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--no-first-run'] });
try {
  const page = await browser.newPage();
  for (const j of jobs) {
    mkdirSync(dirname(j.file), { recursive: true });
    await page.setViewport({ width: j.size, height: j.size, deviceScaleFactor: 1 });
    await page.setContent(html(j.size, j.face, j.bg), { waitUntil: 'load' });
    await page.screenshot({ path: j.file, type: 'png', omitBackground: j.bg === 'transparent', clip: { x: 0, y: 0, width: j.size, height: j.size } });
    console.log('wrote', j.file.replace(ROOT + '/', ''), `${j.size}px`);
  }
} finally {
  await browser.close();
}
