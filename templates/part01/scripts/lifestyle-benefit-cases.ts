import sharp from 'sharp';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { lifestyleBenefitEditorialSchema } from '../src/lifestyle-benefit-editorial.js';

const campaignId = 'd1511111-1111-4111-8111-111111111111';
const facts = [
  { id: 't15-description-fixture', text: 'Comfortabel materiaal, gecombineerd met een minimalistisch ontwerp.', verified: true as const },
  { id: 't15-benefit-comfort-fixture', text: 'Comfortabel materiaal', verified: true as const },
  { id: 't15-benefit-design-fixture', text: 'Minimalistisch ontwerp', verified: true as const },
];

/** Original synthetic tote fixture; visibly marked, no screenshot crop or real logo. */
async function syntheticBag(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="670" viewBox="0 0 900 670"><rect width="900" height="670" fill="#c1c4b4"/><ellipse cx="450" cy="565" rx="230" ry="30" fill="#69715f" opacity=".22"/><path d="M285 230h330l-34 330H319z" fill="#ddc7a2" stroke="#594b39" stroke-width="12"/><path d="M355 238c0-110 45-160 95-160s95 50 95 160" fill="none" stroke="#594b39" stroke-width="24"/><path d="M365 262h170" stroke="#bea47c" stroke-width="8"/><text x="450" y="405" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#22352a">DEMO BAG</text><text x="450" y="453" text-anchor="middle" font-family="Arial" font-size="24" fill="#22352a">SYNTHETIC FIXTURE</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function contractCases(): Promise<ContractCase[]> {
  const assets = [{ campaignId, assetId: 't15-synthetic-bag', bytes: await syntheticBag() }];
  const config = lifestyleBenefitEditorialSchema.parse({
    schemaVersion:1, templateId:'lifestyle-benefit-editorial',
    brand:{name:'LAYERFIT DEMO',primary:'#22352a',secondary:'#e6e3d8',accent:'#d8eb6b',fontHeadingId:'inter',fontBodyId:'inter'},
    copy:{headline:'JOUW DAG. JOUW STIJL.',cta:'ONTDEK DE COLLECTIE',benefits:[]},
    assets:[{assetId:'t15-synthetic-bag',role:'lifestyle',allowCrop:true}],
    t15:{eyebrow:'MADE FOR EVERYDAY',note:'PRODUCT A / 01',descriptionFactId:facts[0]!.id,benefitFactIds:[facts[1]!.id,facts[2]!.id],imageAlt:'Synthetic demo tote bag, fixture only'},
  });
  return [{
    name:'reference-layout-synthetic-photo',campaignId,config,assets,facts,
    rejects:[
      {name:'two photos',config:{...config,assets:[...config.assets,{assetId:'extra',role:'lifestyle',allowCrop:false}]}},
      {name:'unbound free body copy',config:{...config,copy:{...config.copy,body:'unsupported body'}}},
      {name:'legacy free benefits',config:{...config,copy:{...config.copy,benefits:[{text:'claim',factIds:[facts[1]!.id]}]}}},
      {name:'three benefits exceed layout',config:{...config,t15:{...config.t15,benefitFactIds:[facts[1]!.id,facts[2]!.id,facts[1]!.id]}}},
      {name:'empty image alt',config:{...config,t15:{...config.t15,imageAlt:''}}},
    ],
  }];
}
