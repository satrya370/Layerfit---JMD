import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { questionHookSchema } from '../src/question-hook.js';

const campaignId = '66666666-6666-4666-8666-666666666666';
const referenceAssetId = 't06-demo-product';

/** User-supplied T06 example content and image, for layout reproduction only. Not a real product claim. */
export async function contractCases(): Promise<ContractCase[]> {
  const assets = [{
    campaignId, assetId: referenceAssetId,
    bytes: await readFile(resolve('../../Template-example/T06_Question_Hook/assets/demo-product.png')),
  }];
  const config = questionHookSchema.parse({
    schemaVersion: 1, templateId: 'question-hook',
    brand: { name: 'LAYERFIT', primary: '#1c3129', secondary: '#f5f0e7', accent: '#ef6744', fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: { headline: 'OP ZOEK NAAR IETS DAT PAST?', accentPhrase: 'IETS DAT PAST?', cta: 'BEKIJK PRODUCT', benefits: [] },
    assets: [{ assetId: referenceAssetId, role: 'product', allowCrop: true }],
    t06: {
      brandRight: 'PRODUCT IN BEELD', eyebrow: 'EVEN EEN VRAAGJE',
      headlineLead: 'OP ZOEK NAAR', headlineAccent: 'IETS DAT PAST?',
      photoCaption: 'MAAK KENNIS MET PRODUCT A', footerNote: 'ONTDEK MEER OVER HET PRODUCT',
      descriptionFactId: 't06-description', featureFactIds: [], imageAlt: 'Product A — voorbeeldfoto',
    },
  });
  return [{
    name: 'reference-example-layout-only', campaignId, config, assets, formats: ['square', 'portrait', 'vertical'],
    facts: [{ id: 't06-description', text: 'Maak kennis met Product A. Bekijk het product en ontdek de details.', verified: true }],
    rejects: [
      { name: 'question-hook extension missing', config: { ...config, t06: undefined } },
      { name: 'unknown t06 field', config: { ...config, t06: { ...config.t06, arbitraryHtml: '<script>x</script>' } } },
    ],
  }];
}
