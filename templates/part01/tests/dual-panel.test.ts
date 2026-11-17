import test from 'node:test';
import assert from 'node:assert/strict';
import { dualPanelSchema, renderDualPanelBody, type DualPanelConfig, type ResolvedDualPanelAsset } from '../src/dual-panel.js';

const evidenceId = '00000000-0000-4000-8000-000000000099';
const factA = '00000000-0000-4000-8000-000000000001';
const factB = '00000000-0000-4000-8000-000000000002';
const twoPhoto: DualPanelConfig = {
  schemaVersion: 1, templateId: 'dual-panel', creativeId: 'synthetic-dual-panels', language: 'nl', mode: 'dual-benefit',
  brand: { name: 'Synthetic Studio', primary: '#274333', secondary: '#f0eadf', accent: '#c39a5d', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
  product: { name: 'Synthetic shirt' }, headline: 'Twee details van één ontwerp',
  panels: [
    { label: 'Everyday view', assetId: 'shirt-front', facts: [{ text: 'Cotton fabric', factIds: [factA] }] },
    { label: 'Fabric detail', assetId: 'shirt-detail', facts: [{ text: 'Crew neckline', factIds: [factB] }] },
  ],
  assets: [
    { assetId: 'shirt-front', role: 'lifestyle', allowCrop: true },
    { assetId: 'shirt-detail', role: 'detail', allowCrop: true },
  ],
  cta: 'Explore the shirt',
};
const resolved: ResolvedDualPanelAsset[] = twoPhoto.assets.map((asset) => ({
  ...asset, mime: 'image/png', width: 600, height: 800, src: 'data:image/png;base64,AQIDBA==',
}));

test('dual-benefit two-panel configuration is valid without implying competitor comparison', () => {
  assert.equal(dualPanelSchema.safeParse(twoPhoto).success, true);
  assert.equal(twoPhoto.comparisonEvidenceId, undefined);
});

test('verified comparison requires evidence; default dual-benefit rejects comparison evidence', () => {
  assert.equal(dualPanelSchema.safeParse({ ...twoPhoto, mode: 'verified-comparison' }).success, false);
  assert.equal(dualPanelSchema.safeParse({ ...twoPhoto, comparisonEvidenceId: evidenceId }).success, false);
  assert.equal(dualPanelSchema.safeParse({ ...twoPhoto, mode: 'verified-comparison', comparisonEvidenceId: evidenceId }).success, true);
});

test('single-photo fallback uses one real image and makes the other panel informational', () => {
  const config: DualPanelConfig = {
    ...twoPhoto,
    creativeId: 'synthetic-single-photo',
    panels: [twoPhoto.panels[0], { label: 'Product details', facts: [{ text: 'Classic crew neck', factIds: [factB] }] }],
    assets: [twoPhoto.assets[0]!],
  };
  assert.equal(dualPanelSchema.safeParse(config).success, true);
  const body = renderDualPanelBody(config, resolved.slice(0, 1));
  assert.equal((body.match(/<img\b/g) ?? []).length, 1);
  assert.match(body, /lf-dual-panel--information/);
  assert.match(body, /data-slot="panel-photo-left"/);
  assert.doesNotMatch(body, /data-slot="panel-photo-right"/);
});

test('two-panel rendering references only engine-resolved local raster assets', () => {
  const body = renderDualPanelBody(twoPhoto, resolved);
  assert.equal((body.match(/<img\b/g) ?? []).length, 2);
  assert.match(body, /data-image-fit="cover" data-allow-crop="true"/);
  assert.match(body, /data-slot="left-fact-1"/);
  assert.match(body, /data-slot="right-fact-1"/);
  assert.match(body, /data-fit-group="dual-headline"/);
  assert.match(body, /data-fit-group="panel-copy"/);
  assert.doesNotMatch(body, /<html|<style|<script|https?:\/\//i);
});

test('text is escaped and arbitrary remote asset src is rejected', () => {
  const config = { ...twoPhoto, headline: '<script>alert(1)</script>' };
  const body = renderDualPanelBody(config, resolved);
  assert.doesNotMatch(body, /<script>/i);
  assert.match(body, /&lt;script&gt;/i);
  assert.throws(() => renderDualPanelBody(twoPhoto, [{ ...resolved[0]!, src: 'https://example.invalid/photo.png' }, resolved[1]!]), /data URI/);
});

test('rejects reused panel image, dangling asset references and missing fact ids', () => {
  assert.equal(dualPanelSchema.safeParse({ ...twoPhoto, panels: [twoPhoto.panels[0], { ...twoPhoto.panels[1], assetId: 'shirt-front' }] }).success, false);
  assert.equal(dualPanelSchema.safeParse({ ...twoPhoto, panels: [twoPhoto.panels[0], { ...twoPhoto.panels[1], assetId: 'unknown' }] }).success, false);
  assert.equal(dualPanelSchema.safeParse({ ...twoPhoto, panels: [twoPhoto.panels[0], { ...twoPhoto.panels[1], facts: [{ text: 'Unverified statement', factIds: [] }] }] }).success, false);
});
