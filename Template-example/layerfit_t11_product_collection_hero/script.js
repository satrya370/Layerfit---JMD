/* T11 standalone binding. Same markup/CSS composition as the engine module, but user file input.
 * Real campaign facts must be verified by the domain service, not this browser adapter.
 * Text is never parsed as HTML; URLs are restricted to local assets or embedded raster bytes.
 */
(() => {
  'use strict';
  const root = document.getElementById('creative');
  const txt = (value, max = 240) => {
    if (value == null || value === '') return '';
    if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b-\x1f]/.test(value)) throw new Error('Invalid or oversized T11 text');
    return value.trim();
  };
  const asset = (value) => {
    if (typeof value !== 'string') throw new Error('Image URL must be a string');
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
    if (/^(?:\.\/)?assets\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(value)) return value;
    throw new Error('Only assets/ raster images or embedded raster bytes are allowed; no remote URLs or SVG');
  };
  const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  const slot = (el, name) => { el.dataset.slot = name; return el; };
  const addText = (parent, tag, cls, text, name) => { if (!text) return; const el = node(tag, cls, text); if (name) slot(el, name); parent.append(el); return el; };
  const load = async (image) => { await image.decode(); if (!image.naturalWidth) throw new Error('T11 image failed'); };
  window.setCreative = async (input = {}) => {
    const data = structuredClone(input);
    const images = data.productImages;
    if (!Array.isArray(images) || images.length < 1 || images.length > 3) throw new Error('Provide 1–3 productImages');
    const sources = images.map((image) => asset(typeof image === 'string' ? image : image.src));
    if (new Set(sources).size !== sources.length) throw new Error('Duplicate product images are not allowed');
    const format = ({ story:'vertical', vertical:'vertical', portrait:'portrait', square:'square' })[data.format || 'portrait'];
    if (!format) throw new Error('Unsupported format');
    const colors = { primary:'#31151b', secondary:'#fbd7dd', accent:'#ef233c', ...(data.colors || {}) };
    for (const key of ['primary', 'secondary', 'accent']) { if (!/^#[a-f0-9]{6}$/i.test(colors[key])) throw new Error('Use six-digit hex colors'); }
    const fonts = { inter:'LF Inter', 'LF Inter':'LF Inter' };
    if (data.fontFamily && !fonts[data.fontFamily]) throw new Error('Only locally bundled Inter is available in this package');
    const lang = data.locale || 'en'; if (!/^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(lang)) throw new Error('Invalid locale');
    const brand = txt(data.brand,100), headline = txt(data.headline,90), cta = txt(data.ctaBottom,32);
    if (!brand || !headline || !cta) throw new Error('brand, headline and ctaBottom are required');
    const lines = headline.split('\n'); if (lines.length > 3) throw new Error('Maximum 3 headline lines');
    const website = txt(data.website,120); if (website && !/^(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[a-z0-9/_-]*)?$/i.test(website)) throw new Error('Invalid website display label');
    const benefits = (data.benefits || []).map((benefit) => txt(benefit,80)); if (benefits.length > 3) throw new Error('Maximum 3 benefits');
    const fragment = document.createDocumentFragment();
    const header = slot(node('header','collection-header'),'header');
    if (data.logoUrl) { const logo = node('img','collection-logo'); logo.src = asset(data.logoUrl); logo.alt = brand; header.append(logo); }
    else addText(header,'span','collection-brand',brand);
    addText(header,'span','collection-tagline',txt(data.tagline,60)); fragment.append(header);
    const copy = node('section','collection-copy');
    const h1 = slot(node('h1','collection-headline'),'headline'); lines.forEach((line) => h1.append(node('span','',line))); copy.append(h1);
    addText(copy,'p','collection-description',txt(data.description),'description');
    addText(copy,'p','collection-benefits',benefits.filter(Boolean).join(' · '),'benefits');
    addText(copy,'div','collection-primary',txt(data.ctaPrimary,32),'primary-cta'); fragment.append(copy);
    const stage = node('section','collection-stage'); stage.dataset.count = sources.length;
    sources.forEach((src,index) => { const image = slot(node('img',`collection-product collection-product--${['main','left','right'][index]}`),`product-${['main','left','right'][index]}`); image.src=src; image.alt=typeof images[index] === 'object' ? txt(images[index].alt,100) : txt(data.productName || 'Product',100); stage.append(image); }); fragment.append(stage);
    // Optional price fields are supplied by the caller; never calculated or defaulted from the reference.
    const price = txt(data.price,60), original = txt(data.originalPrice,60), discount = txt(data.discount,40);
    if (original && !price) throw new Error('originalPrice requires current price');
    const offer = [price, original ? `(was ${original})` : '', discount].filter(Boolean).join(' ');
    addText(fragment,'div','collection-offer',offer,'offer');
    const footer = node('footer','collection-footer'); addText(footer,'span','collection-bottom',cta,'bottom-cta');
    addText(footer,'span','collection-destination',website || txt(data.destinationLabel,60),'destination'); fragment.append(footer);
    root.replaceChildren(fragment); root.dataset.format=format; document.documentElement.lang=lang;
    for (const key of ['primary','secondary','accent']) root.style.setProperty(`--lf-brand-${key}`,colors[key]);
    root.style.setProperty('--lf-font-heading',`"${fonts[data.fontFamily] || 'LF Inter'}",sans-serif`);
    root.style.setProperty('--lf-font-body',`"${fonts[data.fontFamily] || 'LF Inter'}",sans-serif`);
    await document.fonts.ready; await Promise.all([...root.querySelectorAll('img')].map(load));
    window.__T11_READY__=true; return { format, imageCount: sources.length };
  };
  window.__T11_PROMISE__ = window.setCreative({brand:'LAYERFIT',tagline:'YOUR EVERYDAY COLLECTION',headline:'Your Complete\nGlow Routine',description:'Discover the collection. Find your daily essentials.',ctaPrimary:'Build your routine',ctaBottom:'SHOP THE COLLECTION',destinationLabel:'EXPLORE THE RANGE',productImages:['assets/product-0.png','assets/product-1.png','assets/product-2.png'],format:new URLSearchParams(location.search).get('format') || 'portrait'});
})();
