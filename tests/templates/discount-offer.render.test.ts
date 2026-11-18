/**
 * Real engine, real Chromium, synthetic cases: T16 discount-offer in all three formats.
 * Requires CHROMIUM_EXECUTABLE_PATH. Writes outputs and contact sheets to the ignored artifacts/ folder.
 */
import test from 'node:test';
import { builtCases, snapshotFor } from '../../fixtures/templates/discount-offer/cases.js';
import { renderMatrix } from '../../fixtures/templates/render-matrix.js';
import { discountOffer } from '../../src/templates/part02/discount-offer/index.js';

const SKIP = process.env.CHROMIUM_EXECUTABLE_PATH ? false : 'CHROMIUM_EXECUTABLE_PATH not set; browser integration skipped';

test('T16 renders every synthetic case in square, portrait and vertical with PNG and JPG', { skip: SKIP, timeout: 300_000 }, async () => {
  await renderMatrix({ module: discountOffer, cases: await builtCases(), snapshotFor, outDir: 'artifacts/templates/discount-offer' });
});
