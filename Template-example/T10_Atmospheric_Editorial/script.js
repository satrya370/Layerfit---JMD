(() => {
  const root=document.getElementById('creative');
  const $=id=>document.getElementById(id);
  const defaults={
    topLeft:'103 N 10TH ST',topRight:'YOUR ESCAPE STARTS HERE.',eyebrow:'TORONTO',
    headline:'Ableton\nSprings\n& Spa',
    features:['SAUNA &\nCOLD PLUNGE','FACIALS &\nTREATMENTS','MASSAGE &\nBODY SCRUB'],
    imageUrl:'assets/demo-spa-photo.png',imageAlt:'Spa lifestyle photograph',format:'square',
    descriptionFactId:null,facts:[],cta:'',
    colors:{top:'#dce459',mid:'#e9e6dd',bottom:'#acc8e8',ink:'#302d28'}
  };
  // Standalone assets stay package-local or embedded; never fetch arbitrary remote URLs.
  const validImg=u=>typeof u==='string'&&(/^(?:\.\/)?assets\/[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(u)||/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(u));
  const validColor=u=>typeof u==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(u);
  window.setCreative=async function(data={}){
    const d={...defaults,...data,colors:{...defaults.colors,...(data.colors||{})}};
    if(!['square','portrait','story'].includes(d.format))throw Error('Unsupported format');
    let description='';
    if(d.descriptionFactId){
      const fact=Array.isArray(d.facts)?d.facts.find(f=>f.id===d.descriptionFactId&&f.verified===true):null;
      if(!fact||typeof fact.text!=='string'||!fact.text.trim())throw Error('Description requires a verified fact');
      description=fact.text.trim();
      if(description.length>140)throw Error('Description exceeds 140 characters');
    }
    if(typeof d.cta!=='string'||d.cta.length>32)throw Error('CTA must be text of at most 32 characters');
    if(!validImg(d.imageUrl))throw Error('Image must be package-local or embedded raster data');
    $('description').textContent=description;$('description').hidden=!description;
    $('cta').textContent=d.cta;$('cta').hidden=!d.cta;
    root.dataset.copy=String(Boolean(description||d.cta));
    root.dataset.format=d.format;
    for(const id of ['topLeft','topRight','eyebrow']){$(id).textContent=String(d[id]||'');$(id).hidden=!d[id];}
    $('headline').textContent=String(d.headline||'');
    const items=$('features');items.replaceChildren();
    (Array.isArray(d.features)?d.features:[]).slice(0,3).forEach(value=>{
      const val=typeof value==='string'?value:value?.title;
      if(!val)return;
      const p=document.createElement('p');p.className='benefit';p.textContent=String(val);items.append(p);
    });
    items.hidden=!items.childElementCount;
    for(const [k,v] of Object.entries(d.colors)){if(['top','mid','bottom','ink'].includes(k)&&validColor(v))root.style.setProperty('--'+k,v);}
    const img=$('productImage');if(validImg(d.imageUrl))img.src=d.imageUrl;img.alt=String(d.imageAlt||'Product image');
    await document.fonts.ready;
    if(!img.complete)await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,5000)});
    return {format:d.format,imageLoaded:img.naturalWidth>0,featureCount:items.childElementCount};
  };
  const requested=new URLSearchParams(location.search).get('format');
  window.__creativeReady=window.setCreative({format:['square','portrait','story'].includes(requested)?requested:'square'});
})();
