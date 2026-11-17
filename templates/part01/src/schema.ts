import { z } from 'zod';

export const formats = {
  square: { width: 1080, height: 1080, safeTop: 62, safeBottom: 60 },
  portrait: { width: 1080, height: 1350, safeTop: 74, safeBottom: 72 },
  vertical: { width: 1080, height: 1920, safeTop: 250, safeBottom: 350 },
} as const;
export type CreativeFormat = keyof typeof formats;

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const normalizedPoint = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();

export const annotatedHeroSchema = z.object({
  schemaVersion: z.literal(1),
  templateId: z.literal('annotated-hero'),
  creativeId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  language: z.enum(['nl', 'en', 'id']),
  brand: z.object({
    name: z.string().trim().min(1).max(64),
    primary: hex,
    background: hex,
    text: hex,
    fontHeading: z.enum(['serif', 'sans']),
    fontBody: z.enum(['sans']),
  }).strict(),
  product: z.object({ name: z.string().trim().min(1).max(100) }).strict(),
  copy: z.object({
    headline: z.string().trim().min(1).max(90),
    benefits: z.array(z.object({ text: z.string().trim().min(1).max(48), factIds: z.array(z.string().uuid()).min(1).max(5) }).strict()).min(1).max(3),
    cta: z.string().trim().min(1).max(32),
  }).strict(),
  image: z.object({
    mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    bytes: z.instanceof(Buffer).refine((buffer) => buffer.length > 0 && buffer.length <= 10 * 1024 * 1024),
    focalPoint: normalizedPoint.optional(),
  }).strict(),
  // Anchor is normalized to the full product-stage canvas; renderer/tooling can set it from preview.
  callouts: z.array(z.object({ benefitIndex: z.number().int().min(0).max(2), anchor: normalizedPoint.extend({ x: z.number().min(0).max(0.72) }) }).strict()).max(3).optional(),
  verifiedOffer: z.object({ label: z.string().trim().min(1).max(48), factId: z.string().uuid() }).strict().optional(),
}).strict().superRefine((value, context) => {
  for (const callout of value.callouts ?? []) {
    if (!value.copy.benefits[callout.benefitIndex]) context.addIssue({ code: 'custom', path: ['callouts'], message: 'Callout references a benefit that does not exist' });
  }
});

export type AnnotatedHeroConfig = z.infer<typeof annotatedHeroSchema>;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
