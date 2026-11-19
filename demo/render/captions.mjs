// Writes captions (SRT, VTT) and the narration script from the timeline's word timings.
//   node render/captions.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chunk } from './chunks.mjs';

const demo = new URL('..', import.meta.url).pathname;
const tl = JSON.parse(readFileSync(join(demo, 'render/timeline.json'), 'utf8'));
const cues = tl.scenes.flatMap((s) => chunk(s.words));
const ts = (t, sep) => { const ms = Math.max(0, Math.round(t * 1000)); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
// Same on-screen window as the composition: until the next cue starts or 0.7 s after the last word.
const windows = cues.map((c, i) => ({ text: c.words.map((w) => w.text).join(' '), start: c.start, end: cues[i + 1] ? Math.min(cues[i + 1].start - 0.08, c.end + 0.7) : c.end + 0.7 }));

mkdirSync(join(demo, 'captions'), { recursive: true });
writeFileSync(join(demo, 'captions/mosaic-demo.en.srt'), windows.map((w, i) => `${i + 1}\n${ts(w.start, ',')} --> ${ts(w.end, ',')}\n${w.text}\n`).join('\n'));
writeFileSync(join(demo, 'captions/mosaic-demo.en.vtt'), 'WEBVTT\n\n' + windows.map((w) => `${ts(w.start, '.')} --> ${ts(w.end, '.')}\n${w.text}\n`).join('\n'));

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
writeFileSync(join(demo, 'narration/script.md'), `# Mosaic demo — narration script

Generated from \`demo/script/scenes.mjs\` by \`render/captions.mjs\`. Numbers in the narration are read from evidence files, not typed in.
Voice: ${tl.voice.name}, model \`${tl.voice.model}\`. Music: ${tl.bpm} BPM, scene starts snapped to the beat.

| Scene | Starts | Voice | Narration |
|---|---|---|---|
${tl.scenes.map((s) => `| ${s.id} | ${fmt(s.start)} | ${s.voiceDuration.toFixed(1)} s | ${s.text.replace(/\|/g, '\\|')} |`).join('\n')}

Total running time: ${fmt(tl.total)}.
`);
console.log(`${windows.length} caption cues -> captions/mosaic-demo.en.{srt,vtt}; narration/script.md`);
