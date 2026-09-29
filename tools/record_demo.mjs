// Records a real gameplay clip of the app's own demo mode (Settings → "Ver una
// partida automática") with the music and effects the game synthesizes.
// Output: <out>/gameplay-demo.mp4 (1080×1920, h264 + aac) and
// <out>/gameplay-demo-audio.m4a. Needs the app served locally, Chrome and ffmpeg.
//   node tools/record_demo.mjs http://127.0.0.1:8766/app/?lang=es videos/capifiesta-promo/assets 26
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [,, url = 'http://127.0.0.1:8766/app/?lang=es', out = 'assets', secondsArg = '26'] = process.argv;
const SECONDS = Number(secondsArg);
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio=false'],
});
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.warn('page error:', e.message));
  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3 });
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}seed=11`, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: '.demo-tag{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
  // Clear the first-run guide and any title pop-up.
  for (let i = 0; i < 6; i++) {
    const clicked = await page.evaluate(() => {
      const vis = (s) => { const el = document.querySelector(s); return el && !el.hidden && el.offsetParent !== null ? el : null; };
      const b = vis('#guide-skip') || vis('#bonus-ok') || vis('#tg-ok') || vis('#hammer-no');
      if (b) { b.click(); return true; }
      return false;
    });
    if (!clicked) break;
    await sleep(600);
  }
  // Tap the audio graph: master bus → MediaRecorder (opus/webm).
  await page.evaluate(() => {
    const a = window.__dopa.audio;
    a.unlock();
    window.__recStart = () => {
      const dest = a.ctx.createMediaStreamDestination();
      a.g.master.connect(dest);
      const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      window.__recStop = () => new Promise((resolve) => {
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result).split(',')[1]);
          fr.readAsDataURL(blob);
        };
        rec.stop();
      });
      rec.start(250);
      return a.ctx.state;
    };
  });
  // Start the demo round through the real UI, then record.
  await page.click('#open-settings');
  await sleep(500);
  await page.click('#demo-play');
  await sleep(250);
  const state = await page.evaluate(() => window.__recStart());
  const t0 = Date.now();
  const recorder = await page.screencast({ path: join(out, 'gameplay-demo.webm') });
  console.log('recording… audio context:', state);
  await sleep(SECONDS * 1000);
  await recorder.stop();
  const audioB64 = await page.evaluate(() => window.__recStop());
  console.log('captured', ((Date.now() - t0) / 1000).toFixed(1), 's');
  writeFileSync(join(out, 'gameplay-demo-audio.webm'), Buffer.from(audioB64, 'base64'));
} finally {
  await browser.close();
}
// Mux: h264 video + aac audio, loudness-normalised; plus the audio alone.
const v = join(out, 'gameplay-demo.webm'); const a = join(out, 'gameplay-demo-audio.webm');
execFileSync('ffmpeg', ['-y', '-i', v, '-i', a, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-vf', 'scale=1080:1920:flags=lanczos', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', join(out, 'gameplay-demo.mp4')], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-y', '-i', a, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', join(out, 'gameplay-demo-audio.m4a')], { stdio: 'inherit' });
console.log('wrote', join(out, 'gameplay-demo.mp4'), 'and', join(out, 'gameplay-demo-audio.m4a'));
