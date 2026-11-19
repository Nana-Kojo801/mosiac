/* ==========================================================================
   Mosaic mobile design preview (iOS-style). Navigation stacks per tab,
   bottom sheets, swipe actions, collapsing large titles.
   ========================================================================== */

const TABS = [
  ['workspaces', 'Workspaces', 'layers'],
  ['findings', 'Findings', 'list-checks'],
  ['map', 'Map', 'waypoints'],
  ['journal', 'Journal', 'activity'],
  ['settings', 'Settings', 'settings'],
];

const M = {
  mode: 'onboarding',
  tab: 'workspaces',
  stacks: {
    onboarding: [{ name: 'landing' }],
    workspaces: [{ name: 'workspaces' }],
    findings: [{ name: 'findings' }],
    map: [{ name: 'map' }],
    journal: [{ name: 'journal' }],
    settings: [{ name: 'settings' }],
  },
  sheets: [],
  filter: 'all',
  mapMode: 'map',
  mapStage: 3,
  landingStage: 0,
  docFocus: 0,
  expandedPack: null,
  genDomain: 'QUALITATIVE_RESEARCH',
  genCats: new Set(PACK_REQUEST.categories),
  exportKind: 'clean',
  exportFmt: 'Markdown',
  storageMode: 'persist',
  sessionOnly: false,
  dismissNote: '',
  deleteArmed: false,
};

const stackEl = $('#stack');
const tabbarEl = $('#tabbar');
const sheetsEl = $('#sheets');
const currentStack = () => (M.mode === 'onboarding' ? M.stacks.onboarding : M.stacks[M.tab]);
const topRoute = () => currentStack()[currentStack().length - 1];

/* ---------- small builders ---------- */
const backBtn = () => `<button type="button" class="gbtn round glass" data-back data-refract aria-label="Back">${ic('chevron-left', 22)}</button>`;
const gRound = (icon, act, label, extra = '') => `<button type="button" class="gbtn round glass" data-act="${act}" ${extra} data-refract aria-label="${label}">${ic(icon, 20)}</button>`;
const row = ({ icon, iconCls = '', title, sub, end = '', attrs = '', cls = '', chevron = true }) => `
  <button type="button" class="row ${cls}" ${attrs}>
    ${icon ? `<span class="r-ic ${iconCls}">${ic(icon, 17)}</span>` : ''}
    <span class="r-main"><span class="r-title">${title}</span>${sub ? `<span class="r-sub">${sub}</span>` : ''}</span>
    <span class="r-end">${end}${chevron ? ic('chevron-right', 17) : ''}</span>
  </button>`;
const go = (name, params) => `data-go="${name}"${params ? ` data-p='${JSON.stringify(params)}'` : ''}`;
const scenarioBanner = (where) => {
  const sc = S.scenario;
  if (sc === 'unsupported') return `<div class="banner banner-warn">${ic('monitor-x', 18)}<div class="banner-body"><strong>No on-device model here</strong>You're viewing recorded sample results. Private workspaces run rules-only checks, and nothing moves to the cloud instead.</div></div>`;
  if (sc === 'offline' && where !== 'quiet') return `<div class="banner banner-neutral">${ic('wifi-off', 18)}<div class="banner-body"><strong>Offline</strong>Private review keeps working on this device. Cloud test packs resume when you reconnect.</div></div>`;
  if ((sc === 'partial' || sc === 'error') && where === 'review') return `<div class="banner banner-un">${ic('circle-dashed', 18)}<div class="banner-body"><strong>Partial scan</strong>${sc === 'error' ? 'The model reply for ¶6–8 was malformed.' : '¶6–8 timed out on this device.'} Those paragraphs are not assessed.<br><button type="button" class="btn btn-sm btn-tinted" data-act="run-chunk">${ic('rotate-cw', 14)} Run ¶6–8 again</button></div></div>`;
  return '';
};
const counts = () => {
  const o = openFindings();
  return {
    high: o.filter((f) => f.band === 'HIGH' || f.band === 'CRITICAL').length,
    mod: o.filter((f) => f.band === 'MODERATE').length,
    low: o.filter((f) => f.band === 'LOW').length,
    un: o.filter((f) => f.unassessed).length,
  };
};
const coverage = () => {
  const sc = S.scenario;
  const ctx = sc === 'unsupported' ? 0 : sc === 'partial' || sc === 'error' ? 5 : 8;
  return { ctx, rules: 8, total: 8 };
};
function docLabel(id, para) { return `${DOCS[id].short} ¶${para + 1}`; }

/* ---------- screens ---------- */
const SCREENS = {};

SCREENS.landing = () => {
  const steps = groupSteps(new Set());
  const st = M.landingStage;
  const lit = (k) => (st >= k ? ' lit' : '');
  return {
    cls: 'landing', large: false, tabbar: false, hideTop: true,
    body: `
      <div class="brand">${logo(24)}<span>Mosaic</span><span class="preview-flag">${ic('pencil-ruler', 12)} Design preview</span></div>
      <h1 class="hero-title">Protect the information you never realized you were revealing.</h1>
      <p class="hero-sub">Each release can look anonymous on its own. Mosaic checks how your drafts and past releases read together, and it does that privately, on this device.</p>
      <div class="reveal" aria-live="polite">
        <div class="docs3">
          <div class="mini-doc${lit(1)}"><span class="md-ic">${ic('file-text', 16)}</span><div><b>Interim report · published March</b>Participants were drawn from <mark class="ev">the overnight pharmacy team</mark>.</div></div>
          <div class="mini-doc${lit(2)}"><span class="md-ic">${ic('file-text', 16)}</span><div><b>Case study · published June</b>One participant joined with <mark class="ev">the winter onboarding cohort</mark>.</div></div>
          <div class="mini-doc${lit(3)}"><span class="md-ic">${ic('file-pen', 16)}</span><div><b>Interview transcript · draft</b>I came over <mark class="ev ev-high">after my transfer from the coastal satellite clinic</mark>.</div></div>
        </div>
        <div class="reveal-foot">
          ${mosaicGrid(steps, st)}
          <div>
            <div class="reveal-count tnum">${steps[st].count}<small> of 100</small></div>
            <p class="reveal-caption">${['A fictional population of 100 people.', 'The March report narrows it to one team.', 'The June case study narrows it again.', 'The new draft leaves one person.'][st]}</p>
            <button type="button" class="btn btn-plain btn-sm" data-act="replay" style="padding:0;margin-top:6px">${ic('rotate-ccw', 14)} Replay</button>
          </div>
        </div>
        <span class="illustrative">${ic('flask-conical', 12)} Educational illustration · fictional records</span>
      </div>
      <div class="cta-col">
        <button type="button" class="btn btn-primary" data-act="start-sample">Try the sample workspace</button>
        <button type="button" class="btn btn-tinted" data-act="create-ws">Create a private workspace</button>
        <button type="button" class="btn btn-plain" ${go('setup')}>${ic('cpu', 16)} Check this device</button>
      </div>
      <div class="trust">
        <div>${ic('lock', 18)}<span>Private drafts are analysed on this device and never sent to the cloud.</span></div>
        <div>${ic('cloud', 18)}<span>The cloud only writes generic test packs from fixed categories. You see each request first.</span></div>
        <div>${ic('badge-check', 18)}<span>Every result shows where it actually ran. No sign-up needed.</span></div>
      </div>`,
  };
};

SCREENS.setup = () => {
  const ms = modelState();
  const m = MODEL_STATES[ms];
  const tone = { ok: 'ok', warn: 'warn', bad: 'bad', neutral: '' }[m.tone];
  const action = {
    checking: '',
    unsupported: `<button type="button" class="btn btn-quiet" data-act="noop-req">See requirements</button>`,
    download: `<button type="button" class="btn btn-primary" data-act="model-state" data-v="downloading">${ic('download', 16)} Download model</button>`,
    downloading: `<div class="indet" role="progressbar" aria-label="Downloading model"></div><p class="small muted">Waiting for the system to report progress. No estimate is shown until it does.</p><button type="button" class="btn btn-quiet" data-act="model-state" data-v="download">Cancel download</button>`,
    ready: `<button type="button" class="btn btn-tinted" data-act="toast" data-msg="Preview only: no test prompt was run">${ic('play', 16)} Run a short test prompt</button>`,
    unavailable: `<button type="button" class="btn btn-quiet" data-act="model-state" data-v="ready">${ic('rotate-cw', 16)} Try again</button>`,
    offline: '',
    error: `<button type="button" class="btn btn-primary" data-act="model-state" data-v="downloading">${ic('rotate-cw', 16)} Retry</button>`,
  }[ms];
  return {
    title: 'This device', large: true, back: true, tabbar: false,
    body: `
      <p class="large-sub">Mosaic checks what this device can do before you add anything private.</p>
      <div class="model-card">
        <div class="model-state ${tone}"><span class="ms-ic">${ic(m.icon, 24, ms === 'checking' || ms === 'downloading' ? 'spin' : '')}</span><div><span class="small muted">On-device model</span><h3>${m.label}</h3></div></div>
        <p class="small" style="color:var(--ink-2)">${m.body}</p>
        ${action}
      </div>
      <div class="eyebrow">Preview a model state</div>
      <div class="filters" style="margin-bottom:0">${Object.entries(MODEL_STATES).map(([k, v]) => `<button type="button" class="fchip" aria-pressed="${k === ms}" data-act="model-state" data-v="${k}">${v.label}</button>`).join('')}</div>
      <div class="eyebrow">What it needs</div>
      <div class="group">
        ${row({ icon: 'smartphone', title: 'iPhone with Apple Intelligence', sub: 'Uses Apple’s on-device model through Firebase AI Logic', chevron: false })}
        ${row({ icon: 'smartphone', title: 'Android with Gemini Nano', sub: 'Devices supported by AICore', chevron: false })}
        ${row({ icon: 'wifi', title: 'One-time download', sub: 'Over Wi-Fi. After that, private review works offline.', chevron: false })}
      </div>
      <div class="eyebrow">What the cloud does</div>
      <div class="card"><p style="color:var(--ink-2)">It writes generic test packs from a fixed list of categories, such as “rare roles in small teams”. You see the exact request before it’s sent. Document text, names and file names are never part of it.</p></div>
      <div class="eyebrow">Where workspaces live</div>
      <div class="group">
        <button type="button" class="row plain radio" data-act="storage" data-v="persist"><span class="r-main"><span class="r-title">Keep on this device</span><span class="r-sub">Stays until you delete it. Not synced or backed up by Mosaic.</span></span><span class="tick">${M.storageMode === 'persist' ? ic('check', 20) : ''}</span></button>
        <button type="button" class="row plain radio" data-act="storage" data-v="session"><span class="r-main"><span class="r-title">This session only</span><span class="r-sub">Deleted when you close the workspace.</span></span><span class="tick">${M.storageMode === 'session' ? ic('check', 20) : ''}</span></button>
      </div>
      <div class="cta-col"><button type="button" class="btn btn-primary" data-act="start-sample">Continue to the sample</button></div>`,
  };
};

SCREENS.workspaces = () => {
  const empty = S.scenario === 'empty';
  const c = counts();
  return {
    title: 'Workspaces', large: true,
    right: gRound('plus', 'create-ws', 'New workspace'),
    body: `
      <label class="search">${ic('search', 17)}<input id="ws-search" type="search" placeholder="Search titles" aria-label="Search workspace titles"></label>
      <div class="section-h"><h2>Sample</h2></div>
      <button type="button" class="card" ${go('overview')} style="width:100%;text-align:left;display:grid;gap:10px">
        <span class="hstack" style="justify-content:space-between"><span class="hstack">${logo(20)}<strong style="font-size:var(--fs-headline)">${WORKSPACE.title}</strong></span>${ic('chevron-right', 17)}</span>
        <span class="small muted">${WORKSPACE.org} · 3 documents · 2 approved releases</span>
        <span class="hstack">${c.high ? riskChip('HIGH', { small: true }) : ''}<span class="pack-src">${ic('flask-conical', 12)} Fictional sample</span></span>
      </button>
      <div class="section-h"><h2>Private</h2><button type="button" class="btn btn-plain" data-act="create-ws">New</button></div>
      ${empty ? `<div class="empty"><div class="mini-mosaic">${'<i></i>'.repeat(12)}</div><h3>No private workspaces yet</h3><p>Create one for a draft you plan to publish. It stays on this device.</p><button type="button" class="btn btn-primary" data-act="create-ws">${ic('plus', 16)} Create workspace</button></div>` : `
      <div class="group">
        ${PRIVATE_WORKSPACES.map((w) => `<div class="frow-wrap" data-swipe>
          <div class="frow-actions"><button type="button" class="a-dismiss" data-act="toast" data-msg="Preview: rename not wired">${ic('pencil', 18)}Rename</button><button type="button" style="background:var(--risk-crit-fg)" data-sheet="delete" data-id="${w.id}">${ic('trash-2', 18)}Delete</button></div>
          <button type="button" class="frow" data-act="toast" data-msg="Opens ${esc(w.title)} (not part of the sample)"><span class="f-ic">${ic('folder-lock', 17)}</span><span><span class="f-title">${w.title}</span><span class="f-where">${w.docs} documents · ${w.edited}</span></span><span class="chev">${ic('chevron-right', 17)}</span></button>
        </div>`).join('')}
      </div>
      <p class="foot">Swipe left on a workspace for more actions. Stored only on this device.</p>`}`,
  };
};

SCREENS.overview = (p = {}) => {
  if (p.blank) {
    return {
      title: 'Untitled workspace', large: true, back: true,
      right: gRound('ellipsis', 'toast', 'More', 'data-msg="Rename, export bundle, delete"'),
      body: `
        <p class="large-sub">Private · on this device</p>
        <div class="empty"><div class="mini-mosaic">${'<i></i>'.repeat(12)}</div><h3>Add your documents</h3><p>Add the draft you plan to publish, and any releases that are already out. Everything is classed private.</p>
          <div class="hstack" style="justify-content:center"><button type="button" class="btn btn-primary" data-sheet="import">${ic('file-up', 16)} Import files</button><button type="button" class="btn btn-tinted" data-sheet="import" data-id="paste">${ic('clipboard', 16)} Paste text</button></div></div>
        <p class="foot">Mosaic compares new drafts against releases you mark as approved. Without them it checks the draft on its own.</p>`,
    };
  }
  const c = counts();
  const cov = coverage();
  const v = draftVersion();
  return {
    title: WORKSPACE.title, large: true, back: true,
    right: gRound('plus', 'open-import', 'Add documents'),
    body: `
      <p class="large-sub">${WORKSPACE.org}</p>
      <div class="stack-12">
        ${scenarioBanner('review')}
        <div class="status-card">
          <div class="sc-top"><div><span class="small muted">Next release</span><div class="sc-doc">P-07 transcript · draft ${v}</div></div>${S.approved ? `<span class="chip chip-ok">${ic('circle-check', 14)}<span>Approved</span></span>` : riskChip(c.high ? 'HIGH' : c.mod ? 'MODERATE' : 'LOW')}</div>
          <div class="counts">
            <button type="button" class="count high" ${go('findings')} data-tabgo="findings"><strong>${c.high}</strong><span>${ic('triangle-alert', 12)} High priority</span></button>
            <button type="button" class="count mod" data-tabgo="findings"><strong>${c.mod}</strong><span>${ic('circle-alert', 12)} Needs review</span></button>
            <button type="button" class="count" data-tabgo="findings"><strong>${c.low + c.un}</strong><span>${ic('info', 12)} ${c.un ? 'Low / not assessed' : 'Low'}</span></button>
          </div>
          <div class="coverage">
            <div class="cov-row"><span>Context</span><span class="bar"><i style="width:${(cov.ctx / 8) * 100}%"></i>${cov.ctx < 8 ? `<i class="un" style="width:${((8 - cov.ctx) / 8) * 100}%"></i>` : ''}</span><span class="tnum">${cov.ctx}/8 ¶</span></div>
            <div class="cov-row"><span>Rules</span><span class="bar"><i class="rules" style="width:100%"></i></span><span class="tnum">8/8 ¶</span></div>
          </div>
          <div class="btn-row" style="margin-top:0">
            <button type="button" class="btn btn-quiet" ${go('document')}>${ic('file-text', 16)} Open draft</button>
            <button type="button" class="btn btn-primary" data-act="rescan">${ic('scan-search', 16)} Run review</button>
          </div>
        </div>
      </div>
      <div class="section-h"><h2>Documents</h2></div>
      <div class="group">
        ${['D3', 'R2', 'R1'].map((id) => { const d = DOCS[id]; return `<button type="button" class="row docrow" ${go('document', { doc: id })}><span class="doc-thumb ${d.kind === 'draft' ? 'draft' : ''}">${ic(d.kind === 'draft' ? 'file-pen' : 'file-check', 17)}</span><span class="r-main"><span class="r-title">${d.title}</span><span class="r-sub">${id === 'D3' ? `Draft ${v} · Private` : d.meta}</span></span><span class="r-end">${ic('chevron-right', 17)}</span></button>`; }).join('')}
      </div>
      <div class="section-h"><h2>Review</h2></div>
      <div class="group">
        ${row({ icon: 'waypoints', iconCls: 'accent', title: 'Disclosure map', sub: 'How the three documents connect', attrs: 'data-tabgo="map"' })}
        ${row({ icon: 'flask-conical', iconCls: 'accent', title: 'Stress tests', sub: `${Object.values(S.packsEnabled).filter(Boolean).length} packs on`, attrs: go('tests') })}
        ${row({ icon: 'pen-line', iconCls: 'accent', title: 'Rewrite studio', sub: `${FINDINGS.filter((f) => f.rewrite && !S.applied.has(f.id)).length} suggested edits`, attrs: go('rewrite') })}
        ${row({ icon: 'clipboard-check', iconCls: 'accent', title: 'Release review', sub: S.approved ? 'Approved on this device' : 'Not approved', attrs: go('release') })}
        ${row({ icon: 'history', iconCls: 'accent', title: 'Release history', sub: `${S.approved ? 3 : 2} approved releases`, attrs: go('history') })}
        ${row({ icon: 'file-output', iconCls: 'accent', title: 'Reports & export', attrs: go('export') })}
      </div>
      <p class="foot">Last review ran ${S.scenario === 'unsupported' ? 'from recorded sample results' : 'on this device at 10:42'}. ${findings().length} findings.</p>`,
  };
};

SCREENS.document = (p = {}) => {
  const id = p.doc || 'D3';
  const d = DOCS[id];
  const paras = id === 'D3' ? draftParas() : d.paras;
  const fl = findings().filter((f) => f.anchors.some((a) => a.doc === id && a.quote));
  const total = fl.length;
  const idx = Math.min(M.docFocus, Math.max(0, total - 1));
  return {
    title: d.short, sub: id === 'D3' ? `Draft ${draftVersion()} · Private` : 'Approved release', large: false, back: true, tabbar: false,
    right: gRound('ellipsis', 'toast', 'Document actions', 'data-msg="Version history, export, delete"'),
    toolbar: total ? `
      <button type="button" class="gbtn round" data-act="doc-prev" aria-label="Previous finding">${ic('chevron-up', 20)}</button>
      <span class="tb-mid">Finding ${idx + 1} of ${total}</span>
      <button type="button" class="gbtn round" data-act="doc-next" aria-label="Next finding">${ic('chevron-down', 20)}</button>
      ${id === 'D3' ? `<button type="button" class="gbtn primary" ${go('rewrite')}>${ic('pen-line', 16)} Rewrite</button>` : ''}` : `<span class="tb-mid">No open findings in this document</span>`,
    body: `
      ${id === 'D3' ? scenarioBanner('review') : ''}
      <div class="doc-head" style="margin-top:${id === 'D3' && scenarioBanner('review') ? '12px' : '0'}"><span>${d.title}</span><span class="hstack">${id === 'D3' ? `<span class="pack-src">${ic('lock', 11)} Private</span>` : `<span class="pack-src">${ic('file-check', 11)} Released ${d.approved}</span>`}</span></div>
      <article class="reader" aria-label="Document text">
        ${paras.map((t, i) => `<div class="para" id="p-${id}-${i}"><span class="para-anchor">¶${i + 1}</span><p>${markPara(id, i, t)}</p></div>`).join('')}
      </article>
      <p class="foot">Tap a highlighted passage to see why it was flagged. Text extracted on this device; original formatting is not shown.</p>`,
    mount(el) {
      if (p.para != null) {
        const pe = $(`#p-${id}-${p.para}`, el);
        if (pe) setTimeout(() => { pe.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); pe.classList.add('flash'); $$('mark', pe).forEach((m) => m.classList.add('flash')); }, 380);
      }
    },
  };
};

SCREENS.findings = () => {
  const all = findings();
  const f = M.filter;
  const pass = (x) => f === 'all' || (f === 'high' && (x.band === 'HIGH' || x.band === 'CRITICAL')) || (f === 'mod' && x.band === 'MODERATE') || (f === 'low' && x.band === 'LOW') || (f === 'un' && x.unassessed) || (f === 'device' && x.source === 'DEVICE') || (f === 'rules' && x.source === 'RULES');
  const list = all.filter(pass);
  const open = list.filter((x) => !['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(x.status));
  const closed = list.filter((x) => ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(x.status));
  const n = (fn) => all.filter(fn).length;
  const chips = [
    ['all', 'All', all.length], ['high', 'High priority', n((x) => x.band === 'HIGH' || x.band === 'CRITICAL')], ['mod', 'Needs review', n((x) => x.band === 'MODERATE')],
    ['low', 'Low', n((x) => x.band === 'LOW')], ['un', 'Not assessed', n((x) => x.unassessed)], ['device', 'On device', n((x) => x.source === 'DEVICE')], ['rules', 'Rules', n((x) => x.source === 'RULES')],
  ].filter((c) => c[2] || c[0] === 'all');
  const frow = (x) => {
    const cat = x.category ? CATEGORY[x.category] : { icon: 'circle-dashed' };
    const docs = [...new Set(x.anchors.map((a) => DOCS[a.doc].short))];
    const done = ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(x.status);
    return `<div class="frow-wrap" data-swipe>
      <div class="frow-actions">${done ? `<button type="button" class="a-dismiss" data-act="reopen" data-id="${x.id}">${ic('undo-2', 18)}Reopen</button>` : `<button type="button" class="a-dismiss" data-sheet="finding" data-id="${x.id}" data-v="dismiss">${ic('circle-slash', 18)}Dismiss</button>${x.rewrite ? `<button type="button" class="a-rewrite" ${go('rewrite', { focus: x.id })}>${ic('pen-line', 18)}Rewrite</button>` : ''}`}</div>
      <button type="button" class="frow ${done ? 'done' : ''}" data-sheet="finding" data-id="${x.id}">
        <span class="f-ic">${ic(cat.icon, 17)}</span>
        <span><span class="f-title">${esc(x.title)}</span>
          <span class="f-where">${x.id} · ${docs.join(' + ')}</span>
          <span class="f-meta">${riskChip(x.band, { small: true })}${sourceBadge(x.source)}${x.status !== 'OPEN' ? statusChip(x.status) : ''}</span></span>
        <span class="chev">${ic('chevron-right', 17)}</span>
      </button></div>`;
  };
  return {
    title: 'Findings', large: true,
    right: gRound('arrow-down-up', 'toast', 'Sort', 'data-msg="Sort by priority, document or status"'),
    body: `
      <p class="large-sub">P-07 transcript · draft ${draftVersion()}</p>
      ${scenarioBanner('review') ? `<div style="margin-bottom:12px">${scenarioBanner('review')}</div>` : ''}
      <div class="filters" role="toolbar" aria-label="Filter findings">${chips.map(([k, l, c]) => `<button type="button" class="fchip" aria-pressed="${k === f}" data-act="filter" data-v="${k}">${l} <span class="n">${c}</span></button>`).join('')}</div>
      ${open.length ? `<div class="group">${open.map(frow).join('')}</div>` : `<div class="empty"><h3>Nothing open in this filter</h3><p>That doesn’t mean the draft is anonymous. It means no open finding matches.</p></div>`}
      ${closed.length ? `<div class="eyebrow">Closed</div><div class="group">${closed.map(frow).join('')}</div>` : ''}
      <p class="foot">Swipe left to dismiss or rewrite. Findings are suggestions; you decide what to publish.</p>`,
  };
};

/* graph geometry shared by map + edge sheet */
const G = (() => {
  const nodes = {
    R1: { x: 6, y: 8, w: 104, h: 46, t: 'Interim report', s: 'Release · Mar 2026', cls: 'release' },
    R2: { x: 118, y: 8, w: 104, h: 46, t: 'Case study', s: 'Release · Jun 2026', cls: 'release' },
    D3: { x: 230, y: 8, w: 104, h: 46, t: 'P-07 transcript', s: 'Draft', cls: 'draft' },
    c1: { x: 6, y: 136, w: 78, h: 36, t: 'Team or role', s: 'category', cls: 'cat' },
    c2: { x: 90, y: 136, w: 78, h: 36, t: 'Start window', s: 'category', cls: 'cat' },
    c3: { x: 174, y: 136, w: 78, h: 36, t: 'Transfer', s: 'category', cls: 'cat' },
    c4: { x: 258, y: 136, w: 76, h: 36, t: 'Health', s: 'category', cls: 'cat' },
    'F-01': { x: 6, y: 262, w: 156, h: 42, t: 'F-01 combined', s: '', cls: 'finding' },
    'F-02': { x: 170, y: 262, w: 52, h: 42, t: 'F-02', s: '', cls: 'finding' },
    'F-03': { x: 226, y: 262, w: 52, h: 42, t: 'F-03', s: '', cls: 'finding' },
    'F-05': { x: 282, y: 262, w: 52, h: 42, t: 'F-05', s: '', cls: 'finding' },
  };
  const edges = [
    { id: 'e1', a: 'R1', b: 'c1', reason: 'The interim report names the overnight pharmacy team.', refs: [['R1', 1]] },
    { id: 'e2', a: 'D3', b: 'c1', reason: 'P-07 describes a skill that belongs to that team.', refs: [['D3', 2]], f: 'F-02' },
    { id: 'e3', a: 'R2', b: 'c2', reason: 'The case study places one participant in the winter onboarding cohort, after the January rota change.', refs: [['R2', 1]] },
    { id: 'e4', a: 'D3', b: 'c2', reason: 'P-07 gives the date of the rota change, which matches that cohort.', refs: [['D3', 4]], f: 'F-03' },
    { id: 'e5', a: 'D3', b: 'c3', reason: 'P-07 mentions a transfer from the coastal satellite clinic.', refs: [['D3', 1]], f: 'F-01' },
    { id: 'e6', a: 'D3', b: 'c4', reason: 'P-07 mentions contact with occupational health.', refs: [['D3', 6]], f: 'F-05' },
    { id: 'e7', a: 'c1', b: 'F-01', reason: 'Team, start window and transfer together narrow the group to one fictional record.', refs: [['R1', 1], ['R2', 1], ['D3', 1]], hot: true },
    { id: 'e8', a: 'c2', b: 'F-01', reason: 'Team, start window and transfer together narrow the group to one fictional record.', refs: [['R1', 1], ['R2', 1], ['D3', 1]], hot: true },
    { id: 'e9', a: 'c3', b: 'F-01', reason: 'Team, start window and transfer together narrow the group to one fictional record.', refs: [['R1', 1], ['R2', 1], ['D3', 1]], hot: true },
    { id: 'e10', a: 'c1', b: 'F-02', reason: 'A unique skill inside a named team.', refs: [['D3', 2], ['R1', 1]] },
    { id: 'e11', a: 'c2', b: 'F-03', reason: 'The exact date links the draft to the cohort.', refs: [['D3', 4], ['R2', 1]] },
    { id: 'e12', a: 'c4', b: 'F-05', reason: 'Health detail not needed for the finding.', refs: [['D3', 6]] },
  ];
  return { nodes, edges };
})();

function graphSvg() {
  const fs = findings();
  const has = (id) => fs.some((f) => f.id === id);
  const fstate = (id) => fs.find((f) => f.id === id);
  const visible = (e) => [e.a, e.b].every((n) => !n.startsWith('F-') || has(n)) && !(e.b === 'c4' && !has('F-05')) && !(e.a === 'c4' && !has('F-05'));
  const cut = (e) => (e.id === 'e5' && S.applied.has('F-01')) || (e.id === 'e4' && S.applied.has('F-03')) || (e.id === 'e2' && S.applied.has('F-02')) || (e.id === 'e6' && S.applied.has('F-05'));
  const N = G.nodes;
  const path = (e) => { const a = N[e.a], b = N[e.b]; const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y; const my = (y1 + y2) / 2; return `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`; };
  const edges = G.edges.filter(visible).map((e) => `<g><path class="g-hit" d="${path(e)}" data-sheet="edge" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(N[e.a].t)} to ${esc(N[e.b].t)}"></path><path class="g-edge${e.hot && !S.applied.has('F-01') ? ' hot' : ''}${cut(e) ? ' cut' : ''}" d="${path(e)}"></path></g>`).join('');
  const nodes = Object.entries(N).filter(([k]) => !k.startsWith('F-') || has(k)).filter(([k]) => k !== 'c4' || has('F-05')).map(([k, n]) => {
    const f = k.startsWith('F-') ? fstate(k) : null;
    const resolved = f && ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(f.status);
    const sub = f ? (resolved ? STATUS[f.status].label : BAND[f.band].label) : n.s;
    const sel = f ? `data-sheet="finding" data-id="${k}"` : k.length === 2 ? `${go('document', { doc: k })}` : '';
    return `<g class="g-node ${n.cls}${resolved ? ' resolved' : ''}" ${sel} tabindex="0" role="button" style="cursor:pointer"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10"></rect><text x="${n.x + 9}" y="${n.y + (sub ? 18 : n.h / 2 + 4)}">${esc(n.t)}</text>${sub ? `<text class="sub" x="${n.x + 9}" y="${n.y + 32}">${esc(sub)}</text>` : ''}</g>`;
  }).join('');
  return `<svg viewBox="0 0 340 312" role="group" aria-label="Disclosure map">${edges}${nodes}</svg>`;
}

SCREENS.map = () => {
  const steps = groupSteps(S.applied);
  const st = Math.min(M.mapStage, steps.length - 1);
  const fs = findings();
  const listView = `<div class="group">${G.edges.filter((e) => e.b.startsWith('F-') ? fs.some((f) => f.id === e.b) : true).filter((e) => e.b !== 'c4' || fs.some((f) => f.id === 'F-05')).map((e) => row({ icon: e.b.startsWith('F-') ? 'git-merge' : 'link-2', title: `${G.nodes[e.a].t} → ${G.nodes[e.b].t}`, sub: e.reason, attrs: `data-sheet="edge" data-id="${e.id}"` })).join('')}</div>`;
  return {
    title: 'Disclosure map', large: true,
    right: gRound('scan', 'map-reset', 'Reset view'),
    body: `
      <p class="large-sub">How the draft connects to what’s already published.</p>
      <div class="seg" role="tablist" style="margin:0 0 12px 4px"><button type="button" role="tab" aria-selected="${M.mapMode === 'map'}" data-act="map-mode" data-v="map">Map</button><button type="button" role="tab" aria-selected="${M.mapMode === 'list'}" data-act="map-mode" data-v="list">List</button></div>
      ${M.mapMode === 'map' ? `<div class="graph-card">${graphSvg()}<div class="g-legend"><span><i style="background:var(--surface-2)"></i>Release</span><span><i style="background:var(--accent-soft)"></i>Draft</span><span><i style="background:var(--surface)"></i>Category</span><span><i style="background:var(--risk-high-bg)"></i>Finding</span><span>Dashed: removed by an edit</span></div></div><p class="foot">Tap a line to see the reason and the passages behind it. No node stands for a real person.</p>` : listView}
      <div class="section-h"><h2>Fictional group size</h2></div>
      <div class="card">
        <div class="group-card">
          ${mosaicGrid(steps, st)}
          <div class="steps">${steps.map((s, k) => `<button type="button" class="step" aria-pressed="${k === st}" data-act="map-stage" data-v="${k}"><span><span class="st-l">${k === 0 ? 'Start' : '+ ' + esc(s.label)}</span><br><span class="st-s">${esc(s.from)}</span></span><span class="st-n">${s.count}</span></button>`).join('')}</div>
        </div>
        <p class="foot" style="margin:12px 0 0"><span class="illustrative">${ic('flask-conical', 12)} Educational illustration</span><br>Computed from 100 seeded fictional records. It is not a measure of real-world anonymity.</p>
      </div>`,
  };
};

SCREENS.tests = () => {
  const off = isOffline();
  const allCats = [['ROLE_RARITY', 'Role rarity'], ['TENURE_WINDOWS', 'Start-date windows'], ['SHIFT_PATTERNS', 'Shift patterns'], ['RARE_EVENTS', 'Rare events'], ['SMALL_SITES', 'Small sites']];
  return {
    title: 'Stress tests', large: true, back: true,
    body: `
      <p class="large-sub">Reusable checks applied to your documents on this device.</p>
      <div class="stack-12">
        ${PACKS.map((p) => {
          const src = p.source === 'cloud' && off ? 'cached' : p.source;
          const open = M.expandedPack === p.id;
          return `<div class="pack">
            <div class="pack-head"><button type="button" style="text-align:left" data-act="pack-expand" data-v="${p.id}" aria-expanded="${open}"><h3>${p.name}</h3><span class="hstack" style="margin-top:6px">${packBadge(p.source)}${src === 'cached' ? packBadge('cached') : ''}<span class="small muted">${p.version} · ${p.count} tests</span></span></button>
            <label class="switch"><input type="checkbox" data-act="pack-toggle" data-v="${p.id}" ${S.packsEnabled[p.id] ? 'checked' : ''} aria-label="Use ${p.name}"><span></span></label></div>
            ${open ? `<div class="pack-tests">${p.tests.map(([, n, q]) => `<div class="pack-test"><b>${n}</b><span>${q}</span></div>`).join('')}${p.count > p.tests.length ? `<div class="pack-test"><span>+ ${p.count - p.tests.length} more</span></div>` : ''}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="section-h"><h2>Generate a pack</h2></div>
      <div class="card stack-12">
        ${off ? `<div class="banner banner-neutral">${ic('wifi-off', 18)}<div class="banner-body"><strong>Unavailable offline</strong>Cached packs still work. Generation resumes when you reconnect.</div></div>` : ''}
        <p class="small" style="color:var(--ink-2)">The cloud writes new generic tests from the choices below. Nothing from your documents is included.</p>
        <div><div class="h-label" style="margin-top:0">Domain</div><div class="seg"><button type="button" aria-pressed="${M.genDomain === 'QUALITATIVE_RESEARCH'}" data-act="gen-domain" data-v="QUALITATIVE_RESEARCH">Research</button><button type="button" aria-pressed="${M.genDomain === 'EDITORIAL'}" data-act="gen-domain" data-v="EDITORIAL">Editorial</button></div></div>
        <div><div class="h-label" style="margin-top:0">Categories</div><div class="catpick">${allCats.map(([k, l]) => `<button type="button" class="fchip" aria-pressed="${M.genCats.has(k)}" data-act="gen-cat" data-v="${k}">${M.genCats.has(k) ? ic('check', 14) : ''}${l}</button>`).join('')}</div></div>
        <button type="button" class="btn btn-primary" data-sheet="consent" ${off || !M.genCats.size ? 'disabled' : ''}>${ic('eye', 16)} Review request</button>
      </div>
      <p class="foot">Packs are checked against a schema before use and never run as code. They are review aids, not legal policy.</p>`,
  };
};

SCREENS.rewrite = (p = {}) => {
  const cands = findings().filter((f) => f.rewrite && f.status !== 'DISMISSED');
  const pending = cands.filter((f) => !S.applied.has(f.id));
  const applied = cands.filter((f) => S.applied.has(f.id));
  const order = p.focus ? [...cands].sort((a, b) => (a.id === p.focus ? -1 : b.id === p.focus ? 1 : 0)) : cands;
  const paras = DOCS.D3.paras;
  const card = (f) => {
    const on = S.applied.has(f.id);
    const r = f.rewrite;
    const before = paras[r.para];
    const i = before.indexOf(r.from);
    const ctxL = before.slice(Math.max(0, i - 38), i);
    const ctxR = before.slice(i + r.from.length, i + r.from.length + 38);
    return `<div class="edit-card ${on ? 'applied' : ''}" id="ec-${f.id}">
      <div class="ec-top"><span class="hstack">${riskChip(f.band, { small: true })}<span class="small muted">${f.id} · ¶${r.para + 1}</span></span>${on ? `<span class="chip chip-ok chip-sm">${ic('check', 13)}<span>Applied</span></span>` : sourceBadge(S.scenario === 'unsupported' ? 'FIXTURE' : f.source === 'RULES' ? 'RULES' : 'DEVICE')}</div>
      <strong>${f.action}</strong>
      <div class="diffbox">${i > 38 ? '…' : ''}${esc(ctxL)}<del class="diff">${esc(r.from)}</del>${r.to ? ` <ins class="diff">${esc(r.to)}</ins>` : ''}${esc(ctxR)}…</div>
      <div class="keeps">${ic('circle-check', 16)}<span><b>Still true:</b> ${esc(f.keeps)}</span></div>
      ${on ? `<div class="btn-row"><button type="button" class="btn btn-quiet full" data-act="undo" data-id="${f.id}">${ic('undo-2', 16)} Undo</button></div>` : `<div class="btn-row"><button type="button" class="btn btn-quiet" data-act="toast" data-msg="Opens a manual editor for ¶${r.para + 1}">${ic('pencil', 16)} Edit myself</button><button type="button" class="btn btn-primary" data-act="apply" data-id="${f.id}">Apply</button></div>`}
    </div>`;
  };
  const before = groupSteps(new Set());
  const after = groupSteps(S.applied);
  return {
    title: 'Rewrite', sub: `P-07 · draft v3 → ${S.applied.size ? 'v4' : 'v4 (unsaved)'}`, large: false, back: true, tabbar: false,
    toolbar: `<span class="tb-mid" style="text-align:left;padding-left:10px">${applied.length ? `${applied.length} edit${applied.length > 1 ? 's' : ''} applied` : 'No edits yet'}</span><button type="button" class="gbtn primary" data-act="rescan" ${applied.length ? '' : 'disabled style="opacity:.45"'}>${ic('scan-search', 16)} Review again</button>`,
    body: `
      <p class="small muted" style="margin:0 4px 12px">Suggestions are written on this device. The original stays unchanged; applying creates a new version you can undo.</p>
      ${S.rescanned && applied.length ? `<div class="card" style="margin-bottom:12px"><div class="hstack" style="justify-content:space-between;margin-bottom:10px"><strong>Reassessment</strong>${sourceBadge(S.scenario === 'unsupported' ? 'FIXTURE' : 'DEVICE')}</div>
        <div class="reassess"><div><strong>${applied.length}</strong><span>Resolved</span></div><div><strong>${openFindings().length}</strong><span>Unchanged</span></div><div><strong>0</strong><span>New</span></div><div><strong>${counts().un}</strong><span>Not assessed</span></div></div>
        <p class="small" style="margin-top:12px;color:var(--ink-2)">Fictional group: <b class="tnum">${before[before.length - 1].count}</b> → <b class="tnum">${after[after.length - 1].count}</b> of 100 records.</p>
        <div class="btn-row"><button type="button" class="btn btn-tinted full" ${go('release')}>Continue to release review</button></div></div>` : ''}
      <div class="stack-12">${order.map(card).join('')}</div>
      ${!pending.length && !applied.length ? `<div class="empty"><h3>No suggested edits</h3><p>Every finding was dismissed or has no automatic suggestion. You can still edit the text yourself.</p></div>` : ''}`,
  };
};

SCREENS.release = () => {
  const before = groupSteps(new Set());
  const after = groupSteps(S.applied);
  const fsBefore = FINDINGS.filter((f) => bandOf(f) === 'HIGH').length;
  const c = counts();
  const blocked = c.un > 0;
  const all = S.checklist.every(Boolean);
  const residual = openFindings().filter((f) => !f.unassessed);
  const items = ['I’ve read every remaining finding.', 'The remaining details are needed for the analysis.', 'I understand this review is advisory and doesn’t certify anonymity.'];
  return {
    title: 'Release review', large: true, back: true,
    body: `
      <p class="large-sub">P-07 transcript · draft ${draftVersion()}</p>
      ${S.approved ? `<div class="banner" style="background:var(--ok-bg);color:var(--ok-fg);margin-bottom:12px">${ic('circle-check', 18)}<div class="banner-body"><strong>Approved on this device</strong>Draft ${draftVersion()} is saved to release history. Future drafts are checked against it.</div></div>` : ''}
      <div class="compare">
        <div><h3>Draft v3</h3><div><div class="big" style="color:var(--risk-high-fg)">${fsBefore}</div><div class="lbl">High-priority findings</div></div><div><div class="big">${before[before.length - 1].count}</div><div class="lbl">Fictional group size</div></div></div>
        <div><h3>Draft ${draftVersion()}${S.applied.size && !S.rescanned ? ' (not re-reviewed)' : ''}</h3><div><div class="big" style="color:${c.high ? 'var(--risk-high-fg)' : 'var(--ink)'}">${S.applied.size && !S.rescanned ? '—' : c.high}</div><div class="lbl">High-priority findings</div></div><div><div class="big">${S.applied.size && !S.rescanned ? '—' : after[after.length - 1].count}</div><div class="lbl">Fictional group size</div></div></div>
      </div>
      ${S.applied.size && !S.rescanned ? `<div class="banner banner-info" style="margin-top:12px">${ic('scan-search', 18)}<div class="banner-body"><strong>Review the new version first</strong>Edits invalidate the last scan. Nothing is marked resolved until it runs again.<br><button type="button" class="btn btn-sm btn-primary" data-act="rescan">Review again</button></div></div>` : ''}
      <div class="eyebrow">Coverage</div>
      <div class="card coverage">
        <div class="cov-row"><span>Context</span><span class="bar"><i style="width:${(coverage().ctx / 8) * 100}%"></i>${coverage().ctx < 8 ? `<i class="un" style="width:${((8 - coverage().ctx) / 8) * 100}%"></i>` : ''}</span><span class="tnum">${coverage().ctx}/8 ¶</span></div>
        <div class="cov-row"><span>Rules</span><span class="bar"><i class="rules" style="width:100%"></i></span><span class="tnum">8/8 ¶</span></div>
        ${blocked ? `<p class="small" style="color:var(--unassessed-fg)">${ic('circle-dashed', 13)} ¶6–8 not assessed. Approval waits until they are, or until you review them by hand.</p>` : ''}
      </div>
      <div class="eyebrow">Remaining findings (${residual.length})</div>
      <div class="group">${residual.length ? residual.map((f) => row({ icon: CATEGORY[f.category].icon, title: esc(f.title), sub: `${f.id} · ${BAND[f.band].label}`, attrs: `data-sheet="finding" data-id="${f.id}"` })).join('') : `<div class="row plain"><span class="r-main"><span class="r-title">None open</span><span class="r-sub">Outside knowledge can still identify people. Keep human review in the loop.</span></span></div>`}</div>
      <div class="eyebrow">Before you approve</div>
      <div class="group" role="group" aria-label="Approval checklist">${items.map((t, i) => `<button type="button" class="check" role="checkbox" aria-checked="${S.checklist[i]}" data-act="check" data-v="${i}" ${S.approved ? 'disabled' : ''}><span class="box">${ic('check', 15)}</span><span>${t}</span></button>`).join('')}</div>
      <div class="cta-col">
        ${S.approved ? `<button type="button" class="btn btn-tinted" ${go('export')}>${ic('file-output', 16)} Export clean draft</button><button type="button" class="btn btn-plain" data-act="revoke">Revoke approval</button>` : `<button type="button" class="btn btn-primary" data-act="approve" ${all && !blocked ? '' : 'disabled'}>${ic('stamp', 16)} Approve release on this device</button>`}
      </div>
      <p class="foot">Approval is a local record for your team. It isn’t a legal or compliance sign-off.</p>`,
  };
};

SCREENS.history = () => ({
  title: 'Release history', large: true, back: true,
  body: `
    <p class="large-sub">Approved snapshots on this device. New drafts are compared against these.</p>
    <div class="timeline">
      ${S.approved ? `<div class="tl-item approved"><span class="hstack" style="justify-content:space-between"><strong>P-07 transcript · v4</strong><span class="chip chip-ok chip-sm">${ic('circle-check', 13)}<span>Approved today</span></span></span><span class="small muted">${S.applied.size} edits · ${openFindings().length} accepted residual findings</span><div class="hstack"><button type="button" class="btn btn-sm btn-quiet" ${go('release')}>Review summary</button><button type="button" class="btn btn-sm btn-plain" data-act="revoke">Revoke</button></div></div>` : `<div class="tl-item current"><span class="hstack" style="justify-content:space-between"><strong>P-07 transcript · ${draftVersion()}</strong>${statusChip('UNDER_REVIEW')}</span><span class="small muted">Draft · not approved</span><div class="hstack"><button type="button" class="btn btn-sm btn-quiet" ${go('release')}>Open release review</button></div></div>`}
      <div class="tl-item approved"><span class="hstack" style="justify-content:space-between"><strong>Onboarding case study · v1</strong><span class="small muted">3 Jun 2026</span></span><span class="small muted">Imported as an already-published release</span><div class="hstack"><button type="button" class="btn btn-sm btn-quiet" ${go('document', { doc: 'R2' })}>View</button><button type="button" class="btn btn-sm btn-plain" data-act="toast" data-msg="Compare with the current draft">Compare</button></div></div>
      <div class="tl-item approved"><span class="hstack" style="justify-content:space-between"><strong>Interim findings report · v2</strong><span class="small muted">12 Mar 2026</span></span><span class="small muted">Imported as an already-published release</span><div class="hstack"><button type="button" class="btn btn-sm btn-quiet" ${go('document', { doc: 'R1' })}>View</button><button type="button" class="btn btn-sm btn-plain" data-act="toast" data-msg="Compare with the current draft">Compare</button></div></div>
    </div>`,
});

SCREENS.export = () => {
  const fmts = M.exportKind === 'clean' ? ['TXT', 'Markdown', 'PDF', 'DOCX'] : ['Markdown', 'PDF'];
  if (!fmts.includes(M.exportFmt)) M.exportFmt = fmts[0];
  const paras = draftParas();
  return {
    title: 'Export', large: true, back: true,
    body: `
      <p class="large-sub">New files are built from clean text. Nothing hidden comes along.</p>
      <div class="banner banner-warn">${ic('triangle-alert', 18)}<div class="banner-body"><strong>Check before you share</strong>The export can still contain sensitive details. Mosaic’s review is advisory and doesn’t certify anonymity.</div></div>
      <div class="eyebrow">What to export</div>
      <div class="group">
        <button type="button" class="row plain radio" data-act="export-kind" data-v="clean"><span class="r-main"><span class="r-title">Clean draft</span><span class="r-sub">The reviewed text only</span></span><span class="tick">${M.exportKind === 'clean' ? ic('check', 20) : ''}</span></button>
        <button type="button" class="row plain radio" data-act="export-kind" data-v="report"><span class="r-main"><span class="r-title">Review report</span><span class="r-sub">Findings, decisions and coverage. Kept separate from the draft.</span></span><span class="tick">${M.exportKind === 'report' ? ic('check', 20) : ''}</span></button>
      </div>
      <div class="eyebrow">Format</div>
      <div class="seg" style="margin-left:4px">${fmts.map((f) => `<button type="button" aria-pressed="${f === M.exportFmt}" data-act="export-fmt" data-v="${f}">${f}</button>`).join('')}</div>
      <div class="eyebrow">Left out</div>
      <div class="card small" style="color:var(--ink-2)">Original passages, comments, revision history, tracked changes and source-file metadata.</div>
      <div class="eyebrow">Preview</div>
      <div class="reader" style="font-size:var(--fs-subhead)">${M.exportKind === 'clean' ? paras.map((t) => `<p style="margin-bottom:10px">${esc(t)}</p>`).join('') : `<p style="margin-bottom:8px"><b>Review report · P-07 transcript ${draftVersion()}</b></p><p class="small" style="margin-bottom:8px">Coverage: context ${coverage().ctx}/8 ¶, rules 8/8 ¶. Findings: ${findings().length}. Resolved: ${S.rescanned ? S.applied.size : 0}.</p><p class="small muted">Advisory review. Not a certification of anonymity.</p>`}</div>
      <div class="cta-col"><button type="button" class="btn btn-primary" data-act="toast" data-msg="Preview only: no file was created">${ic('share', 16)} Export ${M.exportFmt}</button></div>`,
  };
};

SCREENS.journal = () => {
  const j = journal();
  const n = (s) => j.filter((e) => e.src === s).length;
  return {
    title: 'Inference journal', large: true,
    body: `
      <p class="large-sub">Where each task actually ran, from the SDK’s own metadata.</p>
      <div class="sumchips">${sourceBadge('DEVICE')}<span class="small muted tnum">${n('DEVICE')}</span>${sourceBadge('CLOUD')}<span class="small muted tnum">${n('CLOUD')}</span>${sourceBadge('RULES')}<span class="small muted tnum">${n('RULES')}</span>${n('UNAVAILABLE') ? `${sourceBadge('UNAVAILABLE')}<span class="small muted tnum">${n('UNAVAILABLE')}</span>` : ''}</div>
      <div class="group">${j.map((e, i) => `<button type="button" class="row jrow" data-sheet="jevent" data-id="${i}"><span class="r-main"><span class="r-title">${e.task}</span><span class="r-sub">${esc(e.scope)} · <span class="j-time">${e.t}</span></span><span class="hstack" style="margin-top:6px">${sourceBadge(e.src)}${e.policy !== 'NO_MODEL' ? policyTag(e.policy) : ''}</span></span><span class="r-end tnum">${e.ms == null ? '—' : e.ms >= 1000 ? (e.ms / 1000).toFixed(1) + ' s' : e.ms + ' ms'}${ic('chevron-right', 17)}</span></button>`).join('')}</div>
      <p class="foot">Sample entries for the design preview. The real journal never stores prompts, replies, file names or excerpts.</p>`,
  };
};

SCREENS.settings = () => ({
  title: 'Settings', large: true,
  body: `
    <div class="eyebrow" style="margin-top:4px">Appearance</div>
    <div class="group">
      <div class="row plain"><span class="r-main"><span class="r-title">Theme</span></span><div class="seg"><button type="button" aria-pressed="${S.appearance === 'light'}" data-act="theme" data-v="light">Light</button><button type="button" aria-pressed="${S.appearance === 'dark'}" data-act="theme" data-v="dark">Dark</button></div></div>
      <label class="row plain"><span class="r-main"><span class="r-title">Reduce transparency</span><span class="r-sub">Solid bars and sheets, same layout</span></span><span class="switch"><input type="checkbox" data-act="pref-reduced" ${S.reduced ? 'checked' : ''}><span></span></span></label>
      <label class="row plain"><span class="r-main"><span class="r-title">Glass effects</span><span class="r-sub">Refraction on bars and buttons</span></span><span class="switch"><input type="checkbox" data-act="pref-refraction" ${S.refraction ? 'checked' : ''}><span></span></span></label>
    </div>
    <div class="eyebrow">Model</div>
    <div class="group">
      ${row({ icon: 'cpu', title: 'On-device model', end: MODEL_STATES[modelState()].label, attrs: go('setup') })}
      ${row({ icon: 'flask-conical', title: 'Test packs', end: `${PACKS.length}`, attrs: go('tests') })}
      ${row({ icon: 'chart-column', title: 'Benchmark lab', attrs: go('benchmark') })}
    </div>
    <div class="eyebrow">Privacy</div>
    <div class="group">
      <label class="row plain"><span class="r-main"><span class="r-title">Session-only mode</span><span class="r-sub">Delete workspaces when closed</span></span><span class="switch"><input type="checkbox" data-act="session-only" ${M.sessionOnly ? 'checked' : ''}><span></span></span></label>
      ${row({ icon: 'cloud', title: 'Cloud request approvals', end: S.consent === 'sent' ? '1 used' : 'None active', attrs: 'data-act="toast" data-msg="Approvals expire after 5 minutes and can be revoked here"' })}
      ${row({ icon: 'trash-2', title: 'Delete all local data', cls: 'danger', attrs: 'data-sheet="delete" data-id="all"', chevron: false })}
    </div>
    <p class="foot">Deleting removes Mosaic’s copies on this device. It can’t reach copies you exported or shared.</p>
    <div class="eyebrow">About</div>
    <div class="group">
      ${row({ icon: 'shield', title: 'How Mosaic handles your data', attrs: 'data-act="toast" data-msg="Links to the privacy model"' })}
      ${row({ icon: 'scroll-text', title: 'Licences', attrs: 'data-act="toast" data-msg="Apache-2.0 and third-party notices"' })}
      ${row({ icon: 'info', title: 'Version', end: 'Design preview', chevron: false })}
    </div>`,
});

SCREENS.benchmark = () => {
  const steps = groupSteps(S.applied);
  const st = Math.min(M.mapStage, steps.length - 1);
  return {
    title: 'Benchmark lab', large: true, back: true,
    body: `
      <p class="large-sub">Synthetic test sets. Fictional people only.</p>
      <div class="card">
        <div class="hstack" style="justify-content:space-between;margin-bottom:12px"><strong>Fictional population</strong><span class="illustrative">${ic('flask-conical', 12)} Fixture</span></div>
        <div class="group-card">${mosaicGrid(steps, st)}<div class="steps">${steps.map((s, k) => `<button type="button" class="step" aria-pressed="${k === st}" data-act="map-stage" data-v="${k}"><span class="st-l">${k === 0 ? 'Start' : esc(s.label)}</span><span class="st-n">${s.count}</span></button>`).join('')}</div></div>
      </div>
      <div class="section-h"><h2>Results</h2></div>
      <div class="card">
        <div class="banner banner-neutral" style="margin-bottom:12px">${ic('hourglass', 18)}<div class="banner-body"><strong>Not run yet</strong>Results appear after the runner finishes the held-out set. Nothing here is estimated.</div></div>
        <div style="overflow-x:auto"><table class="bench-table"><thead><tr><th>Configuration</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>
          <tr><td>Rules baseline</td><td>—</td><td>—</td><td>—</td></tr>
          <tr><td>Rules + local single-doc</td><td>—</td><td>—</td><td>—</td></tr>
          <tr><td>Full Mosaic</td><td>—</td><td>—</td><td>—</td></tr>
        </tbody></table></div>
        <p class="small muted" style="margin-top:10px">Dataset: synthetic set v0 · 0 of 48 cases run</p>
        <div class="btn-row"><button type="button" class="btn btn-primary full" data-act="toast" data-msg="Preview only: the runner is not part of this page" ${S.scenario === 'unsupported' ? 'disabled' : ''}>${ic('play', 16)} Run on this device</button></div>
      </div>`,
  };
};

/* ---------- sheets ---------- */
const SHEETS = {};

SHEETS.finding = ({ id, v }) => {
  const f = findingById(id);
  if (!f) return { title: 'Finding', body: '<p>Not found.</p>' };
  const cat = f.category ? CATEGORY[f.category] : null;
  const dismissing = v === 'dismiss';
  const done = ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(f.status);
  const r = f.rewrite;
  return {
    title: f.id, detent: 'large',
    left: `<button type="button" class="gbtn round glass" data-close aria-label="Close" data-refract>${ic('x', 20)}</button>`,
    right: f.unassessed ? '' : `<button type="button" class="gbtn round glass" data-close data-go="document" data-p='${JSON.stringify({ doc: f.anchors[0].doc, para: f.anchors[0].para })}' aria-label="Show in document" data-refract>${ic('file-search', 19)}</button>`,
    body: `
      <div class="hstack" style="margin-bottom:8px">${riskChip(f.band)}${cat ? `<span class="small muted">${ic(cat.icon, 13)} ${cat.label}</span>` : ''}</div>
      <h2 style="font-size:var(--fs-title-2);font-weight:700;margin-bottom:8px">${esc(f.title)}</h2>
      <div class="hstack" style="margin-bottom:14px">${sourceBadge(f.source)}${f.source !== 'RULES' ? policyTag('ONLY_ON_DEVICE') : ''}${statusChip(f.status)}</div>
      <div class="sheet-surface"><p style="font-size:var(--fs-subhead);line-height:1.5">${esc(f.rationale)}</p></div>
      ${f.unassessed ? `<div class="btn-row"><button type="button" class="btn btn-primary full" data-act="run-chunk">${ic('rotate-cw', 16)} Run ¶6–8 again on this device</button><button type="button" class="btn btn-quiet full" data-close ${go('document', { doc: 'D3', para: 5 })}>Review ¶6–8 by hand</button></div>` : `
      <div class="h-label">Evidence</div>
      <div class="ev-list">${f.anchors.map((a) => `<button type="button" class="ev-card" data-close ${go('document', { doc: a.doc, para: a.para })}><span class="ev-src">${ic(DOCS[a.doc].kind === 'draft' ? 'file-pen' : 'file-check', 13)} ${DOCS[a.doc].title} · ¶${a.para + 1}</span><span class="ev-q">“…${markPara(a.doc, a.para, a.quote, { findings: [f] })}…”</span></button>`).join('')}</div>
      <div class="h-label">Review priority</div>
      <div class="sheet-surface">${scoreBars(f)}</div>
      <div class="h-label">Confidence</div>
      <div class="sheet-surface"><strong style="font-size:var(--fs-subhead)">${CONF[f.confidence]}</strong><p class="small" style="color:var(--ink-2);margin-top:4px">${esc(f.confReason)}</p></div>
      ${r ? `<div class="h-label">Suggested change</div><div class="diffbox"><del class="diff">${esc(r.from)}</del>${r.to ? ` <ins class="diff">${esc(r.to)}</ins>` : ''}</div>` : ''}
      ${dismissing ? `<div class="h-label">Why dismiss? (optional, stays on this device)</div><textarea class="note-field" id="dismiss-note" placeholder="For example: already public in the funder’s report"></textarea><div class="btn-row"><button type="button" class="btn btn-quiet" data-sheet-v="finding" data-id="${f.id}" data-v="">Cancel</button><button type="button" class="btn btn-danger" data-act="dismiss" data-id="${f.id}">Dismiss finding</button></div>` : done ? `<div class="btn-row"><button type="button" class="btn btn-quiet full" data-act="reopen" data-id="${f.id}">${ic('undo-2', 16)} Reopen</button></div>` : `
      <div class="btn-row">
        ${r ? `<button type="button" class="btn btn-primary full" data-close ${go('rewrite', { focus: f.id })}>${ic('pen-line', 16)} Preview rewrite</button>` : ''}
        <button type="button" class="btn btn-quiet" data-act="residual" data-id="${f.id}">Accept as residual</button>
        <button type="button" class="btn btn-quiet" data-sheet-v="finding" data-id="${f.id}" data-v="dismiss">Dismiss…</button>
      </div>`}
      <p class="foot" style="margin:14px 2px 0">Advisory. Mosaic suggests; you decide what to publish.</p>`}`,
  };
};

SHEETS.import = ({ id }) => {
  const err = S.scenario === 'error';
  const files = [
    { n: 'interview-p07-v3.docx', s: '2 pages · 1,204 words · text extracted', ok: true, icon: 'file-text' },
    { n: 'interim-report-v2.pdf', s: 'Reading page 3 of 4…', busy: true, icon: 'file-text' },
    ...(err ? [
      { n: 'field-notes-scan.pdf', s: 'No text layer. This looks like a scan.', bad: true, icon: 'file-warning', act: 'Run OCR on this device' },
      { n: 'budget.xlsx', s: 'Not supported. Use TXT, Markdown, PDF or DOCX.', bad: true, icon: 'file-x' },
    ] : []),
  ];
  return {
    title: 'Add documents', detent: 'large',
    left: `<button type="button" class="gbtn" data-close>Cancel</button>`,
    right: `<button type="button" class="gbtn accent" data-close data-act="toast" data-msg="Preview: nothing was imported">Add</button>`,
    body: `
      ${id === 'paste' ? `<div class="sheet-surface"><label class="h-label" for="paste-box" style="margin-top:0;display:block">Paste text</label><textarea id="paste-box" class="note-field" style="min-height:140px" placeholder="Paste a draft or a published release"></textarea></div>` : `
      <div class="drop"><span class="d-ic">${ic('file-up', 24)}</span><strong>Choose files</strong><span class="small muted">TXT, Markdown, text-based PDF or DOCX · up to 20 MB and 100 pages each</span><div class="hstack" style="justify-content:center"><button type="button" class="btn btn-sm btn-primary" data-act="toast" data-msg="Opens the Files picker">Browse</button><button type="button" class="btn btn-sm btn-tinted" data-sheet-v="import" data-id="paste">Paste text</button></div></div>`}
      <div class="h-label">This document is</div>
      <div class="seg"><button type="button" aria-pressed="true">The draft to review</button><button type="button" aria-pressed="false">Already published</button></div>
      <div class="h-label">Classification</div>
      <div class="sheet-surface hstack" style="justify-content:space-between;flex-wrap:nowrap"><span><strong>Private</strong><br><span class="small muted">Analysed only on this device. This can’t be changed for imported files.</span></span>${ic('lock', 20)}</div>
      ${id === 'paste' ? '' : `<div class="h-label">Files</div>
      <div class="group">${files.map((f) => `<div class="row plain file-row"><span class="r-ic">${ic(f.icon, 17)}</span><span class="r-main"><span class="r-title" style="font-size:var(--fs-subhead)">${f.n}</span><span class="r-sub ${f.bad ? 'err' : f.ok ? 'okc' : ''}">${f.busy ? ic('loader', 12, 'spin') + ' ' : ''}${f.s}</span>${f.act ? `<button type="button" class="btn btn-sm btn-tinted" style="margin-top:8px" data-act="toast" data-msg="OCR runs locally and marks uncertain words">${f.act}</button>` : ''}</span><span class="r-end">${f.ok ? ic('circle-check', 18) : f.bad ? '' : `<button type="button" class="btn btn-sm btn-plain" data-act="toast" data-msg="Import cancelled">Cancel</button>`}</span></div>`).join('')}</div>`}
      <p class="foot">Files are read on this device and nothing is uploaded. Links in documents stay inactive, and macros never run.</p>`,
  };
};

SHEETS.consent = () => {
  const body = { ...PACK_REQUEST, domain: M.genDomain, categories: [...M.genCats] };
  const json = JSON.stringify(body, null, 2).replace(/"(\w+)":/g, '<span class="k">"$1"</span>:').replace(/: "([^"]+)"/g, ': <span class="s">"$1"</span>');
  return {
    title: 'Send to cloud?', detent: 'large',
    left: `<button type="button" class="gbtn" data-close>Cancel</button>`,
    right: '',
    body: `
      <div class="hstack" style="margin-bottom:10px"><span class="pack-src pack-cloud">${ic('cloud', 12)} Generic request</span>${policyTag('ONLY_IN_CLOUD')}</div>
      <p style="font-size:var(--fs-subhead);color:var(--ink-2);margin-bottom:12px">This asks Gemini, through Firebase AI Logic, to write new generic test definitions with fictional examples. This is the complete request:</p>
      <div class="payload">${json}</div>
      <div class="h-label">Not included</div>
      <div class="sheet-surface small" style="color:var(--ink-2)">Document text, excerpts, file names, workspace names, findings and anything derived from them.</div>
      <div class="h-label">Approval</div>
      <div class="sheet-surface"><dl class="kv"><dt>Payload digest</dt><dd class="mono">sha256:9f3c…7a1e</dd><dt>Valid for</dt><dd>5 minutes, this exact request</dd><dt>App Check</dt><dd>Required</dd></dl></div>
      <div class="btn-row"><button type="button" class="btn btn-primary full" data-act="consent-send">${ic('send', 16)} Send this request</button></div>
      <p class="foot" style="margin:12px 2px 0">Changing a category creates a new request that needs a new approval.</p>`,
  };
};

SHEETS.edge = ({ id }) => {
  const e = G.edges.find((x) => x.id === id);
  return {
    title: 'Connection', detent: 'medium',
    left: `<button type="button" class="gbtn round glass" data-close aria-label="Close" data-refract>${ic('x', 20)}</button>`,
    body: `
      <div class="hstack" style="margin-bottom:10px"><strong>${esc(G.nodes[e.a].t)}</strong>${ic('arrow-right', 16)}<strong>${esc(G.nodes[e.b].t)}</strong></div>
      <div class="sheet-surface"><p style="font-size:var(--fs-subhead);line-height:1.5">${esc(e.reason)}</p></div>
      <div class="h-label">Passages</div>
      <div class="ev-list">${e.refs.map(([d, p]) => `<button type="button" class="ev-card" data-close ${go('document', { doc: d, para: p })}><span class="ev-src">${ic(DOCS[d].kind === 'draft' ? 'file-pen' : 'file-check', 13)} ${DOCS[d].title} · ¶${p + 1}</span><span class="ev-q">${markPara(d, p, (d === 'D3' ? draftParas() : DOCS[d].paras)[p])}</span></button>`).join('')}</div>
      <p class="foot" style="margin:12px 2px 0">A connection is a hypothesis for review, not an identity match.</p>`,
  };
};

SHEETS.jevent = ({ id }) => {
  const e = journal()[Number(id)];
  const json = e.cloud ? JSON.stringify(PACK_REQUEST, null, 2) : null;
  return {
    title: e.task, detent: e.cloud ? 'large' : 'medium',
    left: `<button type="button" class="gbtn round glass" data-close aria-label="Close" data-refract>${ic('x', 20)}</button>`,
    body: `
      <div class="hstack" style="margin-bottom:12px">${sourceBadge(e.src)}<span class="small muted">${e.outcome === 'ok' ? 'Completed' : e.outcome}</span></div>
      <div class="sheet-surface"><dl class="kv">
        <dt>Requested policy</dt><dd><code>${e.policy}</code></dd>
        <dt>Actual source</dt><dd>${SOURCE[e.src].label}${e.src === 'DEVICE' || e.src === 'CLOUD' ? ' (SDK metadata)' : ''}</dd>
        <dt>Scope</dt><dd>${esc(e.scope)}</dd>
        <dt>Duration</dt><dd class="tnum">${e.ms == null ? '—' : e.ms + ' ms'}</dd>
        <dt>Time</dt><dd class="mono">${e.t}</dd>
        <dt>Operation</dt><dd class="mono">op_${(7919 * (Number(id) + 3)).toString(16)}</dd>
      </dl></div>
      ${e.note ? `<div class="banner banner-neutral" style="margin-top:10px">${ic('info', 16)}<div class="banner-body">${esc(e.note)}</div></div>` : ''}
      ${json ? `<div class="h-label">Exactly what was sent</div><div class="payload">${esc(json)}</div>` : `<p class="foot" style="margin:12px 2px 0">Prompts and replies for private tasks are never stored.</p>`}`,
  };
};

SHEETS.delete = ({ id }) => {
  const all = id === 'all';
  const w = PRIVATE_WORKSPACES.find((x) => x.id === id);
  return {
    title: all ? 'Delete all data?' : 'Delete workspace?', detent: 'medium',
    left: `<button type="button" class="gbtn" data-close>Cancel</button>`,
    body: `
      <div class="sheet-surface"><p style="font-size:var(--fs-subhead);line-height:1.5">${all ? 'This removes every workspace, document, finding, release record and cached pack stored by Mosaic on this device.' : `This removes “${esc(w.title)}” and its ${w.docs} documents from this device.`}</p><p class="small muted" style="margin-top:8px">It can’t undo exports or copies made elsewhere, and it isn’t forensic erasure.</p></div>
      <div class="btn-row"><button type="button" class="btn btn-danger full" data-close data-act="toast" data-msg="Preview only: nothing was deleted">${ic('trash-2', 16)} ${all ? 'Delete everything' : 'Delete workspace'}</button></div>`,
  };
};

/* ---------- rendering ---------- */
function buildScreen(route) {
  const def = SCREENS[route.name](route.params || {});
  const el = document.createElement('section');
  el.className = `screen ${def.cls || ''} ${def.large === false ? 'no-large' : ''} ${def.tabbar === false ? 'no-tabbar' : ''}`;
  el.dataset.route = route.name;
  const hasBack = def.back || currentStack().length > 1;
  el.innerHTML = `
    ${def.hideTop ? '' : `<header class="topbar"><div class="edge"></div><div class="t-left">${hasBack ? backBtn() : ''}${def.left || ''}</div><div class="t-title">${esc(def.title || '')}${def.sub ? `<span class="t-sub">${esc(def.sub)}</span>` : ''}</div><div class="t-right">${def.right || ''}</div></header>`}
    <div class="scroll">${def.large !== false && def.title ? `<h1 class="large-title">${esc(def.title)}</h1>` : ''}${def.body}</div>
    ${def.toolbar ? `<div class="toolbar glass" data-refract>${def.toolbar}</div>` : ''}`;
  el._def = def;
  const sc = $('.scroll', el);
  sc.addEventListener('scroll', () => el.classList.toggle('collapsed', sc.scrollTop > 30), { passive: true });
  return el;
}

function renderTabbar() {
  const top = topRoute();
  const def = stackEl.lastElementChild?._def;
  const hidden = M.mode === 'onboarding' || (def && def.tabbar === false);
  tabbarEl.classList.toggle('hidden', !!hidden);
  const n = openFindings().filter((f) => f.band === 'HIGH' || f.band === 'CRITICAL').length;
  tabbarEl.innerHTML = TABS.map(([k, l, icon]) => `<button type="button" class="tab" data-tab="${k}" ${M.tab === k ? 'aria-current="page"' : ''}>${ic(icon, 22)}<span>${l}</span>${k === 'findings' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('');
  void top;
}

function mountScreen(el) {
  if (el._def.mount) el._def.mount(el);
  Refraction.scan(el);
}

function showTop(anim = 'none') {
  const route = topRoute();
  const el = buildScreen(route);
  const old = stackEl.lastElementChild;
  stackEl.appendChild(el);
  renderTabbar();
  mountScreen(el);
  Refraction.scan(tabbarEl);
  if (!old || anim === 'none' || reduceMotion()) {
    if (old) old.remove();
    if (old && anim !== 'none') el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    finishNav();
    return;
  }
  const spring = 'cubic-bezier(0.2, 0.9, 0.25, 1)';
  if (anim === 'push') {
    el.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 440, easing: spring });
    old.animate([{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-28%)', filter: 'brightness(0.92)' }], { duration: 440, easing: spring }).onfinish = () => { old.remove(); finishNav(); };
  } else if (anim === 'pop') {
    stackEl.insertBefore(el, old);
    el.animate([{ transform: 'translateX(-28%)' }, { transform: 'translateX(0)' }], { duration: 400, easing: spring });
    old.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 400, easing: spring }).onfinish = () => { old.remove(); finishNav(); };
  } else {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    old.remove();
    finishNav();
  }
}
function finishNav() { renderNotes(); syncPreviewScreen(); }

function refreshTop() {
  const old = stackEl.lastElementChild;
  if (!old) return showTop();
  const sc = $('.scroll', old);
  const top = sc ? sc.scrollTop : 0;
  const el = buildScreen(topRoute());
  stackEl.replaceChild(el, old);
  const nsc = $('.scroll', el);
  if (nsc) { nsc.scrollTop = top; el.classList.toggle('collapsed', top > 30); }
  renderTabbar();
  Refraction.scan(el);
  Refraction.scan(tabbarEl);
}

function push(name, params) { currentStack().push({ name, params }); M.docFocus = 0; showTop('push'); }
function pop() { if (currentStack().length > 1) { currentStack().pop(); showTop('pop'); } else if (M.mode === 'tabs' && M.tab === 'workspaces') { M.mode = 'onboarding'; showTop('pop'); } }
function switchTab(tab) { M.mode = 'tabs'; if (M.tab === tab && currentStack().length > 1) { M.stacks[tab] = [M.stacks[tab][0]]; } M.tab = tab; showTop('fade'); }

/* ---------- sheets ---------- */
function openSheet(kind, params = {}) {
  closeSheets(true);
  const def = SHEETS[kind](params);
  const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.close = '';
  const el = document.createElement('div');
  el.className = `sheet glass glass-strong ${def.detent || 'medium'}`;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', def.title);
  el._kind = kind; el._params = params;
  el.innerHTML = sheetInner(def);
  sheetsEl.append(scrim, el);
  M.sheets = [{ el, scrim }];
  requestAnimationFrame(() => { scrim.classList.add('in'); el.classList.add('in'); });
  Refraction.scan(el);
  bindSheetDrag(el);
  setTimeout(() => $('.sheet-body', el)?.focus?.(), 50);
}
function sheetInner(def) {
  return `<div class="grabber" aria-hidden="true"></div><div class="sheet-head"><div class="sh-l">${def.left || ''}</div><h3>${esc(def.title)}</h3><div class="sh-r">${def.right || ''}</div></div><div class="sheet-body" tabindex="-1">${def.body}</div>`;
}
function refreshSheet() {
  const s = M.sheets[0];
  if (!s) return;
  const sb = $('.sheet-body', s.el); const top = sb ? sb.scrollTop : 0;
  const def = SHEETS[s.el._kind](s.el._params);
  s.el.innerHTML = sheetInner(def);
  $('.sheet-body', s.el).scrollTop = top;
  Refraction.scan(s.el);
}
function closeSheets(instant) {
  for (const { el, scrim } of M.sheets) {
    if (instant) { el.remove(); scrim.remove(); continue; }
    el.classList.remove('in'); scrim.classList.remove('in');
    setTimeout(() => { el.remove(); scrim.remove(); }, 380);
  }
  M.sheets = [];
}
function bindSheetDrag(el) {
  let y0 = null, dy = 0;
  const start = (e) => { if (!e.target.closest('.grabber, .sheet-head') || e.target.closest('button')) return; y0 = e.clientY; dy = 0; el.classList.add('dragging'); el.setPointerCapture(e.pointerId); };
  const move = (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 == null) return; el.classList.remove('dragging'); el.style.transform = ''; if (dy > 110) closeSheets(); y0 = null; };
  el.addEventListener('pointerdown', start); el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

/* ---------- swipe actions ---------- */
function bindSwipe() {
  let cur = null, x0 = 0, y0 = 0, dx = 0, locked = null, moved = false;
  const W = (wrap) => $('.frow-actions', wrap).offsetWidth;
  $('#device').addEventListener('pointerdown', (e) => {
    const row = e.target.closest('[data-swipe] .frow');
    $$('[data-swipe] .frow.open').forEach((r) => { if (r !== row) { r.classList.remove('open'); r.style.transform = ''; } });
    if (!row) return;
    cur = row; x0 = e.clientX; y0 = e.clientY; dx = 0; locked = null; moved = false;
  });
  $('#device').addEventListener('pointermove', (e) => {
    if (!cur) return;
    const ddx = e.clientX - x0, ddy = e.clientY - y0;
    if (locked == null && (Math.abs(ddx) > 6 || Math.abs(ddy) > 6)) locked = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
    if (locked !== 'x') return;
    moved = true;
    const base = cur.classList.contains('open') ? -W(cur.parentElement) : 0;
    dx = Math.min(0, Math.max(-W(cur.parentElement) - 30, base + ddx));
    cur.classList.add('dragging');
    cur.style.transform = `translateX(${dx}px)`;
  });
  const end = () => {
    if (!cur) return;
    cur.classList.remove('dragging');
    if (moved) {
      const open = dx < -W(cur.parentElement) / 2;
      cur.classList.toggle('open', open);
      cur.style.transform = open ? `translateX(${-W(cur.parentElement)}px)` : '';
      cur._suppress = true; setTimeout(() => { if (cur) cur._suppress = false; }, 0);
      const c = cur; setTimeout(() => { c._suppress = false; }, 50);
    }
    cur = null;
  };
  $('#device').addEventListener('pointerup', end);
  $('#device').addEventListener('pointercancel', end);
}

/* ---------- actions ---------- */
function act(name, el) {
  const id = el.dataset.id, v = el.dataset.v;
  switch (name) {
    case 'start-sample': M.mode = 'tabs'; M.tab = 'workspaces'; M.stacks.workspaces = [{ name: 'workspaces' }, { name: 'overview' }]; showTop('push'); break;
    case 'create-ws': M.mode = 'tabs'; M.tab = 'workspaces'; M.stacks.workspaces = [{ name: 'workspaces' }, { name: 'overview', params: { blank: true } }]; showTop('push'); break;
    case 'replay': playLanding(); break;
    case 'model-state': setState({ modelPreview: v }); break;
    case 'storage': M.storageMode = v; refreshTop(); break;
    case 'open-import': openSheet('import'); break;
    case 'rescan': setState({ rescanned: true }); toast(S.applied.size ? 'Reviewed again on this device (preview)' : 'Review ran on this device (preview)', 'scan-search'); break;
    case 'run-chunk': setState({ scenario: 'normal' }); toast('¶6–8 ran again on this device (preview)', 'rotate-cw'); break;
    case 'apply': { const a = new Set(S.applied); a.add(id); setState({ applied: a, rescanned: false, approved: false }); toast(`Applied ${id} · draft v4 created`, 'pen-line'); break; }
    case 'undo': { const a = new Set(S.applied); a.delete(id); setState({ applied: a, rescanned: false, approved: false }); toast(`Undid ${id}`, 'undo-2'); break; }
    case 'dismiss': setState({ statusOverride: { ...S.statusOverride, [id]: 'DISMISSED' } }); closeSheets(); toast(`${id} dismissed`, 'circle-slash'); break;
    case 'residual': setState({ statusOverride: { ...S.statusOverride, [id]: 'ACCEPTED_RESIDUAL' } }); closeSheets(); toast(`${id} accepted as residual`, 'circle-check-big'); break;
    case 'reopen': { const o = { ...S.statusOverride }; delete o[id]; const a = new Set(S.applied); a.delete(id); setState({ statusOverride: o, applied: a }); closeSheets(); toast(`${id} reopened`, 'undo-2'); break; }
    case 'filter': M.filter = v; refreshTop(); break;
    case 'map-mode': M.mapMode = v; refreshTop(); break;
    case 'map-stage': M.mapStage = Number(v); refreshTop(); break;
    case 'map-reset': M.mapStage = 3; M.mapMode = 'map'; refreshTop(); break;
    case 'doc-next': case 'doc-prev': {
      const r = topRoute(); const docId = r.params?.doc || 'D3';
      const fl = findings().filter((f) => f.anchors.some((a) => a.doc === docId && a.quote));
      if (!fl.length) break;
      M.docFocus = (M.docFocus + (name === 'doc-next' ? 1 : fl.length - 1)) % fl.length;
      const f = fl[M.docFocus];
      const mk = $(`.screen:last-child mark[data-f="${f.id}"]`);
      $('.screen:last-child .tb-mid').textContent = `Finding ${M.docFocus + 1} of ${fl.length}`;
      if (mk) { mk.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); mk.classList.remove('flash'); void mk.offsetWidth; mk.classList.add('flash'); }
      break;
    }
    case 'check': { const c = [...S.checklist]; c[Number(v)] = !c[Number(v)]; setState({ checklist: c }); break; }
    case 'approve': setState({ approved: true }); toast('Approved on this device', 'stamp'); break;
    case 'revoke': setState({ approved: false, checklist: [false, false, false] }); toast('Approval revoked', 'undo-2'); break;
    case 'pack-expand': M.expandedPack = M.expandedPack === v ? null : v; refreshTop(); break;
    case 'pack-toggle': setState({ packsEnabled: { ...S.packsEnabled, [v]: el.checked } }); break;
    case 'gen-domain': M.genDomain = v; refreshTop(); break;
    case 'gen-cat': M.genCats.has(v) ? M.genCats.delete(v) : M.genCats.add(v); refreshTop(); break;
    case 'consent-send': setState({ consent: 'sent' }); closeSheets(); toast('Design preview: no request was sent', 'cloud'); break;
    case 'export-kind': M.exportKind = v; refreshTop(); break;
    case 'export-fmt': M.exportFmt = v; refreshTop(); break;
    case 'theme': setState({ appearance: v }); break;
    case 'pref-reduced': setState({ reduced: el.checked }); break;
    case 'pref-refraction': setState({ refraction: el.checked }); break;
    case 'session-only': M.sessionOnly = el.checked; break;
    case 'toast': toast(el.dataset.msg || 'Preview only', 'info'); break;
    case 'noop-req': toast('Lists the supported devices', 'info'); break;
    default: break;
  }
}

$('#device').addEventListener('click', (e) => {
  const t = e.target;
  const frow = t.closest('.frow');
  if (frow && frow._suppress) { e.preventDefault(); return; }
  if (frow && frow.classList.contains('open')) { frow.classList.remove('open'); frow.style.transform = ''; return; }
  const closeEl = t.closest('[data-close]');
  const goEl = t.closest('[data-go]');
  const tabgo = t.closest('[data-tabgo]');
  const tab = t.closest('[data-tab]');
  const back = t.closest('[data-back]');
  const sheetEl = t.closest('[data-sheet]');
  const sheetV = t.closest('[data-sheet-v]');
  const actEl = t.closest('[data-act]');
  const mark = t.closest('mark.ev[data-f]');
  if (actEl && actEl.tagName === 'INPUT') return; // handled on change
  if (closeEl) closeSheets();
  if (back) return pop();
  if (tab) return switchTab(tab.dataset.tab);
  if (tabgo) return switchTab(tabgo.dataset.tabgo);
  if (mark && !t.closest('.ev-card')) return openSheet('finding', { id: mark.dataset.f });
  if (sheetV) { const s = M.sheets[0]; if (s) { s.el._params = { id: sheetV.dataset.id, v: sheetV.dataset.v }; refreshSheet(); } return; }
  if (sheetEl) return openSheet(sheetEl.dataset.sheet, { id: sheetEl.dataset.id, v: sheetEl.dataset.v });
  if (actEl) act(actEl.dataset.act, actEl);
  if (goEl) {
    const name = goEl.dataset.go;
    const params = goEl.dataset.p ? JSON.parse(goEl.dataset.p) : undefined;
    if (name === 'findings') return switchTab('findings');
    if (M.mode === 'tabs' && !['workspaces'].includes(M.tab) && ['document', 'overview', 'release', 'history', 'export', 'tests', 'rewrite'].includes(name)) { push(name, params); return; }
    push(name, params);
  }
});
$('#device').addEventListener('change', (e) => { const a = e.target.closest('[data-act]'); if (a && a.tagName === 'INPUT') act(a.dataset.act, a); });
$('#device').addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('mark.ev[data-f], g[role="button"], path[role="button"]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (e.key === 'Escape' && M.sheets.length) closeSheets();
});

/* ---------- landing animation ---------- */
let landingTimer = null;
function playLanding() {
  clearInterval(landingTimer);
  if (reduceMotion()) { M.landingStage = 3; if (topRoute().name === 'landing') refreshTop(); return; }
  M.landingStage = 0;
  if (topRoute().name === 'landing') refreshTop();
  landingTimer = setInterval(() => {
    if (topRoute().name !== 'landing') return clearInterval(landingTimer);
    M.landingStage++;
    // update in place so tiles animate
    const scr = stackEl.lastElementChild;
    const steps = groupSteps(new Set());
    const grid = $('.mosaic', scr);
    if (grid) grid.outerHTML = mosaicGrid(steps, M.landingStage);
    // re-query because outerHTML replaced it; animate by toggling classes next frame
    const cnt = $('.reveal-count', scr); if (cnt) cnt.innerHTML = `${steps[M.landingStage].count}<small> of 100</small>`;
    const cap = $('.reveal-caption', scr); if (cap) cap.textContent = ['A fictional population of 100 people.', 'The March report narrows it to one team.', 'The June case study narrows it again.', 'The new draft leaves one person.'][M.landingStage];
    $$('.mini-doc', scr).forEach((d, i) => d.classList.toggle('lit', i < M.landingStage));
    if (M.landingStage >= 3) clearInterval(landingTimer);
  }, 1300);
}

/* ---------- preview panel + notes ---------- */
const NOTES = {
  landing: ['Landing', '12.2 · 5.1 · F01', ['Three-document reveal: each release looks harmless; together they leave 1 of 100 fictional records.', 'Counts come from the seeded fictional population, not typed numbers.', 'Two prominent actions, no sign-up.']],
  setup: ['Setup', '7.4 · F01 · F25', ['All eight model states are previewable with the chips.', 'No fake progress: downloading shows an indeterminate bar until the system reports progress.', 'Storage choice: keep on device or session only.']],
  workspaces: ['Workspace list', '12.2 · F02', ['Sample workspace is separate and labelled fictional.', 'Swipe a private workspace left for Rename and Delete.', 'Try the Empty state in the panel.']],
  overview: ['Workspace overview', '12.2 · 5.4', ['Counts by priority with icon, text and colour.', 'Coverage bars separate contextual (on-device) from rules checks.', 'Try Partial scan and Unsupported device states.']],
  document: ['Document review', '12.3 · F05', ['Solid reading surface; glass only on bars.', 'Tap a highlight to open the finding sheet.', 'The bottom toolbar steps through findings.']],
  findings: ['Findings', '6.3 · F11', ['Filters by priority and actual source.', 'Swipe left for Dismiss and Rewrite.', 'Closed findings move to their own group.']],
  map: ['Disclosure map', '12.3 · F09', ['Nodes: releases, draft, generic categories, findings. None represents a person.', 'Tap a line for its reason and passages; List gives the accessible alternative.', 'Group-size steps recompute after rewrites.']],
  tests: ['Stress tests', '6.2 · F10 · F16', ['Source badges: bundled, generated in cloud, cached.', 'Generation is built from enums only. Review request shows the exact JSON.', 'Try the Offline state.']],
  rewrite: ['Rewrite studio', '6.4 · F12 · F13', ['Each edit shows the diff and what stays true.', 'Apply creates v4; Undo is per edit.', 'Review again shows resolved, unchanged, new and not assessed.']],
  release: ['Release review', '12.2 · F14', ['Before and after: high-priority count and fictional group size.', 'Approval needs the checklist and full coverage.', 'Copy never says "safe".']],
  history: ['Release history', 'F14', ['Approved snapshots used as the comparison baseline.', 'Approval can be revoked.']],
  export: ['Reports & export', 'F17', ['Clean draft and review report stay separate.', 'Lists exactly what is left out.']],
  journal: ['Inference journal', 'F15 · 9.4', ['Requested policy next to actual source from SDK metadata.', 'Tap the cloud entry to see the exact payload that was sent.']],
  settings: ['Settings', '12.2 · F22', ['Theme, reduce transparency and glass effects work live.', 'Delete flows explain the limits of deletion.']],
  benchmark: ['Benchmark lab', '14 · F19', ['Results table stays empty until the runner produces real numbers.', 'Population illustration is computed from fixtures.']],
};
function renderNotes() {
  const n = NOTES[topRoute().name];
  const host = $('#notes');
  if (!n) { host.innerHTML = ''; return; }
  host.innerHTML = `<h2>${n[0]}</h2><span class="spec">Spec ${n[1]}</span><ul>${n[2].map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="spec">Use the panel on the left to jump between screens and states.</p>`;
}
function syncPreviewScreen() { const sel = $('#pv-screen'); if (sel) sel.value = topRoute().name; }
function renderPreview() { $('#pv').innerHTML = previewControls(topRoute().name); }

function jumpTo(screen) {
  closeSheets(true);
  const W = { name: 'workspaces' }, O = { name: 'overview' };
  const map = {
    landing: ['onboarding', [{ name: 'landing' }]],
    setup: ['onboarding', [{ name: 'landing' }, { name: 'setup' }]],
    workspaces: ['workspaces', [W]],
    overview: ['workspaces', [W, O]],
    import: ['workspaces', [W, O]],
    document: ['workspaces', [W, O, { name: 'document' }]],
    map: ['map', [{ name: 'map' }]],
    findings: ['findings', [{ name: 'findings' }]],
    tests: ['workspaces', [W, O, { name: 'tests' }]],
    rewrite: ['workspaces', [W, O, { name: 'rewrite' }]],
    release: ['workspaces', [W, O, { name: 'release' }]],
    history: ['workspaces', [W, O, { name: 'history' }]],
    export: ['workspaces', [W, O, { name: 'export' }]],
    journal: ['journal', [{ name: 'journal' }]],
    benchmark: ['settings', [{ name: 'settings' }, { name: 'benchmark' }]],
    settings: ['settings', [{ name: 'settings' }]],
  };
  const [tab, stack] = map[screen];
  if (tab === 'onboarding') { M.mode = 'onboarding'; M.stacks.onboarding = stack; }
  else { M.mode = 'tabs'; M.tab = tab; M.stacks[tab] = stack; }
  showTop('fade');
  if (screen === 'import') setTimeout(() => openSheet('import'), 200);
  if (screen === 'landing') playLanding();
}

/* ---------- boot ---------- */
function fit() {
  const sc = $('#scaler');
  if (window.innerWidth <= 720) { sc.style.transform = ''; sc.style.marginBottom = ''; return; }
  const s = Math.min(1, (window.innerHeight - 84) / 852);
  sc.style.transform = `scale(${s})`;
  sc.style.marginBottom = `${852 * s - 852}px`;
}
window.addEventListener('resize', fit);

function renderStatusIcons() { $('#sb-icons').innerHTML = `${ic('signal', 17)}${ic(isOffline() ? 'wifi-off' : 'wifi', 17)}${ic('battery-full', 22)}`; }

onState((patch) => {
  renderPreview();
  renderStatusIcons();
  if (Object.keys(patch).some((k) => !['appearance', 'accent', 'reduced', 'refraction'].includes(k))) { refreshTop(); refreshSheet(); }
  else { refreshTop(); }
});

bindPreviewControls($('#pv'), (screen) => jumpTo(screen));
$('#pv-fab').addEventListener('click', () => { const p = $('#pv'); const o = p.classList.toggle('open'); $('#pv-fab').setAttribute('aria-expanded', o); });

applyAppearance();
renderPreview();
renderStatusIcons();
fit();
showTop();
playLanding();
bindSwipe();
