import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { templateModule } from '../src/immersive-editorial.js';
import { contractCases } from './immersive-editorial-cases.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import { composeDocument } from '../../../../Layerfit-JMD-engine/src/server/render/document.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { FONT_REGISTRY } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';
import type { FontDefinition, FontWeight } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';

const out = resolve('artifacts/t12-immersive-editorial');
await mkdir(out, { recursive: true });

const report = await checkTemplateContract(templateModule, await contractCases(), { strict: true });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(report, null, 2));
assert.ok(report.passed, JSON.stringify(report.checks.filter((check) => check.status !== 'pass')));

/*
 * The source headline uses 'URW Bookman'/'Bookman Old Style' (serif) and the body uses Arial.
 * Engine policy requires bundled fonts: the heading token maps to Fraunces (OFL-1.1, the agreed
 * serif stand-in) and the body token maps to Arimo (OFL-1.1, metrically compatible with Arial).
 */
const fontRegistry: Record<string, FontDefinition> = {
  // Engine defaults (fraunces heading, etc.) stay registered; only the body token is remapped.
  ...FONT_REGISTRY,
  inter: {
    family: 'LF Arimo', fallback: 'sans-serif', licence: 'OFL-1.1',
    faces: ([400, 500, 600, 700] as FontWeight[]).map((weight) => ({
      weight, style: 'normal', module: `@fontsource/arimo/files/arimo-latin-${weight}-normal.woff2`,
    })),
  },
};

const cases = await contractCases();
const shortName = (name: string) => name === 'reference-source-state' ? 'reference' : name === 'minimal-optional-hidden' ? 'minimal' : 'compact';
const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({
  templates: [templateModule],
  assets: cases.flatMap((item) => item.assets),
  outputRoot: store,
  fontRegistry,
  fontResolve: (specifier) => resolve('node_modules', specifier),
});
const results = [];
try {
  for (const item of cases) {
    for (const format of templateModule.formats) {
      const config = templateModule.configSchema.parse(item.config);
      const resolved = await harness.engine.assets.resolve(item.campaignId, config);
      const output = templateModule.render({ format, profile: FORMAT_PROFILES[format], config, ...resolved, facts: new Map(item.facts.map((fact) => [fact.id, fact])) });
      const document = composeDocument({
        templateId: templateModule.id, templateVersion: templateModule.version, rootClass: templateModule.rootClass,
        profile: FORMAT_PROFILES[format], config, language: 'en',
        fonts: { heading: await harness.engine.fonts.load(config.brand.fontHeadingId), body: await harness.engine.fonts.load(config.brand.fontBodyId) },
        output,
      });
      if (item.name === 'reference-source-state') {
        await writeFile(join(out, `T12-${format}.html`), document.html);
        if (format === 'portrait') await writeFile(join(out, 'index.html'), document.html);
      }
      const result = await renderOutput({
        taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format, encodings: ['png', 'jpg'],
        snapshot: {
          schemaVersion: 1, campaignId: item.campaignId, creativeId: randomUUID(), revision: 1,
          templateId: templateModule.id, templateVersion: templateModule.version, language: 'en',
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
        await copyFile(stored, join(out, `T12-${shortName(item.name)}-${format}.${artifact.encoding}`));
      }
    }
  }
} finally {
  await harness.close();
}

/* Contact sheet: three cases × three formats. */
const variants = ['reference', 'minimal', 'compact'];
const formats = ['square', 'portrait', 'vertical'] as const;
const tiles = [];
for (const [row, variant] of variants.entries()) {
  for (const [col, format] of formats.entries()) {
    const input = await sharp(join(out, `T12-${variant}-${format}.png`)).resize(360, 640, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    tiles.push({ input, left: col * 372, top: row * 652 });
  }
}
await sharp({ create: { width: 1104, height: 1944, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(join(out, 'T12-all-cases.png'));

/*
 * Side-by-side against the standalone package previews. Not a fidelity claim: fonts differ
 * (Fraunces vs URW Bookman, Arimo vs Arial), panel padding respects the engine safe box, and
 * image bytes are normalized by the resolver.
 */
const comparisons = [];
for (const [format, sourceFile] of [['square', 't12-square'], ['portrait', 't12-portrait'], ['vertical', 't12-story']] as const) {
  const sourcePath = resolve('../../Template-example/LayerFit_T12/previews', `${sourceFile}.png`);
  const enginePath = join(out, `T12-reference-${format}.png`);
  const [sourceMeta, engineMeta] = [await sharp(sourcePath).metadata(), await sharp(enginePath).metadata()];
  const [left, right] = [
    await sharp(sourcePath).removeAlpha().raw().toBuffer(),
    await sharp(enginePath).removeAlpha().raw().toBuffer(),
  ];
  let error = 0;
  if (left.length === right.length) for (let i = 0; i < left.length; i++) error += Math.abs(left[i]! - right[i]!);
  const scaled = [];
  for (const [index, path] of [sourcePath, enginePath].entries()) {
    const buffer = await sharp(path).flatten({ background: '#ffffff' }).resize({ width: 460 }).png().toBuffer();
    scaled.push({ input: buffer, left: index * 470, top: 0 });
  }
  const sheetHeight = Math.round((Math.max(sourceMeta.height ?? 1080, engineMeta.height ?? 1080) / Math.max(sourceMeta.width ?? 1080, engineMeta.width ?? 1080)) * 460) + 20;
  await sharp({ create: { width: 940, height: sheetHeight, channels: 3, background: '#ffffff' } }).composite(scaled).png().toFile(join(out, `T12-source-vs-engine-${format}.png`));
  comparisons.push({
    format,
    meanAbsoluteChannelError: left.length === right.length ? error / left.length : null,
    exactPixelMatch: left.length === right.length ? left.equals(right) : false,
    sourceSize: `${sourceMeta.width}x${sourceMeta.height}`,
    engineSize: `${engineMeta.width}x${engineMeta.height}`,
  });
}
await writeFile(join(out, 'comparison.json'), JSON.stringify({
  note: 'MAE is not a visual-similarity percentage. Deliberate differences: bundled Fraunces/Arimo stand-ins for URW Bookman/Arial, panel padding inside the engine safe box (source used 24-52px bottom clearance), normalized image bytes.',
  comparisons,
}, null, 2));

console.log(JSON.stringify({
  out,
  contract: report.counts,
  results: results.map(({ case: name, format, result }) => ({ name, format, status: result.status, violations: result.diagnostics?.violations, fittingSteps: result.diagnostics?.fittingSteps, warnings: result.diagnostics?.warnings, error: result.error })),
  comparisons,
}, null, 2));
assert.ok(results.every(({ result }) => result.status === 'success'), 'See engine-report.json for actual failures; successes retained');
