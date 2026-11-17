import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { templateModule } from '../src/editorial-reframe.js';
import { contractCases } from './editorial-contract-cases.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import type { FontDefinition } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';
import { join as pathJoin } from 'node:path';

const arimoAsInter: Record<string, FontDefinition> = {
  inter: {
    family: 'LF Arimo', fallback: 'sans-serif', licence: 'OFL-1.1',
    faces: [
      { weight: 400, style: 'normal', module: '@fontsource/arimo/files/arimo-latin-400-normal.woff2' },
      { weight: 700, style: 'normal', module: '@fontsource/arimo/files/arimo-latin-700-normal.woff2' },
    ],
  },
};

const cases = await contractCases();
const reference = cases.find((item) => item.name === 'reference-example')!;
const harness = await createHarness({
  outputRoot: join(resolve('artifacts/t04-engine-port'), `store-probe-${randomUUID()}`),
  templates: [templateModule], assets: reference.assets,
  fontRegistry: arimoAsInter,
  fontResolve: (specifier) => pathJoin(process.cwd(), 'node_modules', specifier),
});
try {
  const result = await renderOutput({
    taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format: 'square', encodings: ['png'],
    snapshot: {
      schemaVersion: 1, campaignId: reference.campaignId, creativeId: 'd1111111-1111-4111-8111-111111111111', revision: 1,
      templateId: templateModule.id, templateVersion: templateModule.version, language: 'nl', config: reference.config, facts: reference.facts,
    },
  }, harness.engine);
  console.log(JSON.stringify(result.diagnostics, null, 2));
} finally { await harness.close(); }
