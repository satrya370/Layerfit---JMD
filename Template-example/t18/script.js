/* ============================================================
   LAYERFIT TEMPLATE T19 — FASHION — dynamic content
   ------------------------------------------------------------
   API publik: window.setCreative(data)

   data = {
     brand?,       "ELIA"                          (null -> slot merek disembunyikan)
     headline?,    string | string[]               (maks 3 baris; string dipecah \n)
     accentLine?,  "Winterzon Editie"              (baris script; null -> disembunyikan)
     badgeLines?,  string | string[]               (maks 2 baris; string dipecah spasi)
     address?,     "VANAF € 24,95"                 (hook harga / info singkat)
     eventDate?,   "T/M ZO 29 NOV."                (slot kiri: deadline / ketersediaan)
     eventTime?,   "-30% ONLINE"                   (slot kanan: benefit / promo)
     cta?,         "SHOP DE COLLECTIE"             (null -> CTA bar disembunyikan)
     imageUrl?,    "assets/hero.jpg"               (null -> hero disembunyikan)
     imageAlt?,    string
     imageMode?,   "cover" (foto) | "contain"
     texture?,     true | false                    (grain kertas)
     colors?,      { bg, ink, mid, accent, gold, onAccent }
     format?       "square" | "portrait" | "story"
   }

   Keamanan: SEMUA teks di-set via textContent — tidak ada
   innerHTML dengan data eksternal. Elemen tanpa data
   disembunyikan, bukan diisi placeholder palsu.

   Tipografi: setelah font & gambar siap, setiap teks di-auto-fit
   (headline multi-baris memakai satu ukuran bersama) sehingga
   copy panjang/k pendek selalu proporsional tanpa overflow.
   ============================================================ */

(function () {
  'use strict';

  var DEFAULT_COLORS = {
    bg: '#F4EEE1',
    ink: '#27231B',
    mid: '#5F6B3A',
    accent: '#B3401F',
    gold: '#BC8A2E',
    onAccent: '#F6EFE0'
  };

  var FORMATS = ['square', 'portrait', 'story'];

  /* ---------- helper ---------- */

  function $(id) { return document.getElementById(id); }

  /** Set teks; sembunyikan elemen bila teks kosong. */
  function setText(el, value) {
    if (!el) return;
    var text = typeof value === 'string' ? value.trim() : '';
    if (text) {
      el.textContent = text;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  /** Terapkan warna brand ke CSS variables pada root .ad. */
  function applyColors(ad, colors) {
    var c = colors && typeof colors === 'object' ? colors : {};
    Object.keys(DEFAULT_COLORS).forEach(function (key) {
      if (typeof c[key] === 'string' && c[key].trim()) {
        ad.style.setProperty('--c-' + kebab(key), c[key].trim());
      } else {
        ad.style.removeProperty('--c-' + kebab(key));
      }
    });
  }

  function kebab(camel) {
    return camel.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
  }

  /** Normalisasi input teks multi-baris -> array (maks n). */
  function toLines(value, max) {
    var out = [];
    if (Array.isArray(value)) {
      out = value.filter(function (v) { return typeof v === 'string' && v.trim(); });
    } else if (typeof value === 'string' && value.trim()) {
      out = value.trim().split(/\n+/);
    }
    return out.map(function (v) { return v.trim(); }).filter(Boolean).slice(0, max);
  }

  /** Badge: string satu baris dipecah jadi 2 baris seimbang. */
  function badgeToLines(value) {
    var lines = toLines(value, 2);
    if (lines.length === 1 && /\s/.test(lines[0])) {
      var words = lines[0].split(/\s+/);
      var half = Math.ceil(words.length / 2);
      lines = [words.slice(0, half).join(' '), words.slice(half).join(' ')].filter(Boolean);
    }
    return lines;
  }

  /** Muat gambar; resolve "ok"|"error" (timeout 12 dtk). */
  function loadImage(img, url) {
    return new Promise(function (resolve) {
      if (!url) { resolve('empty'); return; }
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; resolve('error'); }
      }, 12000);
      img.onload = function () {
        if (settled) return; settled = true;
        clearTimeout(timer); resolve('ok');
      };
      img.onerror = function () {
        if (settled) return; settled = true;
        clearTimeout(timer); resolve('error');
      };
      img.src = url;
    });
  }

  /* ---------- auto-fit tipografi ---------- */

  function adWidth(ad) {
    return ad.getBoundingClientRect().width || 1080;
  }

  /** Beberapa elemen berbagi satu ukuran font (mis. 3 baris headline). */
  function fitShared(els, targetCqw, minCqw, maxCqw, w) {
    var visible = (els || []).filter(function (el) { return el && !el.hidden; });
    if (!visible.length) return;
    visible.forEach(function (el) { el.style.fontSize = ''; });
    var base = parseFloat(getComputedStyle(visible[0]).fontSize);
    var widest = 0;
    visible.forEach(function (el) { widest = Math.max(widest, el.offsetWidth); });
    if (!base || !widest) return;
    var target = targetCqw / 100 * w;
    var px = Math.min(maxCqw / 100 * w, Math.max(minCqw / 100 * w, base * target / widest));
    visible.forEach(function (el) { el.style.fontSize = px + 'px'; });
  }

  /** Satu elemen di-fit ke lebar target. */
  function fitEl(el, targetCqw, minCqw, maxCqw, w) {
    fitElPx(el, targetCqw / 100 * w, minCqw / 100 * w, maxCqw / 100 * w);
  }

  /** Varian fitEl dengan target/min/maks dalam piksel absolut. */
  function fitElPx(el, targetPx, minPx, maxPx) {
    if (!el || el.hidden) return;
    el.style.fontSize = '';
    var base = parseFloat(getComputedStyle(el).fontSize);
    var width = el.offsetWidth;
    if (!base || !width) return;
    var px = Math.min(maxPx, Math.max(minPx, base * targetPx / width));
    el.style.fontSize = px + 'px';
  }

  /* ---------- API publik ---------- */

  /**
   * Terapkan satu creative ke template.
   * Mengembalikan Promise; render.mjs menunggu window.__layerfit.ready.
   */
  window.setCreative = function (data) {
    window.__layerfit = { ready: false };

    var d = data || {};
    var ad = $('ad');

    /* --- format kanvas --- */
    var format = FORMATS.indexOf(d.format) !== -1 ? d.format : 'square';
    ad.dataset.format = format;

    /* --- warna & tekstur --- */
    applyColors(ad, d.colors);
    ad.dataset.texture = d.texture === false ? 'off' : 'on';

    /* --- headline (piramida 3 baris) --- */
    var lines = toLines(d.headline, 3);
    var spans = [$('hl1'), $('hl2'), $('hl3')];
    spans.forEach(function (el, i) { setText(el, lines[i] || ''); });
    var headline = $('headline');
    if (headline) headline.hidden = lines.length === 0;

    /* --- baris script --- */
    var accentLine = typeof d.accentLine === 'string' ? d.accentLine.trim() : '';
    setText($('scriptText'), accentLine);
    var scriptLine = $('scriptLine');
    if (scriptLine) scriptLine.hidden = !accentLine;

    /* --- badge starburst --- */
    var blines = badgeToLines(d.badgeLines);
    setText($('burstL1'), blines[0] || '');
    setText($('burstL2'), blines[1] || '');
    var burst = $('burst');
    if (burst) burst.hidden = blines.length === 0;

    /* --- info acara --- */
    setText($('address'), d.address);
    setText($('eventDate'), d.eventDate);
    setText($('eventTime'), d.eventTime);
    setText($('brandName'), d.brand);
    var dateSide = $('dateSide');
    var timeSide = $('timeSide');
    if (dateSide) dateSide.hidden = !(typeof d.eventDate === 'string' && d.eventDate.trim());
    if (timeSide) timeSide.hidden = !(typeof d.eventTime === 'string' && d.eventTime.trim());
    var eventrow = $('eventrow');
    if (eventrow) {
      eventrow.hidden = (dateSide && dateSide.hidden) && (timeSide && timeSide.hidden) &&
        !(typeof d.brand === 'string' && d.brand.trim());
    }

    /* --- CTA --- */
    var ctaText = typeof d.cta === 'string' ? d.cta.trim() : '';
    setText($('ctaLabel'), ctaText);
    var ctabar = $('ctabar');
    if (ctabar) ctabar.hidden = !ctaText;
    ad.dataset.ctabar = ctaText ? 'on' : 'off';

    /* --- hero --- */
    var hero = $('hero');
    var img = $('heroImg');
    ad.dataset.imageMode = d.imageMode === 'contain' ? 'contain' : 'cover';

    /* --- muat gambar, lalu auto-fit & tandai siap-render --- */
    return loadImage(img, typeof d.imageUrl === 'string' ? d.imageUrl.trim() : '')
      .then(function (status) {
        if (img) {
          img.alt = typeof d.imageAlt === 'string' ? d.imageAlt : '';
          if (status === 'ok') {
            img.hidden = false;
          } else {
            img.removeAttribute('src');
            img.hidden = true;
          }
        }
        if (hero) hero.hidden = status !== 'ok';

        return document.fonts.ready.then(function () {
          var w = adWidth(ad);

          /* headline: satu ukuran bersama, target lebar per format */
          var hl = {
            square:   [72, 7.0, 9.0],
            portrait: [80, 8.0, 11.6],
            story:    [82, 8.4, 11.9]
          }[format];
          fitShared(spans, hl[0], hl[1], hl[2], w);

          fitEl($('scriptText'), 40, 3.2, { square: 4.9, portrait: 5.4, story: 6 }[format], w);
          fitEl($('address'), 46, 2.6, format === 'story' ? 4 : 3.6, w);

          /* merek dipasang dulu; tanggal/jam lalu di-fit ke lebar
             kolom sisi yang tersisa agar tidak pernah bertabrakan
             dengan merek yang panjang */
          fitEl($('brandName'), { square: 42, portrait: 42, story: 44 }[format], 4.4,
                { square: 10, portrait: 10.2, story: 11.2 }[format], w);
          var sidePad = 8;
          var dateTarget = dateSide && !dateSide.hidden ? Math.max(80, dateSide.clientWidth - sidePad) : 0;
          var timeTarget = timeSide && !timeSide.hidden ? Math.max(80, timeSide.clientWidth - sidePad) : 0;
          if (dateTarget) fitElPx($('eventDate'), dateTarget, 1.6 / 100 * w, 2.9 / 100 * w);
          if (timeTarget) fitElPx($('eventTime'), timeTarget, 1.6 / 100 * w, 2.9 / 100 * w);
          fitShared([$('burstL1'), $('burstL2')], 14.5, 1.2, 2.2, w);
          fitEl($('ctaLabel'), 62, 1.8, 2.7, w);

          window.__layerfit.ready = true;
          return { imageStatus: status, format: format };
        });
      });
  };
})();
