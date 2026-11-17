/* T08 Photo Overlay — dynamic content.
 *
 *   window.setCreative({ brand, logoUrl, headline, description, cta, imageUrl, imageAlt,
 *                        features: [..], colors: { primary, secondary, accent }, format })
 *
 * Optional extras: fonts { heading, body }, offer, allowCrop.
 *  - every text goes in with textContent / text nodes, never as an HTML string, so untrusted AI text cannot run as markup;
 *  - nothing is invented: an element whose data is missing is not rendered;
 *  - `offer` is shown exactly as given and must be verified product data;
 *  - the photo stays whole (contain) unless allowCrop is true. With allowCrop the photo fills the canvas under a dark scrim;
 *    without it the photo sits on a flat field and the text goes on a solid panel.
 * Markup, class names and data-* attributes are the same as the engine module (render.ts).
 */
(function () {
  'use strict';

  var FORMATS = { square: 'square', portrait: 'portrait', story: 'vertical', vertical: 'vertical' };
  var FONT_STACKS = {
    fraunces: '"LF Fraunces", Georgia, serif',
    inter: '"LF Inter", Arial, sans-serif',
    montserrat: '"LF Montserrat", Arial, sans-serif',
    poppins: '"LF Poppins", Arial, sans-serif',
  };
  var DEFAULT_COLORS = { primary: '#17332f', secondary: '#efe9de', accent: '#f2b134' };
  var WHITE = '#ffffff';
  var INK = '#14171a';
  // Same budgets as the engine schema: limits for a good layout, not a promise that text fits (the renderer measures that).
  var LIMITS = { brand: 24, headline: 56, description: 90, feature: 28, features: 3 };
  var created = false;

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }
  function text(node, value) { node.textContent = String(value); return node; }
  function clean(value) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() : ''; }

  function svg(pathData, strokeWidth) {
    var ns = 'http://www.w3.org/2000/svg';
    var node = document.createElementNS(ns, 'svg');
    node.setAttribute('class', 'pov-svg');
    node.setAttribute('viewBox', '0 0 24 24');
    node.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linecap', 'square');
    node.appendChild(path);
    return node;
  }
  var tick = function () { return svg('M4 12.5l5 5L20 6.5', '3.2'); };
  var arrow = function () { return svg('M3 12h16M13 6l6 6-6 6', '2.8'); };

  function hex(value, fallback) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
  function channel(v) { var c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function luminance(h) { var n = parseInt(h.slice(1), 16); return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255); }
  function contrast(a, b) { var hi = Math.max(luminance(a), luminance(b)); var lo = Math.min(luminance(a), luminance(b)); return (hi + 0.05) / (lo + 0.05); }

  /** Only data images, same-origin relative paths and https are accepted. javascript: and other schemes are refused. */
  function safeImageUrl(value) {
    var url = clean(value);
    if (!url) return '';
    if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return /^https:\/\//i.test(url) ? url : '';
    return url.indexOf('//') === 0 ? '' : url;
  }

  /** `[[...]]` marks the key words that get the marker block. The result is text nodes and one <mark>, never HTML. */
  function appendHeadline(node, raw) {
    clean(raw).split(/(\[\[[\s\S]*?\]\])/g).forEach(function (part) {
      if (!part) return;
      if (part.slice(0, 2) === '[[' && part.slice(-2) === ']]') node.appendChild(text(el('mark', 'pov-mark'), part.slice(2, -2)));
      else node.appendChild(document.createTextNode(part));
    });
  }

  function build(root, data, warnings) {
    var headlineText = clean(data.headline);
    var ctaText = clean(data.cta);
    var photoUrl = safeImageUrl(data.imageUrl);
    var logoUrl = safeImageUrl(data.logoUrl);
    var brandText = clean(data.brand);
    var features = (Array.isArray(data.features) ? data.features : []).map(clean).filter(Boolean);
    var cover = data.allowCrop === true;

    if (!headlineText) warnings.push('headline is missing');
    if (!ctaText) warnings.push('cta is missing');
    if (!photoUrl) warnings.push('imageUrl is missing or not allowed');
    if (!brandText && !logoUrl) warnings.push('brand and logoUrl are both missing');
    if (features.length > LIMITS.features) { warnings.push('only the first ' + LIMITS.features + ' features are shown'); features = features.slice(0, LIMITS.features); }
    if (brandText.length > LIMITS.brand) warnings.push('brand is longer than ' + LIMITS.brand + ' characters');
    if (headlineText.replace(/\[\[|\]\]/g, '').length > LIMITS.headline) warnings.push('headline is longer than ' + LIMITS.headline + ' characters');
    if (clean(data.description).length > LIMITS.description) warnings.push('description is longer than ' + LIMITS.description + ' characters');
    features.forEach(function (feature, i) { if (feature.length > LIMITS.feature) warnings.push('feature ' + (i + 1) + ' is longer than ' + LIMITS.feature + ' characters'); });

    var fragment = document.createDocumentFragment();

    if (photoUrl) {
      var photo = el('div', 'pov-photo ' + (cover ? 'pov-photo--cover' : 'pov-photo--contain'), { 'data-fit-group': 'headline', 'data-fit-min': '0.6' });
      var figure = el('figure', 'pov-figure', { 'data-slot': 'photo', 'data-required': 'true', 'data-allow-overlap': '*' });
      var img = el('img', 'pov-img', cover ? { 'data-image-fit': 'cover', 'data-allow-crop': 'true' } : { 'data-image-fit': 'contain' });
      img.alt = clean(data.imageAlt);
      img.src = photoUrl;
      figure.appendChild(img);
      photo.appendChild(figure);
      fragment.appendChild(photo);
    }

    if (brandText || logoUrl) {
      var top = el('header', 'pov-top');
      var mark = el('span', 'pov-brand', { 'data-slot': 'brand', 'data-required': 'true', 'data-safe': 'true' });
      if (logoUrl) {
        var logo = el('img', 'pov-logo', { 'data-image-fit': 'contain' });
        logo.alt = brandText;
        logo.src = logoUrl;
        mark.appendChild(logo);
      } else {
        text(mark, brandText);
      }
      top.appendChild(mark);
      fragment.appendChild(top);
    }

    var copy = el('section', 'pov-copy ' + (cover ? 'pov-copy--cover' : 'pov-copy--panel'));
    if (clean(data.offer)) {
      copy.appendChild(text(el('span', 'pov-tag', { 'data-slot': 'offer', 'data-safe': 'true', 'data-fit-group': 'tag', 'data-fit-min': '0.8' }), clean(data.offer)));
    }
    if (headlineText) {
      var h1 = el('h1', 'pov-headline', { 'data-slot': 'headline', 'data-required': 'true', 'data-safe': 'true', 'data-fit-group': 'headline', 'data-fit-min': '0.6' });
      appendHeadline(h1, headlineText);
      copy.appendChild(h1);
    }
    if (clean(data.description)) {
      copy.appendChild(text(el('p', 'pov-support', { 'data-slot': 'description', 'data-safe': 'true', 'data-fit-group': 'support', 'data-fit-min': '0.85' }), clean(data.description)));
    }
    if (features.length) {
      var list = el('ul', 'pov-points', { 'data-slot': 'benefits', 'data-safe': 'true', 'data-fit-group': 'support', 'data-fit-min': '0.85' });
      features.forEach(function (feature, i) {
        var item = el('li');
        item.appendChild(tick());
        item.appendChild(text(el('span', null, { 'data-slot': 'benefit-' + (i + 1), 'data-safe': 'true' }), feature));
        list.appendChild(item);
      });
      copy.appendChild(list);
    }
    if (ctaText) {
      var cta = el('div', 'pov-cta', { 'data-slot': 'cta', 'data-required': 'true', 'data-safe': 'true', 'data-fit-group': 'cta', 'data-fit-min': '0.8' });
      cta.appendChild(text(el('span'), ctaText));
      var icon = el('span', 'pov-cta-icon');
      icon.appendChild(arrow());
      cta.appendChild(icon);
      copy.appendChild(cta);
    }
    fragment.appendChild(copy);

    root.replaceChildren(fragment);
  }

  window.setCreative = function setCreative(input) {
    var data = input && typeof input === 'object' ? input : {};
    var warnings = [];
    var root = document.getElementById('creative');
    created = true;

    var format = FORMATS[data.format] || 'square';
    if (data.format && !FORMATS[data.format]) warnings.push('unknown format "' + clean(String(data.format)) + '": square is used');
    root.setAttribute('data-format', format);

    var colors = data.colors && typeof data.colors === 'object' ? data.colors : {};
    var primary = hex(colors.primary, DEFAULT_COLORS.primary);
    var secondary = hex(colors.secondary, DEFAULT_COLORS.secondary);
    var accent = hex(colors.accent, DEFAULT_COLORS.accent);
    root.style.setProperty('--lf-brand-primary', primary);
    root.style.setProperty('--lf-brand-secondary', secondary);
    root.style.setProperty('--lf-brand-accent', accent);
    // The engine checks contrast in its schema; here a combination that cannot be read is reported, not shown silently.
    if (contrast(primary, WHITE) < 4.5) warnings.push('colors.primary: white text on it has contrast below 4.5');
    if (contrast(accent, INK) < 4.5) warnings.push('colors.accent: dark text on it has contrast below 4.5');

    var fonts = data.fonts && typeof data.fonts === 'object' ? data.fonts : {};
    root.style.setProperty('--lf-font-heading', FONT_STACKS[fonts.heading] || FONT_STACKS.inter);
    root.style.setProperty('--lf-font-body', FONT_STACKS[fonts.body] || FONT_STACKS.inter);

    build(root, data, warnings);
    ['headline', 'support', 'cta', 'tag'].forEach(function (group) { root.style.removeProperty('--lf-fit-' + group); });

    window.creativeWarnings = warnings;
    window.creativeReady = Promise.all([
      document.fonts && document.fonts.ready,
      Promise.all(Array.prototype.map.call(root.querySelectorAll('img'), function (img) { return img.decode().catch(function () { /* reported by the render checks */ }); })),
    ]).then(function () { return { format: format, warnings: warnings }; });
    return { format: format, warnings: warnings };
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (created) return;
    var root = document.getElementById('creative');
    root.appendChild(text(el('p', 'pov-empty'), 'Roep window.setCreative(data) aan om deze advertentie te vullen.'));
  });
})();
