import sharp from 'sharp';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { editorialSalePromoSchema } from '../src/editorial-sale-promo.js';

const campaignId='d1311111-1111-4111-8111-111111111111';
const facts=[
  {id:'t13-promo-fixture',text:'30% korting',verified:true as const},
  {id:'t13-description-fixture',text:'Ontdek Product A met comfortabel materiaal en een minimalistisch ontwerp.',verified:true as const},
  {id:'t13-terms-fixture',text:'Actievoorwaarden zijn van toepassing.',verified:true as const},
];

/** Synthetic package silhouette for fixture renders only; no product or brand is implied. */
async function syntheticProduct(){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1050" viewBox="0 0 760 1050"><rect width="760" height="1050" fill="#d8d4ca"/><ellipse cx="380" cy="910" rx="220" ry="38" fill="#77796e" opacity=".2"/><path d="M240 180h280l55 650H185z" fill="#b9aa8e" stroke="#615b4f" stroke-width="15"/><rect x="280" y="240" width="200" height="150" rx="10" fill="#f2eee7"/><text x="380" y="315" text-anchor="middle" font-family="Arial" font-weight="700" font-size="34" fill="#252b27">DEMO</text><text x="380" y="360" text-anchor="middle" font-family="Arial" font-size="22" fill="#5a605a">FIXTURE ONLY</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function contractCases():Promise<ContractCase[]>{
  const assets=[{campaignId,assetId:'t13-synthetic-product',bytes:await syntheticProduct()}];
  const config=editorialSalePromoSchema.parse({
    schemaVersion:1,templateId:'editorial-sale-promo',
    brand:{name:'LAYERFIT DEMO',primary:'#252b27',secondary:'#f2eee7',accent:'#b64b36',fontHeadingId:'inter',fontBodyId:'inter'},
    copy:{headline:'Een mooie deal.',cta:'BEKIJK DE ACTIE',benefits:[]},
    assets:[{assetId:'t13-synthetic-product',role:'product',allowCrop:false}],
    offerFactId:facts[0]!.id,
    t13:{campaignLabel:'DE SELECTIE / PRODUCT A',eyebrow:'EEN SPECIALE AANBIEDING',discountWord:'KORTING',descriptionFactId:facts[1]!.id,finePrintFactId:facts[2]!.id,imageAlt:'Synthetic demo product, test fixture only',demoMode:true,demoLabel:'DEMO · GEEN ECHTE ACTIE'},
  });
  return [{name:'editorial-sale-reference-synthetic-product',campaignId,config,assets,facts,rejects:[
    {name:'missing verified promotion id',config:{...config,offerFactId:undefined}},
    {name:'multiple photos',config:{...config,assets:[...config.assets,{assetId:'second',role:'product',allowCrop:false}]}},
    {name:'legacy free body copy',config:{...config,copy:{...config.copy,body:'unsupported body'}}},
    {name:'legacy benefit chips',config:{...config,copy:{...config.copy,benefits:[{text:'claim',factIds:[facts[1]!.id]}]}}},
    {name:'empty alt',config:{...config,t13:{...config.t13,imageAlt:''}}},
    {name:'invalid palette extension',config:{...config,t13:{...config.t13,photoBackground:'url(javascript:alert(1))'}}},
  ]}];
}
