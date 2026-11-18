import {z} from 'zod';
import {html} from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import {templateConfigSchema,type TemplateModule} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {brandMark} from '../../../../Layerfit-JMD-engine/src/templates/shared/fill.js';
import {circularProductBenefitsCss} from './circular-product-benefits-css.js';

export const T20_BUDGETS={headline:48,eyebrow:32,cta:28,benefits:4,benefit:60,brand:24} as const;
export const circularProductBenefitsSchema=templateConfigSchema.safeExtend({templateId:z.literal('circular-product-benefits')}).superRefine((c,ctx)=>{
  const issue=(path:Array<string|number>,message:string)=>ctx.addIssue({code:'custom',path,message});
  if(c.assets.length!==1)issue(['assets'],'T20 requires one product image');
  if(c.assets[0]?.allowCrop)issue(['assets',0,'allowCrop'],'T20 always preserves the full product with contain');
  if(c.copy.headline.length>T20_BUDGETS.headline)issue(['copy','headline'],'T20 headline budget exceeded');
  if(c.copy.eyebrow&&c.copy.eyebrow.length>T20_BUDGETS.eyebrow)issue(['copy','eyebrow'],'T20 eyebrow budget exceeded');
  if(c.copy.cta.length>T20_BUDGETS.cta)issue(['copy','cta'],'T20 CTA budget exceeded');
  if(c.brand.name.length>T20_BUDGETS.brand)issue(['brand','name'],'T20 brand budget exceeded');
  if(c.copy.body!==undefined)issue(['copy','body'],'T20 supporting copy belongs in canonical benefits');
  if(c.copy.benefits.length>T20_BUDGETS.benefits)issue(['copy','benefits'],'T20 accepts four benefits plus one offer/hero fact');
  c.copy.benefits.forEach((b,i)=>{if(b.text.length>T20_BUDGETS.benefit)issue(['copy','benefits',i,'text'],'T20 benefit budget exceeded');});
  if(c.heroFactId&&c.copy.benefits.some(b=>b.factIds.includes(c.heroFactId!)))issue(['heroFactId'],'hero fact must not also appear in benefits');
  if(c.proofFactId||c.disclaimerFactId||c.comparisonEvidenceId||c.callouts?.length)issue(['proofFactId'],'T20 has no proof, disclaimer, comparison or callout block');
});

const positions:Record<number,readonly string[]>={0:[],1:['top'],2:['mid-left','mid-right'],3:['top','mid-left','mid-right'],4:['top','mid-left','mid-right','bottom-center'],5:['top','mid-left','mid-right','bottom-left','bottom-right']};

/** Two-line typographic presentation of one canonical string, not extra content fields.
 * Words are retained verbatim, in order. The first balanced half is the title. */
export function splitBenefitText(value:string):{title:string;subtitle:string}{
  const words=value.split(' ');const half=Math.ceil(words.length/2);
  return {title:words.slice(0,half).join(' '),subtitle:words.slice(half).join(' ')};
}

export const templateModule:TemplateModule={
  id:'circular-product-benefits',version:'0.1.0',formats:['square','portrait','vertical'],rootClass:'lf-circular-product-benefits',configSchema:circularProductBenefitsSchema,
  content:{headline:{max:T20_BUDGETS.headline},eyebrow:{use:'optional',max:T20_BUDGETS.eyebrow},body:{use:'none'},cta:{max:T20_BUDGETS.cta},benefits:{min:0,max:T20_BUDGETS.benefits,chars:T20_BUDGETS.benefit},photos:{min:1,max:1,kind:'cutout'},offer:'optional-or-hero',proof:'none',disclaimer:'none'},
  slots:[{name:'brand',required:true},{name:'headline',required:true},{name:'eyebrow',required:false},{name:'photo',required:true},{name:'offer',required:false},{name:'benefits',required:false},{name:'benefit-1',required:false},{name:'benefit-2',required:false},{name:'benefit-3',required:false},{name:'cta',required:true}],
  render({config:raw,photos,logo,facts}){
    const c=circularProductBenefitsSchema.parse(raw),photo=photos[0];
    if(photos.length!==1||!photo||photo.assetId!==c.assets[0]?.assetId)throw new Error('T20 requires one matching product image');
    const fact=(id:string)=>{const f=facts.get(id);if(!f?.verified||f.id!==id)throw new Error(`T20 verified fact missing: ${id}`);return f.text;};
    c.copy.benefits.forEach(b=>b.factIds.forEach(fact));
    const offerId=c.offerFactId??c.heroFactId,offer=offerId?fact(offerId):undefined;
    if(offer&&offer.length>T20_BUDGETS.benefit)throw new Error('T20 offer/hero fact exceeds the radial label budget');
    const entries=[...(offer?[{text:offer,slot:'offer'}]:[]),...c.copy.benefits.map((b,i)=>({text:b.text,slot:i<3?`benefit-${i+1}`:undefined}))];
    const cards=entries.map((entry,index)=>{
      const label=splitBenefitText(entry.text);
      const content=html`<strong class="benefit__title">${label.title}</strong>${label.subtitle?html`<span class="benefit__subtitle">${label.subtitle}</span>`:''}`;
      return entry.slot?html`<div class="benefit benefit--${positions[entries.length]![index]}" data-slot="${entry.slot}" data-fit-group="t20-benefit" data-fit-min="0.8">${content}</div>`:html`<div class="benefit benefit--${positions[entries.length]![index]}" data-fit-group="t20-benefit" data-fit-min="0.8">${content}</div>`;
    });
    return {css:circularProductBenefitsCss,body:html`
      <div class="ambient" aria-hidden="true"></div>
      <header class="brand-zone"><div class="brand" data-slot="brand" data-required="true" data-fit-group="t20-brand" data-fit-min="0.7">${brandMark(c,logo,'brand-logo')}</div><h1 class="product-type" data-slot="headline" data-required="true" data-fit-group="t20-headline" data-fit-min="0.75">${c.copy.headline}</h1>${c.copy.eyebrow?html`<p class="eyebrow" data-slot="eyebrow">${c.copy.eyebrow}</p>`:''}</header>
      <section class="hero"><div class="hero-halo" aria-hidden="true"></div><div class="orbit" aria-hidden="true"></div><div class="product-shadow" aria-hidden="true"></div><img class="product-image" src="${photo.src}" alt="${c.productName??''}" data-slot="photo" data-required="true" data-image-fit="contain"/>${cards.length?html`<div class="benefits" data-slot="benefits" data-allow-overlap="*">${cards}</div>`:''}</section>
      <p class="t20-cta" data-slot="cta" data-required="true" data-fit-group="t20-cta" data-fit-min="0.8">${c.copy.cta}</p>`,};
  },
};
