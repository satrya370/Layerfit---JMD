import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {ContractCase} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {afterDarkEditorialSchema} from '../src/after-dark-editorial.js';

const campaignId='d1911111-1111-4111-8111-111111111111';
const facts=[
  {id:'t19-event-details-fixture',text:'A good night starts at the table.',verified:true as const},
  {id:'t19-table-benefit-fixture',text:'A good night starts at the table.',verified:true as const},
  {id:'t19-opening-fixture',text:'ONE NIGHT ONLY',verified:true as const},
  {id:'t19-date-fixture',text:'THU / APR 18',verified:true as const},
  {id:'t19-time-fixture',text:'7:30 PM — LATE',verified:true as const},
  {id:'t19-address-fixture',text:'38 MAIN ST.',verified:true as const},
];

/** Synthetic food-table scene fixture; source food-demo.jpg is a reference crop and is not reused. */
async function syntheticFoodScene(){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#7b4a38"/><path d="M0 620h1200v280H0z" fill="#4c2634"/><path d="M0 650h1200M0 720h1200M0 790h1200" stroke="#b17957" stroke-width="8" opacity=".45"/><ellipse cx="610" cy="475" rx="340" ry="220" fill="#f8f0e3" stroke="#e26c47" stroke-width="22"/><ellipse cx="610" cy="475" rx="280" ry="166" fill="#d6b184"/><circle cx="510" cy="430" r="55" fill="#b64b36"/><circle cx="680" cy="510" r="62" fill="#66804a"/><path d="M430 490c110-80 260-90 350-5" fill="none" stroke="#f4d178" stroke-width="34" stroke-linecap="round"/><text x="600" y="830" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#f8f0e3">SYNTHETIC DEMO SCENE</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function contractCases():Promise<ContractCase[]>{
  const asset={campaignId,assetId:'t19-synthetic-food-scene',bytes:await syntheticFoodScene()};
  const config=afterDarkEditorialSchema.parse({
    schemaVersion:1,templateId:'after-dark-editorial',productName:'THE TABLE IS SET.',heroFactId:facts[2]!.id,
    brand:{name:'KYKLOS / AFTER DARK',primary:'#3a2229',secondary:'#f8f0e3',accent:'#e26c47',fontHeadingId:'inter',fontBodyId:'fraunces'},
    copy:{eyebrow:'FOOD · DRINKS · PEOPLE',headline:'SOUVLAKI, WINE & LATE NIGHTS.',accentPhrase:'LATE NIGHTS.',body:facts[0]!.text,bodyFactIds:[facts[0]!.id],cta:'SAVE THE DATE',benefits:facts.slice(3).map(f=>({text:f.text,factIds:[f.id]}))},
    assets:[{assetId:asset.assetId,role:'lifestyle',kind:'scene',allowCrop:true}],
  });
  return [{name:'event-poster-normalized-config-synthetic-scene',campaignId,config,assets:[asset],facts,rejects:[
    {name:'multiple photos unsupported',config:{...config,assets:[...config.assets,{assetId:'extra',role:'lifestyle',kind:'scene',allowCrop:false}]}},
    {name:'cutout crop forbidden',config:{...config,assets:[{...config.assets[0]!,kind:'cutout'}]}},
    {name:'body without verified refs',config:{...config,copy:{...config.copy,bodyFactIds:undefined}}},
    {name:'body fact refs without body',config:{...config,copy:{...config.copy,body:undefined}}},
    {name:'too many footer facts',config:{...config,copy:{...config.copy,benefits:[...config.copy.benefits,{text:'extra',factIds:[facts[1]!.id]}]}}},
  ]}];
}

/** User-requested local reference-photo comparison only; never a production default asset. */
export async function referenceCase():Promise<ContractCase>{
  const [base]=await contractCases();
  const config=afterDarkEditorialSchema.parse(base!.config);
  return {...base!,config:{...config,assets:[{...config.assets[0]!,assetId:'t19-reference-food'}]},name:'source-reference-photo-fixture',assets:[{campaignId,assetId:'t19-reference-food',bytes:await readFile(resolve('../../Template-example/t19/assets/food-demo.jpg'))}]};
}
