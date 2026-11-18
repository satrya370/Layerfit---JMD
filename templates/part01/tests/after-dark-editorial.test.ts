import assert from 'node:assert/strict';
import test from 'node:test';
import {checkTemplateContract} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {FORMAT_PROFILES,type ResolvedAsset} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {isCanonicalSlot} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {afterDarkEditorialSchema,templateModule} from '../src/after-dark-editorial.js';
import {contractCases} from '../scripts/after-dark-editorial-cases.js';

const cases=await contractCases();
function fixture(){
  const item=cases[0]!;const config=afterDarkEditorialSchema.parse(item.config);
  const photo:ResolvedAsset={assetId:'t19-synthetic-food-scene',role:'lifestyle',mime:'image/png',width:1200,height:900,sha256:'fixture',src:'data:image/png;base64,fixture',kind:'scene',allowCrop:true};
  return {item,config,input:{format:'portrait' as const,profile:FORMAT_PROFILES.portrait,config,photos:[photo],facts:new Map(item.facts.map(f=>[f.id,f]))}};
}

test('T19 source-fidelity module passes contract checks with documented source-safe-inset warnings and canonical slots',async()=>{
  const report=await checkTemplateContract(templateModule,cases,{strict:false});
  assert.equal(report.counts.fail,0,JSON.stringify(report.checks.filter(c=>c.status==='fail')));
  for(const check of report.checks.filter(c=>c.status==='warn'))assert.equal(check.id,'css.tokens','only deliberate source geometry warning allowed');
  assert.ok(templateModule.slots.every(s=>isCanonicalSlot(s.name)),templateModule.slots.map(s=>s.name).join(','));
  assert.equal(Object.hasOwn(cases[0]!.config as object,'t19'),false,'no template-specific config extension');
});

test('T19 renders normalized brand, eyebrow, headline/accent, product name, body, offer and CTA',()=>{
  const {input}=fixture();const body=templateModule.render(input).body.toString();
  for(const slot of ['brand','eyebrow','headline','description','photo','product-name','offer','cta'])assert.ok(body.includes(`data-slot="${slot}"`),`missing ${slot}`);
  assert.ok(body.includes('KYKLOS / AFTER DARK')&&body.includes('FOOD · DRINKS · PEOPLE'));
  assert.ok(body.includes('LATE NIGHTS.')&&body.includes('THE TABLE IS SET.'));
  assert.ok(body.includes('THU / APR 18')&&body.includes('7:30 PM — LATE')&&body.includes('38 MAIN ST.'));
  assert.ok(body.includes('A good night starts at the table.')&&body.includes('ONE NIGHT ONLY'));
  assert.ok(!body.includes('meander')&&!body.includes('t19-cta-bar'),'no invented border or extra CTA bar');
  assert.ok(body.includes('data-image-fit="cover"')&&body.includes('SAVE THE DATE'));
  for(const format of templateModule.formats){
    const output=templateModule.render({...input,format,profile:FORMAT_PROFILES[format]});
    assert.ok(output.body.toString().includes('data-slot="cta"'));
  }
});

test('T19 verifies canonical body fact IDs, offer-or-hero facts and escaped CTA',()=>{
  const {item,input}=fixture();
  assert.throws(()=>templateModule.render({...input,facts:new Map()}),/verified description fact missing/);
  assert.throws(()=>templateModule.render({...input,photos:[]}),/matching photo/);
  assert.throws(()=>templateModule.render({...input,config:{...input.config,copy:{...input.config.copy,bodyFactIds:[]}}}),/bodyFactIds/);
  input.config.copy.cta='<script>bad</script>';
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  for(const rejected of item.rejects||[])assert.equal(afterDarkEditorialSchema.safeParse(rejected.config).success,false,rejected.name);
});

test('T19 extracts source geometry instead of a redesigned layout',()=>{
  const {input}=fixture();const css=templateModule.render(input).css;
  for(const value of ['top:550px','height:521px','top:780px','height:700px','top:1090px','top:1500px'])assert.ok(css.includes(value),value);
  assert.ok(css.includes('text-align')&&!css.includes('t19-meander'));
});
