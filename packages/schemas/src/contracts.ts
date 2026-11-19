import { z } from 'zod';
import { CONFIDENCE, DOMAINS, FINDING_CATEGORIES, GENERATOR_CATEGORIES, PROPOSED_ACTIONS, REMEDIATIONS, TEST_CATEGORIES, PACK_SOURCES } from './enums';

/** Output the local model must return for context extraction (spec 9.2). Strict: no extra fields. */
export const ExtractionFinding = z.strictObject({
  category: z.enum(FINDING_CATEGORIES),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  quote: z.string().min(1).max(300),
  rationale: z.string().min(1).max(400),
  confidence: z.enum(CONFIDENCE),
  proposedAction: z.enum(PROPOSED_ACTIONS),
});
export type ExtractionFinding = z.infer<typeof ExtractionFinding>;

export const ExtractionOutput = z.strictObject({
  schemaVersion: z.literal(1),
  findings: z.array(ExtractionFinding).max(12),
});
export type ExtractionOutput = z.infer<typeof ExtractionOutput>;

/** The only body a cloud test-pack request may carry. Built from enums, never from user text. */
export const GenericPackRequest = z.strictObject({
  task: z.literal('generatePack'),
  domain: z.enum(DOMAINS),
  categories: z.array(z.enum(GENERATOR_CATEGORIES)).min(1).max(GENERATOR_CATEGORIES.length),
  packSchemaVersion: z.literal(1),
});
export type GenericPackRequest = z.infer<typeof GenericPackRequest>;

const safeText = (max: number) =>
  z.string().min(1).max(max).refine((s) => !/https?:\/\/|www\.|<\s*script|```|javascript:/i.test(s), 'Links, markup and code are not allowed in test packs');

export const PackTest = z.strictObject({
  id: z.string().regex(/^[A-Z0-9][A-Z0-9_-]{1,39}$/),
  category: z.enum(TEST_CATEGORIES),
  title: safeText(80),
  question: safeText(300),
  evidenceRequirement: safeText(300),
  remediation: z.enum(REMEDIATIONS),
  fictionalExample: safeText(400),
});
export type PackTest = z.infer<typeof PackTest>;

/** What the cloud model must return for a pack request. */
export const GeneratedPackOutput = z.strictObject({ tests: z.array(PackTest).min(1).max(24) });
export type GeneratedPackOutput = z.infer<typeof GeneratedPackOutput>;

export const TestPack = z.strictObject({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(80),
  version: z.string().min(1).max(40),
  domain: z.enum(DOMAINS),
  source: z.enum(PACK_SOURCES),
  createdAt: z.string(),
  schemaVersion: z.literal(1),
  tests: z.array(PackTest).min(1).max(24),
});
export type TestPack = z.infer<typeof TestPack>;
