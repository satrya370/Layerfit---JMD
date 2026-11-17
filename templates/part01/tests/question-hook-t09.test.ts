import assert from 'node:assert/strict';
import test from 'node:test';
import { questionHookT09Schema, templateModule } from '../src/question-hook-t09.js';
import { contractCases } from '../scripts/question-hook-t09-cases.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

async function fixture(index = 0) {
  const item = (await contractCases())[index]!;
  const config = questionHookT09Schema.parse(item.config);
  const source = new MemoryAssetSource(); item.assets.forEach((asset) => source.put(asset));
  const resolved = await new RenderAssetResolver(source).resolve(item.campaignId, config);
  return { item, config, input: { format: 'square' as const, profile: FORMAT_PROFILES.square, config, ...resolved, facts: new Map(item.facts.map((fact) => [fact.id, fact])) } };
}

test('T09 removes only the large ghost question mark; headline question mark and source layout remain', async () => {
  const { input } = await fixture();
  const result = templateModule.render(input);
  const body = result.body.toString();
  assert.ok(body.includes('kabels?'));
  assert.ok(body.includes('hero__ring'));
  assert.ok(body.includes('brandbar'));
  assert.ok(!body.includes('ad__ghostq'));
  assert.ok(!result.css.includes('.ad__ghostq'));
});

test('T09 escapes user text and fails closed on missing factual copy', async () => {
  const { input } = await fixture();
  input.config.copy.headline = '<svg onload=x>';
  const output = templateModule.render(input).body.toString();
  assert.ok(output.includes('&lt;svg'));
  assert.ok(output.includes('onload=x&gt;'));
  assert.ok(!output.includes('<svg onload=x>'));
  const facts = new Map(input.facts); facts.delete(input.config.t09.descriptionFactId);
  assert.throws(() => templateModule.render({ ...input, facts }), /description fact missing/);
});

test('T09 enforces verified features, crop permission and formats', async () => {
  const { item, config, input } = await fixture();
  for (const rejected of item.rejects ?? []) assert.equal(questionHookT09Schema.safeParse(rejected.config).success, false, rejected.name);
  const facts = new Map(input.facts); facts.delete(config.t09.featureFactIds[0]!);
  assert.throws(() => templateModule.render({ ...input, facts }), /feature fact missing/);
  const toni = await fixture(1);
  assert.throws(() => templateModule.render({ ...toni.input, photos: toni.input.photos.map((photo) => ({ ...photo, allowCrop: false })) }), /crop permission/);
  for (const format of ['square', 'portrait', 'vertical'] as const) {
    assert.ok(templateModule.render({ ...input, format, profile: FORMAT_PROFILES[format] }).body.toString().includes('question__accent'));
  }
});
