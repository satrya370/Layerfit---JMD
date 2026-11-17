import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { everydayEditorialSchema } from '../src/everyday-editorial.js';

const campaignId = '77777777-7777-4777-8777-777777777777';
export async function contractCases(): Promise<ContractCase[]> {
  const config = everydayEditorialSchema.parse({
    schemaVersion: 1, templateId: 'everyday-editorial',
    brand: { name: 'LAYERFIT', primary: '#1f2724', secondary: '#f4f0e9', accent: '#d44f36', fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: { headline: 'Schoonmaken. Op jouw manier.', cta: 'BEKIJK DE COMBINATIE', benefits: [] },
    assets: [{ assetId: 't07-lifestyle-v3', role: 'lifestyle', allowCrop: true }],
    t07: {
      kicker: 'PRODUCT IN BEELD', eyebrow: 'VOOR IN HUIS', headlineLines: ['Schoonmaken.', 'Op jouw manier.'],
      descriptionFactId: 't07-v3-description', photoCaption: 'DE COMBINATIE IN ACTIE', productLabel: 'ONTDEK HET PRODUCT',
      featureFactIds: ['t07-v3-feature-1', 't07-v3-feature-2'], imageAlt: 'Handstofzuiger bij een stoel, robotstofzuiger op de vloer', imagePosition: '50-48',
    },
  });
  return [{
    name: 'reference-layout-only', campaignId, config, formats: ['square', 'portrait', 'vertical'],
    assets: [{ campaignId, assetId: 't07-lifestyle-v3', bytes: await readFile(resolve('../../Template-example/layerfit_t07_lifestyle_benefit_v3/assets/demo-lifestyle.jpg')) }],
    facts: [
      { id: 't07-v3-description', text: 'Bekijk de combinatie van een robotstofzuiger en een handstofzuiger.', verified: true },
      { id: 't07-v3-feature-1', text: 'Robotstofzuiger', verified: true },
      { id: 't07-v3-feature-2', text: 'Handstofzuiger', verified: true },
    ],
    rejects: [
      { name: 'missing T07 extension', config: { ...config, t07: undefined } },
      { name: 'invalid focal position', config: { ...config, t07: { ...config.t07, imagePosition: '45% 50%' } } },
      { name: 'headline extension mismatch', config: { ...config, t07: { ...config.t07, headlineLines: ['not aligned'] } } },
      { name: 'unknown copy field', config: { ...config, copy: { ...config.copy, injected: '<script>x</script>' } } },
    ],
  }];
}
