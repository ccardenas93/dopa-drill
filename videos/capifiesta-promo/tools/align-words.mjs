// The local ASR is English-only, so its word TEXT is garbage for Spanish
// narration while its TIMING (first word start → last word end per line) is
// sound. This rewrites audio_meta.json voices[].words with the real spoken
// words from SCRIPT.md (display spelling from DISPLAY below), spread across the
// ASR window proportionally to syllable weight. Run after audio.mjs generate.
import { readFileSync, writeFileSync } from 'node:fs';

const META = process.argv[2] || 'audio_meta.json';
const SCRIPT = process.argv[3] || 'SCRIPT.md';
// Spoken spellings (for the phonemizer) → what the caption should show.
const DISPLAY = { 'Capi': 'Capi', 'Fiesta:': 'Fiesta:', 'Fiesta.': 'Fiesta.', 'Gúgol': 'Google', 'Plei.': 'Play.' };

const script = readFileSync(SCRIPT, 'utf8');
const lines = [];
for (const m of script.matchAll(/## Line (\d+)[^\n]*\n([\s\S]*?)(?=\n## Line |\s*$)/g)) {
  const spoken = m[2].split('\n').filter((l) => /^ {4}\S/.test(l)).map((l) => l.trim()).join(' ');
  lines.push({ frame: Number(m[1]), text: spoken });
}
const meta = JSON.parse(readFileSync(META, 'utf8'));
const weight = (w) => Math.max(1, (w.match(/[aeiouáéíóúü]/gi) || []).length) + 0.35; // syllables + a beat per word
for (const v of meta.voices) {
  const line = lines.find((l) => l.frame === Number(v.frame ?? v.id));
  if (!line || !v.words?.length) continue;
  const t0 = v.words[0].start;
  const t1 = v.words[v.words.length - 1].end;
  const raw = line.text.split(/\s+/).map((w) => DISPLAY[w] || w);
  // The brand is spoken as two words ("Capi Fiesta") but written as one.
  const words = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === 'Capi' && /^Fiesta[.:,]?$/.test(raw[i + 1] || '')) { words.push('Capi' + raw[i + 1]); i++; } else words.push(raw[i]);
  }
  const total = words.reduce((a, w) => a + weight(w), 0);
  let t = t0;
  v.words = words.map((w, i) => {
    const d = ((t1 - t0) * weight(w)) / total;
    const out = { id: i, text: w, start: Number(t.toFixed(3)), end: Number((t + d).toFixed(3)) };
    t += d;
    return out;
  });
  console.log(`frame ${v.frame ?? v.id}: ${words.length} words over ${t0.toFixed(2)}–${t1.toFixed(2)}s`);
}
writeFileSync(META, JSON.stringify(meta, null, 2));
console.log('rewrote', META);
