import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
import type {ContractCase} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {circularProductBenefitsSchema} from '../src/circular-product-benefits.js';

const campaignId='d2011111-1111-4111-8111-111111111111';
const facts=[
  {id:'t20-hero-fixture',text:'Removes hair From roots',verified:true as const},
  {id:'t20-benefit-1-fixture',text:'Slows down Hair regrowth',verified:true as const},
  {id:'t20-benefit-2-fixture',text:'Soothes skin After waxing',verified:true as const},
  {id:'t20-benefit-3-fixture',text:'Helps reduce Ingrown bumps',verified:true as const},
  {id:'t20-benefit-4-fixture',text:'Leaves skin soft And smooth',verified:true as const},
];

async function syntheticJar(){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="800" viewBox="0 0 900 800"><defs><linearGradient id="jar" x1="0" x2="1"><stop stop-color="#a9aaa3"/><stop offset=".3" stop-color="#eeeeea"/><stop offset="1" stop-color="#999e97"/></linearGradient></defs><path d="M120 280h660l-30 340q-300 150-600 0z" fill="url(#jar)" stroke="#5b625a" stroke-width="8"/><rect x="95" y="180" width="710" height="150" rx="30" fill="#26332e"/><path d="M110 235h680" stroke="#4e6158" stroke-width="4"/><rect x="240" y="390" width="420" height="180" rx="12" fill="#f7f6f0"/><text x="450" y="470" text-anchor="middle" font-family="Arial" font-size="56" font-weight="700" fill="#252b27">DEMO</text><text x="450" y="530" text-anchor="middle" font-family="Arial" font-size="28" fill="#525a52">SYNTHETIC PRODUCT</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function contractCases():Promise<ContractCase[]>{
  const config=circularProductBenefitsSchema.parse({
    schemaVersion:1,templateId:'circular-product-benefits',productName:'Demonstration wax jar',heroFactId:facts[0]!.id,
    brand:{name:'Waxli',primary:'#f6f5f1',secondary:'#e8e6df',accent:'#252b27',fontHeadingId:'inter',fontBodyId:'inter'},
    copy:{headline:'Soft Hair Removal Wax',cta:'EXPLORE THE PRODUCT',benefits:facts.slice(1).map(f=>({text:f.text,factIds:[f.id]}))},
    assets:[{assetId:'t20-synthetic-jar',role:'product',kind:'cutout',allowCrop:false}],
  });
  return [{name:'synthetic-neutral-five-labels',campaignId,config,assets:[{campaignId,assetId:'t20-synthetic-jar',bytes:await syntheticJar()}],facts,rejects:[
    {name:'crop forbidden',config:{...config,assets:[{...config.assets[0]!,allowCrop:true}]}},
    {name:'two products forbidden',config:{...config,assets:[...config.assets,{assetId:'second',role:'product',kind:'cutout',allowCrop:false}]}},
    {name:'hero repeated in benefits',config:{...config,copy:{...config.copy,benefits:[{text:facts[0]!.text,factIds:[facts[0]!.id]}]}}},
    {name:'unsupported body',config:{...config,copy:{...config.copy,body:'unmapped supporting copy',bodyFactIds:[facts[0]!.id]}}},
    {name:'legacy t20 variables forbidden',config:{...config,t20:{benefitTitles:['unsupported']}}},
    {name:'headline too long',config:{...config,copy:{...config.copy,headline:'a'.repeat(49)}}},
  ]}];
}

/** User-source photo is fixture-only for local fidelity review, not a module/default asset. */
export async function referenceCase():Promise<ContractCase>{
  const [base]=await contractCases();const c=circularProductBenefitsSchema.parse(base!.config);
  const assetId='t20-reference-wax-cutout';
  return {...base!,name:'source-product-neutral-fidelity',config:{...c,assets:[{...c.assets[0]!,assetId}]},assets:[{campaignId,assetId,bytes:await readFile(resolve('../../Template-example/LayerFit_T20_Symmetric_v2/assets/waxli-demo-cutout.png'))}]};
}
