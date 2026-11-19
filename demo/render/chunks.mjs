// Caption chunking shared by the on-screen captions and the SRT/VTT files.
// Breaks on sentence ends, on clause commas once a line has a few words, on
// pauses, and at a maximum line length.

/** @param {{text:string,start:number,end:number}[]} words */
export function chunk(words, max = 7) {
  const out = []; let cur = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], next = words[i + 1];
    cur.push(w);
    const sentence = /[.?!]["”’)]?$/.test(w.text);
    const clause = /[,;:]$/.test(w.text) && cur.length >= 3;
    const pause = next ? next.start - w.end > 0.45 : true;
    const full = cur.length >= max && !(next && /[.?!,]$/.test(next.text) && cur.length < max + 1);
    if (sentence || clause || pause || full || !next) { out.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur }); cur = []; }
  }
  return out;
}
