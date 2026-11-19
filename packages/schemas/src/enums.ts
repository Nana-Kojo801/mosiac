/** Closed enums shared by all components (spec 9.1, 6.2, 6.3). */

export const CLASSIFICATIONS = ['PRIVATE', 'GENERIC', 'SYNTHETIC', 'PUBLIC_APPROVED'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

/** NO_MODEL marks deterministic local work (rules, scoring, export). */
export const INFERENCE_POLICIES = ['ONLY_ON_DEVICE', 'PREFER_ON_DEVICE', 'ONLY_IN_CLOUD', 'NO_MODEL'] as const;
export type InferencePolicy = (typeof INFERENCE_POLICIES)[number];

/**
 * Where an operation actually ran. DEVICE and CLOUD come only from SDK
 * metadata (`inferenceSource`). FIXTURE marks authored sample results shown in
 * the sample workspace when no model is available; it is never model output.
 */
export const ACTUAL_SOURCES = ['DEVICE', 'CLOUD', 'RULES', 'UNKNOWN', 'UNAVAILABLE', 'FIXTURE'] as const;
export type ActualSource = (typeof ACTUAL_SOURCES)[number];

export const FINDING_CATEGORIES = [
  'DIRECT_IDENTIFIER',
  'PRECISE_DATE',
  'RARE_ATTRIBUTE',
  'NARROW_LOCATION',
  'DISTINCTIVE_EVENT',
  'CROSS_RELEASE',
  'EXCESSIVE_DETAIL',
  'SENSITIVE_CONTEXT',
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

/** Categories a test pack may contain. Core categories plus generator-only categories. */
export const TEST_CATEGORIES = [
  ...FINDING_CATEGORIES,
  'ROLE_RARITY',
  'TENURE_WINDOWS',
  'SHIFT_PATTERNS',
  'RARE_EVENTS',
  'SMALL_SITES',
] as const;
export type TestCategory = (typeof TEST_CATEGORIES)[number];

/** Categories the cloud generator may be asked for (static options, spec 6.2). */
export const GENERATOR_CATEGORIES = ['ROLE_RARITY', 'TENURE_WINDOWS', 'SHIFT_PATTERNS', 'RARE_EVENTS', 'SMALL_SITES'] as const satisfies readonly TestCategory[];
export type GeneratorCategory = (typeof GENERATOR_CATEGORIES)[number];

export const DOMAINS = ['QUALITATIVE_RESEARCH', 'EDITORIAL'] as const;
export type Domain = (typeof DOMAINS)[number];

export const CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const BANDS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type Band = (typeof BANDS)[number];

export const FINDING_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ACCEPTED_RESIDUAL', 'RESOLVED', 'DISMISSED', 'UNASSESSED'] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const PROPOSED_ACTIONS = ['GENERALIZE', 'REMOVE', 'REVIEW'] as const;
export type ProposedAction = (typeof PROPOSED_ACTIONS)[number];

export const PACK_SOURCES = ['bundled', 'cloud', 'cached'] as const;
export type PackSource = (typeof PACK_SOURCES)[number];

export const REMEDIATIONS = ['GENERALIZE', 'REMOVE', 'AGGREGATE', 'DELAY_RELEASE', 'HUMAN_REVIEW'] as const;
export type Remediation = (typeof REMEDIATIONS)[number];
