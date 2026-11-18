import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const text=(max:number)=>z.string().trim().min(1).max(max).refine(v=>!/\p{Cc}/u.test(v),'control characters are not allowed');

export const editorialSalePromoSchema=templateConfigSchema.safeExtend({
  templateId:z.literal('editorial-sale-promo'),
  t13:z.object({
    campaignLabel:text(48), eyebrow:text(48), discountWord:text(24),
    descriptionFactId:idSchema.optional(), finePrintFactId:idSchema,
    imageAlt:text(120), demoMode:z.boolean(), demoLabel:text(48).optional(),
  }).strict(),
}).superRefine((config,ctx)=>{
  const issue=(path:Array<string|number>,message:string)=>ctx.addIssue({code:'custom',path,message});
  if(config.assets.length!==1)issue(['assets'],'T13 requires exactly one product photo');
  if(!config.offerFactId)issue(['offerFactId'],'T13 requires a verified promotion fact for the displayed percentage');
  if(config.t13.demoMode&&!config.t13.demoLabel)issue(['t13','demoLabel'],'demo mode requires a visible demo label');
  if(config.copy.benefits.length)issue(['copy','benefits'],'T13 does not support benefit chips');
  if(config.copy.body!==undefined)issue(['copy','body'],'use t13.descriptionFactId for verified supporting copy');
  if(config.callouts?.length||config.proofFactId!==undefined||config.comparisonEvidenceId!==undefined)issue(['proofFactId'],'T13 does not support proof, callouts or comparison blocks');
});

const css=readFileSync(new URL('./editorial-sale-promo.css',import.meta.url),'utf8');

function promotionPercent(value:string):string {
  const match=value.match(/(?:^|\b)(\d{1,3}(?:[.,]\d+)?)\s*%/);
  if(!match)throw new Error('T13 promotion fact must explicitly contain a percentage');
  const number=Number(match[1]!.replace(',','.'));
  if(!Number.isFinite(number)||number<=0||number>100)throw new Error('T13 promotion percentage is outside the allowed range');
  return String(number);
}

export const templateModule:TemplateModule={
  id:'editorial-sale-promo',version:'0.2.0',formats:['square','portrait','vertical'],
  rootClass:'lf-editorial-sale-promo',configSchema:editorialSalePromoSchema,
  slots:[
    {name:'brand',required:true},{name:'campaign-label',required:true},{name:'eyebrow',required:true},
    {name:'offer',required:true},{name:'headline',required:true},{name:'description',required:false},
    {name:'photo',required:true},{name:'cta',required:true},{name:'fineprint',required:true},
  ],
  render({config:raw,photos,facts}){
    const config=editorialSalePromoSchema.parse(raw);
    if(photos.length!==1||photos[0]?.assetId!==config.assets[0]?.assetId)throw new Error('T13 requires one matching product photo');
    const fact=(id:string,field:string)=>{
      const item=facts.get(id);
      if(!item?.verified||item.id!==id)throw new Error(`T13 verified ${field} fact missing: ${id}`);
      return item.text;
    };
    const offer=fact(config.offerFactId!,'promotion');
    const percent=promotionPercent(offer);
    const description=config.t13.descriptionFactId?fact(config.t13.descriptionFactId,'description'):undefined;
    const finePrint=fact(config.t13.finePrintFactId,'fine print');
    const photo=photos[0]!;
    const image=photo.allowCrop
      ?html`<img src="${photo.src}" alt="${config.t13.imageAlt}" data-image-fit="cover" data-allow-crop="true"/>`
      :html`<img src="${photo.src}" alt="${config.t13.imageAlt}" data-image-fit="contain"/>`;
    return {css,body:html`
      <main class="t13-layout">
      <header class="t13-topline">
        <span class="t13-brand" data-slot="brand" data-required="true" data-safe="true">${config.brand.name}</span>
        <span class="t13-campaign" data-slot="campaign-label" data-required="true" data-safe="true">${config.t13.campaignLabel}</span>
      </header>
      <section class="t13-copy">
        <div class="t13-offer-block">
        <p class="t13-eyebrow" data-slot="eyebrow" data-required="true" data-safe="true">${config.t13.eyebrow}</p>
        <div class="t13-offer" data-slot="offer" data-required="true" data-safe="true" data-fit-group="t13-offer" data-fit-min="0.75"><strong class="t13-number">${percent}</strong><span class="t13-percent">%</span></div>
        <p class="t13-offer-word">${config.t13.discountWord}</p>
        </div>
        <div class="t13-message">
        <h1 class="t13-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="t13-headline" data-fit-min="0.72">${config.copy.headline}</h1>
        ${description?html`<p class="t13-description" data-slot="description" data-safe="true" data-fit-group="t13-description" data-fit-min="0.78">${description}</p>`:''}
        <p class="t13-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="t13-cta" data-fit-min="0.8">${config.copy.cta}<span aria-hidden="true">↗</span></p>
        </div>
      </section>
      <figure class="t13-photo" data-slot="photo" data-required="true" data-safe="true">${image}</figure>
      <footer class="t13-fineprint" data-slot="fineprint" data-required="true" data-safe="true">
        <span>${finePrint}</span>${config.t13.demoMode?html`<span class="t13-demo">${config.t13.demoLabel}</span>`:''}
      </footer>
      </main>`,
    };
  },
};
