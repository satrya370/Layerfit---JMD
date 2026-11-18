(() => {
  const $ = id => document.getElementById(id);
  const defaults = {
    format:'story', brand:'CONZURI', announcement:'',
    topLines:['HEIGHT','BOOSTING','SHOES'],
    mainHeadline:'ADD 3 INCHES',
    bottomLines:['WHERE IT','MATTERS','MOST'],
    teaser:'DOWN THERE', teaserEmoji:'👇',
    imageUrl:'assets/boot-scene.png', imageAlt:'Black height boosting boot',
    colors:{highlight:'#ffffff',stroke:'#cecece'}
  };
  function setLines(node,lines){
    node.replaceChildren();
    (Array.isArray(lines)?lines:[]).slice(0,4).forEach(t=>{
      const s=document.createElement('span');s.textContent=String(t);node.appendChild(s);
    });
  }
  const safeSrc = src => /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|blob:|\.\.?\/|\/)/i.test(String(src||''));
  const safeColor = s => typeof s==='string' && /^#[a-f0-9]{3,8}$/i.test(s);
  window.setCreative = async function setCreative(input={}){
    const d={...defaults,...input,colors:{...defaults.colors,...(input.colors||{})}};
    if(!['story','portrait','square'].includes(d.format)) throw new Error('Unsupported format');
    $('creative').dataset.format=d.format;
    $('announcement').textContent=String(d.announcement||'');
    $('announcement').hidden=!d.announcement;
    setLines($('topOutline'),d.topLines);
    $('mainHeadline').textContent=String(d.mainHeadline||'');
    setLines($('bottomOutline'),d.bottomLines);
    $('teaser').replaceChildren(document.createTextNode(String(d.teaser||'')+' '));
    if(d.teaserEmoji){const emoji=document.createElement('span');emoji.className='hand';emoji.textContent=String(d.teaserEmoji);$('teaser').appendChild(emoji);}
    $('brand').textContent=String(d.brand||'').toUpperCase().split('').join(' ');
    if(safeColor(d.colors.highlight)) $('creative').style.setProperty('--highlight',d.colors.highlight);
    if(safeColor(d.colors.stroke)) $('creative').style.setProperty('--stroke',d.colors.stroke);
    const img=$('productImage');
    if(safeSrc(d.imageUrl))img.src=d.imageUrl;
    img.alt=String(d.imageAlt||'Product image');
    await document.fonts.ready;
    if(!img.complete) await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,5000);});
    return {format:d.format,imageLoaded:img.naturalWidth>0};
  };
  const query=new URLSearchParams(location.search);
  window.__creativeReady=window.setCreative({format:query.get('format')||'story'});
})();
