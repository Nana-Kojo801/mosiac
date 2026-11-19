/* ==========================================================================
   Mosaic desktop design preview. Glass sidebar, toolbar and inspector around
   a solid reading surface. Split-pane analysis workspace.
   ========================================================================== */

const D = {
  screen: 'landing',
  filter: 'all',
  mapMode: 'map',
  mapStage: 3,
  mapSel: { type: 'finding', id: 'F-01' },
  doc: 'D3',
  dismissing: null,
  landingStage: 0,
  expandedPack: 'core',
  genDomain: 'QUALITATIVE_RESEARCH',
  genCats: new Set(PACK_REQUEST.categories),
  exportKind: 'clean',
  exportFmt: 'Markdown',
  storageMode: 'persist',
  journalSel: 0,
  historySel: 'current',
  sessionOnly: false,
  dragOver: false,
};

const NAV = [
  ['Review', [['overview', 'Overview', 'layout-dashboard'], ['document', 'Documents', 'file-text'], ['findings', 'Findings', 'list-checks'], ['map', 'Disclosure map', 'waypoints'], ['rewrite', 'Rewrite studio', 'pen-line']]],
  ['Release', [['release', 'Release review', 'clipboard-check'], ['history', 'Release history', 'history'], ['export', 'Reports & export', 'file-output']]],
  ['Tools', [['tests', 'Stress tests', 'flask-conical'], ['journal', 'Inference journal', 'activity'], ['benchmark', 'Benchmark lab', 'chart-column']]],
];
const WITH_INSPECTOR = new Set(['document', 'findings', 'map', 'tests', 'rewrite', 'release', 'history', 'export', 'journal']);
const TITLES = { workspaces: 'Workspaces', overview: 'Overview', import: 'Import', document: 'Documents', findings: 'Findings', map: 'Disclosure map', tests: 'Stress tests', rewrite: 'Rewrite studio', release: 'Release review', history: 'Release history', export: 'Reports & export', journal: 'Inference journal', benchmark: 'Benchmark lab', settings: 'Settings' };

const appEl = $('#app');
const modalsEl = $('#modals');
const go = (s, extra = '') => `data-go="${s}" ${extra}`;
const counts = () => {
  const o = openFindings();
  return { high: o.filter((f) => f.band === 'HIGH' || f.band === 'CRITICAL').length, mod: o.filter((f) => f.band === 'MODERATE').length, low: o.filter((f) => f.band === 'LOW').length, un: o.filter((f) => f.unassessed).length };
};
const coverage = () => ({ ctx: S.scenario === 'unsupported' ? 0 : S.scenario === 'partial' || S.scenario === 'error' ? 5 : 8, rules: 8 });
const covBars = () => { const c = coverage(); return `<div class="coverage-d">
  <div class="cov-row"><span>Context</span><span class="bar"><i style="width:${(c.ctx / 8) * 100}%"></i>${c.ctx < 8 ? `<i class="un" style="width:${((8 - c.ctx) / 8) * 100}%"></i>` : ''}</span><span class="tnum">${c.ctx}/8 ¶ ${S.scenario === 'unsupported' ? '' : 'on device'}</span></div>
  <div class="cov-row"><span>Rules</span><span class="bar"><i class="rules" style="width:100%"></i></span><span class="tnum">8/8 ¶</span></div></div>`; };
const fmtMs = (ms) => (ms == null ? '—' : ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : ms + ' ms');

function scenarioBanner(where) {
  const sc = S.scenario;
  if (sc === 'unsupported') return `<div class="banner banner-warn">${ic('monitor-x', 18)}<div class="banner-body"><strong>This browser can’t run the on-device model</strong>You’re viewing recorded sample results. Private workspaces run rules-only checks here, and nothing is sent to the cloud instead. <a href="#" data-go="setup" style="color:inherit;font-weight:600">See requirements</a></div></div>`;
  if (sc === 'offline' && where !== 'quiet') return `<div class="banner banner-neutral">${ic('wifi-off', 18)}<div class="banner-body"><strong>Offline</strong>Private review keeps working on this device. Cloud test packs resume when you reconnect.</div></div>`;
  if ((sc === 'partial' || sc === 'error') && where === 'review') return `<div class="banner banner-un">${ic('circle-dashed', 18)}<div class="banner-body"><strong>Partial scan</strong>${sc === 'error' ? 'The model reply for ¶6–8 failed validation and was set aside after one local retry.' : '¶6–8 timed out on this device.'} Those paragraphs are not assessed.<br><button type="button" class="btn btn-sm btn-tinted" data-act="run-chunk">${ic('rotate-cw', 14)} Run ¶6–8 again</button></div></div>`;
  return '';
}
const withGap = (html) => (html ? `<div style="margin-bottom:16px">${html}</div>` : '');

/* ---------- shell ---------- */
function sidebar() {
  const ms = MODEL_STATES[modelState()];
  const dot = { ok: 'ok', warn: 'warn', bad: 'bad', neutral: '' }[ms.tone];
  const c = counts();
  const n = { findings: openFindings().length, rewrite: FINDINGS.filter((f) => f.rewrite && !S.applied.has(f.id)).length, document: 3 };
  return `<aside class="sidebar glass" aria-label="Workspace navigation">
    <div class="sb-brand">${logo(22)}<span>Mosaic</span><span class="preview-flag">Preview</span></div>
    <button type="button" class="ws-switch" ${go('workspaces')}>${logo(18)}<span><span class="ws-t">${WORKSPACE.title}</span><span class="ws-s">Sample · fictional</span></span>${ic('chevrons-up-down', 15)}</button>
    <nav class="nav">${NAV.map(([h, items]) => `<div class="nav-h">${h}</div>${items.map(([k, l, icon]) => `<button type="button" class="nav-i" ${go(k)} ${D.screen === k ? 'aria-current="page"' : ''}>${ic(icon, 16)}<span>${l}</span>${n[k] ? `<span class="n ${k === 'findings' && c.high ? 'hot' : ''}">${n[k]}</span>` : ''}</button>`).join('')}`).join('')}</nav>
    <div class="sb-foot">
      <button type="button" class="dev-chip" ${go('setup')}><span class="dot ${dot}"></span><span><b>On-device model</b><span>${ms.label}${isOffline() ? ' · offline' : ''}</span></span></button>
      <button type="button" class="nav-i" ${go('settings')} ${D.screen === 'settings' ? 'aria-current="page"' : ''}>${ic('settings', 16)}<span>Settings</span></button>
    </div>
  </aside>`;
}

function topbar() {
  const ms = modelState();
  const label = isOffline() ? 'Offline · local work continues' : { ready: 'On-device ready', unsupported: 'Rules only on this browser', error: 'Model error', unavailable: 'Model busy', download: 'Model not downloaded', downloading: 'Downloading model', checking: 'Checking model' }[ms] || 'On-device ready';
  const dot = isOffline() ? '' : ms === 'ready' ? 'ok' : ms === 'error' ? 'bad' : 'warn';
  const inWs = !['workspaces', 'settings'].includes(D.screen);
  return `<header class="topbar-d glass" data-refract>
    <div class="crumbs">${inWs ? `<span>${WORKSPACE.title}</span>${ic('chevron-right', 14)}` : ''}<b>${TITLES[D.screen]}</b></div>
    <span class="spacer"></span>
    <span class="pill-status"><span class="dot ${dot}"></span>${label}</span>
    ${inWs ? `<button type="button" class="btn btn-quiet tb-btn" ${go('import')}>${ic('file-up', 15)} Import</button><button type="button" class="btn btn-primary tb-btn" data-act="rescan">${ic('scan-search', 15)} Run review</button>` : ''}
  </header>`;
}

function render() {
  if (D.screen === 'landing') { appEl.innerHTML = landing(); afterRender(); return; }
  if (D.screen === 'setup') { appEl.innerHTML = setup(); afterRender(); return; }
  const scr = SCREENS[D.screen]();
  const insp = WITH_INSPECTOR.has(D.screen) && scr.inspector;
  const prev = $('.main-scroll', appEl);
  const keep = prev && prev.dataset.screen === D.screen ? prev.scrollTop : 0;
  const prevI = $('.insp-body', appEl);
  const keepI = prevI && prevI.dataset.screen === D.screen ? prevI.scrollTop : 0;
  appEl.innerHTML = `<div class="shell ${insp ? '' : 'no-inspector'}">
    ${sidebar()}
    <section class="main" aria-label="${TITLES[D.screen]}">${topbar()}<div class="main-scroll" data-screen="${D.screen}"><div class="main-inner ${scr.wide ? 'wide' : ''}">${scr.body}</div></div></section>
    ${insp ? `<aside class="inspector glass" aria-label="Inspector"><div class="insp-head"><h2>${scr.inspectorTitle || 'Inspector'}</h2>${scr.inspectorHead || ''}</div><div class="insp-body" data-screen="${D.screen}">${scr.inspector}</div></aside>` : ''}
  </div>`;
  $('.main-scroll', appEl).scrollTop = keep;
  if ($('.insp-body', appEl)) $('.insp-body', appEl).scrollTop = keepI;
  if (scr.mount) scr.mount();
  afterRender();
}
function afterRender() {
  Refraction.scan(appEl);
  const sel = $('#pv-screen'); if (sel) sel.value = D.screen;
}

/* ---------- landing ---------- */
function landing() {
  const steps = groupSteps(new Set());
  const st = D.landingStage;
  const lit = (k) => (st >= k ? ' lit' : '');
  const cols = [
    ['ONLY_ON_DEVICE', 'On this device', 'cpu', 'Private documents and anything derived from them.'],
    ['ONLY_IN_CLOUD', 'In the cloud, after you approve', 'cloud', 'Only fixed, generic inputs. You see the exact request.'],
    ['PREFER_ON_DEVICE', 'Either, for bundled samples', 'shuffle', 'The SDK picks; the actual source is shown.'],
  ];
  return `<div class="landing-d">
    <nav class="lnav glass" aria-label="Site">
      <span class="brand">${logo(22)} Mosaic</span>
      <span class="lk">How it works</span><span class="lk">Privacy model</span><button type="button" class="lk" ${go('setup')}>Device support</button>
      <span class="spacer"></span>
      <span class="preview-flag">${ic('pencil-ruler', 12)} Design preview</span>
      <button type="button" class="btn btn-primary btn-sm" data-act="start-sample">Open the sample</button>
    </nav>
    <section class="l-hero">
      <div>
        <h1>Protect the information you never realized you were revealing.</h1>
        <p class="sub">Each release can look anonymous on its own. Mosaic checks how your drafts and past releases read together, and it does the private part on your own device.</p>
        <div class="l-ctas"><button type="button" class="btn btn-primary" data-act="start-sample">Try the sample workspace</button><button type="button" class="btn btn-tinted" data-act="create-ws">Create a private workspace</button></div>
        <div class="l-trust">
          <div>${ic('lock', 17)}<span>Drafts are analysed in your browser with the built-in model. They never go to a server.</span></div>
          <div>${ic('cloud', 17)}<span>The cloud only writes generic test packs from fixed categories, after you approve the exact request.</span></div>
          <div>${ic('badge-check', 17)}<span>Every result shows where it actually ran. No account needed.</span></div>
        </div>
      </div>
      <div class="l-reveal" aria-live="polite">
        <div class="l-docs">
          <div class="l-doc${lit(1)}"><b>${ic('file-check', 13)} Interim report · published March 2026</b>Participants were drawn from ward-based nursing staff and from <mark class="ev">the overnight pharmacy team</mark>.</div>
          <div class="l-doc${lit(2)}"><b>${ic('file-check', 13)} Case study · published June 2026</b>One participant described joining with <mark class="ev">the winter onboarding cohort</mark>, after the January rota change.</div>
          <div class="l-doc${lit(3)}"><b>${ic('file-pen', 13)} Interview transcript · draft</b>I came over <mark class="ev ev-high">after my transfer from the coastal satellite clinic</mark>, so I already knew the system.</div>
          <span class="illustrative" style="margin-top:4px">${ic('flask-conical', 12)} Educational illustration · fictional records</span>
        </div>
        <div>
          ${mosaicGrid(steps, st)}
          <div class="l-count" id="l-count">${steps[st].count}<small> of 100</small></div>
          <p class="l-cap" id="l-cap">${['A fictional population of 100 people.', 'The March report narrows it to one team.', 'The June case study narrows it again.', 'The new draft leaves one person.'][st]}</p>
          <button type="button" class="btn btn-plain btn-sm" data-act="replay" style="padding:0">${ic('rotate-ccw', 14)} Replay</button>
        </div>
      </div>
    </section>
    <section class="l-split">
      <h2>Cloud writes the tests. Your device reads the documents.</h2>
      <p>Mosaic uses Firebase AI Logic for both. Each task has a fixed routing policy, and a private task never falls back to the cloud, even when the local model fails.</p>
      <div class="route-grid">${cols.map(([pol, h, icon, sub]) => `<div class="route-col glass"><h3>${ic(icon, 18)} ${h}</h3><span class="small muted">${sub}</span>${ROUTING.filter((r) => r.policy === pol).map((r) => `<div class="route-item"><b>${r.task}</b><span>${policyTag(r.policy)} · if unavailable: ${r.fail.toLowerCase()}</span></div>`).join('')}</div>`).join('')}</div>
    </section>
  </div>`;
}

/* ---------- setup ---------- */
function setup() {
  const ms = modelState();
  const m = MODEL_STATES[ms];
  const tone = { ok: 'ok', warn: 'warn', bad: 'bad', neutral: '' }[m.tone];
  const action = {
    checking: '',
    unsupported: `<button type="button" class="btn btn-quiet" data-act="toast" data-msg="Opens the device support page">Supported browsers and devices</button>`,
    download: `<button type="button" class="btn btn-primary" data-act="model-state" data-v="downloading">${ic('download', 16)} Download model</button>`,
    downloading: `<div class="indet" role="progressbar" aria-label="Downloading model"></div><p class="small muted">Waiting for Chrome to report progress. No estimate is shown until it does.</p><button type="button" class="btn btn-quiet" data-act="model-state" data-v="download">Cancel</button>`,
    ready: `<button type="button" class="btn btn-tinted" data-act="toast" data-msg="Preview only: no test prompt was run">${ic('play', 16)} Run a short test prompt</button>`,
    unavailable: `<button type="button" class="btn btn-quiet" data-act="model-state" data-v="ready">${ic('rotate-cw', 16)} Try again</button>`,
    offline: '',
    error: `<button type="button" class="btn btn-primary" data-act="model-state" data-v="downloading">${ic('rotate-cw', 16)} Retry</button>`,
  }[ms];
  return `<div class="setup-d">
    <div style="width:min(980px,100%);margin:0 auto 18px;display:flex;align-items:center;gap:12px">
      <button type="button" class="btn btn-quiet btn-sm" ${go('landing')}>${ic('chevron-left', 15)} Back</button>
      <h1 style="font-size:28px;font-weight:750;letter-spacing:-0.02em">Set up this browser</h1>
      <span style="flex:1"></span><span class="preview-flag">${ic('pencil-ruler', 12)} Design preview</span>
    </div>
    <div class="setup-card">
      <div class="glass" style="display:grid;gap:14px;align-content:start">
        <div class="model-state ${tone}"><span class="ms-ic">${ic(m.icon, 26, ms === 'checking' || ms === 'downloading' ? 'spin' : '')}</span><div><span class="small muted">Built-in model (Gemini Nano in Chrome)</span><h3>${m.label}</h3></div></div>
        <p style="color:var(--ink-2)">${m.body}</p>
        ${action}
        <div><div class="insp-label" style="margin-left:0">Preview a state</div><div class="filters-d" style="margin:0">${Object.entries(MODEL_STATES).map(([k, v]) => `<button type="button" class="fchip" aria-pressed="${k === ms}" data-act="model-state" data-v="${k}">${v.label}</button>`).join('')}</div></div>
        <div><div class="insp-label" style="margin-left:0">What Chrome needs</div>
          <div class="req">${ic('app-window', 16)}<div>Desktop Chrome with the Prompt API<span>Mobile Chrome doesn’t run the built-in model</span></div></div>
          <div class="req">${ic('hard-drive', 16)}<div>About 22 GB free on the Chrome profile drive<span>The model itself is smaller; Chrome keeps headroom</span></div></div>
          <div class="req">${ic('memory-stick', 16)}<div>More than 4 GB of video memory, or 16 GB RAM and 4 CPU cores<span>Meeting these doesn’t guarantee support; Chrome decides</span></div></div>
          <div class="req">${ic('wifi', 16)}<div>An unmetered connection for the first download<span>After that, private review works offline</span></div></div>
        </div>
      </div>
      <div style="display:grid;gap:16px;align-content:start">
        <div class="glass"><h3 style="font-size:16px;font-weight:700;margin-bottom:6px">${ic('cloud', 17)} What the cloud does</h3><p style="color:var(--ink-2);font-size:14px">It writes generic test packs from a fixed list of categories, such as “rare roles in small teams”. You see and approve the exact request first. Document text, names and file names are never part of it.</p></div>
        <div class="glass"><h3 style="font-size:16px;font-weight:700;margin-bottom:8px">${ic('hard-drive', 17)} Where workspaces live</h3>
          <button type="button" class="radio-d" role="radio" aria-checked="${D.storageMode === 'persist'}" data-act="storage" data-v="persist"><span class="dot"></span><div><b>Keep in this browser</b><span>Stored in IndexedDB until you delete it. Browsers can evict data; export anything you need to keep.</span></div></button>
          <button type="button" class="radio-d" role="radio" aria-checked="${D.storageMode === 'session'}" data-act="storage" data-v="session"><span class="dot"></span><div><b>This session only</b><span>Deleted when you close the workspace.</span></div></button>
        </div>
        <button type="button" class="btn btn-primary" data-act="start-sample" style="min-height:48px">Continue to the sample workspace</button>
      </div>
    </div>
  </div>`;
}

/* ---------- workspace screens ---------- */
const SCREENS = {};

SCREENS.workspaces = () => {
  const empty = S.scenario === 'empty';
  return {
    body: `
      <div class="page-h"><div><h1>Workspaces</h1><p>Each workspace holds a draft and the releases it is checked against. Everything stays in this browser.</p></div><button type="button" class="btn btn-primary" data-act="create-ws">${ic('plus', 16)} New workspace</button></div>
      <div class="h2" style="margin-top:0">Sample</div>
      <button type="button" class="tool-tile" ${go('overview')} style="width:100%;grid-template-columns:auto 1fr auto;align-items:center;gap:14px">${logo(28)}<span><b style="display:block;font-size:15px">${WORKSPACE.title}</b><span>${WORKSPACE.org} · 3 documents · 2 approved releases</span></span><span class="hstack">${riskChip(counts().high ? 'HIGH' : 'MODERATE', { small: true })}<span class="pack-src">${ic('flask-conical', 12)} Fictional sample</span>${ic('chevron-right', 16)}</span></button>
      <div class="h2">Private</div>
      ${empty ? `<div class="empty-d"><div class="mini-mosaic">${'<i></i>'.repeat(12)}</div><h3>No private workspaces yet</h3><p>Create one for a draft you plan to publish. It stays in this browser and is never synced.</p><button type="button" class="btn btn-primary" data-act="create-ws">${ic('plus', 16)} Create workspace</button></div>` : `
      <table class="tbl"><thead><tr><th>Title</th><th>Documents</th><th>Last edited</th><th>Status</th><th></th></tr></thead><tbody>
        ${PRIVATE_WORKSPACES.map((w) => `<tr class="clickable" data-act="toast" data-msg="Opens ${esc(w.title)} (not part of the sample)"><td class="t-title">${ic('folder-lock', 15)} ${w.title}</td><td class="num">${w.docs}</td><td class="muted">${w.edited.replace('Edited ', '')}</td><td>${w.status === 'Approved release' ? `<span class="chip chip-ok chip-sm">${ic('circle-check', 13)}<span>Approved release</span></span>` : riskChip('MODERATE', { small: true })}</td><td style="text-align:right"><button type="button" class="btn btn-sm btn-plain" data-act="toast" data-msg="Rename">Rename</button><button type="button" class="btn btn-sm btn-plain" style="color:var(--risk-crit-fg)" data-modal="delete" data-id="${w.id}">Delete</button></td></tr>`).join('')}
      </tbody></table>`}`,
  };
};

SCREENS.overview = () => {
  if (D.blank) {
    return { body: `
      <div class="page-h"><div><h1>Untitled workspace</h1><p>Private · in this browser</p></div></div>
      <div class="empty-d"><div class="mini-mosaic">${'<i></i>'.repeat(12)}</div><h3>Add your documents</h3><p>Add the draft you plan to publish and any releases that are already out. Everything is classed private.</p><div class="hstack" style="justify-content:center"><button type="button" class="btn btn-primary" ${go('import')}>${ic('file-up', 16)} Import files</button><button type="button" class="btn btn-tinted" ${go('import')}>${ic('clipboard', 16)} Paste text</button></div></div>` };
  }
  const c = counts();
  const v = draftVersion();
  return {
    body: `
      ${withGap(scenarioBanner('review'))}
      <div class="page-h"><div><h1>${WORKSPACE.title}</h1><p>${WORKSPACE.description}</p></div></div>
      <div class="status-d">
        <div class="panel">
          <div class="hstack" style="justify-content:space-between"><div><span class="small muted">Next release</span><div style="font-size:17px;font-weight:650">P-07 transcript · draft ${v}</div></div>${S.approved ? `<span class="chip chip-ok">${ic('circle-check', 14)}<span>Approved</span></span>` : riskChip(c.high ? 'HIGH' : c.mod ? 'MODERATE' : 'LOW')}</div>
          <div class="counts-d">
            <button type="button" class="count-d high" ${go('findings')} data-filter="high"><strong>${c.high}</strong><span>${ic('triangle-alert', 12)} High priority</span></button>
            <button type="button" class="count-d mod" ${go('findings')} data-filter="mod"><strong>${c.mod}</strong><span>${ic('circle-alert', 12)} Needs review</span></button>
            <button type="button" class="count-d" ${go('findings')} data-filter="low"><strong>${c.low}</strong><span>${ic('info', 12)} Low</span></button>
            <button type="button" class="count-d un" ${go('findings')} data-filter="un"><strong>${c.un}</strong><span>${ic('circle-dashed', 12)} Not assessed</span></button>
          </div>
        </div>
        <div class="panel" style="display:grid;gap:12px;align-content:start">
          <span class="small muted">Coverage</span>
          ${covBars()}
          <div class="hstack" style="margin-top:4px"><button type="button" class="btn btn-quiet btn-sm" ${go('document')}>${ic('file-text', 14)} Open draft</button><button type="button" class="btn btn-tinted btn-sm" ${go('rewrite')}>${ic('pen-line', 14)} Rewrite</button></div>
        </div>
      </div>
      <div class="h2">Documents <button type="button" class="btn btn-plain" ${go('import')}>${ic('plus', 14)} Add</button></div>
      <table class="tbl"><thead><tr><th></th><th>Title</th><th>Role</th><th>Version</th><th>Classification</th><th>Findings</th></tr></thead><tbody>
        ${['D3', 'R2', 'R1'].map((id) => { const d = DOCS[id]; const nf = findings().filter((f) => f.anchors.some((a) => a.doc === id && a.quote)).length; return `<tr class="clickable" data-go="document" data-doc="${id}"><td style="width:40px"><span class="doc-ic ${d.kind === 'draft' ? 'draft' : ''}">${ic(d.kind === 'draft' ? 'file-pen' : 'file-check', 15)}</span></td><td class="t-title">${d.title}</td><td>${d.kind === 'draft' ? 'Draft to review' : `Approved ${d.approved}`}</td><td class="mono">${id === 'D3' ? v : d.meta.split('· ').pop()}</td><td><span class="pack-src">${ic('lock', 11)} Private</span></td><td class="num">${nf}</td></tr>`; }).join('')}
      </tbody></table>
      <div class="h2">Tools</div>
      <div class="grid-3">
        <button type="button" class="tool-tile" ${go('map')}>${ic('waypoints', 20)}<b>Disclosure map</b><span>How the three documents connect</span></button>
        <button type="button" class="tool-tile" ${go('tests')}>${ic('flask-conical', 20)}<b>Stress tests</b><span>${Object.values(S.packsEnabled).filter(Boolean).length} packs on</span></button>
        <button type="button" class="tool-tile" ${go('release')}>${ic('clipboard-check', 20)}<b>Release review</b><span>${S.approved ? 'Approved on this device' : 'Not approved yet'}</span></button>
      </div>
      <p class="small muted" style="margin-top:18px">Last review ran ${S.scenario === 'unsupported' ? 'from recorded sample results' : 'on this device at 10:42'} with Core disclosure checks v1.3 and Qualitative research expansion 2026.11.18-a.</p>`,
  };
};

SCREENS.import = () => {
  const err = S.scenario === 'error';
  const files = [
    { n: 'interview-p07-v3.docx', s: '2 pages · 1,204 words', st: `<span class="chip chip-ok chip-sm">${ic('circle-check', 13)}<span>Text extracted</span></span>`, role: 'Draft to review' },
    { n: 'interim-report-v2.pdf', s: '4 pages', st: `<span class="status">${ic('loader', 13, 'spin')}<span>Reading page 3 of 4</span></span>`, role: 'Approved release' },
    ...(err ? [
      { n: 'field-notes-scan.pdf', s: '6 pages · no text layer', st: `<span class="chip chip-crit chip-sm">${ic('file-warning', 13)}<span>Looks scanned</span></span>`, role: '—', act: `<button type="button" class="btn btn-sm btn-tinted" data-act="toast" data-msg="OCR runs locally and marks uncertain words for correction">Run OCR on this device</button>` },
      { n: 'budget.xlsx', s: 'Spreadsheet', st: `<span class="chip chip-crit chip-sm">${ic('file-x', 13)}<span>Not supported</span></span>`, role: '—', act: '<span class="small muted">Use TXT, Markdown, PDF or DOCX</span>' },
      { n: 'appendix-c.docx', s: 'File is damaged', st: `<span class="chip chip-crit chip-sm">${ic('file-x', 13)}<span>Couldn’t read</span></span>`, role: '—', act: '<span class="small muted">Re-save the file and try again</span>' },
    ] : []),
  ];
  return {
    body: `
      <div class="page-h"><div><h1>Import</h1><p>Files are read in this browser. Nothing is uploaded, links stay inactive and macros never run.</p></div></div>
      <div class="drop-d ${D.dragOver ? 'over' : ''}" id="drop"><span class="d-ic">${ic('file-up', 26)}</span><strong style="font-size:16px">Drop files here</strong><span class="small muted">TXT, Markdown, text-based PDF or DOCX · up to 20 MB and 100 pages each</span><div class="hstack" style="justify-content:center"><button type="button" class="btn btn-sm btn-primary" data-act="toast" data-msg="Opens the file picker">Choose files</button><button type="button" class="btn btn-sm btn-tinted" data-act="toast" data-msg="Opens a paste box">Paste text</button></div></div>
      <div class="grid-2" style="margin-top:16px">
        <div class="panel"><span class="small muted">Classification</span><div class="hstack" style="margin-top:6px;justify-content:space-between"><b>Private</b>${ic('lock', 17)}</div><p class="small muted" style="margin-top:6px">Every imported file is private and is analysed only on this device. Bundled samples are the only cloud-eligible content.</p></div>
        <div class="panel"><span class="small muted">Role</span><div class="seg" style="margin-top:8px"><button type="button" aria-pressed="true">Draft to review</button><button type="button" aria-pressed="false">Already published</button></div><p class="small muted" style="margin-top:8px">Published releases become the history new drafts are checked against.</p></div>
      </div>
      <div class="h2">Files</div>
      <table class="tbl"><thead><tr><th>File</th><th>Details</th><th>Status</th><th>Role</th><th></th></tr></thead><tbody>
        ${files.map((f) => `<tr><td class="t-title">${ic('file-text', 15)} ${f.n}</td><td class="muted">${f.s}</td><td>${f.st}</td><td>${f.role}</td><td style="text-align:right">${f.act || `<button type="button" class="btn btn-sm btn-plain" data-act="toast" data-msg="Removed from import">Remove</button>`}</td></tr>`).join('')}
      </tbody></table>
      <div class="hstack" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn btn-quiet" ${go('overview')}>Cancel</button><button type="button" class="btn btn-primary" data-act="toast" data-msg="Preview: nothing was imported">Add to workspace</button></div>`,
  };
};

function findingInspector(f) {
  if (!f) return `<div class="insp-card"><p class="muted">Select a finding to see its evidence.</p></div>`;
  const cat = f.category ? CATEGORY[f.category] : null;
  const done = ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(f.status);
  const r = f.rewrite;
  return `
    <div class="insp-card">
      <div class="hstack" style="justify-content:space-between;margin-bottom:8px">${riskChip(f.band)}<span class="small muted mono">${f.id}</span></div>
      <div class="insp-title">${esc(f.title)}</div>
      <div class="hstack" style="margin-top:10px">${sourceBadge(f.source)}${f.source !== 'RULES' ? policyTag('ONLY_ON_DEVICE') : ''}${statusChip(f.status)}</div>
      ${cat ? `<p class="small muted" style="margin-top:8px">${ic(cat.icon, 13)} ${cat.label}</p>` : ''}
      <p style="margin-top:10px;font-size:13.5px;line-height:1.55;color:var(--ink-2)">${esc(f.rationale)}</p>
    </div>
    ${f.unassessed ? `<div class="insp-actions"><button type="button" class="btn btn-primary" data-act="run-chunk">${ic('rotate-cw', 15)} Run ¶6–8 again on this device</button><button type="button" class="btn btn-quiet" data-act="goto" data-doc="D3" data-para="5">Review ¶6–8 by hand</button></div>` : `
    <div class="insp-label">Evidence · ${f.anchors.length} passage${f.anchors.length > 1 ? 's' : ''}</div>
    <div class="ev-list">${f.anchors.map((a) => `<button type="button" class="ev-card" data-act="goto" data-doc="${a.doc}" data-para="${a.para}"><span class="ev-src">${ic(DOCS[a.doc].kind === 'draft' ? 'file-pen' : 'file-check', 12)} ${DOCS[a.doc].title} · ¶${a.para + 1}</span><span class="ev-q">“…${markPara(a.doc, a.para, a.quote, { findings: [f] })}…”</span></button>`).join('')}</div>
    <div class="insp-label">Review priority</div>
    <div class="insp-card">${scoreBars(f)}</div>
    <div class="insp-label">Confidence</div>
    <div class="insp-card"><b style="font-size:13.5px">${CONF[f.confidence]}</b><p class="small" style="color:var(--ink-2);margin-top:4px">${esc(f.confReason)}</p></div>
    ${r ? `<div class="insp-label">Suggested change</div><div class="insp-card"><div class="diffbox"><del class="diff">${esc(r.from)}</del>${r.to ? ` <ins class="diff">${esc(r.to)}</ins>` : ''}</div><div class="keeps" style="margin-top:8px">${ic('circle-check', 14)}<span><b>Still true:</b> ${esc(f.keeps)}</span></div></div>` : ''}
    ${D.dismissing === f.id ? `<div class="insp-label">Why dismiss? (optional, stays on this device)</div><textarea class="note-field" id="dismiss-note" placeholder="For example: already public in the funder’s report"></textarea><div class="insp-actions"><div class="two"><button type="button" class="btn btn-quiet" data-act="dismiss-cancel">Cancel</button><button type="button" class="btn btn-danger" data-act="dismiss" data-id="${f.id}">Dismiss</button></div></div>` : done ? `<div class="insp-actions"><button type="button" class="btn btn-quiet" data-act="reopen" data-id="${f.id}">${ic('undo-2', 15)} Reopen</button></div>` : `
    <div class="insp-actions">
      ${r ? `<button type="button" class="btn btn-primary" data-go="rewrite">${ic('pen-line', 15)} Preview rewrite</button>` : ''}
      <div class="two"><button type="button" class="btn btn-quiet" data-act="residual" data-id="${f.id}">Accept residual</button><button type="button" class="btn btn-quiet" data-act="dismiss-start" data-id="${f.id}">Dismiss…</button></div>
    </div>`}
    <p class="small muted" style="margin:14px 4px 0">Advisory. Mosaic suggests; you decide what to publish.</p>`}`;
}

SCREENS.document = () => {
  const id = D.doc;
  const d = DOCS[id];
  const paras = id === 'D3' ? draftParas() : d.paras;
  const sel = findingById(S.selected);
  return {
    body: `
      ${id === 'D3' ? withGap(scenarioBanner('review')) : ''}
      <div class="doc-tabs" role="tablist">${['D3', 'R1', 'R2'].map((k) => `<button type="button" class="doc-tab" role="tab" aria-selected="${k === id}" data-act="doc" data-v="${k}">${ic(DOCS[k].kind === 'draft' ? 'file-pen' : 'file-check', 14)} ${DOCS[k].short}</button>`).join('')}</div>
      <div class="doc-meta"><b style="color:var(--ink);font-size:15px">${d.title}</b><span>${id === 'D3' ? `Draft ${draftVersion()}` : d.meta}</span><span class="pack-src">${ic('lock', 11)} Private</span><span style="flex:1"></span><span class="hstack small"><span class="kbd">J</span><span class="kbd">K</span> next / previous finding</span></div>
      <article class="reader-d" aria-label="Document text">${paras.map((t, i) => `<div class="para" id="p-${id}-${i}"><span class="para-anchor">¶${i + 1}</span><p>${markPara(id, i, t, { active: S.selected })}</p></div>`).join('')}</article>
      <p class="small muted" style="margin-top:8px">Text extracted in this browser. Original formatting, embedded objects and file metadata are not reviewed here.</p>`,
    inspectorTitle: 'Finding',
    inspector: findingInspector(sel && sel.anchors.some((a) => a.doc === id) ? sel : findings().find((f) => f.anchors.some((a) => a.doc === id && a.quote))),
    mount() {
      if (D.gotoPara != null) {
        const pe = $(`#p-${id}-${D.gotoPara}`);
        D.gotoPara = null;
        if (pe) setTimeout(() => { pe.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); pe.classList.add('flash'); }, 60);
      }
    },
  };
};

SCREENS.findings = () => {
  const all = findings();
  const f = D.filter;
  const pass = (x) => f === 'all' || (f === 'high' && (x.band === 'HIGH' || x.band === 'CRITICAL')) || (f === 'mod' && x.band === 'MODERATE') || (f === 'low' && x.band === 'LOW') || (f === 'un' && x.unassessed) || (f === 'device' && x.source === 'DEVICE') || (f === 'rules' && x.source === 'RULES') || (f === 'closed' && ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(x.status));
  const list = all.filter(pass);
  const n = (fn) => all.filter(fn).length;
  const chips = [['all', 'All', all.length], ['high', 'High priority', n((x) => x.band === 'HIGH')], ['mod', 'Needs review', n((x) => x.band === 'MODERATE')], ['low', 'Low', n((x) => x.band === 'LOW')], ['un', 'Not assessed', n((x) => x.unassessed)], ['device', 'On device', n((x) => x.source === 'DEVICE')], ['rules', 'Rules', n((x) => x.source === 'RULES')], ['closed', 'Closed', n((x) => ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(x.status))]].filter((c) => c[2] || c[0] === 'all');
  return {
    wide: true,
    body: `
      ${withGap(scenarioBanner('review'))}
      <div class="page-h"><div><h1>Findings</h1><p>P-07 transcript · draft ${draftVersion()} checked against 2 approved releases.</p></div></div>
      <div class="filters-d" role="toolbar" aria-label="Filter findings">${chips.map(([k, l, c]) => `<button type="button" class="fchip" aria-pressed="${k === f}" data-act="filter" data-v="${k}">${l} <span class="n">${c}</span></button>`).join('')}</div>
      <table class="tbl"><thead><tr><th>Priority</th><th>Finding</th><th>Documents</th><th>Source</th><th>Status</th><th class="num">Score</th></tr></thead><tbody>
        ${list.map((x) => { const done = ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(x.status); return `<tr class="clickable ${x.id === S.selected ? 'sel' : ''} ${done ? 'done' : ''}" data-act="select" data-id="${x.id}" tabindex="0"><td>${riskChip(x.band, { small: true })}</td><td><div class="t-title">${esc(x.title)}</div><div class="small muted">${x.id}${x.category ? ' · ' + CATEGORY[x.category].label : ''}</div></td><td class="small">${[...new Set(x.anchors.map((a) => DOCS[a.doc].short))].join(', ')}</td><td>${sourceBadge(x.source)}</td><td>${statusChip(x.status)}</td><td class="num mono">${x.unassessed ? '—' : x.score + '/11'}</td></tr>`; }).join('')}
      </tbody></table>
      ${list.length ? '' : `<div class="empty-d" style="margin-top:12px"><h3>Nothing in this filter</h3><p>That doesn’t mean the draft is anonymous. It means no finding matches.</p></div>`}
      <p class="small muted" style="margin-top:14px">Scores are review priority from four rubric dimensions, not a probability of identification. A low score is not clearance.</p>`,
    inspectorTitle: 'Finding',
    inspector: findingInspector(findingById(S.selected)),
  };
};

/* desktop graph */
const DG = {
  nodes: {
    R1: { x: 20, y: 40, w: 180, h: 62, t: 'Interim report', s: 'Approved · 12 Mar 2026', k: 'RELEASE', cls: 'release' },
    R2: { x: 20, y: 160, w: 180, h: 62, t: 'Case study', s: 'Approved · 3 Jun 2026', k: 'RELEASE', cls: 'release' },
    D3: { x: 20, y: 280, w: 180, h: 62, t: 'P-07 transcript', s: 'Draft', k: 'DRAFT', cls: 'draft' },
    c1: { x: 300, y: 30, w: 160, h: 50, t: 'Team or role', s: '2 passages', k: 'CATEGORY', cls: 'cat' },
    c2: { x: 300, y: 120, w: 160, h: 50, t: 'Start window', s: '2 passages', k: 'CATEGORY', cls: 'cat' },
    c3: { x: 300, y: 210, w: 160, h: 50, t: 'Transfer history', s: '1 passage', k: 'CATEGORY', cls: 'cat' },
    c4: { x: 300, y: 300, w: 160, h: 50, t: 'Health context', s: '1 passage', k: 'CATEGORY', cls: 'cat' },
    'F-01': { x: 560, y: 70, w: 200, h: 92, t: 'F-01 · combined', s: '', k: 'FINDING', cls: 'finding' },
    'F-02': { x: 560, y: 184, w: 200, h: 50, t: 'F-02 · unique skill', s: '', k: '', cls: 'finding' },
    'F-03': { x: 560, y: 246, w: 200, h: 50, t: 'F-03 · exact date', s: '', k: '', cls: 'finding' },
    'F-05': { x: 560, y: 308, w: 200, h: 50, t: 'F-05 · health detail', s: '', k: '', cls: 'finding' },
  },
};

function dGraph() {
  const fs = findings();
  const has = (id) => fs.some((f) => f.id === id);
  const N = DG.nodes;
  const visible = (e) => [e.a, e.b].every((n) => !n.startsWith('F-') || has(n)) && (![e.a, e.b].includes('c4') || has('F-05'));
  const cut = (e) => (e.id === 'e5' && S.applied.has('F-01')) || (e.id === 'e4' && S.applied.has('F-03')) || (e.id === 'e2' && S.applied.has('F-02')) || (e.id === 'e6' && S.applied.has('F-05'));
  const path = (e) => { const a = N[e.a], b = N[e.b]; const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2; const mx = (x1 + x2) / 2; return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`; };
  const selE = D.mapSel.type === 'edge' ? D.mapSel.id : null;
  const selN = D.mapSel.type !== 'edge' ? D.mapSel.id : null;
  const edges = G_EDGES.filter(visible).map((e) => `<g><path class="g-hit" d="${path(e)}" data-act="map-sel" data-type="edge" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(N[e.a].t)} to ${esc(N[e.b].t)}"></path><path class="g-edge${e.hot && !S.applied.has('F-01') ? ' hot' : ''}${cut(e) ? ' cut' : ''}${selE === e.id ? ' sel' : ''}" d="${path(e)}"></path></g>`).join('');
  const nodes = Object.entries(N).filter(([k]) => (!k.startsWith('F-') || has(k)) && (k !== 'c4' || has('F-05'))).map(([k, n]) => {
    const f = k.startsWith('F-') ? fs.find((x) => x.id === k) : null;
    const resolved = f && ['RESOLVED', 'DISMISSED', 'ACCEPTED_RESIDUAL'].includes(f.status);
    const sub = f ? (resolved ? STATUS[f.status].label : BAND[f.band].label) : n.s;
    const mod = f && f.band === 'MODERATE' ? ' mod' : '';
    const type = f ? 'finding' : k.startsWith('c') ? 'cat' : 'doc';
    const big = k === 'F-01';
    return `<g class="g-node ${n.cls}${mod}${resolved ? ' resolved' : ''}${selN === k ? ' sel' : ''}" data-act="map-sel" data-type="${type}" data-id="${k}" tabindex="0" role="button"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12"></rect>${n.k ? `<text class="kind" x="${n.x + 12}" y="${n.y + 16}">${n.k}</text>` : ''}<text x="${n.x + 12}" y="${n.y + (n.k ? 34 : 22)}">${esc(n.t)}</text><text class="sub" x="${n.x + 12}" y="${n.y + (n.k ? 50 : 38)}">${esc(sub)}</text>${big && !resolved ? `<text class="sub" x="${n.x + 12}" y="${n.y + 72}">Group: ${groupSteps(S.applied).slice(-1)[0].count} of 100 fictional</text>` : ''}</g>`;
  }).join('');
  return `<svg viewBox="0 0 780 372" role="group" aria-label="Disclosure map"><text class="g-col" x="20" y="22">DOCUMENTS</text><text class="g-col" x="300" y="18">CATEGORIES</text><text class="g-col" x="560" y="58">FINDINGS</text>${edges}${nodes}</svg>`;
}
// reuse the mobile edge semantics
const G_EDGES = [
  { id: 'e1', a: 'R1', b: 'c1', reason: 'The interim report names the overnight pharmacy team.', refs: [['R1', 1]] },
  { id: 'e2', a: 'D3', b: 'c1', reason: 'P-07 describes a skill that belongs to that team.', refs: [['D3', 2]] },
  { id: 'e3', a: 'R2', b: 'c2', reason: 'The case study places one participant in the winter onboarding cohort, after the January rota change.', refs: [['R2', 1]] },
  { id: 'e4', a: 'D3', b: 'c2', reason: 'P-07 gives the date of the rota change, which matches that cohort.', refs: [['D3', 4]] },
  { id: 'e5', a: 'D3', b: 'c3', reason: 'P-07 mentions a transfer from the coastal satellite clinic.', refs: [['D3', 1]] },
  { id: 'e6', a: 'D3', b: 'c4', reason: 'P-07 mentions contact with occupational health.', refs: [['D3', 6]] },
  { id: 'e7', a: 'c1', b: 'F-01', reason: 'Team, start window and transfer together narrow the fictional group to one record.', refs: [['R1', 1], ['R2', 1], ['D3', 1]], hot: true },
  { id: 'e8', a: 'c2', b: 'F-01', reason: 'Team, start window and transfer together narrow the fictional group to one record.', refs: [['R1', 1], ['R2', 1], ['D3', 1]], hot: true },
  { id: 'e9', a: 'c3', b: 'F-01', reason: 'Team, start window and transfer together narrow the fictional group to one record.', refs: [['R1', 1], ['R2', 1], ['D3', 1]], hot: true },
  { id: 'e10', a: 'c1', b: 'F-02', reason: 'A unique skill inside a named team.', refs: [['D3', 2], ['R1', 1]] },
  { id: 'e11', a: 'c2', b: 'F-03', reason: 'The exact date links the draft to the cohort.', refs: [['D3', 4], ['R2', 1]] },
  { id: 'e12', a: 'c4', b: 'F-05', reason: 'Health detail not needed for the finding.', refs: [['D3', 6]] },
];

function mapInspector() {
  const sel = D.mapSel;
  const steps = groupSteps(S.applied);
  const st = Math.min(D.mapStage, steps.length - 1);
  let top = '';
  if (sel.type === 'edge') {
    const e = G_EDGES.find((x) => x.id === sel.id);
    top = `<div class="insp-card"><span class="small muted">Connection</span><div class="insp-title" style="font-size:16px;margin-top:4px">${esc(DG.nodes[e.a].t)} → ${esc(DG.nodes[e.b].t)}</div><p style="margin-top:8px;font-size:13.5px;color:var(--ink-2)">${esc(e.reason)}</p></div>
      <div class="insp-label">Passages</div><div class="ev-list">${e.refs.map(([d, p]) => `<button type="button" class="ev-card" data-act="goto" data-doc="${d}" data-para="${p}"><span class="ev-src">${ic(DOCS[d].kind === 'draft' ? 'file-pen' : 'file-check', 12)} ${DOCS[d].title} · ¶${p + 1}</span><span class="ev-q">${markPara(d, p, (d === 'D3' ? draftParas() : DOCS[d].paras)[p])}</span></button>`).join('')}</div>
      <p class="small muted" style="margin:10px 4px 0">A connection is a hypothesis for review, not an identity match.</p>`;
  } else if (sel.type === 'finding') {
    const f = findingById(sel.id);
    top = f ? `<div class="insp-card"><div class="hstack" style="justify-content:space-between">${riskChip(f.band, { small: true })}${sourceBadge(f.source)}</div><div class="insp-title" style="font-size:16px;margin-top:8px">${esc(f.title)}</div><p style="margin-top:8px;font-size:13.5px;color:var(--ink-2)">${esc(f.rationale)}</p><div class="insp-actions"><button type="button" class="btn btn-tinted btn-sm" data-act="select" data-id="${f.id}" data-then="findings">Open in Findings</button></div></div>` : '';
  } else if (sel.type === 'doc') {
    const d = DOCS[sel.id];
    top = `<div class="insp-card"><span class="small muted">${d.kind === 'draft' ? 'Draft' : 'Approved release'}</span><div class="insp-title" style="font-size:16px;margin-top:4px">${d.title}</div><p class="small muted" style="margin-top:6px">${d.meta}</p><div class="insp-actions"><button type="button" class="btn btn-tinted btn-sm" data-act="goto" data-doc="${sel.id}" data-para="0">Open document</button></div></div>`;
  } else {
    const n = DG.nodes[sel.id];
    top = `<div class="insp-card"><span class="small muted">Generic disclosure category</span><div class="insp-title" style="font-size:16px;margin-top:4px">${n.t}</div><p class="small muted" style="margin-top:6px">A category groups passages that disclose the same kind of context. It never stands for a person.</p></div>`;
  }
  return `${top}
    <div class="insp-label">Fictional group size</div>
    <div class="insp-card">
      <div style="max-width:200px;margin:0 auto 12px">${mosaicGrid(steps, st)}</div>
      <div class="steps">${steps.map((s, k) => `<button type="button" class="step" aria-pressed="${k === st}" data-act="map-stage" data-v="${k}"><span><span class="st-l">${k === 0 ? 'Start' : '+ ' + esc(s.label)}</span><span class="st-s">${esc(s.from)}</span></span><span class="st-n">${s.count}</span></button>`).join('')}</div>
      <p class="small muted" style="margin-top:10px"><span class="illustrative">${ic('flask-conical', 12)} Educational illustration</span><br>Computed from 100 seeded fictional records. Not a measure of real-world anonymity.</p>
    </div>`;
}

SCREENS.map = () => ({
  wide: true,
  body: `
    <div class="page-h"><div><h1>Disclosure map</h1><p>How the draft connects to what’s already published. Click a line for its reason and the passages behind it.</p></div><div class="seg" role="tablist"><button type="button" role="tab" aria-selected="${D.mapMode === 'map'}" data-act="map-mode" data-v="map">Map</button><button type="button" role="tab" aria-selected="${D.mapMode === 'list'}" data-act="map-mode" data-v="list">List</button></div></div>
    ${D.mapMode === 'map' ? `<div class="graph-wrap">${dGraph()}</div><div class="g-legend"><span><i style="background:var(--surface)"></i>Release / category</span><span><i style="background:var(--accent-soft)"></i>Draft</span><span><i style="background:var(--risk-high-bg)"></i>Finding</span><span><i style="background:var(--ok-bg)"></i>Resolved</span><span>Dashed line: removed by an edit</span><span>No node represents a person</span></div>` : `
    <table class="tbl"><thead><tr><th>From</th><th>To</th><th>Reason</th><th>Passages</th></tr></thead><tbody>${G_EDGES.filter((e) => ![e.a, e.b].some((n) => n.startsWith('F-') && !findings().some((f) => f.id === n))).map((e) => `<tr class="clickable ${D.mapSel.id === e.id ? 'sel' : ''}" data-act="map-sel" data-type="edge" data-id="${e.id}"><td class="t-title">${esc(DG.nodes[e.a].t)}</td><td class="t-title">${esc(DG.nodes[e.b].t)}</td><td class="small">${esc(e.reason)}</td><td class="small mono">${e.refs.map(([d, p]) => `${DOCS[d].short} ¶${p + 1}`).join(', ')}</td></tr>`).join('')}</tbody></table>`}
    <div class="grid-3" style="margin-top:20px">
      <div class="panel"><span class="small muted">Documents linked</span><div style="font-size:26px;font-weight:700">3</div></div>
      <div class="panel"><span class="small muted">Cross-release findings</span><div style="font-size:26px;font-weight:700">${findings().filter((f) => f.anchors.some((a) => a.doc !== 'D3') && !['RESOLVED', 'DISMISSED'].includes(f.status)).length}</div></div>
      <div class="panel"><span class="small muted">Fictional group now</span><div style="font-size:26px;font-weight:700">${groupSteps(S.applied).slice(-1)[0].count} <span class="small muted">of 100</span></div></div>
    </div>`,
  inspectorTitle: 'Details',
  inspector: mapInspector(),
});

SCREENS.tests = () => {
  const off = isOffline();
  const allCats = [['ROLE_RARITY', 'Role rarity'], ['TENURE_WINDOWS', 'Start-date windows'], ['SHIFT_PATTERNS', 'Shift patterns'], ['RARE_EVENTS', 'Rare events'], ['SMALL_SITES', 'Small sites']];
  const body = { ...PACK_REQUEST, domain: D.genDomain, categories: [...D.genCats] };
  const json = JSON.stringify(body, null, 2).replace(/"(\w+)":/g, '<span class="k">"$1"</span>:').replace(/: "([^"]+)"/g, ': <span class="s">"$1"</span>');
  return {
    body: `
      <div class="page-h"><div><h1>Stress tests</h1><p>Reusable, declarative checks applied to your documents on this device. Packs are validated before use and never run as code.</p></div></div>
      <div style="display:grid;gap:10px">${PACKS.map((p) => { const open = D.expandedPack === p.id; return `<div class="pack-d"><div class="ph"><button type="button" style="text-align:left" data-act="pack-expand" data-v="${p.id}" aria-expanded="${open}"><h3>${p.name} ${ic(open ? 'chevron-up' : 'chevron-down', 15)}</h3><span class="hstack" style="margin-top:6px">${packBadge(p.source)}${p.source === 'cloud' && off ? packBadge('cached') : ''}<span class="small muted">${p.version} · ${p.count} tests</span></span></button><label class="switch sm"><input type="checkbox" data-act="pack-toggle" data-v="${p.id}" ${S.packsEnabled[p.id] ? 'checked' : ''} aria-label="Use ${p.name}"><span></span></label></div>${open ? `<div class="pt">${p.tests.map(([, n, q]) => `<div><b>${n}</b><span>${q}</span></div>`).join('')}${p.count > p.tests.length ? `<div><span class="muted">+ ${p.count - p.tests.length} more</span><span></span></div>` : ''}</div>` : ''}</div>`; }).join('')}</div>
      <div class="h2">Generate a pack</div>
      <div class="panel line" style="display:grid;gap:14px">
        ${off ? `<div class="banner banner-neutral">${ic('wifi-off', 18)}<div class="banner-body"><strong>Unavailable offline</strong>Cached packs still work. Generation resumes when you reconnect.</div></div>` : ''}
        <div><span class="small muted">Domain</span><div class="seg" style="margin-top:6px;display:flex;width:max-content"><button type="button" aria-pressed="${D.genDomain === 'QUALITATIVE_RESEARCH'}" data-act="gen-domain" data-v="QUALITATIVE_RESEARCH">Qualitative research</button><button type="button" aria-pressed="${D.genDomain === 'EDITORIAL'}" data-act="gen-domain" data-v="EDITORIAL">Editorial</button></div></div>
        <div><span class="small muted">Categories (fixed list)</span><div class="filters-d" style="margin:6px 0 0">${allCats.map(([k, l]) => `<button type="button" class="fchip" aria-pressed="${D.genCats.has(k)}" data-act="gen-cat" data-v="${k}">${D.genCats.has(k) ? ic('check', 13) : ''}${l}</button>`).join('')}</div></div>
        <p class="small muted">There is no free-text field. The request is built only from these choices.</p>
      </div>`,
    inspectorTitle: 'Outbound request',
    inspector: `
      <div class="insp-card"><div class="hstack" style="justify-content:space-between"><span class="pack-src pack-cloud">${ic('cloud', 12)} Generic · enum only</span>${policyTag('ONLY_IN_CLOUD')}</div><p class="small" style="margin-top:10px;color:var(--ink-2)">This is the complete body that would leave the device. It updates as you change the choices.</p></div>
      <div class="insp-label">Exact payload</div>
      <div class="payload">${json}</div>
      <div class="insp-label">Never included</div>
      <div class="insp-card small" style="color:var(--ink-2)">Document text, excerpts, file names, workspace names, findings and anything derived from them.</div>
      <div class="insp-actions"><button type="button" class="btn btn-primary" data-modal="consent" ${off || !D.genCats.size ? 'disabled' : ''}>${ic('eye', 15)} Review and send…</button></div>
      ${S.consent === 'sent' ? `<p class="small muted" style="margin:10px 4px 0">${ic('check', 13)} Last request approved this session (preview: nothing was sent).</p>` : ''}`,
  };
};

SCREENS.rewrite = () => {
  const cands = findings().filter((f) => f.rewrite && f.status !== 'DISMISSED');
  const applied = cands.filter((f) => S.applied.has(f.id));
  const orig = DOCS.D3.paras;
  const rev = draftParas();
  const markApplied = (i, text, side) => {
    let html = esc(text);
    for (const f of FINDINGS) {
      if (!S.applied.has(f.id) || !f.rewrite || f.rewrite.para !== i) continue;
      if (side === 'L') html = html.replace(esc(f.rewrite.from), `<del class="diff">${esc(f.rewrite.from)}</del>`);
      else if (f.rewrite.to) html = html.replace(esc(f.rewrite.to), `<ins class="diff">${esc(f.rewrite.to)}</ins>`);
    }
    return html;
  };
  const before = groupSteps(new Set());
  const after = groupSteps(S.applied);
  return {
    wide: true,
    body: `
      <div class="page-h"><div><h1>Rewrite studio</h1><p>Suggestions are written on this device. The original stays untouched; applying an edit creates a new version you can undo.</p></div><span class="hstack"><span class="pack-src">v3 → ${S.applied.size ? 'v4' : 'v4 (empty)'}</span></span></div>
      <div class="diff-cols">
        <div><h3>${ic('file-text', 14)} Draft v3 · original</h3>${orig.map((t, i) => `<p><span class="para-anchor">¶${i + 1}</span><span>${S.applied.size ? markApplied(i, t, 'L') : markPara('D3', i, t)}</span></p>`).join('')}</div>
        <div><h3>${ic('file-pen', 14)} Draft v4 · proposed</h3>${S.applied.size ? rev.map((t, i) => `<p><span class="para-anchor">¶${i + 1}</span><span>${markApplied(i, t, 'R')}</span></p>`).join('') : `<p class="muted" style="display:block">Apply a suggested edit from the panel on the right to start version 4.</p>`}</div>
      </div>
      ${S.rescanned && applied.length ? `<div class="panel" style="margin-top:16px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center"><div><b>Reassessed on this device</b><p class="small muted" style="margin-top:4px">Fictional group: ${before.slice(-1)[0].count} → ${after.slice(-1)[0].count} of 100 records.</p></div><button type="button" class="btn btn-primary btn-sm" ${go('release')}>Continue to release review</button></div>` : ''}`,
    inspectorTitle: 'Suggested edits',
    inspectorHead: `<span class="small muted">${applied.length}/${cands.length} applied</span>`,
    inspector: `
      ${S.rescanned && applied.length ? `<div class="insp-card" style="margin-bottom:10px"><div class="hstack" style="justify-content:space-between;margin-bottom:8px"><b style="font-size:13.5px">Reassessment</b>${sourceBadge(S.scenario === 'unsupported' ? 'FIXTURE' : 'DEVICE')}</div><div class="reassess"><div><strong>${applied.length}</strong><span>Resolved</span></div><div><strong>${openFindings().length}</strong><span>Unchanged</span></div><div><strong>0</strong><span>New</span></div><div><strong>${counts().un}</strong><span>Not assessed</span></div></div></div>` : ''}
      ${cands.map((f) => { const on = S.applied.has(f.id); const r = f.rewrite; return `<div class="edit-d ${on ? 'applied' : ''}"><div class="top"><span class="hstack">${riskChip(f.band, { small: true })}<span class="small muted">${f.id} · ¶${r.para + 1}</span></span>${on ? `<span class="chip chip-ok chip-sm">${ic('check', 12)}<span>Applied</span></span>` : ''}</div><b style="font-size:13.5px">${f.action}</b><div class="diffbox"><del class="diff">${esc(r.from)}</del>${r.to ? ` <ins class="diff">${esc(r.to)}</ins>` : ''}</div><div class="keeps">${ic('circle-check', 14)}<span><b>Still true:</b> ${esc(f.keeps)}</span></div>${on ? `<button type="button" class="btn btn-quiet btn-sm" data-act="undo" data-id="${f.id}">${ic('undo-2', 14)} Undo</button>` : `<div class="insp-actions" style="margin-top:2px"><div class="two"><button type="button" class="btn btn-quiet btn-sm" data-act="toast" data-msg="Opens ¶${r.para + 1} for manual editing">Edit myself</button><button type="button" class="btn btn-primary btn-sm" data-act="apply" data-id="${f.id}">Apply</button></div></div>`}</div>`; }).join('')}
      <div class="insp-actions"><button type="button" class="btn btn-primary" data-act="rescan" ${applied.length ? '' : 'disabled'}>${ic('scan-search', 15)} Review v4 again</button></div>`,
  };
};

SCREENS.release = () => {
  const before = groupSteps(new Set());
  const after = groupSteps(S.applied);
  const fsBefore = FINDINGS.filter((f) => bandOf(f) === 'HIGH').length;
  const c = counts();
  const stale = S.applied.size && !S.rescanned;
  const blocked = c.un > 0;
  const residual = openFindings().filter((f) => !f.unassessed);
  const items = ['I’ve read every remaining finding.', 'The remaining details are needed for the analysis.', 'I understand this review is advisory and doesn’t certify anonymity.'];
  return {
    body: `
      <div class="page-h"><div><h1>Release review</h1><p>P-07 transcript · draft ${draftVersion()} compared with the version you started from.</p></div></div>
      ${S.approved ? `<div class="banner" style="background:var(--ok-bg);color:var(--ok-fg);margin-bottom:16px">${ic('circle-check', 18)}<div class="banner-body"><strong>Approved in this browser</strong>Draft ${draftVersion()} is in release history. Future drafts are checked against it.</div></div>` : ''}
      ${stale ? `<div class="banner banner-info" style="margin-bottom:16px">${ic('scan-search', 18)}<div class="banner-body"><strong>Review v4 before approving</strong>Edits invalidate the last scan. Nothing is marked resolved until it runs again. <button type="button" class="btn btn-sm btn-primary" data-act="rescan" style="margin-left:8px">Review again</button></div></div>` : ''}
      <div class="compare-d">
        <div class="col"><h3>Draft v3</h3><div><div class="big" style="color:var(--risk-high-fg)">${fsBefore}</div><div class="lbl">High-priority findings</div></div><div><div class="big">${before.slice(-1)[0].count}</div><div class="lbl">Fictional group size (of 100)</div></div></div>
        <span class="arrow">${ic('arrow-right', 22)}</span>
        <div class="col"><h3>Draft ${draftVersion()}</h3><div><div class="big" style="color:${c.high && !stale ? 'var(--risk-high-fg)' : 'var(--ink)'}">${stale ? '—' : c.high}</div><div class="lbl">High-priority findings</div></div><div><div class="big">${stale ? '—' : after.slice(-1)[0].count}</div><div class="lbl">Fictional group size (of 100)</div></div></div>
      </div>
      <div class="h2">Coverage</div>
      <div class="panel">${covBars()}${blocked ? `<p class="small" style="color:var(--unassessed-fg);margin-top:10px">${ic('circle-dashed', 13)} ¶6–8 not assessed. Approval waits until they are, or until you review them by hand.</p>` : ''}</div>
      <div class="h2">Remaining findings (${residual.length})</div>
      ${residual.length ? `<table class="tbl"><tbody>${residual.map((f) => `<tr class="clickable" data-act="select" data-id="${f.id}" data-then="findings"><td style="width:150px">${riskChip(f.band, { small: true })}</td><td class="t-title">${esc(f.title)}</td><td>${statusChip(f.status)}</td></tr>`).join('')}</tbody></table>` : `<div class="panel small muted">None open. Outside knowledge can still identify people, so keep human review in the loop.</div>`}`,
    inspectorTitle: 'Approval',
    inspector: `
      <div class="insp-card">
        <b style="font-size:14px">Before you approve</b>
        <div role="group" aria-label="Approval checklist" style="margin-top:6px">${items.map((t, i) => `<button type="button" class="check" role="checkbox" aria-checked="${S.checklist[i]}" data-act="check" data-v="${i}" ${S.approved ? 'disabled' : ''}><span class="box">${ic('check', 13)}</span><span>${t}</span></button>`).join('')}</div>
      </div>
      <div class="insp-actions">${S.approved ? `<button type="button" class="btn btn-tinted" ${go('export')}>${ic('file-output', 15)} Export clean draft</button><button type="button" class="btn btn-quiet" data-act="revoke">Revoke approval</button>` : `<button type="button" class="btn btn-primary" data-act="approve" ${S.checklist.every(Boolean) && !blocked && !stale ? '' : 'disabled'}>${ic('stamp', 15)} Approve release in this browser</button>`}</div>
      <p class="small muted" style="margin:12px 4px 0">Approval is a local record for your team. It isn’t a legal or compliance sign-off, and it never publishes anything.</p>`,
  };
};

SCREENS.history = () => {
  const items = [
    S.approved ? { id: 'current', t: 'P-07 transcript · v4', d: 'Approved today', cls: 'approved', st: `<span class="chip chip-ok chip-sm">${ic('circle-check', 13)}<span>Approved</span></span>` } : { id: 'current', t: `P-07 transcript · ${draftVersion()}`, d: 'Draft · under review', cls: 'current', st: statusChip('UNDER_REVIEW') },
    { id: 'R2', t: 'Onboarding case study · v1', d: 'Approved 3 Jun 2026', cls: 'approved', st: `<span class="small muted">Imported release</span>` },
    { id: 'R1', t: 'Interim findings report · v2', d: 'Approved 12 Mar 2026', cls: 'approved', st: `<span class="small muted">Imported release</span>` },
  ];
  const sel = D.historySel;
  const insp = sel === 'current'
    ? `<div class="insp-card"><b>${items[0].t}</b><p class="small muted" style="margin-top:4px">${items[0].d}</p><dl class="kv" style="margin-top:12px"><dt>Edits applied</dt><dd>${S.applied.size}</dd><dt>Open findings</dt><dd>${openFindings().length}</dd><dt>Coverage</dt><dd>${coverage().ctx}/8 ¶ context</dd><dt>Packs</dt><dd>Core v1.3, QR 2026.11.18-a</dd></dl></div><div class="insp-actions">${S.approved ? `<button type="button" class="btn btn-quiet" data-act="revoke">Revoke approval marker</button>` : `<button type="button" class="btn btn-tinted" ${go('release')}>Open release review</button>`}</div>`
    : `<div class="insp-card"><b>${DOCS[sel].title}</b><p class="small muted" style="margin-top:4px">${DOCS[sel].meta}</p><p class="small" style="margin-top:10px;color:var(--ink-2)">Imported as already published. Mosaic uses it as context for later drafts but has no review record for it.</p></div><div class="insp-actions"><button type="button" class="btn btn-tinted" data-act="goto" data-doc="${sel}" data-para="0">View document</button><button type="button" class="btn btn-quiet" data-act="toast" data-msg="Shows a diff against the current draft">Compare with current draft</button></div>`;
  return {
    body: `
      <div class="page-h"><div><h1>Release history</h1><p>Approved snapshots in this browser. Every new draft is compared against them.</p></div></div>
      <div class="timeline">${items.map((x) => `<button type="button" class="tl-item ${x.cls} ${sel === x.id ? 'sel' : ''}" data-act="hist-sel" data-v="${x.id}"><b>${x.t}</b>${x.st}<span class="small muted">${x.d}</span></button>`).join('')}</div>`,
    inspectorTitle: 'Snapshot',
    inspector: insp,
  };
};

SCREENS.export = () => {
  const fmts = D.exportKind === 'clean' ? ['TXT', 'Markdown', 'PDF', 'DOCX'] : ['Markdown', 'PDF'];
  if (!fmts.includes(D.exportFmt)) D.exportFmt = fmts[0];
  const paras = draftParas();
  return {
    body: `
      <div class="page-h"><div><h1>Reports & export</h1><p>Exports are new files built from clean text. Nothing hidden from the original comes along.</p></div></div>
      <div class="panel line" style="padding:28px 34px;font-size:14.5px;line-height:1.65;max-width:68ch">
        ${D.exportKind === 'clean' ? `<p class="small muted" style="margin-bottom:14px">Interview P-07 transcript · edited for publication</p>${paras.map((t) => `<p style="margin-bottom:12px">${esc(t)}</p>`).join('')}` : `<h3 style="font-size:18px;margin-bottom:6px">Review report · P-07 transcript ${draftVersion()}</h3><p class="small muted" style="margin-bottom:14px">${WORKSPACE.title} · generated in this browser</p><p style="margin-bottom:8px"><b>Coverage.</b> Context ${coverage().ctx}/8 paragraphs on device; rules 8/8.</p><p style="margin-bottom:8px"><b>Findings.</b> ${findings().length} raised, ${S.rescanned ? S.applied.size : 0} resolved by edits, ${openFindings().length} open or residual.</p><p style="margin-bottom:8px"><b>Releases compared.</b> Interim findings report v2; Onboarding case study v1.</p><p class="small muted">Advisory review. Not a certification of anonymity.</p>`}
      </div>`,
    inspectorTitle: 'Export',
    inspector: `
      <div class="insp-card">
        <button type="button" class="radio-d" role="radio" aria-checked="${D.exportKind === 'clean'}" data-act="export-kind" data-v="clean"><span class="dot"></span><div><b>Clean draft</b><span>The reviewed text only</span></div></button>
        <button type="button" class="radio-d" role="radio" aria-checked="${D.exportKind === 'report'}" data-act="export-kind" data-v="report"><span class="dot"></span><div><b>Review report</b><span>Findings, decisions and coverage, kept separate from the draft</span></div></button>
      </div>
      <div class="insp-label">Format</div>
      <div class="seg" style="display:flex">${fmts.map((f) => `<button type="button" style="flex:1" aria-pressed="${f === D.exportFmt}" data-act="export-fmt" data-v="${f}">${f}</button>`).join('')}</div>
      <div class="insp-label">Left out</div>
      <div class="insp-card small" style="color:var(--ink-2)">Original passages, comments, revision history, tracked changes and source-file metadata.</div>
      <div class="banner banner-warn" style="margin-top:12px">${ic('triangle-alert', 16)}<div class="banner-body">The export can still contain sensitive details. The review is advisory and doesn’t certify anonymity.</div></div>
      <div class="insp-actions"><button type="button" class="btn btn-primary" data-act="toast" data-msg="Preview only: no file was created">${ic('download', 15)} Export ${D.exportFmt}</button></div>`,
  };
};

SCREENS.journal = () => {
  const j = journal();
  const e = j[Math.min(D.journalSel, j.length - 1)];
  const n = (s) => j.filter((x) => x.src === s).length;
  return {
    wide: true,
    body: `
      <div class="page-h"><div><h1>Inference journal</h1><p>Where each task actually ran, from the SDK’s own metadata, next to the policy that was requested.</p></div></div>
      <div class="hstack" style="margin-bottom:14px">${sourceBadge('DEVICE')}<span class="small muted tnum">${n('DEVICE')}</span>${sourceBadge('CLOUD')}<span class="small muted tnum">${n('CLOUD')}</span>${sourceBadge('RULES')}<span class="small muted tnum">${n('RULES')}</span>${n('UNAVAILABLE') ? `${sourceBadge('UNAVAILABLE')}<span class="small muted tnum">${n('UNAVAILABLE')}</span>` : ''}</div>
      <table class="tbl"><thead><tr><th>Time</th><th>Task</th><th>Scope</th><th>Requested</th><th>Actual source</th><th class="num">Duration</th><th>Outcome</th></tr></thead><tbody>
        ${j.map((x, i) => `<tr class="clickable ${i === D.journalSel ? 'sel' : ''}" data-act="j-sel" data-v="${i}"><td class="mono">${x.t}</td><td class="t-title">${x.task}</td><td class="small">${esc(x.scope)}</td><td>${x.policy === 'NO_MODEL' ? '<span class="small muted">No model</span>' : policyTag(x.policy)}</td><td>${sourceBadge(x.src)}</td><td class="num mono">${fmtMs(x.ms)}</td><td class="small">${x.outcome === 'ok' ? 'Completed' : `<span style="color:var(--unassessed-fg)">${x.outcome}</span>`}</td></tr>`).join('')}
      </tbody></table>
      <p class="small muted" style="margin-top:14px">Sample entries for the design preview. The real journal never stores prompts, replies, file names or excerpts.</p>`,
    inspectorTitle: 'Event',
    inspector: `
      <div class="insp-card"><div class="hstack" style="justify-content:space-between"><b style="font-size:15px">${e.task}</b>${sourceBadge(e.src)}</div>
        <dl class="kv" style="margin-top:12px"><dt>Requested policy</dt><dd><code>${e.policy}</code></dd><dt>Actual source</dt><dd>${SOURCE[e.src].label}${e.src === 'DEVICE' || e.src === 'CLOUD' ? ' (SDK metadata)' : ''}</dd><dt>Scope</dt><dd>${esc(e.scope)}</dd><dt>Duration</dt><dd class="tnum">${fmtMs(e.ms)}</dd><dt>Operation</dt><dd class="mono">op_${(7919 * (D.journalSel + 3)).toString(16)}</dd></dl></div>
      ${e.note ? `<div class="banner banner-neutral" style="margin-top:10px">${ic('info', 16)}<div class="banner-body">${esc(e.note)}</div></div>` : ''}
      ${e.cloud ? `<div class="insp-label">Exactly what was sent</div><div class="payload">${esc(JSON.stringify(PACK_REQUEST, null, 2))}</div><dl class="kv" style="margin-top:10px"><dt>Digest</dt><dd class="mono">sha256:9f3c…7a1e</dd><dt>App Check</dt><dd>Passed</dd></dl>` : `<p class="small muted" style="margin:12px 4px 0">Prompts and replies for private tasks are never stored.</p>`}`,
  };
};

SCREENS.benchmark = () => {
  const steps = groupSteps(S.applied);
  const st = Math.min(D.mapStage, steps.length - 1);
  return {
    wide: true,
    body: `
      <div class="page-h"><div><h1>Benchmark lab</h1><p>Synthetic, seeded test sets with fictional people only. Results are shown exactly as the runner produces them.</p></div></div>
      <div class="grid-2" style="grid-template-columns:320px 1fr;align-items:start">
        <div class="panel"><div class="hstack" style="justify-content:space-between;margin-bottom:12px"><b>Fictional population</b><span class="illustrative">${ic('flask-conical', 12)} Fixture</span></div>${mosaicGrid(steps, st)}<div class="steps" style="margin-top:12px">${steps.map((s, k) => `<button type="button" class="step" aria-pressed="${k === st}" data-act="map-stage" data-v="${k}"><span class="st-l">${k === 0 ? 'Start' : esc(s.label)}</span><span class="st-n">${s.count}</span></button>`).join('')}</div></div>
        <div class="panel line">
          <div class="banner banner-neutral" style="margin-bottom:14px">${ic('hourglass', 18)}<div class="banner-body"><strong>Not run yet</strong>Results appear after the runner finishes the held-out set. Nothing here is estimated.</div></div>
          <table class="bench-table"><thead><tr><th>Configuration</th><th>Precision</th><th>Recall</th><th>F1</th><th>False positives (clean)</th><th>Median latency</th></tr></thead><tbody>
            <tr><td>Rules baseline</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
            <tr><td>Rules + local single-document review</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
            <tr><td>Full Mosaic, cross-release + packs</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
          </tbody></table>
          <dl class="kv" style="margin-top:14px;max-width:420px"><dt>Dataset</dt><dd>Synthetic set v0 · seed 20261119</dd><dt>Held-out cases</dt><dd>0 of 48 run</dd><dt>Matching rule</dt><dd>Span overlap, category exact</dd></dl>
          <div class="hstack" style="margin-top:14px"><button type="button" class="btn btn-primary btn-sm" data-act="toast" data-msg="Preview only: the runner is not part of this page" ${S.scenario === 'unsupported' ? 'disabled' : ''}>${ic('play', 14)} Run in this browser</button><span class="small muted">Needs the on-device model</span></div>
        </div>
      </div>`,
  };
};

SCREENS.settings = () => ({
  body: `
    <div class="page-h"><div><h1>Settings</h1></div></div>
    <div class="grid-2" style="align-items:start">
      <div>
        <div class="h2" style="margin-top:0">Appearance</div>
        <div class="set-group">
          <div class="set-row"><span class="sr-main">Theme</span><div class="seg"><button type="button" aria-pressed="${S.appearance === 'light'}" data-act="theme" data-v="light">Light</button><button type="button" aria-pressed="${S.appearance === 'dark'}" data-act="theme" data-v="dark">Dark</button></div></div>
          <label class="set-row"><span class="sr-main">Reduce transparency<span>Solid bars and panels, same layout</span></span><span class="switch sm"><input type="checkbox" data-act="pref-reduced" ${S.reduced ? 'checked' : ''}><span></span></span></label>
          <label class="set-row"><span class="sr-main">Glass effects<span>Refraction on bars and controls</span></span><span class="switch sm"><input type="checkbox" data-act="pref-refraction" ${S.refraction ? 'checked' : ''}><span></span></span></label>
        </div>
        <div class="h2">Model</div>
        <div class="set-group">
          <button type="button" class="set-row" ${go('setup')}><span class="sr-main">On-device model</span><span class="end">${MODEL_STATES[modelState()].label} ${ic('chevron-right', 15)}</span></button>
          <button type="button" class="set-row" ${go('tests')}><span class="sr-main">Test packs<span>Bundled and cached packs</span></span><span class="end">${PACKS.length} ${ic('chevron-right', 15)}</span></button>
        </div>
      </div>
      <div>
        <div class="h2" style="margin-top:0">Privacy</div>
        <div class="set-group">
          <label class="set-row"><span class="sr-main">Session-only mode<span>Delete workspaces when closed</span></span><span class="switch sm"><input type="checkbox" data-act="session-only" ${D.sessionOnly ? 'checked' : ''}><span></span></span></label>
          <button type="button" class="set-row" data-act="toast" data-msg="Approvals expire after 5 minutes and can be revoked here"><span class="sr-main">Cloud request approvals</span><span class="end">${S.consent === 'sent' ? '1 used' : 'None active'} ${ic('chevron-right', 15)}</span></button>
          <button type="button" class="set-row" data-act="toast" data-msg="Warns that a raw bundle contains private text"><span class="sr-main">Export workspace bundle<span>Contains private text. Handle with care.</span></span><span class="end">${ic('chevron-right', 15)}</span></button>
          <button type="button" class="set-row danger" data-modal="delete" data-id="all"><span class="sr-main">Delete all local data</span></button>
        </div>
        <p class="small muted" style="margin:8px 4px 0">Deleting removes Mosaic’s copies in this browser. It can’t reach files you exported, and it isn’t forensic erasure.</p>
        <div class="h2">About</div>
        <div class="set-group">
          <button type="button" class="set-row" data-act="toast" data-msg="Links to the privacy model"><span class="sr-main">How Mosaic handles your data</span><span class="end">${ic('chevron-right', 15)}</span></button>
          <button type="button" class="set-row" data-act="toast" data-msg="Apache-2.0 and third-party notices"><span class="sr-main">Licences</span><span class="end">${ic('chevron-right', 15)}</span></button>
          <div class="set-row"><span class="sr-main">Version</span><span class="end">Design preview</span></div>
        </div>
      </div>
    </div>`,
});

/* ---------- modals ---------- */
function openModal(kind, id) {
  closeModal(true);
  let html = '';
  if (kind === 'consent') {
    const body = { ...PACK_REQUEST, domain: D.genDomain, categories: [...D.genCats] };
    html = `<div class="hstack" style="margin-bottom:10px"><span class="pack-src pack-cloud">${ic('cloud', 12)} Generic request</span>${policyTag('ONLY_IN_CLOUD')}</div>
      <h2>Send this request to the cloud?</h2>
      <p style="color:var(--ink-2);font-size:14px">Gemini, through Firebase AI Logic, will write new generic test definitions with fictional examples. This is the complete request:</p>
      <div class="payload" style="margin-top:12px">${esc(JSON.stringify(body, null, 2))}</div>
      <div class="msurf small" style="color:var(--ink-2)"><b style="color:var(--ink)">Not included:</b> document text, excerpts, file names, workspace names, findings and anything derived from them.</div>
      <div class="msurf"><dl class="kv"><dt>Payload digest</dt><dd class="mono">sha256:9f3c…7a1e</dd><dt>Valid for</dt><dd>5 minutes, this exact request</dd><dt>App Check</dt><dd>Required</dd></dl></div>
      <div class="m-actions"><button type="button" class="btn btn-quiet" data-mclose>Cancel</button><button type="button" class="btn btn-primary" data-act="consent-send">${ic('send', 15)} Send this request</button></div>`;
  } else if (kind === 'delete') {
    const all = id === 'all';
    const w = PRIVATE_WORKSPACES.find((x) => x.id === id);
    html = `<h2>${all ? 'Delete all local data?' : `Delete “${esc(w.title)}”?`}</h2>
      <p style="color:var(--ink-2);font-size:14px">${all ? 'This removes every workspace, document, finding, release record and cached pack Mosaic stored in this browser.' : `This removes the workspace and its ${w.docs} documents from this browser.`}</p>
      <div class="msurf small" style="color:var(--ink-2)">It can’t undo exports or copies made elsewhere, and it isn’t forensic erasure.</div>
      <div class="m-actions"><button type="button" class="btn btn-quiet" data-mclose>Cancel</button><button type="button" class="btn btn-danger" data-mclose data-act="toast" data-msg="Preview only: nothing was deleted">${ic('trash-2', 15)} Delete</button></div>`;
  }
  modalsEl.innerHTML = `<div class="modal-scrim" data-mclose></div><div class="modal glass glass-strong" role="dialog" aria-modal="true">${html}</div>`;
  requestAnimationFrame(() => { $('.modal-scrim', modalsEl).classList.add('in'); $('.modal', modalsEl).classList.add('in'); });
}
function closeModal(instant) {
  const m = $('.modal', modalsEl), s = $('.modal-scrim', modalsEl);
  if (!m) return;
  if (instant) { modalsEl.innerHTML = ''; return; }
  m.classList.remove('in'); s.classList.remove('in');
  setTimeout(() => { modalsEl.innerHTML = ''; }, 300);
}

/* ---------- actions ---------- */
function navTo(screen) { D.screen = screen; if (screen !== 'overview') D.blank = false; D.dismissing = null; render(); if (screen === 'landing') playLanding(); }

function act(name, el) {
  const id = el.dataset.id, v = el.dataset.v;
  switch (name) {
    case 'start-sample': D.blank = false; navTo('overview'); break;
    case 'create-ws': D.screen = 'overview'; D.blank = true; render(); break;
    case 'replay': playLanding(); break;
    case 'model-state': setState({ modelPreview: v }); break;
    case 'storage': D.storageMode = v; render(); break;
    case 'rescan': setState({ rescanned: true }); toast(S.applied.size ? 'Reviewed again on this device (preview)' : 'Review ran on this device (preview)', 'scan-search'); break;
    case 'run-chunk': setState({ scenario: 'normal' }); toast('¶6–8 ran again on this device (preview)', 'rotate-cw'); break;
    case 'select': S.selected = id; D.dismissing = null; if (el.dataset.then) { D.screen = el.dataset.then; } render(); break;
    case 'goto': { D.doc = el.dataset.doc; D.gotoPara = Number(el.dataset.para); const f = findings().find((x) => x.anchors.some((a) => a.doc === D.doc && a.para === D.gotoPara && a.quote)); if (f) S.selected = f.id; D.screen = 'document'; render(); break; }
    case 'doc': D.doc = v; render(); break;
    case 'apply': { const a = new Set(S.applied); a.add(id); setState({ applied: a, rescanned: false, approved: false }); toast(`Applied ${id} · draft v4 created`, 'pen-line'); break; }
    case 'undo': { const a = new Set(S.applied); a.delete(id); setState({ applied: a, rescanned: false, approved: false }); toast(`Undid ${id}`, 'undo-2'); break; }
    case 'dismiss-start': D.dismissing = id; render(); setTimeout(() => $('#dismiss-note')?.focus(), 30); break;
    case 'dismiss-cancel': D.dismissing = null; render(); break;
    case 'dismiss': D.dismissing = null; setState({ statusOverride: { ...S.statusOverride, [id]: 'DISMISSED' } }); toast(`${id} dismissed`, 'circle-slash'); break;
    case 'residual': setState({ statusOverride: { ...S.statusOverride, [id]: 'ACCEPTED_RESIDUAL' } }); toast(`${id} accepted as residual`, 'circle-check-big'); break;
    case 'reopen': { const o = { ...S.statusOverride }; delete o[id]; const a = new Set(S.applied); a.delete(id); setState({ statusOverride: o, applied: a }); toast(`${id} reopened`, 'undo-2'); break; }
    case 'filter': D.filter = v; render(); break;
    case 'map-mode': D.mapMode = v; render(); break;
    case 'map-stage': D.mapStage = Number(v); render(); break;
    case 'map-sel': D.mapSel = { type: el.dataset.type, id }; render(); break;
    case 'check': { const c = [...S.checklist]; c[Number(v)] = !c[Number(v)]; setState({ checklist: c }); break; }
    case 'approve': setState({ approved: true }); toast('Approved in this browser', 'stamp'); break;
    case 'revoke': setState({ approved: false, checklist: [false, false, false] }); toast('Approval revoked', 'undo-2'); break;
    case 'pack-expand': D.expandedPack = D.expandedPack === v ? null : v; render(); break;
    case 'pack-toggle': setState({ packsEnabled: { ...S.packsEnabled, [v]: el.checked } }); break;
    case 'gen-domain': D.genDomain = v; render(); break;
    case 'gen-cat': D.genCats.has(v) ? D.genCats.delete(v) : D.genCats.add(v); render(); break;
    case 'consent-send': closeModal(); setState({ consent: 'sent' }); toast('Design preview: no request was sent', 'cloud'); break;
    case 'export-kind': D.exportKind = v; render(); break;
    case 'export-fmt': D.exportFmt = v; render(); break;
    case 'j-sel': D.journalSel = Number(v); render(); break;
    case 'hist-sel': D.historySel = v; render(); break;
    case 'theme': setState({ appearance: v }); break;
    case 'pref-reduced': setState({ reduced: el.checked }); break;
    case 'pref-refraction': setState({ refraction: el.checked }); break;
    case 'session-only': D.sessionOnly = el.checked; break;
    case 'toast': toast(el.dataset.msg || 'Preview only', 'info'); break;
    default: break;
  }
}

$('#win').addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-mclose]')) { closeModal(); }
  const modal = t.closest('[data-modal]');
  const actEl = t.closest('[data-act]');
  const goEl = t.closest('[data-go]');
  const mark = t.closest('mark.ev[data-f]');
  if (actEl && actEl.tagName === 'INPUT') return;
  if (t.closest('a[href="#"]')) e.preventDefault();
  if (modal && !modal.disabled) return openModal(modal.dataset.modal, modal.dataset.id);
  if (mark && !t.closest('.ev-card')) { S.selected = mark.dataset.f; D.dismissing = null; render(); return; }
  if (actEl) return act(actEl.dataset.act, actEl);
  if (goEl) {
    if (goEl.dataset.filter) D.filter = goEl.dataset.filter;
    if (goEl.dataset.doc) D.doc = goEl.dataset.doc;
    navTo(goEl.dataset.go);
  }
});
$('#win').addEventListener('change', (e) => { const a = e.target.closest('[data-act]'); if (a && a.tagName === 'INPUT') act(a.dataset.act, a); });
$('#win').addEventListener('dragover', (e) => { if (D.screen === 'import') { e.preventDefault(); if (!D.dragOver) { D.dragOver = true; $('#drop')?.classList.add('over'); } } });
$('#win').addEventListener('dragleave', () => { D.dragOver = false; $('#drop')?.classList.remove('over'); });
$('#win').addEventListener('drop', (e) => { if (D.screen === 'import') { e.preventDefault(); D.dragOver = false; $('#drop')?.classList.remove('over'); toast('Preview: files are not read on this page', 'info'); } });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.target.matches('input, textarea, select')) return;
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('mark.ev[data-f], g[role="button"], path[role="button"], tr[data-act]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
  if (D.screen === 'document' && (e.key === 'j' || e.key === 'k')) {
    const fl = findings().filter((f) => f.anchors.some((a) => a.doc === D.doc && a.quote));
    if (!fl.length) return;
    let i = fl.findIndex((f) => f.id === S.selected);
    i = (i + (e.key === 'j' ? 1 : fl.length - 1)) % fl.length;
    S.selected = fl[i].id;
    render();
    const mk = $(`mark[data-f="${S.selected}"]`);
    if (mk) { mk.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); mk.classList.add('flash'); }
  }
});

/* ---------- landing animation ---------- */
let landingTimer = null;
const CAPS = ['A fictional population of 100 people.', 'The March report narrows it to one team.', 'The June case study narrows it again.', 'The new draft leaves one person.'];
function playLanding() {
  clearInterval(landingTimer);
  const steps = groupSteps(new Set());
  const paint = () => {
    const grid = $('.l-reveal .mosaic'); if (!grid) return false;
    grid.outerHTML = mosaicGrid(steps, D.landingStage);
    $('#l-count').innerHTML = `${steps[D.landingStage].count}<small> of 100</small>`;
    $('#l-cap').textContent = CAPS[D.landingStage];
    $$('.l-doc').forEach((d, i) => d.classList.toggle('lit', i < D.landingStage));
    return true;
  };
  if (reduceMotion()) { D.landingStage = 3; paint(); return; }
  D.landingStage = 0; paint();
  landingTimer = setInterval(() => {
    if (D.screen !== 'landing') return clearInterval(landingTimer);
    D.landingStage++;
    paint();
    if (D.landingStage >= 3) clearInterval(landingTimer);
  }, 1300);
}

/* ---------- backdrop tesserae (gives the glass something to bend) ---------- */
function paintBackdrop() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const W = 1800, H = 1200, cell = 120;
  let out = '';
  for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) {
    if (rnd() < 0.45) continue;
    const s = cell * (0.55 + rnd() * 0.4);
    const ox = x + rnd() * (cell - s), oy = y + rnd() * (cell - s);
    out += `<rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="${(s * 0.18).toFixed(1)}" class="t${1 + Math.floor(rnd() * 3)}" transform="rotate(${((rnd() - 0.5) * 8).toFixed(1)} ${(ox + s / 2).toFixed(1)} ${(oy + s / 2).toFixed(1)})"/>`;
  }
  const svg = $('#backdrop');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.innerHTML = out;
}

/* ---------- fit the window to the viewport ---------- */
const MIN_W = 1180;
function fit() {
  const vp = $('#viewport'), win = $('#win');
  const w = vp.clientWidth, h = vp.clientHeight;
  if (w >= MIN_W) { win.style.width = w + 'px'; win.style.height = h + 'px'; win.style.transform = ''; }
  else { const s = w / MIN_W; win.style.width = MIN_W + 'px'; win.style.height = h / s + 'px'; win.style.transform = `scale(${s})`; }
  Refraction.refresh();
}
window.addEventListener('resize', fit);

/* ---------- boot ---------- */
function renderPreview() { $('#pv').innerHTML = previewControls(D.screen); }
onState(() => { renderPreview(); render(); });
bindPreviewControls($('#pv'), (screen) => { closeModal(true); if (screen === 'overview') D.blank = false; navTo(screen); });
applyAppearance();
renderPreview();
paintBackdrop();
fit();
render();
playLanding();
