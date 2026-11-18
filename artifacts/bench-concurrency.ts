// Measures render throughput: 9 outputs (3 creatives x 3 formats) sequential vs 3 at a time in one browser. Scratch only.
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHarness } from '../fixtures/engine/harness.js';
import { builtCases, snapshotFor } from '../fixtures/templates/minimal-discount/cases.js';
import { renderOutput } from '../src/server/render/render-output.js';
import { minimalDiscount } from '../src/templates/part02/minimal-discount/index.js';
import type { Format } from '../src/shared/render-contract.js';

const FORMATS: Format[] = ['square', 'portrait', 'vertical'];
const cases = await builtCases();
let n = 0;

async function run(label: string, concurrency: number) {
  const root = resolve('artifacts/verify-scratch/bench', label);
  await rm(root, { recursive: true, force: true });
  const harness = await createHarness({ templates: [minimalDiscount], assets: cases.flatMap((c) => c.assets), outputRoot: root });
  // Warm-up: browser launch and font load are paid once per worker, not per image.
  await renderOutput({ taskId: `${String(++n).padStart(8, '0')}-0000-4000-8000-000000000000`, jobId: '44444444-4444-4444-8444-444444444444', attempt: 1, format: 'square', encodings: ['png', 'jpg'], snapshot: { ...snapshotFor(cases[0]!), creativeId: 'c0000000-0000-4000-8000-000000000000' } }, harness.engine);
  const tasks = cases.flatMap((c, i) => FORMATS.map((format) => () => renderOutput({
    taskId: `${String(++n).padStart(8, '0')}-0000-4000-8000-000000000000`, jobId: '44444444-4444-4444-8444-444444444444', attempt: 1, format, encodings: ['png', 'jpg'],
    snapshot: { ...snapshotFor(c), creativeId: `c${label === 'seq' ? '1' : '2'}000000-0000-4000-8000-00000000000${i}` },
  }, harness.engine)));
  const started = performance.now();
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) results.push(...await Promise.all(tasks.slice(i, i + concurrency).map((t) => t())));
  const ms = performance.now() - started;
  await harness.close();
  const ok = results.filter((r) => r.status === 'success').length;
  const per = results.map((r) => r.diagnostics.durationMs);
  console.log(`${label}: ${ok}/${results.length} success, wall ${Math.round(ms)} ms, ${Math.round(ms / results.length)} ms per image, task durations ${Math.min(...per)}-${Math.max(...per)} ms`);
  for (const r of results) if (r.status !== 'success') console.log('  fail', r.format, r.error?.code, r.error?.message);
}

await run('seq', 1);
await run('par3', 3);
