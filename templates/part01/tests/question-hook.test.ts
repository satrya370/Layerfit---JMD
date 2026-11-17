import assert from 'node:assert/strict';
import test from 'node:test';
import { questionHookSchema, templateModule } from '../src/question-hook.js';
import { contractCases } from '../scripts/question-hook-cases.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

async function renderInput() {
  const item = (await contractCases())[0]!;
  const config = questionHookSchema.parse(item.config);
  const source = new MemoryAssetSource();
  item.assets.forEach((asset) => source.put(asset));
  const resolved = await new RenderAssetResolver(source).resolve(item.campaignId, config);
  return { item, config, input: { format: 'square' as const, profile: FORMAT_PROFILES.square, config, ...resolved, facts: new Map(item.facts.map((fact) => [fact.id, fact])) } };
}

test('T06 retains question-hook structure, escaped text and product photo', async () => {
  const { input } = await renderInput();
  input.config.t06.eyebrow = '<svg onload=x>';
  const body = templateModule.render(input).body.toString();
  assert.ok(body.includes('&lt;svg onload=x&gt;'));
  assert.ok(body.includes('question-sticker'));
  assert.ok(body.includes('side-stamp'));
  assert.ok(body.includes('photo-caption'));
  assert.ok(body.includes('product-photo'));
  assert.ok(!body.includes('<svg onload=x>'));
});

test('T06 fails closed for missing description/feature facts and asset mismatch', async () => {
  const { input } = await renderInput();
  const facts = new Map(input.facts);
  facts.delete(input.config.t06.descriptionFactId);
  assert.throws(() => templateModule.render({ ...input, facts }), /description fact missing/);
  const featureConfig = questionHookSchema.parse({ ...input.config, t06: { ...input.config.t06, featureFactIds: ['t06-feature'] } });
  assert.throws(() => templateModule.render({ ...input, config: featureConfig }), /feature fact missing/);
  assert.throws(() => templateModule.render({ ...input, photos: [] }), /asset missing or mismatched/);
});

test('T06 rejects malformed extension and permits all three engine formats', async () => {
  const { item, config, input } = await renderInput();
  for (const rejected of item.rejects ?? []) assert.equal(questionHookSchema.safeParse(rejected.config).success, false, rejected.name);
  for (const format of ['square', 'portrait', 'vertical'] as const) {
    const result = templateModule.render({ ...input, format, profile: FORMAT_PROFILES[format], config });
    assert.ok(result.body.toString().includes('hero-copy'));
  }
});
