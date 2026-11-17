/**
 * Two synthetic briefs (apparel and reusable bottle). All products, facts, prices and photos are invented for
 * simulation only. No LayerFit or competitor assets are used.
 */
import sharp from 'sharp';
import type { RenderSnapshot, TemplateConfig } from '../../src/shared/render-contract.js';
import type { AssetRecord } from '../../src/server/assets/resolve-render-assets.js';

export const SIM = {
  shirt: { campaignId: '11111111-1111-4111-8111-111111111111', creativeId: 'a1111111-1111-4111-8111-111111111111', photoAssetId: 'shirt-photo' },
  bottle: { campaignId: '22222222-2222-4222-8222-222222222222', creativeId: 'b2222222-2222-4222-8222-222222222222', photoAssetId: 'bottle-photo' },
} as const;

const FACT = {
  shirtCotton: '33333333-3333-4333-8333-333333333301',
  shirtCrew: '33333333-3333-4333-8333-333333333302',
  bottleReusable: '33333333-3333-4333-8333-333333333303',
  bottleSteel: '33333333-3333-4333-8333-333333333304',
} as const;

const SHIRT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><path d="M220 70L90 170 20 360 160 420 210 320 180 840 520 840 490 320 540 420 680 360 610 170 480 70 390 120 310 120Z" fill="#385d4b"/><path d="M310 120Q350 220 390 120" fill="none" stroke="#c4d6c8" stroke-width="18"/></svg>`;
const BOTTLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect x="270" y="60" width="160" height="100" rx="20" fill="#283640"/><rect x="190" y="140" width="320" height="680" rx="92" fill="#dc8452"/><rect x="220" y="330" width="260" height="190" rx="20" fill="#faeddf"/><circle cx="350" cy="425" r="50" fill="#283640"/></svg>`;

export interface Brief {
  snapshot: Omit<RenderSnapshot, 'config'> & { config: TemplateConfig };
  assets: AssetRecord[];
}

export async function simulatedBriefs(): Promise<{ shirt: Brief; bottle: Brief }> {
  const shirtPhoto = await sharp(Buffer.from(SHIRT_SVG)).png().toBuffer();
  const bottlePhoto = await sharp(Buffer.from(BOTTLE_SVG)).png().toBuffer();
  const shirt: Brief = {
    snapshot: {
      schemaVersion: 1, campaignId: SIM.shirt.campaignId, creativeId: SIM.shirt.creativeId, revision: 1,
      templateId: 'fixture-hero', templateVersion: '0.1.0', language: 'nl',
      config: {
        schemaVersion: 1, templateId: 'fixture-hero',
        brand: { name: 'Atelier Sample', primary: '#304b3a', secondary: '#edf1e8', accent: '#b85f30', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
        copy: {
          headline: 'Een eenvoudig dagelijks shirt',
          cta: 'Bekijk het shirt',
          benefits: [
            { text: 'Katoen', factIds: [FACT.shirtCotton] },
            { text: 'Ronde hals', factIds: [FACT.shirtCrew] },
          ],
        },
        assets: [{ assetId: SIM.shirt.photoAssetId, role: 'product', allowCrop: false }],
      },
      facts: [
        { id: FACT.shirtCotton, text: 'Gemaakt van katoen', verified: true },
        { id: FACT.shirtCrew, text: 'Shirt met ronde hals', verified: true },
      ],
    },
    assets: [{ campaignId: SIM.shirt.campaignId, assetId: SIM.shirt.photoAssetId, bytes: shirtPhoto }],
  };
  const bottle: Brief = {
    snapshot: {
      schemaVersion: 1, campaignId: SIM.bottle.campaignId, creativeId: SIM.bottle.creativeId, revision: 1,
      templateId: 'fixture-hero', templateVersion: '0.1.0', language: 'nl',
      config: {
        schemaVersion: 1, templateId: 'fixture-hero',
        brand: { name: 'Terra Sample', primary: '#a85832', secondary: '#f6ebdf', accent: '#304b3a', fontHeadingId: 'inter', fontBodyId: 'inter' },
        copy: {
          headline: 'Een fles voor dagelijks gebruik',
          cta: 'Bekijk de fles',
          benefits: [
            { text: 'Herbruikbaar', factIds: [FACT.bottleReusable] },
            { text: 'Roestvrij staal', factIds: [FACT.bottleSteel] },
          ],
        },
        assets: [{ assetId: SIM.bottle.photoAssetId, role: 'product', allowCrop: false }],
      },
      facts: [
        { id: FACT.bottleReusable, text: 'Herbruikbare fles', verified: true },
        { id: FACT.bottleSteel, text: 'Gemaakt van roestvrij staal', verified: true },
      ],
    },
    assets: [{ campaignId: SIM.bottle.campaignId, assetId: SIM.bottle.photoAssetId, bytes: bottlePhoto }],
  };
  return { shirt, bottle };
}
