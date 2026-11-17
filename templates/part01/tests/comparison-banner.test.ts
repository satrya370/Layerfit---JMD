import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonBannerSchema, templateModule } from '../src/comparison-banner.js';
import { contractCases } from '../scripts/comparison-banner-cases.js';
import { RenderAssetResolver, MemoryAssetSource } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

async function input() {
  const item = (await contractCases())[0]!;
  const config = comparisonBannerSchema.parse(item.config);
  const source = new MemoryAssetSource();
  item.assets.forEach((asset) => source.put(asset));
  const assets = await new RenderAssetResolver(source).resolve(item.campaignId, config);
  return { format: 'square' as const, profile: FORMAT_PROFILES.square, config, ...assets, facts: new Map(item.facts.map((fact) => [fact.id, fact])) };
}

test('T02 preserves source details and escapes editable text', async () => {
  const data = await input();
  data.config.t02.leftLabel = '<img onerror=x>';
  const body = templateModule.render(data).body.toString();
  assert.ok(body.includes('&lt;img onerror=x&gt;'));
  assert.equal((body.match(/class="point__icon"/g) ?? []).length, 6);
  assert.ok(body.includes('robot-callout'));
  assert.ok(body.includes('slogan__line--brand'));
  assert.ok(!body.includes('<img onerror=x>'));
});

test('T02 fails closed when any comparison fact or evidence is missing', async () => {
  const data = await input();
  for (const id of [data.config.comparisonEvidenceId, ...data.config.t02.leftFactIds, ...data.config.t02.rightFactIds]) {
    const facts = new Map(data.facts);
    facts.delete(id);
    assert.throws(() => templateModule.render({ ...data, facts }), /missing verified comparison fact/);
  }
});

test('T02 rejects unsupported crop, extra keys and missing evidence', async () => {
  const item = (await contractCases())[0]!;
  for (const entry of item.rejects ?? []) assert.equal(comparisonBannerSchema.safeParse(entry.config).success, false, entry.name);
  const data = await input();
  assert.throws(() => templateModule.render({ ...data, photos: data.photos.map((photo, i) => i ? photo : { ...photo, allowCrop: false }) }), /crop-approved/);
});
