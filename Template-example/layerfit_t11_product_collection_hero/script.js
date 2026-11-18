/* T11 replacement standalone binding. Medical headline/subhead/disclaimer resolve from verified
 * caller facts; verified:true in creative.example.json is illustrative fixture data only. */
(() => {
  'use strict';
  const root = document.getElementById('creative');
  const clean = (value, max, required = false) => {
    if (typeof value !== 'string') throw new Error('Text fields must be strings');
    const result = value.trim();
    if ((required && !result) || result.length > max || /[\x00-\x08\x0b-\x1f]/.test(result)) throw new Error('Invalid or oversized T11 text');
    return result;
  };
  const asset = value => {
    if (typeof value !== 'string' || !/^(?:\.\/)?assets\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(value)) throw new Error('Only package-local raster assets are allowed');
    return value;
  };
  const textNode = (tag, className, value, slotName) => {
    const el = document.createElement(tag); el.className = className; el.textContent = value;
    if (slotName) { el.dataset.slot = slotName; el.dataset.safe = 'true'; el.dataset.required = 'true'; }
    return el;
  };
  window.setCreative = async (data = {}) => {
    const format = ({ story:'vertical', vertical:'vertical', portrait:'portrait', square:'square' })[data.format || 'square'];
    if (!format) throw new Error('Unsupported format');
    const facts = Array.isArray(data.facts) ? data.facts : [];
    const factText = (id, name) => {
      const found = facts.find(f => f && f.id === id && f.verified === true);
      if (!found) throw new Error(`Missing verified ${name} fact`);
      return clean(found.text, 240, true);
    };
    const headline = factText(clean(data.headlineFactId, 80, true), 'headline');
    const headlineLines = Array.isArray(data.headlineLines) ? data.headlineLines.map(line => clean(line, 40, true)) : [];
    if (headlineLines.length < 1 || headlineLines.length > 2 || headlineLines.join(' ') !== headline) throw new Error('Headline lines must match verified headline fact');
    const accent = clean(data.accentPhrase, 30, true);
    if (!headline.includes(accent)) throw new Error('Accent phrase must appear in headline');
    const subhead = factText(clean(data.subheadFactId, 80, true), 'subhead');
    const disclaimer = factText(clean(data.disclaimerFactId, 80, true), 'disclaimer');
    const brand = clean(data.brand, 60, true), cta = clean(data.ctaBottom, 32, true);
    const imageSrc = asset(data.imageUrl);
    const fragment = document.createDocumentFragment();
    const h1 = textNode('h1', 'collection-headline', '', 'headline');
    for (const line of headlineLines) {
      const row = document.createElement('span'); row.className = 'collection-line';
      const at = line.indexOf(accent);
      if (at < 0) row.textContent = line;
      else { row.append(document.createTextNode(line.slice(0, at))); const em = document.createElement('em'); em.textContent = accent; row.append(em, document.createTextNode(line.slice(at + accent.length))); }
      h1.append(row);
    }
    fragment.append(h1);
    const figure = document.createElement('figure'); figure.className = 'collection-stage'; figure.dataset.slot = 'product-main'; figure.dataset.required = 'true'; figure.dataset.safe = 'true';
    const img = document.createElement('img'); img.className = 'collection-product'; img.src = imageSrc; img.alt = clean(data.imageAlt, 120, true); img.dataset.imageFit = 'contain'; figure.append(img); fragment.append(figure);
    fragment.append(textNode('p','collection-subhead',subhead,'subhead'));
    fragment.append(textNode('p','collection-brand',brand,'brand'));
    fragment.append(textNode('p','collection-disclaimer',disclaimer,'disclaimer'));
    fragment.append(textNode('div','collection-cta',cta,'cta'));
    const layout = document.createElement('main'); layout.className = 'semaglutide-layout'; layout.append(fragment);
    root.replaceChildren(layout); root.dataset.format = format;
    document.documentElement.lang = /^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(data.locale || 'en') ? (data.locale || 'en') : 'en';
    await document.fonts.ready; await img.decode();
    if (!img.naturalWidth) throw new Error('Vial image failed to decode');
    return { format, imageCount: 1 };
  };
  window.__T11_PROMISE__ = window.setCreative({
    brand:'SAMPLE BRAND',headlineFactId:'t11-headline-fixture',headlineLines:['Is Semaglutide','Right for You?'],accentPhrase:'Semaglutide',
    subheadFactId:'t11-subhead-fixture',disclaimerFactId:'t11-disclaimer-fixture',ctaBottom:'LEARN MORE',imageUrl:'assets/vial-demo.png',imageAlt:'Synthetic demo vial, not a real medication product',
    facts:[
      {id:'t11-headline-fixture',text:'Is Semaglutide Right for You?',verified:true},
      {id:'t11-subhead-fixture',text:'Find out who should and should not take this medication.',verified:true},
      {id:'t11-disclaimer-fixture',text:'Prescription required. Compounded drugs are not FDA-approved and are not reviewed by the FDA for safety or effectiveness. Results are not guaranteed and vary by individual. Review official safety information with a licensed clinician.',verified:true}
    ],format:new URLSearchParams(location.search).get('format') || 'square'
  });
})();
