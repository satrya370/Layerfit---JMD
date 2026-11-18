// One-off design preview with the user's spa photo (preview only, not a fixture). Output stays in ignored artifacts/.
import { readFile } from 'node:fs/promises';
import { builtCases, snapshotFor } from '../fixtures/templates/atmospheric-editorial/cases.js';
import { renderMatrix } from '../fixtures/templates/render-matrix.js';
import { atmosphericEditorial } from '../src/templates/part02/atmospheric-editorial/index.js';

const photo = await readFile('C:/Users/Asus/Layerfit-JMD/Template-example/T10_Atmospheric_Editorial/assets/demo-spa-photo.png');
const base = (await builtCases())[0]!;
const preview = { ...base, name: 'spa-preview', config: { ...base.config, brand: { ...base.config.brand, name: 'Terra Spa' } }, assets: base.assets.map((a) => ({ ...a, bytes: photo })) };
await renderMatrix({ module: atmosphericEditorial, cases: [preview], snapshotFor, outDir: 'artifacts/templates/atmospheric-editorial-preview' });
console.log('preview done');
