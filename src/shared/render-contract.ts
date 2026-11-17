/**
 * Shared render contract between the rendering engine and template modules.
 * STATUS: proposal v0 (engine draft, 17 Nov 2026). Not frozen until the template agent confirms it;
 * see docs/engine/integration-contract.md. Change only by agreement of both owners.
 */
import { z } from 'zod';
import type { SafeHtml } from './html.js';

/** Version of docs/contracts/render-template-contract.md that this module implements. Bump together with the document. */
export const CONTRACT_VERSION = '0.2';

export const PART01_TEMPLATE_IDS = ['annotated-hero', 'dual-panel', 'dark-offer-stack', 'editorial-reframe'] as const;
export type Part01TemplateId = (typeof PART01_TEMPLATE_IDS)[number];

export const FORMATS = ['square', 'portrait', 'vertical'] as const;
export type Format = (typeof FORMATS)[number];
export const ENCODINGS = ['png', 'jpg'] as const;
export type Encoding = (typeof ENCODINGS)[number];

export interface Insets { top: number; right: number; bottom: number; left: number }
export interface FormatProfile { format: Format; width: number; height: number; safe: Insets }

/** Square/portrait insets are the tested prototype baseline; vertical follows spec.md. Not a Meta UI guarantee. */
const profile = (format: Format, width: number, height: number, safe: Insets): FormatProfile =>
  Object.freeze({ format, width, height, safe: Object.freeze(safe) });

/** Frozen: the same objects are handed to template code, which must not be able to change the shared safe area. */
export const FORMAT_PROFILES: Readonly<Record<Format, FormatProfile>> = Object.freeze({
  square: profile('square', 1080, 1080, { top: 60, right: 70, bottom: 60, left: 70 }),
  portrait: profile('portrait', 1080, 1350, { top: 70, right: 70, bottom: 70, left: 70 }),
  vertical: profile('vertical', 1080, 1920, { top: 250, right: 70, bottom: 350, left: 70 }),
});

/** Semantic attributes the engine reads for diagnostics and typography fitting. */
export const SLOT_ATTRIBUTES = {
  canvas: 'data-canvas', // set by the engine on the root element; templates must not add it
  slot: 'data-slot', // unique semantic name within a render, e.g. "headline", "cta", "product-photo"
  required: 'data-required', // slot must be visible with non-zero size
  safe: 'data-safe', // slot must stay inside the format's safe box
  fitGroup: 'data-fit-group', // engine may scale var(--lf-fit-<group>) down in bounded steps
  fitMin: 'data-fit-min', // optional minimum scale for the group, default 0.8
  allowOverlap: 'data-allow-overlap', // space-separated slot names (or "*") this slot may overlap
  imageFit: 'data-image-fit', // "contain" | "cover"; must match computed object-fit
  allowCrop: 'data-allow-crop', // present only when the asset config allows crop (required for cover)
} as const;

const textField = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
const pointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();

export const FONT_IDS = ['inter', 'fraunces', 'montserrat', 'poppins'] as const;
export type FontId = (typeof FONT_IDS)[number];

/** Base config following template_part01_plan.md §4. Template modules may narrow it (budgets, templateId literal). */
export const templateConfigSchema = z.object({
  schemaVersion: z.literal(1),
  templateId: idSchema,
  brand: z.object({
    name: textField(100),
    logoAssetId: idSchema.optional(),
    primary: hexColorSchema,
    secondary: hexColorSchema,
    accent: hexColorSchema,
    fontHeadingId: z.enum(FONT_IDS),
    fontBodyId: z.enum(FONT_IDS),
  }).strict(),
  copy: z.object({
    headline: textField(90),
    accentPhrase: textField(90).optional(),
    body: textField(240).optional(),
    cta: textField(32),
    benefits: z.array(z.object({ text: textField(240), factIds: z.array(idSchema).min(1).max(5) }).strict()).max(4),
  }).strict(),
  assets: z.array(z.object({
    assetId: idSchema,
    role: z.enum(['product', 'lifestyle', 'detail']),
    focalPoint: pointSchema.optional(),
    allowCrop: z.boolean(),
  }).strict()).min(1).max(8),
  callouts: z.array(z.object({ benefitIndex: z.number().int().min(0).max(3), anchor: pointSchema }).strict()).max(3).optional(),
  offerFactId: idSchema.optional(),
  proofFactId: idSchema.optional(),
  comparisonEvidenceId: idSchema.optional(),
}).strict().superRefine((config, ctx) => {
  const { accentPhrase, headline } = config.copy;
  if (accentPhrase && !headline.includes(accentPhrase)) ctx.addIssue({ code: 'custom', path: ['copy', 'accentPhrase'], message: 'accentPhrase must be a substring of headline' });
  for (const [i, callout] of (config.callouts ?? []).entries()) {
    if (callout.benefitIndex >= config.copy.benefits.length) ctx.addIssue({ code: 'custom', path: ['callouts', i, 'benefitIndex'], message: 'unknown benefit' });
  }
  if (new Set(config.assets.map((a) => a.assetId)).size !== config.assets.length) ctx.addIssue({ code: 'custom', path: ['assets'], message: 'duplicate assetId' });
});
export type TemplateConfig = z.infer<typeof templateConfigSchema>;

/** Verified fact as resolved by the campaign/domain service before enqueue. Renderer checks presence, not truth. */
export const resolvedFactSchema = z.object({ id: idSchema, text: textField(240), verified: z.literal(true) }).strict();
export type ResolvedFact = z.infer<typeof resolvedFactSchema>;

/** Immutable input for one creative revision. Assets are referenced by campaign-owned ID only. */
export const renderSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  campaignId: z.uuid(),
  creativeId: z.uuid(),
  revision: z.number().int().min(1),
  templateId: idSchema,
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  language: z.enum(['nl', 'en', 'id']),
  config: z.unknown(),
  facts: z.array(resolvedFactSchema).max(50),
}).strict();
export type RenderSnapshot = z.infer<typeof renderSnapshotSchema>;

export const renderRequestSchema = z.object({
  snapshot: renderSnapshotSchema,
  format: z.enum(FORMATS),
  encodings: z.array(z.enum(ENCODINGS)).min(1).max(2).refine((e) => new Set(e).size === e.length, 'duplicate encoding'),
  jobId: z.uuid(),
  taskId: z.uuid(),
  attempt: z.number().int().min(1),
}).strict();
export type RenderRequest = z.infer<typeof renderRequestSchema>;

/** Normalized raster produced by the engine's asset resolver. `src` is an engine-generated data URI; templates never build URLs. */
export interface ResolvedAsset {
  assetId: string;
  role: 'product' | 'lifestyle' | 'detail' | 'logo';
  mime: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  sha256: string;
  src: string;
  focalPoint?: { x: number; y: number };
  allowCrop: boolean;
}

/** CSS font-family names the engine registers for the requested font IDs. */
export interface FontBinding { heading: string; body: string }

export interface TemplateRenderInput<C = TemplateConfig> {
  format: Format;
  profile: FormatProfile;
  config: C;
  /** Product/lifestyle/detail assets in config order. */
  photos: readonly ResolvedAsset[];
  logo?: ResolvedAsset;
  facts: ReadonlyMap<string, ResolvedFact>;
}

export interface TemplateRenderOutput {
  /** Content placed inside the engine-owned canvas root. Must be produced by the `html` tagged template. */
  body: SafeHtml;
  /** Precompiled CSS (Tailwind build output or hand CSS). No @import, no non-data url(), no scripts. */
  css: string;
}

export interface SlotManifestEntry { name: string; required: boolean; formats?: readonly Format[] }

export interface TemplateModule<C extends TemplateConfig = TemplateConfig> {
  id: string;
  version: string; // semver; bump when output can change for the same config
  formats: readonly Format[];
  /** Static class on the engine-owned canvas root, [a-z][a-z0-9-]*. */
  rootClass: string;
  /** Manifest used by contract tests and diagnostics. */
  slots: readonly SlotManifestEntry[];
  configSchema: z.ZodType<C>;
  render(input: TemplateRenderInput<C>): TemplateRenderOutput;
}

export const ERROR_CODES = [
  'REQUEST_INVALID', 'TEMPLATE_UNKNOWN', 'CONFIG_INVALID', 'FACT_MISSING', 'REVISION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'CAPACITY',
  'ASSET_INVALID', 'ASSET_FORBIDDEN', 'FONT_MISSING', 'CSS_INVALID', 'CSS_NOT_READY', 'TEMPLATE_FAILED', 'NETWORK_BLOCKED',
  'SLOT_MISSING', 'LAYOUT_OVERFLOW', 'LAYOUT_CLIPPED', 'SLOT_COLLISION', 'SAFE_AREA_VIOLATION', 'OUT_OF_CANVAS', 'IMAGE_CROP_INVALID', 'CANVAS_INVALID',
  'BROWSER_LAUNCH_FAILED', 'BROWSER_DISCONNECTED', 'PAGE_CREATE_FAILED', 'PAGE_CRASH', 'CONTENT_TIMEOUT', 'READINESS_TIMEOUT', 'SCREENSHOT_TIMEOUT', 'TASK_DEADLINE',
  'ENCODE_FAILED', 'OUTPUT_INVALID', 'STORAGE_FAILED', 'STORAGE_CONFLICT', 'DB_COMMIT_FAILED', 'INTERRUPTED', 'INTERNAL',
] as const;
export type RenderErrorCode = (typeof ERROR_CODES)[number];
export type RenderStage = 'validate' | 'assets' | 'fonts' | 'template' | 'browser' | 'page' | 'content' | 'readiness' | 'layout' | 'screenshot' | 'encode' | 'storage' | 'commit' | 'worker';

export interface LayoutViolation { code: RenderErrorCode; slot: string; detail: string; fitGroups: string[] }

export interface RenderArtifact { encoding: Encoding; storageKey: string; width: number; height: number; bytes: number; sha256: string }

export interface RenderResult {
  status: 'success' | 'failed';
  taskId: string;
  /** Empty string / 0 / null when the request was too malformed to read them. Never a guessed default. */
  creativeId: string;
  revision: number;
  format: Format | null;
  artifacts: RenderArtifact[];
  diagnostics: {
    templateId: string;
    templateVersion: string;
    browserVersion?: string;
    cssHash?: string;
    fingerprint?: string;
    durationMs: number;
    stageMs: Partial<Record<RenderStage, number>>;
    warnings: string[];
    fittingSteps: number;
    violations: LayoutViolation[];
  };
  error?: { code: RenderErrorCode; stage: RenderStage; retryable: boolean; message: string };
}
