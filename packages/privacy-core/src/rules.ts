import type { FindingCategory, ScoreComponents } from '@mosaic/schemas';

/**
 * Transparent deterministic checks (spec 8.1 step 1). Not a comprehensive PII
 * detector. Every rule is listed with its description so a reviewer can see
 * exactly what was checked.
 */
export type Rule = { id: string; category: FindingCategory; description: string; pattern: RegExp; components: ScoreComponents; title: string; action: 'REMOVE' | 'GENERALIZE'; replacement: string };

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';

export const RULES: readonly Rule[] = [
  { id: 'R-EMAIL', category: 'DIRECT_IDENTIFIER', title: 'An email address', description: 'Email addresses', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, components: { direct: 3, specificity: 0, cross: 0, sensitivity: 0 }, action: 'REMOVE', replacement: '[contact removed]' },
  { id: 'R-PHONE', category: 'DIRECT_IDENTIFIER', title: 'A phone number', description: 'Phone numbers with 9 or more digits, international or local formats', pattern: /(?<![\w-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,4}(?![\w-])/g, components: { direct: 3, specificity: 0, cross: 0, sensitivity: 0 }, action: 'REMOVE', replacement: '[phone removed]' },
  { id: 'R-URL', category: 'DIRECT_IDENTIFIER', title: 'A web address', description: 'Web addresses, which can point to profiles or pages about a person', pattern: /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi, components: { direct: 2, specificity: 1, cross: 0, sensitivity: 0 }, action: 'REMOVE', replacement: '[link removed]' },
  { id: 'R-HANDLE', category: 'DIRECT_IDENTIFIER', title: 'A social media handle', description: 'Handles that start with @', pattern: /(?<![\w.])@[A-Za-z0-9_]{3,30}\b(?!\.[A-Za-z])/g, components: { direct: 3, specificity: 0, cross: 0, sensitivity: 0 }, action: 'REMOVE', replacement: '[handle removed]' },
  { id: 'R-IDNUM', category: 'DIRECT_IDENTIFIER', title: 'A long reference number', description: 'Unbroken numbers of 8 or more digits, such as staff, case or record numbers', pattern: /(?<![\d.,-])\d{8,}(?![\d.,-])/g, components: { direct: 3, specificity: 0, cross: 0, sensitivity: 0 }, action: 'REMOVE', replacement: '[number removed]' },
  { id: 'R-DATE', category: 'PRECISE_DATE', title: 'An exact date', description: `Exact day-level dates such as "14 January", "January 14" or "2025-01-14"`, pattern: new RegExp(`\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\b(?:,?\\s+\\d{4})?|(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?\\b(?:,?\\s+\\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})`, 'g'), components: { direct: 0, specificity: 2, cross: 0, sensitivity: 0 }, action: 'GENERALIZE', replacement: '' },
];

export type RuleMatch = { ruleId: string; category: FindingCategory; start: number; end: number; quote: string };

export function runRules(text: string, rules: readonly Rule[] = RULES): RuleMatch[] {
  const out: RuleMatch[] = [];
  for (const r of rules) {
    r.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.pattern.exec(text))) {
      const quote = m[0];
      if (r.id === 'R-PHONE' && quote.replace(/\D/g, '').length < 9) continue;
      out.push({ ruleId: r.id, category: r.category, start: m.index, end: m.index + quote.length, quote });
    }
  }
  // Drop matches fully inside a higher-priority match (e.g. digits inside an email).
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  return out.filter((m, i) => !out.some((o, j) => j !== i && o.start <= m.start && o.end >= m.end && (o.end - o.start > m.end - m.start || j < i)));
}

export const ruleById = (id: string) => RULES.find((r) => r.id === id);
