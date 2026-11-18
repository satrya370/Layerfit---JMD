import sharp from 'sharp';
import type {ContractCase} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {mediterraneanFashionPosterSchema} from '../src/mediterranean-fashion-poster.js';

const campaignId='d1811111-1111-4111-8111-111111111111';
const linenFacts=[
  {id:'t18-linen-headline',text:'LINNEN, ZON & LATE ZOMERS',verified:true as const},
  {id:'t18-linen-accent',text:'Winterzon Editie',verified:true as const},
  {id:'t18-linen-badge',text:'LIMITED EDITIE',verified:true as const},
  {id:'t18-linen-offer',text:'VANAF € 24,95',verified:true as const},
  {id:'t18-linen-date',text:'T/M ZO 29 NOV.',verified:true as const},
  {id:'t18-linen-event',text:'-30% ONLINE',verified:true as const},
];
const denimFacts=[
  {id:'t18-denim-headline',text:'DENIM, WOL & AVONDEN',verified:true as const},
  {id:'t18-denim-accent',text:'Nieuw Binnen',verified:true as const},
  {id:'t18-denim-badge',text:'LIMITED DROP',verified:true as const},
  {id:'t18-denim-offer',text:'VANAF € 49,95',verified:true as const},
  {id:'t18-denim-date',text:'NU IN DE WINKEL',verified:true as const},
  {id:'t18-denim-event',text:'GRATIS RETOUR',verified:true as const},
];

async function syntheticFashionAsset(kind:'linen'|'denim'){
  const garment=kind==='linen'?'#e9e1cf':'#34465f';
  const detail=kind==='linen'?'#b9a989':'#192b42';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><rect width="900" height="1200" fill="#d9d0bd"/><path d="M0 810h900v390H0z" fill="#8c8068"/><ellipse cx="450" cy="1000" rx="220" ry="40" fill="#554d40" opacity=".25"/><path d="M305 300l145-90 145 90 125 190-100 80-65-85v400H345V485l-65 85-100-80z" fill="${garment}" stroke="${detail}" stroke-width="15"/><path d="M450 210v675M305 300l145 95 145-95" fill="none" stroke="${detail}" stroke-width="8"/><rect x="300" y="520" width="300" height="130" rx="8" fill="#f4eee1"/><text x="450" y="575" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#27231b">DEMO ${kind.toUpperCase()}</text><text x="450" y="620" text-anchor="middle" font-family="Arial" font-size="22" fill="#5a605a">SYNTHETIC FIXTURE</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function contractCases():Promise<ContractCase[]>{
  const linenBytes=await syntheticFashionAsset('linen'); const denimBytes=await syntheticFashionAsset('denim');
  const linenAsset={campaignId,assetId:'t18-synthetic-linen',bytes:linenBytes};
  const denimAsset={campaignId,assetId:'t18-synthetic-denim',bytes:denimBytes};
  const base={
    schemaVersion:1 as const,templateId:'mediterranean-fashion-poster',
    brand:{name:'ELIA',primary:'#27231b',secondary:'#f4eee1',accent:'#b3401f',fontHeadingId:'montserrat',fontBodyId:'inter'},
    copy:{headline:linenFacts[0]!.text,cta:'SHOP DE COLLECTIE',benefits:[]},
    assets:[{assetId:linenAsset.assetId,role:'lifestyle',allowCrop:true}],
    offerFactId:linenFacts[3]!.id,
    t18:{headlineFactId:linenFacts[0]!.id,headlineLines:['LINNEN,','ZON & LATE','ZOMERS'],accentLineFactId:linenFacts[1]!.id,badgeFactId:linenFacts[2]!.id,badgeLines:['LIMITED','EDITIE'],eventDateFactId:linenFacts[4]!.id,eventTimeFactId:linenFacts[5]!.id,imageAlt:'Synthetic demo linen outfit, fixture only',imageMode:'cover',texture:true,midColor:'#5f6b3a',goldColor:'#bc8a2e',onAccentColor:'#f6efe0'},
  };
  const linenConfig=mediterraneanFashionPosterSchema.parse(base);
  const linen:ContractCase={name:'linen-promo-synthetic-demo',campaignId,config:linenConfig,assets:[linenAsset],facts:linenFacts,rejects:[
    {name:'headline text differs from fact',config:{...base,copy:{...base.copy,headline:'INVENTED PRODUCT CLAIM'}}},
    {name:'uncropped image cannot request cover',config:{...base,assets:[{...base.assets[0]!,allowCrop:false}]}},
    {name:'multiple assets unsupported',config:{...base,assets:[...base.assets,{assetId:'extra',role:'product',allowCrop:false}]}},
    {name:'legacy generic benefits unsupported',config:{...base,copy:{...base.copy,benefits:[{text:'claim',factIds:[linenFacts[4]!.id]}]}}},
    {name:'arbitrary image mode rejected',config:{...base,t18:{...base.t18,imageMode:'fill'}}},
  ]};
  const denimBase={...base,brand:{...base.brand,name:'NOORD',primary:'#232b3a',secondary:'#f1ebdf',accent:'#b3541e'},copy:{...base.copy,headline:denimFacts[0]!.text,cta:'SHOP NU ONLINE'},assets:[{assetId:denimAsset.assetId,role:'lifestyle',allowCrop:true}],offerFactId:denimFacts[3]!.id,t18:{...base.t18,headlineFactId:denimFacts[0]!.id,headlineLines:['DENIM,','WOL &','AVONDEN'],accentLineFactId:denimFacts[1]!.id,badgeFactId:denimFacts[2]!.id,badgeLines:['LIMITED','DROP'],eventDateFactId:denimFacts[4]!.id,eventTimeFactId:denimFacts[5]!.id,imageAlt:'Synthetic demo denim outfit, fixture only',midColor:'#3e5c8a',goldColor:'#c0912f',onAccentColor:'#f5efe2'}};
  const denim:ContractCase={name:'denim-promo-synthetic-demo',campaignId,config:mediterraneanFashionPosterSchema.parse(denimBase),assets:[denimAsset],facts:denimFacts};
  return [linen,denim];
}
