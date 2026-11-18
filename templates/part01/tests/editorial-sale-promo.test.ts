import assert from 'node:assert/strict';
import test from 'node:test';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { FORMAT_PROFILES, type ResolvedAsset } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { editorialSalePromoSchema, templateModule } from '../src/editorial-sale-promo.js';
import { contractCases } from '../scripts/editorial-sale-promo-cases.js';

const cases=await contractCases();
function fixture(){
  const item=cases[0]!; const config=editorialSalePromoSchema.parse(item.config);
  const photo:ResolvedAsset={assetId:'t13-synthetic-product',role:'product',mime:'image/png',width:760,height:1050,sha256:'fixture',src:'data:image/png;base64,fixture',allowCrop:config.assets[0]!.allowCrop};
  return {item,config,input:{format:'square' as const,profile:FORMAT_PROFILES.square,config,photos:[photo],facts:new Map(item.facts.map(f=>[f.id,f]))}};
}

test('T13 editorial sale promo passes strict template contract kit',async()=>{
  const report=await checkTemplateContract(templateModule,cases,{strict:true});
  assert.equal(report.counts.fail,0,JSON.stringify(report.checks.filter(c=>c.status==='fail')));
  assert.equal(report.counts.warn,0,JSON.stringify(report.checks.filter(c=>c.status==='warn')));
});

test('T13 promo percentage comes only from the verified offer fact; source editorial blocks render',()=>{
  const {input}=fixture(); const body=templateModule.render(input).body.toString();
  assert.ok(body.includes('<strong class="t13-number">30</strong>'));
  assert.ok(body.includes('t13-percent')&&body.includes('KORTING'));
  assert.ok(body.includes('Een mooie deal.')&&body.includes('Ontdek Product A'));
  assert.ok(body.includes('BEKIJK DE ACTIE')&&body.includes('Actievoorwaarden zijn van toepassing.'));
  assert.ok(body.includes('DEMO · GEEN ECHTE ACTIE'));
  assert.ok(body.includes('data-image-fit="contain"')&&!body.includes('data-allow-crop="true"'));
});

test('T13 rejects absent/malformed/unverified promotion facts and escapes text',()=>{
  const {item,input}=fixture();
  assert.throws(()=>templateModule.render({...input,facts:new Map()}),/verified promotion fact missing/);
  const unverified=new Map(item.facts.map(f=>[f.id,{...f,verified:false as const}]));
  // @ts-expect-error deliberately inject invalid unverified snapshot for runtime guard test
  assert.throws(()=>templateModule.render({...input,facts:unverified}),/verified promotion fact missing/);
  for(const [bad,pattern] of [['discount unavailable',/percentage/],['0% korting',/outside/],['125% korting',/outside/]] as const){
    const altered=new Map(item.facts.map(f=>[f.id,f])); altered.set('t13-promo-fixture',{id:'t13-promo-fixture',text:bad,verified:true});
    assert.throws(()=>templateModule.render({...input,facts:altered}),pattern);
  }
  input.config.copy.cta='<script>bad</script>';
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  for(const rejected of item.rejects||[])assert.equal(editorialSalePromoSchema.safeParse(rejected.config).success,false,rejected.name);
  assert.throws(()=>templateModule.render({...input,photos:[]}),/matching product photo/);
});
