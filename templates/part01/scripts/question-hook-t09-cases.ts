import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { questionHookT09Schema } from '../src/question-hook-t09.js';

const campaignId = '99999999-9999-4999-8999-999999999999';
const sourceDir = resolve('../../Template-example/layerfit-t09-question-hook');
const headlineScale = (headline: string): 'xl' | 'lg' | 'md' => headline.trim().length <= 16 ? 'xl' : headline.trim().length <= 26 ? 'lg' : 'md';

/** Demo claims/assets from the user-supplied examples, kept strictly to local fidelity fixtures. */
export async function contractCases(): Promise<ContractCase[]> {
  const headphone = await readFile(resolve(sourceDir, 'assets/headphone.png'));
  const logoSvg = await readFile(resolve(sourceDir, 'assets/soniq-logo.svg'));
  const logoPng = await sharp(logoSvg, { density: 192 }).png().toBuffer(); // SVG never reaches the engine resolver.
  const robot = await readFile(resolve(sourceDir, 'assets/robot-vacuum-demo.jpg'));
  const soniqHeadline = 'Klaar met kabels?';
  const soniq = questionHookT09Schema.parse({
    schemaVersion: 1, templateId: 'question-hook-t09',
    brand: { name: 'SONIQ', logoAssetId: 't09-soniq-logo', primary: '#16181d', secondary: '#1e2129', accent: '#c8f135', fontHeadingId: 'montserrat', fontBodyId: 'inter' },
    copy: { headline: soniqHeadline, cta: 'Shop nu', benefits: [] },
    assets: [{ assetId: 't09-headphone', role: 'product', allowCrop: false }],
    t09: { descriptionFactId: 't09-soniq-description', featureFactIds: ['t09-soniq-feature-1', 't09-soniq-feature-2', 't09-soniq-feature-3'], imageAlt: 'Zwarte draadloze over-ear koptelefoon', imageMode: 'contain', headlineScale: headlineScale(soniqHeadline) },
  });
  const altHeadline = 'Verveeld door stof?';
  const toni = questionHookT09Schema.parse({
    schemaVersion: 1, templateId: 'question-hook-t09',
    brand: { name: 'TONI HOMI', primary: '#1b2a4a', secondary: '#24365c', accent: '#ff6a5a', fontHeadingId: 'montserrat', fontBodyId: 'inter' },
    copy: { headline: altHeadline, cta: 'Bekijk aanbod', benefits: [] },
    assets: [{ assetId: 't09-robot-photo', role: 'lifestyle', allowCrop: true }],
    t09: { descriptionFactId: 't09-toni-description', featureFactIds: ['t09-toni-feature-1', 't09-toni-feature-2', 't09-toni-feature-3'], imageAlt: 'Robotstofzuiger op houten vloer', imageMode: 'cover', headlineScale: headlineScale(altHeadline) },
  });
  const soniqFacts = [
    { id: 't09-soniq-description', text: 'Ontmoet de SONIQ Air Pro — draadloos geluid, zonder gedoe, waar je ook bent.', verified: true as const },
    { id: 't09-soniq-feature-1', text: 'Actieve ruisonderdrukking', verified: true as const },
    { id: 't09-soniq-feature-2', text: '40 uur accuduur', verified: true as const },
    { id: 't09-soniq-feature-3', text: 'IPX5 waterbestendig', verified: true as const },
  ];
  const toniFacts = [
    { id: 't09-toni-description', text: 'Slimme robotstofzuigers die zelf schoonmaken. Jij ontspant.', verified: true as const },
    { id: 't09-toni-feature-1', text: 'Pakt lange haren', verified: true as const },
    { id: 't09-toni-feature-2', text: 'Geen gesjouw', verified: true as const },
    { id: 't09-toni-feature-3', text: 'Automatisch schoon', verified: true as const },
  ];
  return [
    {
      name: 'soniq-reference-layout-only', campaignId, config: soniq, formats: ['square', 'portrait', 'vertical'], facts: soniqFacts,
      assets: [
        { campaignId, assetId: 't09-headphone', bytes: headphone },
        { campaignId, assetId: 't09-soniq-logo', bytes: logoPng },
      ],
      rejects: [
        { name: 'cover without crop permission', config: { ...soniq, t09: { ...soniq.t09, imageMode: 'cover' }, assets: soniq.assets.map((asset) => ({ ...asset, allowCrop: false })) } },
        { name: 'unknown T09 extension key', config: { ...soniq, t09: { ...soniq.t09, rawCss: 'background:url(https://bad)' } } },
      ],
    },
    {
      name: 'toni-reference-layout-only', campaignId, config: toni, formats: ['square', 'portrait', 'vertical'], facts: toniFacts,
      assets: [{ campaignId, assetId: 't09-robot-photo', bytes: robot }],
    },
  ];
}
