import type { Confidence, FindingCategory, ProposedAction, ScoreComponents } from '@mosaic/schemas';

/**
 * "Night Shift Study": a wholly fictional research workspace (spec 15.1).
 * Larkspur Health Network does not exist. Contact details use example.org.
 */
export const SAMPLE_WORKSPACE = {
  id: 'ws-sample-night-shift',
  title: 'Night Shift Study',
  org: 'Larkspur Health Network (fictional)',
  description: 'Interviews with overnight care staff. Two reports are already published; transcript P-07 is the next release.',
} as const;

export type SampleDoc = { key: 'R1' | 'R2' | 'D3'; title: string; short: string; role: 'release' | 'draft'; approvedAt?: string; versionLabel: string; text: string };

export const SAMPLE_DOCS: readonly SampleDoc[] = [
  {
    key: 'R1', title: 'Interim findings report', short: 'Interim report', role: 'release', approvedAt: '2026-03-12T09:00:00Z', versionLabel: 'v2',
    text: [
      'This interim report summarises themes from twelve interviews conducted between October and December 2025.',
      'Participants were drawn from ward-based nursing staff and from the overnight pharmacy team, which supports all three inpatient sites.',
      'Across roles, participants described handover as the most stressful point of a night shift.',
    ].join('\n\n'),
  },
  {
    key: 'R2', title: 'Onboarding experience case study', short: 'Case study', role: 'release', approvedAt: '2026-06-03T09:00:00Z', versionLabel: 'v1',
    text: [
      'This case study follows how new starters experienced their first three months on nights.',
      'One participant described joining with the winter onboarding cohort, which started in the weeks after the January rota change.',
      'Peer shadowing was described as more useful than formal induction sessions.',
    ].join('\n\n'),
  },
  {
    key: 'D3', title: 'Interview P-07 transcript', short: 'P-07 transcript', role: 'draft', versionLabel: 'v3',
    text: [
      'Interviewer: Thanks for making time after your shift. Could you start with how you came to the role?',
      'P-07: Sure. I came over after my transfer from the coastal satellite clinic, so I already knew the dispensing system. Most people on nights had never used it.',
      'P-07: For the first few months I was the only one on nights who could run the compounding hood, which meant I got called for everything.',
      'Interviewer: What changed when the new rota started?',
      'P-07: The week the new rota started, on 14 January, two of us were moved to permanent nights. Breaks got shorter and handovers got messy.',
      'P-07: We’d eat in the level 3 break room because it was the only place with a signal.',
      'P-07: Honestly, I thought about leaving. My manager knew I was struggling, and I’d told occupational health about the anxiety.',
      'Follow-up contact: p07.followup@example.org',
    ].join('\n\n'),
  },
];

/**
 * Authored sample results for the sample workspace, shown ONLY when no local
 * model is available, and always labelled "Sample result" (source FIXTURE).
 * They are hand-written for the fixture. They are not model output and are
 * never presented as analysis.
 */
export type AuthoredFinding = {
  key: string; category: FindingCategory; title: string; components: ScoreComponents; confidence: Confidence; confidenceReason: string;
  rationale: string; proposedAction: ProposedAction; anchors: { doc: SampleDoc['key']; quote: string }[];
  suggestion?: { from: string; to: string }; keeps: string;
};

export const AUTHORED_CONTEXT_FINDINGS: readonly AuthoredFinding[] = [
  {
    key: 'transfer', category: 'CROSS_RELEASE', title: 'Three details combine to describe one person',
    components: { direct: 0, specificity: 3, cross: 3, sensitivity: 2 }, confidence: 'MEDIUM',
    confidenceReason: 'The link rests on contextual overlap across three documents. Knowledge outside this workspace is not assessed.',
    rationale: 'Read alone, the transfer is background. Read with the pharmacy team in the interim report and the winter cohort in the case study, it describes a very small group.',
    proposedAction: 'GENERALIZE',
    anchors: [{ doc: 'D3', quote: 'after my transfer from the coastal satellite clinic' }, { doc: 'R1', quote: 'the overnight pharmacy team' }, { doc: 'R2', quote: 'the winter onboarding cohort' }],
    suggestion: { from: 'after my transfer from the coastal satellite clinic', to: 'after moving from another site in the network' }, keeps: 'P-07 already knew the dispensing system.',
  },
  {
    key: 'skill', category: 'RARE_ATTRIBUTE', title: 'A skill only one person on nights had',
    components: { direct: 0, specificity: 3, cross: 1, sensitivity: 1 }, confidence: 'HIGH',
    confidenceReason: 'The passage says outright that no one else on nights had this skill.',
    rationale: 'A unique skill is a strong pointer on its own, and the interim report already names the team it belongs to.',
    proposedAction: 'GENERALIZE',
    anchors: [{ doc: 'D3', quote: 'the only one on nights who could run the compounding hood' }, { doc: 'R1', quote: 'the overnight pharmacy team' }],
    suggestion: { from: 'the only one on nights who could run the compounding hood', to: 'one of the few people on nights trained on specialist equipment' }, keeps: 'P-07 carried an uneven share of call-outs.',
  },
  {
    key: 'date', category: 'PRECISE_DATE', title: 'An exact date ties the draft to the January cohort',
    components: { direct: 0, specificity: 2, cross: 1, sensitivity: 1 }, confidence: 'MEDIUM',
    confidenceReason: 'The date matches the rota change described in the case study.',
    rationale: 'The analysis needs the sequence of events, not the day. The date links this interview to the cohort in the case study.',
    proposedAction: 'REMOVE',
    anchors: [{ doc: 'D3', quote: 'on 14 January' }, { doc: 'R2', quote: 'the January rota change' }],
    suggestion: { from: 'The week the new rota started, on 14 January, two of us', to: 'When the new rota started, two of us' }, keeps: 'Two staff moved to permanent nights when the rota changed.',
  },
  {
    key: 'room', category: 'NARROW_LOCATION', title: 'A specific room is named',
    components: { direct: 0, specificity: 2, cross: 0, sensitivity: 0 }, confidence: 'LOW',
    confidenceReason: 'Break rooms like this exist on every site, so the pointer is weak. Flagged for completeness.',
    rationale: 'A floor number adds precision the analysis does not use.',
    proposedAction: 'GENERALIZE', anchors: [{ doc: 'D3', quote: 'the level 3 break room' }],
    suggestion: { from: 'the level 3 break room', to: 'a staff break room' }, keeps: 'Staff ate where there was phone signal.',
  },
  {
    key: 'health', category: 'SENSITIVE_CONTEXT', title: 'A health disclosure the finding does not need',
    components: { direct: 0, specificity: 1, cross: 0, sensitivity: 2 }, confidence: 'MEDIUM',
    confidenceReason: 'Health information is sensitive by category. Whether it is needed is your call.',
    rationale: 'The point about considering leaving stands without the health detail.',
    proposedAction: 'REMOVE', anchors: [{ doc: 'D3', quote: 'and I’d told occupational health about the anxiety' }],
    suggestion: { from: ', and I’d told occupational health about the anxiety', to: '' }, keeps: 'P-07 considered leaving and their manager knew they were struggling.',
  },
];
