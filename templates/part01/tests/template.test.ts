import test from 'node:test';
import assert from 'node:assert/strict';
import { annotatedHeroSchema, escapeHtml, formats } from '../src/schema.js';
import { renderAnnotatedHeroHtml } from '../src/annotated-hero.js';

const factId = '00000000-0000-4000-8000-000000000001';
const base = {
  schemaVersion: 1 as const,
  templateId: 'annotated-hero' as const,
  creativeId: 'synthetic-bottle',
  language: 'nl' as const,
  brand: { name: 'Studio Test', primary: '#254735', background: '#f3ede3', text: '#20362b', fontHeading: 'serif' as const, fontBody: 'sans' as const },
  product: { name: 'Synthetic reusable bottle' },
  copy: { headline: 'Drink water on your own terms', benefits: [{ text: 'Reusable bottle', factIds: [factId] }], cta: 'Discover the bottle' },
  image: { mime: 'image/png' as const, bytes: Buffer.from('synthetic-raster-fixture') },
};

test('accepts bounded config and rejects arbitrary CSS, bad anchors and ungrounded benefits', () => {
  assert.equal(annotatedHeroSchema.safeParse(base).success, true);
  assert.equal(annotatedHeroSchema.safeParse({ ...base, creativeId: '../../outside' }).success, false);
  assert.equal(annotatedHeroSchema.safeParse({ ...base, brand: { ...base.brand, primary: 'red;url(https://x)' } }).success, false);
  assert.equal(annotatedHeroSchema.safeParse({ ...base, callouts: [{ benefitIndex: 2, anchor: { x: 1.2, y: 0.5 } }] }).success, false);
  assert.equal(annotatedHeroSchema.safeParse({ ...base, copy: { ...base.copy, benefits: [{ text: 'Unverified', factIds: [] }] } }).success, false);
});

test('escapes HTML and attribute content', () => {
  assert.equal(escapeHtml(`<script x="y">'&</script>`), '&lt;script x=&quot;y&quot;&gt;&#39;&amp;&lt;/script&gt;');
});

test('renders explicit format profiles, contain image and no fake price by default', () => {
  const css = '.lf-canvas{display:grid}';
  for (const [format, profile] of Object.entries(formats)) {
    const html = renderAnnotatedHeroHtml(base, format as keyof typeof formats, css);
    assert.match(html, new RegExp(`data-format="${format}"`));
    assert.match(html, new RegExp(`data-canvas-width="${profile.width}"`));
    assert.match(html, new RegExp(`data-canvas-height="${profile.height}"`));
    assert.match(html, /data-image-fit="contain"/);
    assert.doesNotMatch(html, /€|\$|% discount|EXTRA5/i);
  }
});

test('without anchor callouts there is no fabricated connector; verified offer is opt-in', () => {
  const html = renderAnnotatedHeroHtml(base, 'square', '.lf-canvas{}');
  assert.doesNotMatch(html, /callout-connectors/);
  assert.doesNotMatch(html, /verified-offer/);
  const withOffer = renderAnnotatedHeroHtml({ ...base, verifiedOffer: { label: 'Fixture offer', factId } }, 'square', '.lf-canvas{}');
  assert.match(withOffer, /Fixture offer/);
});

test('anchored connector is emitted as valid numeric SVG path data only', () => {
  const html = renderAnnotatedHeroHtml({ ...base, callouts: [{ benefitIndex: 0, anchor: { x: 0.31, y: 0.42 } }] }, 'square', '.lf-canvas{}');
  const path = html.match(/<path[^>]+d="([^"]+)"/);
  assert.ok(path);
  assert.match(path[1]!, /^M [\d.]+ [\d.]+ C [\d.]+ [\d.]+, [\d.]+ [\d.]+, [\d.]+ [\d.]+$/);
  assert.doesNotMatch(path[1]!, /%|NaN|undefined/);
});

test('source CSS contains fixed locally compiled utility classes and all format selectors', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/styles/tailwind.css', import.meta.url), 'utf8');
  assert.match(css, /data-format="square"/);
  assert.match(css, /data-format="portrait"/);
  assert.match(css, /data-format="vertical"/);
  assert.match(css, /\.lf-photo[^}]*object-fit:\s*contain/s);
});
