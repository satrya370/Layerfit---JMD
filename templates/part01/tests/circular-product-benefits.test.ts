import assert from 'node:assert/strict';
import test from 'node:test';
import {checkTemplateContract} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {FORMAT_PROFILES,isCanonicalSlot,type ResolvedAsset} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {templateModule,circularProductBenefitsSchema,splitBenefitText} from '../src/circular-product-benefits.js';
import {contractCases} from '../scripts/circular-product-benefits-cases.js';

const cases=await contractCases();
function fixture(){
  const item=cases[0]!;const config=circularProductBenefitsSchema.parse(item.config);
  const photo:ResolvedAsset={assetId:config.assets[0]!.assetId,role:'product',kind:'cutout',allowCrop:false,mime:'image/png',width:900,height:800,sha256:'fixture',src:'data:image/png;base64,fixture'};
  return {item,config,input:{format:'portrait' as const,profile:FORMAT_PROFILES.portrait,config,photos:[photo],facts:new Map(item.facts.map(f=>[f.id,f]))}};
}

test('T20 canonical model passes kit with documented source-inset warnings only',async()=>{
  const report=await checkTemplateContract(templateModule,cases,{strict:false});
  assert.equal(report.counts.fail,0,JSON.stringify(report.checks.filter(c=>c.status==='fail')));
  assert.ok(report.checks.filter(c=>c.status==='warn').every(c=>c.id==='css.tokens'));
  assert.ok(templateModule.slots.every(s=>isCanonicalSlot(s.name)));
  const c=circularProductBenefitsSchema.parse(cases[0]!.config);
  assert.ok(!Object.hasOwn(c,'t20')&&!Object.hasOwn(c.copy,'headlineLines'));
});

test('T20 preserves five radial labels through hero + four benefits, without invented wording',()=>{
  const {input}=fixture();const output=templateModule.render(input);const body=output.body.toString();
  for(const name of ['top','mid-left','mid-right','bottom-left','bottom-right'])assert.ok(body.includes(`benefit--${name}`));
  assert.ok(body.includes('data-slot="offer"')&&body.includes('data-slot="benefits"'));
  assert.ok(body.includes('data-slot="brand"')&&body.includes('data-slot="headline"')&&body.includes('data-slot="cta"'));
  assert.ok(body.includes('data-image-fit="contain"')&&!body.includes('data-allow-crop'));
  for(const value of ['Slows down Hair regrowth','Leaves skin soft And smooth']){
    const {title,subtitle}=splitBenefitText(value);assert.equal(`${title} ${subtitle}`,value);
  }
  assert.ok(output.css.includes('--bg: var(--lf-brand-primary)')||output.css.includes('--bg:var(--lf-brand-primary)'));
  assert.ok(!output.css.includes('#e65b62')&&!output.css.includes('#fa7b71'),'no hardcoded pink palette');
  assert.equal(input.config.brand.primary,'#f6f5f1');assert.equal(input.config.brand.accent,'#252b27');
});

test('T20 fails closed for missing/unverified benefit facts; omits missing facts, supports logo and escapes CTA',()=>{
  const {item,input}=fixture();
  assert.throws(()=>templateModule.render({...input,facts:new Map()}),/verified fact missing/);
  const falseFacts=new Map(item.facts.map(f=>[f.id,{...f,verified:false as const}]));
  // @ts-expect-error runtime guard against invalid snapshot
  assert.throws(()=>templateModule.render({...input,facts:falseFacts}),/verified fact missing/);
  for(const r of item.rejects??[])assert.equal(circularProductBenefitsSchema.safeParse(r.config).success,false,r.name);
  const minimal={...input.config,heroFactId:undefined,copy:{...input.config.copy,benefits:[]}};
  assert.ok(!templateModule.render({...input,config:minimal}).body.toString().includes('data-slot="offer"'));
  const logo:ResolvedAsset={...input.photos[0]!,role:'logo',assetId:'t20-logo'};
  assert.ok(templateModule.render({...input,logo}).body.toString().includes('class="brand-logo"'));
  input.config.copy.cta='<b>EXPLORE</b>';
  assert.ok(templateModule.render(input).body.toString().includes('&lt;b&gt;EXPLORE&lt;/b&gt;'));
});
