import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { templateModule } from '../src/product-collection-hero.js';
import { contractCases, collectionAssets } from './product-collection-cases.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { composeDocument } from '../../../../Layerfit-JMD-engine/src/server/render/document.js';

const out = resolve('artifacts/t11-product-collection');
await mkdir(join(out, 'assets'), { recursive: true });
for (const [index, image] of (await collectionAssets()).entries()) await writeFile(join(out, 'assets', `product-${index}.png`), image);
const cases = await contractCases();
const report = await checkTemplateContract(templateModule, cases, { strict: true });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(report, null, 2));
assert.ok(report.passed, JSON.stringify(report.checks.filter((check) => check.status !== 'pass')));
const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({ templates: [templateModule], assets: cases.flatMap((item) => item.assets), outputRoot: store });
const results = [];
try {
  for (const [index, item] of cases.entries()) {
    for (const format of templateModule.formats) {
      const config = templateModule.configSchema.parse(item.config);
      const resolved = await harness.engine.assets.resolve(item.campaignId, config);
      const output = templateModule.render({ format, profile: FORMAT_PROFILES[format], config, ...resolved, facts: new Map(item.facts.map((fact) => [fact.id, fact])) });
      const document = composeDocument({ templateId: templateModule.id, templateVersion: templateModule.version, rootClass: templateModule.rootClass, profile: FORMAT_PROFILES[format], config, language: 'en', fonts: { heading: await harness.engine.fonts.load(config.brand.fontHeadingId), body: await harness.engine.fonts.load(config.brand.fontBodyId) }, output });
      if (index === 0) {
        await writeFile(join(out, `T11-${format}.html`), document.html);
        if (format === 'portrait') await writeFile(join(out, 'index.html'), document.html);
      }
      const result = await renderOutput({
        taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format, encodings: ['png', 'jpg'],
        snapshot: { schemaVersion: 1, campaignId: item.campaignId, creativeId: `b${index}111111-1111-4111-8111-111111111111`, revision: 1, templateId: templateModule.id, templateVersion: templateModule.version, language: 'en', config: item.config, facts: item.facts },
      }, harness.engine);
      results.push({ case: item.name, format, result });
      await writeFile(join(out, 'engine-report.json'), JSON.stringify({ syntheticAssetsOnly: true, results }, null, 2));
      if (result.status !== 'success') continue;
      for (const artifact of result.artifacts) {
        const stored = join(store, ...artifact.storageKey.split('/'));
        const meta = await sharp(stored).metadata();
        assert.equal(meta.width, FORMAT_PROFILES[format].width); assert.equal(meta.height, FORMAT_PROFILES[format].height);
        await sharp(stored).raw().toBuffer();
        await copyFile(stored, join(out, `T11-${index === 0 ? 'collection' : index === 1 ? 'one-product' : 'two-products'}-${format}.${artifact.encoding}`));
      }
    }
  }
} finally { await harness.close(); }
console.log(JSON.stringify({ out, contract: report.counts, results: results.map(({ case: name, format, result }) => ({ name, format, status: result.status, violations: result.diagnostics?.violations, error: result.error })) }, null, 2));
assert.ok(results.every(({ result }) => result.status === 'success'), 'See engine-report.json for actual failures; successes retained');
const tiles = [];
for (const [row, variant] of ['collection', 'one-product', 'two-products'].entries()) {
  for (const [col, format] of ['square', 'portrait', 'vertical'].entries()) {
    const input = await sharp(join(out, `T11-${variant}-${format}.png`)).resize(360, 640, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    tiles.push({ input, left: col * 372, top: row * 652 });
  }
}
await sharp({ create: { width: 1104, height: 1944, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(join(out, 'T11-all-cases.png'));
