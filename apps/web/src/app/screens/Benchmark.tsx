import { useMemo, useState } from 'react';
import { Download, FlaskConical, Hourglass, Play } from 'lucide-react';
import { generateDataset, DATASET_VERSION, DATASET_SEED, type Metrics } from '@mosaic/benchmark';
import { disclosureOfDraft, groupSteps, SAMPLE_DOCS } from '@mosaic/fixtures';
import { Shell } from '../Shell';
import { useApp } from '../store';
import { useLive } from '../live';
import { db } from '../../storage/db';
import { Banner, MosaicGrid } from '../../ui/components';
import { runModelConfigs, runRulesConfig, type ModelRun } from '../../features/benchmark/run';
import { getGateway, ensureModelPort } from '../services';
import { download } from '../../features/export/export';

const pct = (v: number | null | undefined) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

export function Benchmark() {
  const app = useApp();
  const data = useMemo(() => generateDataset(), []);
  const rules = useMemo(() => runRulesConfig(), []);
  const last = useLive(async () => (await db().settings.get('benchmark-last'))?.value as { generatedAt: string; configurations: Record<string, { status: string; metrics?: { findings: Metrics; crossReleaseSets: Metrics; cleanFalsePositiveRate: number | null } }> } | undefined, []);
  const [prog, setProg] = useState<ModelRun | null>(null);
  const [ctrl, setCtrl] = useState<AbortController | null>(null);
  const steps = groupSteps(disclosureOfDraft(SAMPLE_DOCS.find((d) => d.key === 'D3')!.text));
  const [stage, setStage] = useState(steps.length - 1);
  const ready = app.readiness?.ok === true;
  const test = data.filter((c) => c.split === 'test');
  const kinds = [...new Set(data.map((c) => c.kind))];
  const row = (label: string, m?: { findings: Metrics; crossReleaseSets: Metrics; cleanFalsePositiveRate: number | null }, note?: string) => (
    <tr><td>{label}{note && <div className="small muted" style={{ fontFamily: 'var(--font-ui)', fontWeight: 400 }}>{note}</div>}</td><td>{pct(m?.findings.precision)}</td><td>{pct(m?.findings.recall)}</td><td>{pct(m?.findings.f1)}</td><td>{pct(m?.crossReleaseSets.recall)}</td><td>{pct(m?.cleanFalsePositiveRate)}</td></tr>
  );
  async function runModels() {
    const g = getGateway(); if (!g) return;
    const c = new AbortController(); setCtrl(c);
    try { await ensureModelPort(); await runModelConfigs(g, setProg, c.signal); app.toast('Benchmark finished'); } finally { setProg(null); setCtrl(null); }
  }
  const lp = last?.configurations;
  return (
    <Shell title="Benchmark lab" wide>
      <div className="page-h"><div><h1>Benchmark lab</h1><p>Seeded synthetic test sets with fictional people only. Results are shown exactly as the runner produces them; nothing is estimated.</p></div></div>
      <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
        <div className="panel"><div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 12 }}><b>Fictional population</b><span className="illustrative"><FlaskConical size={12} /> Fixture</span></div><MosaicGrid steps={steps} stage={stage} />
          <div className="steps" style={{ marginTop: 12 }}>{steps.map((s, k) => <button key={k} type="button" className="step" aria-pressed={k === stage} onClick={() => setStage(k)}><span className="st-l">{k === 0 ? 'Start' : s.label}</span><span className="st-n">{s.count}</span></button>)}</div>
          <p className="small muted" style={{ marginTop: 10 }}>Educational illustration computed from 100 seeded fictional records. Not a measure of real-world anonymity.</p></div>
        <div className="panel line">
          <table className="bench-table"><thead><tr><th>Configuration</th><th>Precision</th><th>Recall</th><th>F1</th><th>Cross-release sets</th><th>False positives (clean)</th></tr></thead><tbody>
            {row('Rules baseline', rules, 'Run in this browser just now')}
            {lp?.rulesPlusLocal?.metrics ? row('Rules + on-device single-document review', lp.rulesPlusLocal.metrics, `Run ${new Date(last!.generatedAt).toLocaleString()}`) : row('Rules + on-device single-document review', undefined, 'Not run: needs the on-device model')}
            {lp?.fullMosaic?.metrics ? row('Full Mosaic: cross-release review with packs', lp.fullMosaic.metrics, `Run ${new Date(last!.generatedAt).toLocaleString()}`) : row('Full Mosaic: cross-release review with packs', undefined, 'Not run: needs the on-device model')}
          </tbody></table>
          <dl className="kv" style={{ marginTop: 14, maxWidth: 520 }}><dt>Dataset</dt><dd>{DATASET_VERSION} · seed {DATASET_SEED}</dd><dt>Held-out cases scored</dt><dd>{test.length} (plus {data.length - test.length} dev cases not scored)</dd><dt>Case types</dt><dd>{kinds.join(', ')}</dd><dt>Matching rule</dt><dd>Same document, same category, overlapping span; cross-release per document set</dd></dl>
          {!ready && <div style={{ marginTop: 14 }}><Banner tone="neutral" icon={<Hourglass size={18} />} title="Model configurations need the on-device model">Open this page in desktop Google Chrome with the built-in model available to run them. They are not estimated here.</Banner></div>}
          {prog && <p className="small muted" style={{ marginTop: 12 }}>{prog.config === 'fullMosaic' ? 'Full Mosaic' : 'Single-document review'}: case {prog.done + 1} of {prog.total}</p>}
          <div className="hstack" style={{ marginTop: 14 }}>
            {ctrl ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => ctrl.abort()}>Cancel</button> : <button type="button" className="btn btn-primary btn-sm" disabled={!ready} onClick={runModels}><Play size={14} /> Run model configurations</button>}
            {last && <button type="button" className="btn btn-quiet btn-sm" onClick={() => download('mosaic-benchmark-results.json', JSON.stringify(last, null, 2), 'application/json')}><Download size={14} /> Download results</button>}
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>Model runs use the same guarded review as the product, in temporary workspaces that are deleted afterwards.</p>
        </div>
      </div>
    </Shell>
  );
}
