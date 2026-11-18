/**
 * Real engine, real Chromium, synthetic cases: T17 minimal-discount in all three formats.
 * Requires CHROMIUM_EXECUTABLE_PATH. Writes outputs and contact sheets to the ignored artifacts/ folder.
 */
import test from 'node:test';
import { builtCases, snapshotFor } from '../../fixtures/templates/minimal-discount/cases.js';
import { renderMatrix } from '../../fixtures/templates/render-matrix.js';
import { minimalDiscount } from '../../src/templates/part02/minimal-discount/index.js';

const SKIP = process.env.CHROMIUM_EXECUTABLE_PATH ? false : 'CHROMIUM_EXECUTABLE_PATH not set; browser integration skipped';

test('T17 renders every synthetic case in square, portrait and vertical with PNG and JPG', { skip: SKIP, timeout: 300_000 }, async () => {
  await renderMatrix({ module: minimalDiscount, cases: await builtCases(), snapshotFor, outDir: 'artifacts/templates/minimal-discount' });
});
