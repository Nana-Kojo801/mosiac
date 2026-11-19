import { TestPack, type TestPack as TestPackT } from '@mosaic/schemas';

/** Bundled, versioned generic test packs (spec 6.2). Declarative only; never executable. */
const core: TestPackT = {
  id: 'core', name: 'Core disclosure checks', version: '1.3.0', domain: 'QUALITATIVE_RESEARCH', source: 'bundled', createdAt: '2026-11-19T00:00:00Z', schemaVersion: 1,
  tests: [
    { id: 'DIRECT_IDENTIFIERS', category: 'DIRECT_IDENTIFIER', title: 'Direct identifiers', question: 'Does the text name, contact or uniquely number a person?', evidenceRequirement: 'A name, contact detail, handle or reference number', remediation: 'REMOVE', fictionalExample: 'You can reach Ama at ama.k@example.org.' },
    { id: 'PRECISE_DATES', category: 'PRECISE_DATE', title: 'Overly precise dates', question: 'Is a date more specific than the analysis needs?', evidenceRequirement: 'A day-level date tied to an event in someone’s life', remediation: 'GENERALIZE', fictionalExample: 'She started on 3 March, the day the new ward opened.' },
    { id: 'RARE_ATTRIBUTES', category: 'RARE_ATTRIBUTE', title: 'Rare descriptive attributes', question: 'Does a role, skill or trait apply to very few people in the group?', evidenceRequirement: 'A role, skill, or trait described as unique or nearly unique', remediation: 'GENERALIZE', fictionalExample: 'I was the only interpreter on the night team.' },
    { id: 'NARROW_LOCATION', category: 'NARROW_LOCATION', title: 'Narrow location', question: 'Does a place description point to a small area or site?', evidenceRequirement: 'A room, floor, street or small site', remediation: 'GENERALIZE', fictionalExample: 'We met in the second-floor office above the bakery.' },
    { id: 'DISTINCTIVE_EVENTS', category: 'DISTINCTIVE_EVENT', title: 'Distinctive events', question: 'Would people nearby recognise this event?', evidenceRequirement: 'A memorable incident, incident date or unusual occurrence', remediation: 'GENERALIZE', fictionalExample: 'It was the week the flood closed the east entrance.' },
    { id: 'CROSS_RELEASE', category: 'CROSS_RELEASE', title: 'Repeated context across releases', question: 'Does this detail repeat or combine with something in an earlier release?', evidenceRequirement: 'A detail that matches context in a published document', remediation: 'GENERALIZE', fictionalExample: 'Mentioned again: the team that covers all three sites.' },
    { id: 'EXCESSIVE_DETAIL', category: 'EXCESSIVE_DETAIL', title: 'Excessive detail', question: 'Is there more detail than the finding needs?', evidenceRequirement: 'Specifics that the analytical point does not use', remediation: 'REMOVE', fictionalExample: 'He drove the blue van with the dented door to every shift.' },
    { id: 'SENSITIVE_CONTEXT', category: 'SENSITIVE_CONTEXT', title: 'Sensitive context', question: 'Does the text reveal health, legal or other sensitive context?', evidenceRequirement: 'Health, legal, financial or similar personal circumstances', remediation: 'HUMAN_REVIEW', fictionalExample: 'I’d been on medication for my back since spring.' },
  ],
};

const editorial: TestPackT = {
  id: 'editorial', name: 'Editorial release checks', version: '1.0.0', domain: 'EDITORIAL', source: 'bundled', createdAt: '2026-11-19T00:00:00Z', schemaVersion: 1,
  tests: [
    { id: 'QUOTE_ATTRIBUTION', category: 'RARE_ATTRIBUTE', title: 'Quote attribution', question: 'Could a direct quote be attributed through its style or content?', evidenceRequirement: 'A quote with distinctive phrasing or insider detail', remediation: 'HUMAN_REVIEW', fictionalExample: '“As the only one who’d worked both sites, I saw it coming.”' },
    { id: 'CAPTION_DETAIL', category: 'EXCESSIVE_DETAIL', title: 'Captions and alt text', question: 'Do captions or alt text add detail missing from the body?', evidenceRequirement: 'A caption naming a place, time or role not in the article', remediation: 'REMOVE', fictionalExample: 'Caption: the night supervisor outside Ward 4, January.' },
    { id: 'TIMELINE_STACKING', category: 'PRECISE_DATE', title: 'Timeline stacking', question: 'Do several time references together pin down one person’s history?', evidenceRequirement: 'Two or more time markers about the same person', remediation: 'GENERALIZE', fictionalExample: 'Joined in 2019, moved to nights in spring, left in June.' },
    { id: 'SMALL_GROUP_STATS', category: 'RARE_ATTRIBUTE', title: 'Small-group statistics', question: 'Does a count or percentage describe a group of fewer than about five people?', evidenceRequirement: 'Counts or percentages over very small groups', remediation: 'AGGREGATE', fictionalExample: 'One of the two night pharmacists said…' },
    { id: 'PLACE_STACKING', category: 'NARROW_LOCATION', title: 'Place stacking', question: 'Do several place details combine to point to one site?', evidenceRequirement: 'Two or more place markers', remediation: 'GENERALIZE', fictionalExample: 'The coastal clinic, next to the ferry terminal.' },
    { id: 'EMBARGO_CONTEXT', category: 'SENSITIVE_CONTEXT', title: 'Sensitive circumstances', question: 'Does the piece reveal circumstances the source may not expect to be public?', evidenceRequirement: 'Health, legal, immigration or employment disputes', remediation: 'HUMAN_REVIEW', fictionalExample: 'She was still waiting on her tribunal date.' },
  ],
};

export const BUNDLED_PACKS: readonly TestPackT[] = [core, editorial].map((p) => TestPack.parse(p));
