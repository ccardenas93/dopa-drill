// Dev helper: quick screenshots of title / demo round / collection. node tools/peek_screens.mjs <outdir> [url]
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.setViewport({ width: 360, height: 640, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:8766/app/?lang=es&seed=3', { waitUntil: 'networkidle0' }); await sleep(900);
for (let i = 0; i < 6; i++) { const c = await p.evaluate(() => { const v = (s) => { const e = document.querySelector(s); return e && !e.hidden && e.offsetParent !== null ? e : null; }; const x = v('#guide-skip') || v('#bonus-ok') || v('#tg-ok') || v('#hammer-no'); if (x) { x.click(); return true; } return false; }); if (!c) break; await sleep(600); }
await p.screenshot({ path: process.argv[2] + '/capi-title.png' });
await p.click('#open-settings'); await sleep(400); await p.click('#demo-play'); await sleep(14000);
await p.screenshot({ path: process.argv[2] + '/capi-play.png' });
await p.goto('http://127.0.0.1:8766/app/?lang=es', { waitUntil: 'networkidle0' }); await sleep(800);
await p.click('#open-collect'); await sleep(900); await p.screenshot({ path: process.argv[2] + '/capi-collect.png' });
await b.close();
