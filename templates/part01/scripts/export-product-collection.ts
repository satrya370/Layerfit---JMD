import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const out = resolve('../../Template-example/layerfit_t11_product_collection_hero');
await mkdir(join(out, 'assets'), { recursive: true });
await copyFile('src/product-collection-hero.css', join(out, 'styles.css'));
for (let i = 0; i < 3; i++) await copyFile(`artifacts/t11-product-collection/assets/product-${i}.png`, join(out, `assets/product-${i}.png`));
let fontCss = '';
for (const weight of [400, 700, 800]) {
  const name = `inter-latin-${weight}-normal.woff2`;
  // Use the engine's exact local font bytes for pixel-consistent standalone rendering.
  await copyFile(resolve('../../..', 'Layerfit-JMD-engine/node_modules/@fontsource/inter/files', name), join(out, 'assets', name));
  fontCss += `@font-face{font-family:"LF Inter";font-style:normal;font-weight:${weight};src:url("assets/${name}") format("woff2");}\n`;
}
await writeFile(join(out, 'fonts.css'), fontCss);
await copyFile(resolve('../../..', 'Layerfit-JMD-engine/node_modules/@fontsource/inter/LICENSE'), join(out, 'assets/Inter-OFL-LICENSE.txt'));
const example = JSON.parse(await readFile(join(out, 'creative.example.json'), 'utf8'));
if (!Array.isArray(example.productImages) || example.productImages.length !== 3) throw new Error('Invalid export example');
console.log(out);
