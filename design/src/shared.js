/* ==========================================================================
   Mosaic design preview: shared fixtures, state and helpers.
   DESIGN PREVIEW ONLY. Nothing here calls Firebase or any model. Every value
   shown is sample data written for the preview; group counts are computed
   from the seeded fictional population below, not typed in.
   ========================================================================== */

/* ---------- small utilities ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (name, size = 18, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('mosaic-preview:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mosaic-preview:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- fixtures: one fictional research workspace ---------- */
const WORKSPACE = {
  id: 'ws-sample',
  title: 'Night Shift Study',
  org: 'Larkspur Health Network (fictional)',
  description: 'Interviews with overnight care staff. Two reports are already published; transcript P-07 is the next release.',
};

const PRIVATE_WORKSPACES = [
  { id: 'ws-chi', title: 'Community Health Interviews', docs: 4, edited: 'Edited 2 days ago', status: 'Needs review' },
  { id: 'ws-avr', title: 'Volunteer Programme Evaluation', docs: 2, edited: 'Edited last week', status: 'Approved release' },
];

const DOCS = {
  R1: {
    id: 'R1', kind: 'release', title: 'Interim findings report', short: 'Interim report',
    meta: 'Approved release · 12 Mar 2026 · v2', approved: '12 Mar 2026', pages: 4,
    paras: [
      'This interim report summarises themes from twelve interviews conducted between October and December 2025.',
      'Participants were drawn from ward-based nursing staff and from the overnight pharmacy team, which supports all three inpatient sites.',
      'Across roles, participants described handover as the most stressful point of a night shift.',
    ],
  },
  R2: {
    id: 'R2', kind: 'release', title: 'Onboarding experience case study', short: 'Case study',
    meta: 'Approved release · 3 Jun 2026 · v1', approved: '3 Jun 2026', pages: 3,
    paras: [
      'This case study follows how new starters experienced their first three months on nights.',
      'One participant described joining with the winter onboarding cohort, which started in the weeks after the January rota change.',
      'Peer shadowing was described as more useful than formal induction sessions.',
    ],
  },
  D3: {
    id: 'D3', kind: 'draft', title: 'Interview P-07 transcript', short: 'P-07 transcript',
    meta: 'Draft v3 · Private · edited today', pages: 2,
    paras: [
      'Interviewer: Thanks for making time after your shift. Could you start with how you came to the role?',
      'P-07: Sure. I came over after my transfer from the coastal satellite clinic, so I already knew the dispensing system. Most people on nights had never used it.',
      'P-07: For the first few months I was the only one on nights who could run the compounding hood, which meant I got called for everything.',
      'Interviewer: What changed when the new rota started?',
      'P-07: The week the new rota started, on 14 January, two of us were moved to permanent nights. Breaks got shorter and handovers got messy.',
      'P-07: We’d eat in the level 3 break room because it was the only place with a signal.',
      'P-07: Honestly, I thought about leaving. My manager knew I was struggling, and I’d told occupational health about the anxiety.',
      'Follow-up contact: p07.followup@example.org',
    ],
  },
};

const CATEGORY = {
  CROSS_RELEASE: { label: 'Cross-release context', icon: 'link-2' },
  RARE_ATTRIBUTE: { label: 'Rare attribute', icon: 'sparkle' },
  PRECISE_DATE: { label: 'Precise date', icon: 'calendar-days' },
  NARROW_LOCATION: { label: 'Narrow location', icon: 'map-pin' },
  SENSITIVE_CONTEXT: { label: 'Sensitive context', icon: 'heart-pulse' },
  DIRECT_IDENTIFIER: { label: 'Direct identifier', icon: 'at-sign' },
};

// comps: direct 0-3, specificity 0-3, crossRelease 0-3, sensitivity 0-2  (8.2)
const FINDINGS = [
  {
    id: 'F-01', category: 'CROSS_RELEASE', title: 'Three details combine to describe one person',
    comps: { direct: 0, specificity: 3, cross: 3, sensitivity: 2 }, confidence: 'MEDIUM',
    confReason: 'The link rests on contextual overlap across three documents. Knowledge outside this workspace is not assessed.',
    source: 'DEVICE', status: 'OPEN',
    anchors: [
      { doc: 'D3', para: 1, quote: 'after my transfer from the coastal satellite clinic' },
      { doc: 'R1', para: 1, quote: 'the overnight pharmacy team' },
      { doc: 'R2', para: 1, quote: 'the winter onboarding cohort' },
    ],
    rationale: 'Read alone, the transfer is background. Read with the pharmacy team in the interim report and the winter cohort in the case study, it describes a very small group.',
    action: 'Generalize the transfer',
    rewrite: { para: 1, from: 'after my transfer from the coastal satellite clinic', to: 'after moving from another site in the network' },
    keeps: 'P-07 already knew the dispensing system.',
  },
  {
    id: 'F-02', category: 'RARE_ATTRIBUTE', title: 'A skill only one person on nights had',
    comps: { direct: 0, specificity: 3, cross: 1, sensitivity: 1 }, confidence: 'HIGH',
    confReason: 'The passage says outright that no one else on nights had this skill.',
    source: 'DEVICE', status: 'UNDER_REVIEW',
    anchors: [
      { doc: 'D3', para: 2, quote: 'the only one on nights who could run the compounding hood' },
      { doc: 'R1', para: 1, quote: 'the overnight pharmacy team' },
    ],
    rationale: 'A unique skill is a strong pointer on its own, and the interim report already names the team it belongs to.',
    action: 'Describe the skill more broadly',
    rewrite: { para: 2, from: 'the only one on nights who could run the compounding hood', to: 'one of the few people on nights trained on specialist equipment' },
    keeps: 'P-07 carried an uneven share of call-outs.',
  },
  {
    id: 'F-03', category: 'PRECISE_DATE', title: 'An exact date ties the draft to the January cohort',
    comps: { direct: 0, specificity: 2, cross: 1, sensitivity: 1 }, confidence: 'MEDIUM',
    confReason: 'The date matches the rota change described in the case study.',
    source: 'DEVICE', status: 'OPEN',
    anchors: [
      { doc: 'D3', para: 4, quote: 'on 14 January' },
      { doc: 'R2', para: 1, quote: 'the January rota change' },
    ],
    rationale: 'The analysis needs the sequence of events, not the day. The date links this interview to the cohort in the case study.',
    action: 'Remove the exact date',
    rewrite: { para: 4, from: 'The week the new rota started, on 14 January, two of us', to: 'When the new rota started, two of us' },
    keeps: 'Two staff moved to permanent nights when the rota changed.',
  },
  {
    id: 'F-04', category: 'NARROW_LOCATION', title: 'A specific room is named',
    comps: { direct: 0, specificity: 2, cross: 0, sensitivity: 0 }, confidence: 'LOW',
    confReason: 'Break rooms like this exist on every site, so the pointer is weak. Flagged for completeness.',
    source: 'DEVICE', status: 'OPEN', chunk: 2,
    anchors: [{ doc: 'D3', para: 5, quote: 'the level 3 break room' }],
    rationale: 'A floor number adds precision the analysis does not use.',
    action: 'Generalize the room',
    rewrite: { para: 5, from: 'the level 3 break room', to: 'a staff break room' },
    keeps: 'Staff ate where there was phone signal.',
  },
  {
    id: 'F-05', category: 'SENSITIVE_CONTEXT', title: 'A health disclosure the finding does not need',
    comps: { direct: 0, specificity: 1, cross: 0, sensitivity: 2 }, confidence: 'MEDIUM',
    confReason: 'Health information is sensitive by category. Whether it is needed is your call.',
    source: 'DEVICE', status: 'OPEN', chunk: 2,
    anchors: [{ doc: 'D3', para: 6, quote: 'and I’d told occupational health about the anxiety' }],
    rationale: 'The point about considering leaving stands without the health detail.',
    action: 'Remove the health detail',
    rewrite: { para: 6, from: ', and I’d told occupational health about the anxiety', to: '' },
    keeps: 'P-07 considered leaving and their manager knew they were struggling.',
  },
  {
    id: 'F-06', category: 'DIRECT_IDENTIFIER', title: 'An email address',
    comps: { direct: 3, specificity: 0, cross: 0, sensitivity: 0 }, confidence: 'HIGH', override: 'HIGH',
    confReason: 'Matched the email address rule.',
    source: 'RULES', status: 'OPEN',
    anchors: [{ doc: 'D3', para: 7, quote: 'p07.followup@example.org' }],
    rationale: 'Contact details identify a person directly. A detected direct identifier is raised to high priority.',
    action: 'Remove the address',
    rewrite: { para: 7, from: 'p07.followup@example.org', to: '[contact removed]' },
    keeps: 'Nothing analytical is lost.',
  },
];

const STATUS = {
  OPEN: { label: 'Open', icon: 'circle-dot' },
  UNDER_REVIEW: { label: 'Under review', icon: 'eye' },
  ACCEPTED_RESIDUAL: { label: 'Accepted residual', icon: 'circle-check-big' },
  RESOLVED: { label: 'Resolved', icon: 'circle-check' },
  DISMISSED: { label: 'Dismissed', icon: 'circle-slash' },
  UNASSESSED: { label: 'Not assessed', icon: 'circle-dashed' },
};

const PACKS = [
  {
    id: 'core', name: 'Core disclosure checks', version: 'v1.3', source: 'bundled', count: 8, enabled: true,
    tests: [
      ['DIRECT_IDENTIFIERS', 'Direct identifiers', 'Does the text name, contact or uniquely number a person?'],
      ['PRECISE_DATES', 'Overly precise dates', 'Is a date more specific than the analysis needs?'],
      ['RARE_ATTRIBUTES', 'Rare descriptive attributes', 'Does a role, skill or trait apply to very few people?'],
      ['NARROW_LOCATION', 'Narrow location', 'Does a place description point to a small area or site?'],
      ['DISTINCTIVE_EVENTS', 'Distinctive events', 'Would people nearby recognise this event?'],
      ['CROSS_RELEASE', 'Repeated context across releases', 'Does this detail repeat or combine with an earlier release?'],
      ['EXCESSIVE_DETAIL', 'Excessive detail', 'Is there more detail than the finding needs?'],
      ['SENSITIVE_CONTEXT', 'Sensitive context', 'Does the text reveal health, legal or other sensitive context?'],
    ],
  },
  {
    id: 'qr', name: 'Qualitative research expansion', version: '2026.11.18-a', source: 'cloud', count: 12, enabled: true,
    tests: [
      ['ROLE_RARITY', 'Role rarity in small teams', 'Would this role description fit only a handful of people in a team of this size?'],
      ['TENURE_WINDOWS', 'Start-date windows', 'Does a start or leave date fall in a narrow, recorded window?'],
      ['SHIFT_PATTERNS', 'Shift patterns', 'Does a described rota or shift pattern apply to few people?'],
    ],
  },
  {
    id: 'ed', name: 'Editorial release checks', version: 'v1.0', source: 'bundled', count: 6, enabled: false,
    tests: [
      ['QUOTE_ATTRIBUTION', 'Quote attribution', 'Could a direct quote be attributed through style or content?'],
      ['PHOTO_CAPTIONS', 'Captions and alt text', 'Do captions add detail missing from the body text?'],
    ],
  },
];

const PACK_SOURCE = {
  bundled: { label: 'Bundled', icon: 'package' },
  cloud: { label: 'Generated in cloud', icon: 'cloud' },
  cached: { label: 'Cached', icon: 'hard-drive' },
};

// The exact outbound body for a generic pack request. Built only from enums.
const PACK_REQUEST = {
  task: 'generatePack',
  domain: 'QUALITATIVE_RESEARCH',
  categories: ['ROLE_RARITY', 'TENURE_WINDOWS', 'SHIFT_PATTERNS'],
  packSchemaVersion: 1,
};

const JOURNAL = [
  { t: '10:42:18', task: 'Extract context', scope: 'P-07 · ¶1–5', policy: 'ONLY_ON_DEVICE', src: 'DEVICE', ms: 2400, outcome: 'ok' },
  { t: '10:42:21', task: 'Extract context', scope: 'P-07 · ¶6–8', policy: 'ONLY_ON_DEVICE', src: 'DEVICE', ms: 1900, outcome: 'ok', chunk: 2 },
  { t: '10:42:21', task: 'Direct checks', scope: 'P-07 · all', policy: 'NO_MODEL', src: 'RULES', ms: 12, outcome: 'ok' },
  { t: '10:42:24', task: 'Link releases', scope: '3 documents', policy: 'ONLY_ON_DEVICE', src: 'DEVICE', ms: 3100, outcome: 'ok' },
  { t: '10:44:02', task: 'Generate test pack', scope: 'Generic enums only', policy: 'ONLY_IN_CLOUD', src: 'CLOUD', ms: 3400, outcome: 'ok', cloud: true },
  { t: '10:44:40', task: 'Explain sample test', scope: 'Fixture fx-07', policy: 'PREFER_ON_DEVICE', src: 'CLOUD', ms: 1200, outcome: 'ok', note: 'Fell back to cloud: no local model on this device. Fixture data only.' },
  { t: '10:47:11', task: 'Rewrite passage', scope: 'P-07 · ¶2', policy: 'ONLY_ON_DEVICE', src: 'DEVICE', ms: 1600, outcome: 'ok' },
];

// Routing table (7.2). The landing diagram is drawn from this list; in the
// build, the same table drives the privacy gate so the two cannot drift.
const ROUTING = [
  { task: 'Extract context from private documents', data: 'Private', policy: 'ONLY_ON_DEVICE', fail: 'Marked not assessed; rules and manual review stay available' },
  { task: 'Review connections across releases', data: 'Private', policy: 'ONLY_ON_DEVICE', fail: 'Partial results kept; no cloud retry' },
  { task: 'Rewrite a private passage', data: 'Private', policy: 'ONLY_ON_DEVICE', fail: 'Manual editing' },
  { task: 'Generate generic test packs', data: 'Fixed enums', policy: 'ONLY_IN_CLOUD', fail: 'Bundled or cached pack' },
  { task: 'Explain a sample test', data: 'Bundled fixture', policy: 'PREFER_ON_DEVICE', fail: 'SDK may use cloud; actual source shown' },
  { task: 'Direct-identifier checks, scoring, export', data: 'Local data', policy: 'NO_MODEL', fail: 'Works offline' },
];

const SOURCE = {
  DEVICE: { label: 'On device', icon: 'cpu', cls: 'device' },
  CLOUD: { label: 'Cloud', icon: 'cloud', cls: 'cloud' },
  RULES: { label: 'Rules only', icon: 'list-checks', cls: 'rules' },
  UNAVAILABLE: { label: 'Unavailable', icon: 'circle-slash', cls: 'unavail' },
  UNKNOWN: { label: 'Unknown', icon: 'circle-help', cls: 'unknown' },
  FIXTURE: { label: 'Sample result', icon: 'flask-conical', cls: 'fixture' },
};

const MODEL_STATES = {
  checking: { label: 'Checking', icon: 'loader', tone: 'neutral', body: 'Asking the browser whether the built-in model is available.' },
  unsupported: { label: 'Unsupported', icon: 'monitor-x', tone: 'warn', body: 'This browser or device can’t run the built-in model. Rules-based checks and manual review still work, and nothing is sent to the cloud instead.' },
  download: { label: 'Download needed', icon: 'download', tone: 'neutral', body: 'The model downloads once (several GB) over an unmetered connection, then works offline.' },
  downloading: { label: 'Downloading', icon: 'loader', tone: 'neutral', body: 'Chrome is downloading the model. Progress shows when the browser reports it.' },
  ready: { label: 'Ready', icon: 'circle-check', tone: 'ok', body: 'Private analysis runs on this device.' },
  unavailable: { label: 'Temporarily unavailable', icon: 'clock', tone: 'warn', body: 'The model is busy or paused by the browser. Private tasks wait; they never move to the cloud.' },
  offline: { label: 'Offline', icon: 'wifi-off', tone: 'neutral', body: 'The model is ready and works offline. Cloud test-pack generation is paused until you reconnect.' },
  error: { label: 'Error', icon: 'triangle-alert', tone: 'bad', body: 'The model failed to load (storage error). Retry, or free space on the Chrome profile drive.' },
};

const SCENARIOS = {
  normal: { label: 'Normal', note: 'Model ready, online.' },
  unsupported: { label: 'Unsupported device', note: 'No local model. Sample shows recorded results; private work is rules-only.' },
  offline: { label: 'Offline', note: 'Local work continues. Cloud packs unavailable.' },
  partial: { label: 'Partial scan', note: 'One chunk timed out and is marked not assessed.' },
  empty: { label: 'Empty', note: 'No private workspaces or documents yet.' },
  error: { label: 'Errors', note: 'Import failures and a malformed model reply.' },
};

/* ---------- seeded fictional population (8.3) ---------- */
// 100 toy records. IDs are not names. Counts are computed from these sets.
const POPULATION = (() => {
  let seed = 20261119;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ids = Array.from({ length: 100 }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const A = ids.slice(0, 24); // overnight pharmacy team
  const outside = ids.slice(24);
  const AB = A.slice(0, 8);
  const B = [...AB, ...outside.slice(0, 7)]; // winter onboarding cohort
  const C = [AB[0], outside[10], outside[20]]; // transfer from coastal satellite clinic
  const Cg = [...AB.slice(0, 7), ...A.slice(8, 22), ...outside.slice(30, 69)]; // moved from another site in the network
  const records = Array.from({ length: 100 }, (_, i) => ({ id: 'T-' + String(i + 1).padStart(3, '0'), i }));
  return { records, A: new Set(A), B: new Set(B), C: new Set(C), Cg: new Set(Cg) };
})();

function groupSteps(applied) {
  const P = POPULATION;
  const steps = [{ label: 'Fictional population', from: 'Seeded toy records', set: new Set(P.records.map((r) => r.i)) }];
  const narrow = (label, from, s) => { const prev = steps[steps.length - 1].set; steps.push({ label, from, set: new Set([...prev].filter((i) => s.has(i))) }); };
  narrow('Overnight pharmacy team', 'Interim report ¶2', P.A);
  if (!applied.has('F-03')) narrow('Winter onboarding cohort', 'Case study ¶2, linked by the date in P-07 ¶5', P.B);
  if (applied.has('F-01')) narrow('Moved from another site', 'P-07 ¶2 (revised)', P.Cg);
  else narrow('Transfer from the coastal satellite clinic', 'P-07 ¶2', P.C);
  return steps.map((s) => ({ ...s, count: s.set.size }));
}

/* ---------- state ---------- */
const S = {
  appearance: store.get('appearance', 'light'),
  accent: store.get('accent', 'indigo'),
  reduced: store.get('reduced', false),
  refraction: store.get('refraction', true),
  scenario: store.get('scenario', 'normal'),
  applied: new Set(),        // rewrites applied to the draft (creates v4)
  rescanned: false,          // reassessment run after rewrites
  statusOverride: {},        // finding id -> status
  approved: false,
  checklist: [false, false, false],
  selected: 'F-01',
  packsEnabled: { core: true, qr: true, ed: false },
  consent: null,             // null | 'pending' | 'approved' | 'sent'
  modelPreview: null,        // override the model state shown on setup
  listeners: new Set(),
};

function setState(patch) {
  Object.assign(S, patch);
  ['appearance', 'accent', 'reduced', 'refraction', 'scenario'].forEach((k) => { if (k in patch) store.set(k, S[k]); });
  applyAppearance();
  S.listeners.forEach((fn) => fn(patch));
}
function onState(fn) { S.listeners.add(fn); }

function resetSample() {
  setState({ applied: new Set(), rescanned: false, statusOverride: {}, approved: false, checklist: [false, false, false], selected: 'F-01', consent: null });
}

function applyAppearance() {
  const r = document.getElementById('app-root');
  if (!r) return;
  r.dataset.appearance = S.appearance;
  r.dataset.accent = S.accent;
  r.dataset.transparency = S.reduced ? 'reduced' : 'full';
  r.dataset.refraction = S.refraction && !S.reduced ? 'on' : 'off';
  Refraction.refresh();
}

/* ---------- derived data ---------- */
const scoreOf = (f) => f.comps.direct + f.comps.specificity + f.comps.cross + f.comps.sensitivity;
function bandOf(f) {
  const s = scoreOf(f);
  let b = s >= 9 ? 'CRITICAL' : s >= 6 ? 'HIGH' : s >= 3 ? 'MODERATE' : 'LOW';
  if (f.override === 'HIGH' && (b === 'LOW' || b === 'MODERATE')) b = 'HIGH';
  return b;
}
const BAND = {
  CRITICAL: { label: 'Critical', cls: 'crit', icon: 'octagon-alert' },
  HIGH: { label: 'High priority', cls: 'high', icon: 'triangle-alert' },
  MODERATE: { label: 'Needs review', cls: 'mod', icon: 'circle-alert' },
  LOW: { label: 'Low', cls: 'low', icon: 'info' },
};
const CONF = { HIGH: 'High confidence', MEDIUM: 'Medium confidence', LOW: 'Low confidence' };

function findings() {
  const sc = S.scenario;
  let list = FINDINGS.map((f) => ({ ...f }));
  if (sc === 'unsupported') list = list.map((f) => (f.source === 'DEVICE' ? { ...f, source: 'FIXTURE' } : f));
  if (sc === 'partial' || sc === 'error') {
    list = list.filter((f) => f.chunk !== 2);
    list.push({
      id: 'F-07', category: null, title: sc === 'error' ? '¶6–8 not assessed: the model reply was malformed' : '¶6–8 not assessed: the local model timed out',
      comps: { direct: 0, specificity: 0, cross: 0, sensitivity: 0 }, confidence: null, source: sc === 'error' ? 'DEVICE' : 'UNAVAILABLE', status: 'UNASSESSED',
      anchors: [{ doc: 'D3', para: 5, quote: '' }],
      rationale: sc === 'error'
        ? 'The reply did not match the findings schema. It was retried once on this device and then set aside. No cloud retry was made.'
        : 'This chunk did not finish within the time limit. It stays not assessed until you run it again. No cloud retry was made.',
      action: 'Run this chunk again', unassessed: true,
    });
  }
  for (const f of list) {
    if (S.statusOverride[f.id]) f.status = S.statusOverride[f.id];
    if (S.applied.has(f.id)) f.status = S.rescanned ? 'RESOLVED' : 'UNDER_REVIEW';
    f.band = f.unassessed ? null : bandOf(f);
    f.score = scoreOf(f);
  }
  return list;
}
const findingById = (id) => findings().find((f) => f.id === id);
const openFindings = () => findings().filter((f) => !['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(f.status));

function draftParas() {
  const paras = [...DOCS.D3.paras];
  for (const f of FINDINGS) if (S.applied.has(f.id) && f.rewrite) paras[f.rewrite.para] = paras[f.rewrite.para].replace(f.rewrite.from, f.rewrite.to);
  return paras;
}
const draftVersion = () => (S.applied.size ? 'v4' : 'v3');

function modelState() {
  if (S.modelPreview) return S.modelPreview;
  return { normal: 'ready', unsupported: 'unsupported', offline: 'offline', partial: 'ready', empty: 'ready', error: 'error' }[S.scenario];
}
const isOffline = () => S.scenario === 'offline';

function journal() {
  const sc = S.scenario;
  let j = JOURNAL.map((e) => ({ ...e }));
  if (sc === 'unsupported') {
    j = j.map((e) => (e.policy === 'ONLY_ON_DEVICE' ? { ...e, src: 'UNAVAILABLE', ms: null, outcome: 'unavailable', note: 'No local model. Marked not assessed. No cloud retry.' } : e));
  }
  if (sc === 'partial') j[1] = { ...j[1], src: 'UNAVAILABLE', ms: 30000, outcome: 'timeout', note: 'Timed out after 30 s. Marked not assessed. No cloud retry.' };
  if (sc === 'error') j[1] = { ...j[1], outcome: 'malformed', note: 'Reply failed schema validation. Retried once on device, then set aside.' };
  if (sc === 'offline') j[4] = { ...j[4], src: 'UNAVAILABLE', ms: null, outcome: 'offline', note: 'Not sent: offline. Using cached pack 2026.11.18-a.' };
  return j.reverse();
}

/* ---------- markup helpers ---------- */
function riskChip(band, opts = {}) {
  if (!band) return `<span class="chip chip-unassessed">${ic('circle-dashed', 14)}<span>Not assessed</span></span>`;
  const b = BAND[band];
  return `<span class="chip chip-${b.cls}${opts.small ? ' chip-sm' : ''}">${ic(b.icon, 14)}<span>${b.label}</span></span>`;
}
function sourceBadge(src, opts = {}) {
  const s = SOURCE[src] || SOURCE.UNKNOWN;
  return `<span class="src src-${s.cls}" title="Actual execution source">${ic(s.icon, 13)}<span>${opts.short ? s.label.replace(' only', '') : s.label}</span></span>`;
}
function statusChip(status) {
  const s = STATUS[status];
  return `<span class="status status-${status.toLowerCase()}">${ic(s.icon, 13)}<span>${s.label}</span></span>`;
}
function packBadge(source) {
  const p = PACK_SOURCE[source];
  return `<span class="pack-src pack-${source}">${ic(p.icon, 12)}<span>${p.label}</span></span>`;
}
function policyTag(p) {
  return `<code class="policy">${p}</code>`;
}
function scoreBars(f) {
  const rows = [['Direct disclosure', f.comps.direct, 3], ['Contextual specificity', f.comps.specificity, 3], ['Cross-release evidence', f.comps.cross, 3], ['Unnecessary sensitivity', f.comps.sensitivity, 2]];
  return `<div class="score">
    ${rows.map(([l, v, m]) => `<div class="score-row"><span class="score-label">${l}</span><span class="score-pips" aria-label="${v} of ${m}">${Array.from({ length: m }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span><span class="score-num">${v}/${m}</span></div>`).join('')}
    <div class="score-total"><span>Review priority</span><strong>${f.score}<small>/11</small></strong></div>
  </div>`;
}
// Paragraph text with evidence marks for every finding anchored in it.
function markPara(docId, idx, text, opts = {}) {
  let html = esc(text);
  const list = opts.findings || findings();
  for (const f of list) {
    if (S.applied.has(f.id) && docId === 'D3') continue;
    for (const a of f.anchors) {
      if (a.doc !== docId || a.para !== idx || !a.quote) continue;
      const q = esc(a.quote);
      if (!html.includes(q)) continue;
      const active = opts.active === f.id ? ' active' : '';
      html = html.replace(q, `<mark class="ev ev-${f.band ? BAND[f.band].cls : 'un'}${active}" data-f="${f.id}" tabindex="0" role="button" aria-label="${esc(f.title)}">${q}</mark>`);
    }
  }
  return html;
}
function mosaicGrid(steps, stage, opts = {}) {
  // stage: index into steps to show. Tiles eliminated at step k get class out-k.
  const last = steps[Math.min(stage, steps.length - 1)].set;
  const outAt = new Map();
  steps.forEach((s, k) => { if (k === 0) return; for (const i of steps[k - 1].set) if (!s.set.has(i) && !outAt.has(i)) outAt.set(i, k); });
  const tiles = POPULATION.records.map((r) => {
    const k = outAt.get(r.i);
    const state = last.has(r.i) ? 'in' : (k && k <= stage ? `out out-${Math.min(k, 3)}` : 'in');
    return `<i class="tile ${state}" title="${r.id}"></i>`;
  }).join('');
  return `<div class="mosaic${opts.cls ? ' ' + opts.cls : ''}" role="img" aria-label="${last.size} of 100 fictional records remain">${tiles}</div>`;
}
function logo(size = 22) {
  // 3x3 tesserae, one accent tile: separate pieces that form a picture
  const t = [0, 1, 2].flatMap((y) => [0, 1, 2].map((x) => `<rect x="${x * 8 + 1}" y="${y * 8 + 1}" width="6.4" height="6.4" rx="1.8" class="${x === 2 && y === 0 ? 'lg-a' : (x + y) % 2 ? 'lg-b' : 'lg-c'}"/>`)).join('');
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 25 25" aria-hidden="true">${t}</svg>`;
}
function toast(msg, icon = 'check') {
  let host = $('#toast-host');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.setAttribute('role', 'status');
  el.innerHTML = `${ic(icon, 16)}<span>${esc(msg)}</span>`;
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2700);
}

/* ---------- Liquid Glass refraction (progressive enhancement, 12.4) ---------- */
// Baseline glass is pure CSS. Where Chromium supports SVG filters in
// backdrop-filter, elements marked [data-refract] get an edge-refraction
// displacement map sized to their box.
const Refraction = {
  cache: new Map(),
  svg: null,
  get supported() {
    return typeof window !== 'undefined' && !!window.chrome && !/Firefox|FxiOS/.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'blur(1px)');
  },
  get on() { return S.refraction && !S.reduced && this.supported && !window.matchMedia('(prefers-reduced-transparency: reduce)').matches; },
  ensureSvg() {
    if (this.svg) return this.svg;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '0'); this.svg.setAttribute('height', '0');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.style.position = 'absolute';
    document.body.appendChild(this.svg);
    return this.svg;
  },
  map(w, h, r, edge) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h); const d = img.data;
    const hw = w / 2, hh = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      let dist, nx, ny;
      if (qx > 0 && qy > 0) { const L = Math.hypot(qx, qy); dist = L - r; nx = (qx / L) * Math.sign(px); ny = (qy / L) * Math.sign(py); }
      else if (qx > qy) { dist = qx - r; nx = Math.sign(px); ny = 0; }
      else { dist = qy - r; nx = 0; ny = Math.sign(py); }
      const depth = -dist; let m = 0;
      if (depth >= 0 && depth < edge) { const t = 1 - depth / edge; m = t * t * (3 - 2 * t); }
      const i = (y * w + x) * 4;
      d[i] = 128 - nx * m * 127; d[i + 1] = 128 - ny * m * 127; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  },
  filterFor(w, h, r) {
    const key = `${w}x${h}r${r}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const id = 'lg-' + this.cache.size;
    const edge = Math.min(22, h / 2.2);
    const href = this.map(w, h, r, edge);
    const svg = this.ensureSvg();
    const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.setAttribute('id', id);
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', w); f.setAttribute('height', h);
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML = `<feGaussianBlur in="SourceGraphic" stdDeviation="5" edgeMode="duplicate" result="b"/>
      <feImage href="${href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
      <feDisplacementMap in="b" in2="m" scale="34" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feColorMatrix in="d" type="saturate" values="1.7"/>`;
    svg.appendChild(f);
    this.cache.set(key, id);
    return id;
  },
  apply(el) {
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2, w / 2);
    const id = this.filterFor(w, h, Math.round(r));
    el.style.backdropFilter = `url(#${id})`;
    el.style.webkitBackdropFilter = `url(#${id})`;
    el.classList.add('refracting');
  },
  clear(el) { el.style.backdropFilter = ''; el.style.webkitBackdropFilter = ''; el.classList.remove('refracting'); },
  scan(root = document) { $$('[data-refract]', root).forEach((el) => (this.on ? this.apply(el) : this.clear(el))); },
  refresh() { requestAnimationFrame(() => this.scan()); },
};
window.addEventListener('resize', () => Refraction.refresh());

/* ---------- design preview control panel (not product UI) ---------- */
const SCREEN_GROUPS = [
  ['Start', [['landing', 'Landing'], ['setup', 'Setup']]],
  ['Workspace', [['workspaces', 'Workspace list'], ['overview', 'Workspace overview'], ['import', 'Import'], ['document', 'Document review'], ['map', 'Disclosure map'], ['findings', 'Findings'], ['tests', 'Stress tests']]],
  ['Release', [['rewrite', 'Rewrite studio'], ['release', 'Release review'], ['history', 'Release history'], ['export', 'Reports & export']]],
  ['System', [['journal', 'Inference journal'], ['benchmark', 'Benchmark lab'], ['settings', 'Settings']]],
];

function previewControls(current) {
  const seg = (name, val, opts) => `<div class="pv-seg" role="radiogroup" aria-label="${name}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${val === v}" data-pv="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `
  <div class="pv-head"><span class="pv-tag">Design preview</span><span class="pv-ver">Phase 0 · draft 1</span></div>
  <p class="pv-note">Sample data only. This page calls no model and no Firebase service, and nothing on it is real analysis.</p>
  <label class="pv-label" for="pv-screen">Screen</label>
  <select id="pv-screen" class="pv-select">${SCREEN_GROUPS.map(([g, items]) => `<optgroup label="${g}">${items.map(([v, l]) => `<option value="${v}"${v === current ? ' selected' : ''}>${l}</option>`).join('')}</optgroup>`).join('')}</select>
  <label class="pv-label" for="pv-scenario">State</label>
  <select id="pv-scenario" class="pv-select">${Object.entries(SCENARIOS).map(([k, v]) => `<option value="${k}"${k === S.scenario ? ' selected' : ''}>${v.label}</option>`).join('')}</select>
  <p class="pv-hint">${esc(SCENARIOS[S.scenario].note)}</p>
  <span class="pv-label">Appearance</span>${seg('appearance', S.appearance, [['light', 'Light'], ['dark', 'Dark']])}
  <span class="pv-label">Accent candidate</span>${seg('accent', S.accent, [['indigo', 'Indigo'], ['teal', 'Teal']])}
  <label class="pv-switch"><input type="checkbox" id="pv-reduced" ${S.reduced ? 'checked' : ''}><span>Reduce transparency</span></label>
  <label class="pv-switch"><input type="checkbox" id="pv-refraction" ${S.refraction ? 'checked' : ''} ${Refraction.supported ? '' : 'disabled'}><span>Refraction effects${Refraction.supported ? '' : ' (needs Chromium)'}</span></label>
  <button type="button" class="pv-reset" id="pv-reset">${ic('rotate-ccw', 14)} Reset sample</button>`;
}

function bindPreviewControls(host, onScreen) {
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pv]');
    if (b) setState({ [b.dataset.pv]: b.dataset.v });
    if (e.target.closest('#pv-reset')) { resetSample(); toast('Sample reset'); }
  });
  host.addEventListener('change', (e) => {
    if (e.target.id === 'pv-screen') onScreen(e.target.value);
    if (e.target.id === 'pv-scenario') setState({ scenario: e.target.value, modelPreview: null });
    if (e.target.id === 'pv-reduced') setState({ reduced: e.target.checked });
    if (e.target.id === 'pv-refraction') setState({ refraction: e.target.checked });
  });
}
