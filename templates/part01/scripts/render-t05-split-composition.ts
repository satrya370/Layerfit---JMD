import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import type { FontDefinition, FontWeight } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';
import { splitComposition } from '../../../../Layerfit-JMD-engine/src/templates/part02/split-composition/index.js';
import { contractCases } from './t05-split-composition-cases.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import { composeDocument } from '../../../../Layerfit-JMD-engine/src/server/render/document.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const out = resolve('artifacts/t05-split-composition');
await mkdir(out, { recursive: true });

const report = await checkTemplateContract(splitComposition, await contractCases(), { strict: true });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(report, null, 2));
assert.ok(report.passed, JSON.stringify(report.checks.filter((check) => check.status !== 'pass')));

/*
 * The T05 source uses system Arial; engine policy requires bundled fonts, so the 'inter' token is
 * mapped to Arimo (OFL-1.1), metrically compatible with Arial. Engine CSS uses weight 900 for
 * display text; Arimo ships up to 700 and the browser synthesizes the rest — the source did the
 * same, because Arial has no 900 face either.
 */
const arimoAsInter: Record<string, FontDefinition> = {
  inter: {
    family: 'LF Arimo',
    fallback: 'sans-serif',
    licence: 'OFL-1.1',
    faces: ([400, 500, 600, 700] as FontWeight[]).map((weight) => ({
      weight, style: 'normal', module: `@fontsource/arimo/files/arimo-latin-${weight}-normal.woff2`,
    })),
  },
};

const cases = await contractCases();
const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({
  templates: [splitComposition],
  assets: cases.flatMap((item) => item.assets),
  outputRoot: store,
  fontRegistry: arimoAsInter,
  fontResolve: (specifier) => resolve('node_modules', specifier),
});
const shortName = (name: string) => (name === 'reference-source-state' ? 'reference' : 'populated');
const results = [];
try {
  for (const item of cases) {
    for (const format of splitComposition.formats) {
      const config = splitComposition.configSchema.parse(item.config);
      const resolved = await harness.engine.assets.resolve(item.campaignId, config);
      const output = splitComposition.render({ format, profile: FORMAT_PROFILES[format], config, ...resolved, facts: new Map(item.facts.map((fact) => [fact.id, fact])) });
      const document = composeDocument({
        templateId: splitComposition.id, templateVersion: splitComposition.version, rootClass: splitComposition.rootClass,
        profile: FORMAT_PROFILES[format], config, language: 'nl',
        fonts: { heading: await harness.engine.fonts.load(config.brand.fontHeadingId), body: await harness.engine.fonts.load(config.brand.fontBodyId) },
        output,
      });
      if (item.name === 'reference-source-state') {
        await writeFile(join(out, `T05-${format}.html`), document.html);
        if (format === 'portrait') await writeFile(join(out, 'index.html'), document.html);
      }
      const result = await renderOutput({
        taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format, encodings: ['png', 'jpg'],
        snapshot: {
          schemaVersion: 1, campaignId: item.campaignId, creativeId: randomUUID(), revision: 1,
          templateId: splitComposition.id, templateVersion: splitComposition.version, language: 'nl',
          config: item.config, facts: item.facts,
        },
      }, harness.engine);
      results.push({ case: item.name, format, result });
      await writeFile(join(out, 'engine-report.json'), JSON.stringify({ results }, null, 2));
      if (result.status !== 'success') continue;
      for (const artifact of result.artifacts) {
        const stored = join(store, ...artifact.storageKey.split('/'));
        const meta = await sharp(stored).metadata();
        assert.equal(meta.width, FORMAT_PROFILES[format].width);
        assert.equal(meta.height, FORMAT_PROFILES[format].height);
        await sharp(stored).raw().toBuffer();
        await copyFile(stored, join(out, `T05-${shortName(item.name)}-${format}.${artifact.encoding}`));
      }
    }
  }
} finally {
  await harness.close();
}

/* Contact sheet: both cases × three formats. */
const variants = ['reference', 'populated'];
const formats = ['square', 'portrait', 'vertical'] as const;
const tiles = [];
for (const [row, variant] of variants.entries()) {
  for (const [col, format] of formats.entries()) {
    const input = await sharp(join(out, `T05-${variant}-${format}.png`)).resize(360, 640, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    tiles.push({ input, left: col * 372, top: row * 652 });
  }
}
await sharp({ create: { width: 1104, height: 1304, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(join(out, 'T05-all-cases.png'));

/*
 * Side-by-side against the standalone package previews the user rendered from the same source.
 * Not a fidelity claim: the engine module deliberately drops scaffold text ("05/15", "T / 05",
 * "01 / 01", the slogan), uses bundled Arimo instead of system Arial, and normalizes image bytes.
 */
const comparisons = [];
for (const [format, sourceFile] of [['square', 't05-square'], ['portrait', 't05-portrait'], ['vertical', 't05-story']] as const) {
  const sourcePath = resolve('../../Template-example/layerfit_t05/previews', `${sourceFile}.png`);
  const enginePath = join(out, `T05-reference-${format}.png`);
  const source = sharp(sourcePath).removeAlpha().raw();
  const engine = sharp(enginePath).removeAlpha().raw();
  const [sourceMeta, engineMeta] = [await sharp(sourcePath).metadata(), await sharp(enginePath).metadata()];
  const [left, right] = [await source.toBuffer(), await engine.toBuffer()];
  let error = 0;
  if (left.length === right.length) for (let i = 0; i < left.length; i++) error += Math.abs(left[i]! - right[i]!);
  const scaled = [];
  for (const [index, path] of [sourcePath, enginePath].entries()) {
    const buffer = await sharp(path).flatten({ background: '#ffffff' }).resize({ width: 460 }).png().toBuffer();
    scaled.push({ input: buffer, left: index * 470, top: 0 });
  }
  const sheetHeight = Math.round((Math.max(sourceMeta.height ?? 1080, engineMeta.height ?? 1080) / Math.max(sourceMeta.width ?? 1080, engineMeta.width ?? 1080)) * 460) + 20;
  await sharp({ create: { width: 940, height: sheetHeight, channels: 3, background: '#ffffff' } }).composite(scaled).png().toFile(join(out, `T05-source-vs-engine-${format}.png`));
  comparisons.push({
    format,
    meanAbsoluteChannelError: left.length === right.length ? error / left.length : null,
    exactPixelMatch: left.length === right.length ? left.equals(right) : false,
    sourceSize: `${sourceMeta.width}x${sourceMeta.height}`,
    engineSize: `${engineMeta.width}x${engineMeta.height}`,
  });
}
await writeFile(join(out, 'comparison.json'), JSON.stringify({
  note: 'MAE is not a visual-similarity percentage. Sources differ deliberately: engine drops scaffold text, uses bundled Arimo (400-700 + synthesis for 900) instead of system Arial, normalizes image bytes, and keeps all content inside the engine safe box.',
  comparisons,
}, null, 2));

console.log(JSON.stringify({
  out,
  contract: report.counts,
  results: results.map(({ case: name, format, result }) => ({ name, format, status: result.status, violations: result.diagnostics?.violations, fittingSteps: result.diagnostics?.fittingSteps, error: result.error })),
  comparisons,
}, null, 2));
assert.ok(results.every(({ result }) => result.status === 'success'), 'See engine-report.json for actual failures; successes retained');
