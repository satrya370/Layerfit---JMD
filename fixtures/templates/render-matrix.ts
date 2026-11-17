/**
 * Renders a template's synthetic cases in every format through the real engine, checks the outputs, and writes a contact
 * sheet per case to the ignored artifacts/ folder for visual review. Shared by the per-template render tests.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import type { AssetRecord } from '../../src/server/assets/resolve-render-assets.js';
import { renderOutput } from '../../src/server/render/render-output.js';
import type { Format, RenderResult, RenderSnapshot, TemplateModule } from '../../src/shared/render-contract.js';
import { createHarness } from '../engine/harness.js';

const FORMATS: Format[] = ['square', 'portrait', 'vertical'];
const SIZE: Record<Format, [number, number]> = { square: [1080, 1080], portrait: [1080, 1350], vertical: [1080, 1920] };
const LAYOUT_CODES = ['SLOT_COLLISION', 'LAYOUT_OVERFLOW', 'LAYOUT_CLIPPED', 'SAFE_AREA_VIOLATION', 'OUT_OF_CANVAS'];

export interface MatrixCase { name: string; assets: AssetRecord[] }

export async function renderMatrix<C extends MatrixCase>(options: {
  module: TemplateModule;
  cases: readonly C[];
  snapshotFor: (built: C) => RenderSnapshot;
  expectedFailures?: Readonly<Record<string, readonly string[]>>;
  outDir: string;
}): Promise<void> {
  const out = resolve(options.outDir);
  await mkdir(out, { recursive: true });
  const harness = await createHarness({ templates: [options.module], assets: options.cases.flatMap((c) => c.assets), outputRoot: join(out, 'store') });
  const summary: string[] = [];
  const failures: string[] = [];
  try {
    let n = 0;
    for (const built of options.cases) {
      const tiles: Array<{ input: Buffer; width: number }> = [];
      for (const format of FORMATS) {
        const result: RenderResult = await renderOutput({
          taskId: `${String(++n).padStart(8, '0')}-0000-4000-8000-000000000000`, jobId: '44444444-4444-4444-8444-444444444444', attempt: 1,
          format, encodings: ['png', 'jpg'], snapshot: options.snapshotFor(built),
        }, harness.engine);
        summary.push(`${built.name}/${format}: ${result.status}${result.error ? ` ${result.error.code} ${result.error.message}` : ''} fit=${result.diagnostics.fittingSteps} ${result.diagnostics.warnings.join(' | ')}`);
        const expectedToFail = (options.expectedFailures?.[built.name] ?? []).includes(format);
        if (result.status !== 'success') {
          if (expectedToFail) {
            assert.ok(LAYOUT_CODES.includes(result.error!.code), `${built.name}/${format}: ${result.error!.code}`);
            assert.equal(result.artifacts.length, 0, 'no output is published for a failed layout');
            assert.ok(result.diagnostics.fittingSteps > 0, 'fitting was tried before failing');
          } else failures.push(summary.at(-1)!);
          continue;
        }
        if (expectedToFail) { failures.push(`${built.name}/${format}: expected a layout failure but it rendered`); continue; }
        assert.equal(result.artifacts.length, 2);
        for (const artifact of result.artifacts) {
          const bytes = await harness.engine.store.read(artifact.storageKey);
          const meta = await sharp(bytes, { failOn: 'error' }).metadata();
          assert.equal(meta.width, SIZE[format][0]);
          assert.equal(meta.height, SIZE[format][1]);
          await sharp(bytes, { failOn: 'error' }).raw().toBuffer();
        }
        const png = await harness.engine.store.read(result.artifacts.find((a) => a.encoding === 'png')!.storageKey);
        const height = 760;
        const width = Math.round((SIZE[format][0] / SIZE[format][1]) * height);
        tiles.push({ input: await sharp(png).resize(width, height).png().toBuffer(), width });
      }
      if (tiles.length) {
        let left = 20;
        const composite = tiles.map((tile) => { const item = { input: tile.input, left, top: 20 }; left += tile.width + 20; return item; });
        await sharp({ create: { width: left, height: 800, channels: 3, background: '#dddddd' } }).composite(composite).png().toFile(join(out, `${built.name}.png`));
      }
    }
  } finally {
    await harness.close();
  }
  assert.deepEqual(failures, [], summary.join('\n'));
}
