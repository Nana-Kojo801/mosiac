/** Word-level diff (LCS) for side-by-side rewrite previews. Small texts only. */
export type DiffPart = { kind: 'same' | 'del' | 'ins'; text: string };

export function diffWords(a: string, b: string): DiffPart[] {
  const A = a.match(/\s+|[^\s]+/g) ?? [], B = b.match(/\s+|[^\s]+/g) ?? [];
  const n = A.length, m = B.length;
  if (n * m > 400_000) return [{ kind: 'del', text: a }, { kind: 'ins', text: b }];
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => { const last = out[out.length - 1]; if (last && last.kind === kind) last.text += text; else out.push({ kind, text }); };
  let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { push('same', A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('del', A[i++]); else push('ins', B[j++]); }
  while (i < n) push('del', A[i++]);
  while (j < m) push('ins', B[j++]);
  return out;
}
