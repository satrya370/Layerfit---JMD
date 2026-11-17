/**
 * Real engine, real Chromium, synthetic cases: T05 split-composition in all three formats.
 * Requires CHROMIUM_EXECUTABLE_PATH. Writes outputs and contact sheets to the ignored artifacts/ folder for visual review.
 */
import test from 'node:test';
import { EXPECTED_FAILURES, builtCases, snapshotFor } from '../../fixtures/templates/split-composition/cases.js';
import { renderMatrix } from '../../fixtures/templates/render-matrix.js';
import { splitComposition } from '../../src/templates/part02/split-composition/index.js';

const SKIP = process.env.CHROMIUM_EXECUTABLE_PATH ? false : 'CHROMIUM_EXECUTABLE_PATH not set; browser integration skipped';

test('T05 renders every synthetic case in square, portrait and vertical with PNG and JPG', { skip: SKIP, timeout: 300_000 }, async () => {
  await renderMatrix({
    module: splitComposition, cases: await builtCases(), snapshotFor, expectedFailures: EXPECTED_FAILURES, outDir: 'artifacts/templates/split-composition',
  });
});
