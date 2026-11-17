/**
 * Real engine, real Chromium, synthetic cases: T03 dark-offer-stack in all three formats.
 * Requires CHROMIUM_EXECUTABLE_PATH. Writes outputs and contact sheets to the ignored artifacts/ folder for visual review.
 */
import test from 'node:test';
import { EXPECTED_FAILURES, builtCases, snapshotFor } from '../../fixtures/templates/dark-offer-stack/cases.js';
import { renderMatrix } from '../../fixtures/templates/render-matrix.js';
import { darkOfferStack } from '../../src/templates/part01/dark-offer-stack/index.js';

const SKIP = process.env.CHROMIUM_EXECUTABLE_PATH ? false : 'CHROMIUM_EXECUTABLE_PATH not set; browser integration skipped';

test('T03 renders every synthetic case in square, portrait and vertical with PNG and JPG', { skip: SKIP, timeout: 300_000 }, async () => {
  await renderMatrix({
    module: darkOfferStack, cases: await builtCases(), snapshotFor, expectedFailures: EXPECTED_FAILURES, outDir: 'artifacts/templates/dark-offer-stack',
  });
});
