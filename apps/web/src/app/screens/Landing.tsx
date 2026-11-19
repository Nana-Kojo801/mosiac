import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BadgeCheck, Cloud, Cpu, FileCheck, FilePen, FlaskConical, Lock, RotateCcw, Shuffle } from 'lucide-react';
import { ROUTING } from '@mosaic/schemas';
import { SAMPLE_DOCS, disclosureOfDraft, groupSteps } from '@mosaic/fixtures';
import { Logo, MosaicGrid, PolicyTag } from '../../ui/components';
import { seedSampleWorkspace, workspaces } from '../../storage/repositories';

const CAPS = ['A fictional population of 100 people.', 'The March report narrows it to one team.', 'The June case study narrows it again.', 'The new draft leaves one person.'];

export function Landing() {
  const nav = useNavigate();
  const steps = groupSteps(disclosureOfDraft(SAMPLE_DOCS.find((d) => d.key === 'D3')!.text));
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [stage, setStage] = useState(reduce ? steps.length - 1 : 0);
  const [play, setPlay] = useState(0);
  useEffect(() => {
    if (reduce) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => { if (s >= steps.length - 1) { clearInterval(t); return s; } return s + 1; }), 1300);
    return () => clearInterval(t);
  }, [play, reduce, steps.length]);
  const cols = [
    ['ONLY_ON_DEVICE', 'On this device', Cpu, 'Private documents and anything derived from them.'],
    ['ONLY_IN_CLOUD', 'In the cloud, after you approve', Cloud, 'Only fixed, generic inputs. You see the exact request.'],
    ['PREFER_ON_DEVICE', 'Either, for bundled samples', Shuffle, 'The SDK picks; the actual source is shown.'],
  ] as const;
  const lit = (k: number) => (stage >= k ? ' lit' : '');
  return (
    <div className="landing-d">
      <nav className="lnav glass" aria-label="Site">
        <span className="brand"><Logo /> Mosaic</span>
        <Link to="/device" className="lk">Device support</Link>
        <span className="spacer" />
        <Link to="/workspaces" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Open workspaces</Link>
      </nav>
      <section className="l-hero">
        <div>
          <h1>Protect the information you never realized you were revealing.</h1>
          <p className="sub">Each release can look anonymous on its own. Mosaic checks how your drafts and past releases read together, and it does the private part on your own device.</p>
          <div className="l-ctas">
            <button type="button" className="btn btn-primary" onClick={async () => { const w = await seedSampleWorkspace(); nav(`/w/${w.id}`); }}>Try the sample workspace</button>
            <button type="button" className="btn btn-tinted" onClick={async () => { const w = await workspaces.create('Untitled workspace'); nav(`/w/${w.id}/import`); }}>Create a private workspace</button>
          </div>
          <div className="l-trust">
            <div><Lock size={17} /><span>Drafts are analysed in your browser with the built-in model. They never go to a server.</span></div>
            <div><Cloud size={17} /><span>The cloud only writes generic test packs from fixed categories, after you approve the exact request.</span></div>
            <div><BadgeCheck size={17} /><span>Every result shows where it actually ran. No account needed.</span></div>
          </div>
        </div>
        <div className="l-reveal" aria-live="polite">
          <div className="l-docs">
            <div className={`l-doc${lit(1)}`}><b><FileCheck size={13} /> Interim report · published March 2026</b>Participants were drawn from ward-based nursing staff and from <mark className="ev">the overnight pharmacy team</mark>.</div>
            <div className={`l-doc${lit(2)}`}><b><FileCheck size={13} /> Case study · published June 2026</b>One participant described joining with <mark className="ev">the winter onboarding cohort</mark>, after the January rota change.</div>
            <div className={`l-doc${lit(3)}`}><b><FilePen size={13} /> Interview transcript · draft</b>I came over <mark className="ev ev-high">after my transfer from the coastal satellite clinic</mark>, so I already knew the system.</div>
            <span className="illustrative" style={{ marginTop: 4 }}><FlaskConical size={12} /> Educational illustration · fictional records</span>
          </div>
          <div>
            <MosaicGrid steps={steps} stage={stage} />
            <div className="l-count">{steps[stage].count}<small> of 100</small></div>
            <p className="l-cap">{CAPS[stage]}</p>
            <button type="button" className="btn btn-plain btn-sm" style={{ padding: 0 }} onClick={() => setPlay((p) => p + 1)}><RotateCcw size={14} /> Replay</button>
          </div>
        </div>
      </section>
      <section className="l-split">
        <h2>Cloud writes the tests. Your device reads the documents.</h2>
        <p>Mosaic uses Firebase AI Logic for both. Each task has a fixed routing policy, and a private task never falls back to the cloud, even when the local model fails.</p>
        <div className="route-grid">{cols.map(([pol, h, Icon, sub]) => (
          <div className="route-col glass" key={pol}><h3><Icon size={18} /> {h}</h3><span className="small muted">{sub}</span>
            {Object.values(ROUTING).filter((r) => r.policy === pol).map((r) => <div className="route-item" key={r.task}><b>{r.label}</b><span><PolicyTag policy={r.policy} /> · if unavailable: {r.onFailure.toLowerCase()}</span></div>)}
          </div>))}
        </div>
      </section>
    </div>
  );
}
