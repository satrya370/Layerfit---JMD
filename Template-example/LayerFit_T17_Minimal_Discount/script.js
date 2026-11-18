(() => {
 const root=document.getElementById('creative');
 const el=id=>document.getElementById(id);
 const defaults={
  format:'story',brand:'LAYERFIT',discountText:'25% OFF',
  headline:'EVERYDAY\nESSENTIALS',
  description:'A SPECIAL OFFER ON SELECTED PRODUCTS.',
  finePrint:'DEMO OFFER ONLY — REPLACE WITH VERIFIED TERMS BEFORE PUBLISHING.',
  imageUrl:'assets/demo-tumbler.svg',imageAlt:'Sample demo product',
  colors:{bg:'#e4d9ca',ink:'#272524',title:'#9f9363',muted:'#605a53'}
 };
 const allowedColors=new Set(['bg','ink','title','muted']);
 const colorSafe=v=>typeof v==='string'&&/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))$/.test(v.trim());
 const imageSafe=url=>/^(https?:\/\/|data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,|blob:|\.\.?\/|\/)/i.test(String(url||'').trim());
 window.setCreative=async function(data={}){
  const d={...defaults,...data,colors:{...defaults.colors,...(data.colors||{})}};
  if(!['square','portrait','story'].includes(d.format))throw new Error('Invalid format');
  if(!d.discountText || !String(d.discountText).trim())throw new Error('T17 requires a verified discount or promotional offer');
  root.dataset.format=d.format;
  el('discount').textContent=String(d.discountText);
  el('headline').textContent=String(d.headline||'');
  el('description').textContent=String(d.description||'');
  el('description').hidden=!d.description;
  el('finePrint').textContent=String(d.finePrint||'');
  el('finePrint').hidden=!d.finePrint;
  el('brand').textContent=String(d.brand||'');
  Object.entries(d.colors).forEach(([k,v])=>{if(allowedColors.has(k)&&colorSafe(v))root.style.setProperty('--'+k,v)});
  const image=el('productImage');
  if(imageSafe(d.imageUrl))image.src=d.imageUrl;
  image.alt=String(d.imageAlt||'Product');
  await document.fonts.ready;
  if(!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});setTimeout(resolve,4500)});
  return {ok:image.naturalWidth>0,format:d.format};
 };
 const queryFormat=new URLSearchParams(location.search).get('format');
 window.__creativeReady=window.setCreative({format:['square','portrait','story'].includes(queryFormat)?queryFormat:'story'});
})();
