// Generates narration per scene with ElevenLabs (spec 22.5). Audio and word
// timings are cached by a hash of text + voice + settings, so re-runs only spend
// credits on lines that changed. Stops with a clear message if the key is missing.
//   npm run narrate [-- --voice <id>]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildScenes } from '../script/scenes.mjs';

const root = new URL('../..', import.meta.url).pathname;
const env = existsSync(join(root, '.env.local')) ? readFileSync(join(root, '.env.local'), 'utf8') : '';
const KEY = process.env.ELEVENLABS_API_KEY || (env.match(/^ELEVENLABS_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('ELEVENLABS_API_KEY is not set (.env.local). Narration was not generated; no other voice is substituted.'); process.exit(1); }
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
export const VOICE = { id: arg('--voice') || 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (ElevenLabs premade)', model: 'eleven_multilingual_v2', settings: { stability: 0.4, similarity_boost: 0.8, style: 0.42, use_speaker_boost: true, speed: 1.06 } };
const cacheDir = join(root, 'demo/narration/cache');
mkdirSync(cacheDir, { recursive: true });

const scenes = buildScenes();
const manifest = { voice: VOICE, generatedAt: new Date().toISOString(), scenes: [] };
for (const [i, s] of scenes.entries()) {
  const hash = createHash('sha256').update(JSON.stringify([s.text, VOICE.id, VOICE.model, VOICE.settings])).digest('hex').slice(0, 16);
  const mp3 = join(cacheDir, `${s.id}-${hash}.mp3`), meta = join(cacheDir, `${s.id}-${hash}.json`);
  if (!existsSync(mp3) || !existsSync(meta)) {
    const body = { text: s.text, model_id: VOICE.model, voice_settings: VOICE.settings, previous_text: scenes[i - 1]?.text, next_text: scenes[i + 1]?.text };
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { console.error(`ElevenLabs refused scene "${s.id}": HTTP ${r.status} ${(await r.text()).slice(0, 200)}`); process.exit(1); }
    const d = await r.json();
    writeFileSync(mp3, Buffer.from(d.audio_base64, 'base64'));
    writeFileSync(meta, JSON.stringify({ alignment: d.alignment }, null, 0));
    console.log(`generated ${s.id} (${s.text.length} chars)`);
  } else console.log(`cached    ${s.id}`);
  const a = JSON.parse(readFileSync(meta, 'utf8')).alignment;
  // Characters -> words with start/end seconds.
  const words = []; let cur = null;
  a.characters.forEach((ch, k) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { text: '', start: a.character_start_times_seconds[k], end: a.character_end_times_seconds[k] };
    cur.text += ch; cur.end = a.character_end_times_seconds[k];
  });
  if (cur) words.push(cur);
  manifest.scenes.push({ id: s.id, audio: `narration/cache/${s.id}-${hash}.mp3`, duration: a.character_end_times_seconds.at(-1), words });
}
writeFileSync(join(root, 'demo/narration/narration.json'), JSON.stringify(manifest, null, 2));
console.log(`total voice ${manifest.scenes.reduce((t, s) => t + s.duration, 0).toFixed(1)} s across ${manifest.scenes.length} scenes`);
