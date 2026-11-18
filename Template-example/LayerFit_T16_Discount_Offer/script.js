(()=>{
const root=document.getElementById('creative'), el=id=>document.getElementById(id);
const demo={brand:'Example Brand',discountPercent:50,freeGift:true,headline:'New year exclusive',productImages:['assets/demo-products.png'],description:'On selected products. Terms apply.',format:'square',colors:{paper:'#faf5f1',ink:'#21182b',accent:'#d8eff7',stroke:'#89808a'}};
const safeImage=v=>/^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|blob:|\.\.?\/|\/)/i.test(String(v||''));
const safeColor=v=>typeof v==='string' && /^(#[a-f0-9]{3,8}|rgba?\([0-9.,% ]+\))$/i.test(v.trim());
const text=(id,v)=>{el(id).textContent=String(v??'')};
window.setCreative=async data=>{
 const d={...demo,...data,colors:{...demo.colors,...(data?.colors||{})}};
 if(data?.mode==='production' && !Object.hasOwn(data,'discountPercent')) throw new Error('Production T16 requires an explicit discountPercent');
 if(!['square','portrait','story'].includes(d.format))throw new Error('Unsupported format');
 if(!Number.isFinite(Number(d.discountPercent))||Number(d.discountPercent)<=0||Number(d.discountPercent)>100)throw new Error('T16 requires verified discountPercent in (0,100]');
 if(d.verifiedDiscount!==true && d.mode==='production')throw new Error('Discount must be verified for production');
 root.dataset.format=d.format;
 const pct=Number(d.discountPercent),gift=Boolean(d.freeGift);
 const offerLabel=`${pct}% OFF${gift?' + FREE GIFT':''}`;
 text('offerBadge',offerLabel);
 text('headline',d.headline);
 const support=el('supportingCopy');support.replaceChildren();
 support.append('Save ');let s=document.createElement('strong');s.textContent=`${pct}%`;support.append(s);
 if(gift){support.append(' + get a ');s=document.createElement('strong');s.textContent='free gift';support.append(s)};
 text('description',d.description);
 el('description').hidden=!d.description;
 const src=d.productImages?.[0]||d.imageUrl;
 if(src && safeImage(src)){el('productImage').src=src}
 for(const [key,value] of Object.entries(d.colors))if(['paper','ink','accent','stroke'].includes(key)&&safeColor(value))root.style.setProperty('--'+key,value);
 document.documentElement.lang=d.locale||'en';
 await document.fonts.ready;
 const img=el('productImage');if(!img.complete)await new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true});setTimeout(r,4000)});
 if(!img.naturalWidth)throw new Error('Product image did not load');
 return {ok:true,format:d.format,discountPercent:pct,freeGift:gift};
};
const format=new URLSearchParams(location.search).get('format')||'square';
window.__creativeReady=window.setCreative({...demo,format});
})();
