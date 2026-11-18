import assert from 'node:assert/strict';
import test from 'node:test';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { lifestyleBenefitEditorialSchema, templateModule } from '../src/lifestyle-benefit-editorial.js';
import { contractCases } from '../scripts/lifestyle-benefit-cases.js';

const cases = await contractCases();
const renderInput = () => {
  const item = cases[0]!; const config = lifestyleBenefitEditorialSchema.parse(item.config);
  return { item, config, input:{format:'square' as const,profile:FORMAT_PROFILES.square,config,photos:[{assetId:'t15-synthetic-bag',role:'lifestyle' as const,mime:'image/png' as const,width:900,height:670,sha256:'fixture',src:'data:image/png;base64,fixture',allowCrop:true}],facts:new Map(item.facts.map(f=>[f.id,f]))} };
};

test('T15 lifestyle-benefit module passes strict template contract kit', async()=>{
  const report=await checkTemplateContract(templateModule,cases,{strict:true});
  assert.equal(report.counts.fail,0,JSON.stringify(report.checks.filter(c=>c.status==='fail')));
  assert.equal(report.counts.warn,0,JSON.stringify(report.checks.filter(c=>c.status==='warn')));
});

test('T15 retains editorial structure, single photo, two verified benefits and CTA',()=>{
  const {input}=renderInput(); const body=templateModule.render(input).body.toString();
  assert.equal((body.match(/data-image-fit=/g)||[]).length,1);
  assert.ok(body.includes('data-image-fit="cover"')&&body.includes('data-allow-crop="true"'));
  assert.ok(body.includes('JOUW DAG. JOUW STIJL.')&&body.includes('Comfortabel materiaal'));
  assert.ok(body.includes('Minimalistisch ontwerp')&&body.includes('ONTDEK DE COLLECTIE'));
  assert.ok(body.includes('data-slot="note"')&&body.includes('MADE FOR EVERYDAY'));
});

test('T15 escapes text, validates config and fails closed for missing/false facts and photo',()=>{
  const {item,input}=renderInput();
  input.config.copy.cta='<script>bad</script>';
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  for(const rejected of item.rejects||[])assert.equal(lifestyleBenefitEditorialSchema.safeParse(rejected.config).success,false,rejected.name);
  assert.throws(()=>templateModule.render({...input,photos:[]}),/matching photo/);
  assert.throws(()=>templateModule.render({...input,facts:new Map()}),/verified description fact missing/);
  const falseFacts=new Map(item.facts.map(f=>[f.id,{...f,verified:false as const}]));
  // @ts-expect-error intentionally bypass static verified-fact typing for runtime guard test
  assert.throws(()=>templateModule.render({...input,facts:falseFacts}),/verified description fact missing/);
});
