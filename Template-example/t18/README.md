# LayerFit T19 — Fashion

Template Meta Ads statis bergaya **poster mode Mediterania** untuk promo
**pakaian** — varian fashion dari poster "tavern night" (struktur layout
identik, konten & fungsi slot diadaptasi untuk e-commerce fashion).
Fitur khasnya tetap utuh:

| Elemen | Implementasi |
| --- | --- |
| Headline | piramida 3 baris, **3 warna font** (ink + mid + accent) di atas kertas hangat |
| Foto | **frame lengkung** (pintu/butik) + bayangan cetak offset warna accent |
| Badge | starburst 12 puncak + cincin warna kertas — "LIMITED EDITIE" / "LIMITED DROP" |
| Info 3 kolom | **hook harga \| merek \| promo/benefit** (Cormorant Garamond serif + hairline) |
| Aksen | baris script emas (Pacifico) + ranting olive SVG |
| Border | strip **Greek key / meander** di tepi atas (& bawah pada story) |
| Footer | **CTA bar** tinta full-bleed ("SHOP DE COLLECTIE →") |
| Detail | tekstur grain kertas, auto-fit tipografi per format |

## Ukuran

| Format | Piksel | Catatan |
| --- | --- | --- |
| square | 1080×1080 | feed 1:1 |
| portrait | 1080×1350 | feed 4:5 |
| story | 1080×1920 | konten inti berakhir ±1568 px (safe area IG story < 1580 px) |

## Struktur

```
t19-fashion/
├── index.html                  markup (semua elemen dinamis ber-ID)
├── styles.css                  desain lengkap (satuan cqw — ikut skala)
├── script.js                   API window.setCreative(data)
├── creative.example.json       contoh: ELIA — linnen winterzon (resort, -30%)
├── creative.example-alt.json   contoh: NOORD. — denim & wol (herfst, palet lain)
├── render.mjs                  ekspor PNG via Puppeteer
├── package.json
├── assets/
│   ├── fonts/                  font lokal (Google Fonts, lisensi OFL) — render tanpa jaringan
│   ├── hero.jpg                foto linnen (placeholder — ganti dengan foto produk Anda)
│   └── hero-alt.jpg            foto denim & knitwear (placeholder)
└── previews/                   hasil render contoh (3 ukuran)
```

## Pemakaian

```bash
npm install
node render.mjs                                       # contoh utama -> previews/
node render.mjs --data creative.example-alt.json      # contoh alternatif
node render.mjs --formats square,story                # pilih ukuran
```

Buka `index.html` langsung di browser untuk pratinjau cepat
(isi awal = creative utama, ELIA).

## Slot konten untuk fashion

| Slot | Contoh ELIA | Contoh NOORD. | Fungsi |
| --- | --- | --- | --- |
| headline | LINNEN, ZON & LATE ZOMERS | DENIM, WOL & AVONDEN | produk + mood |
| accentLine | Winterzon Editie | Nieuw Binnen | nama drop/koleksi (script) |
| badgeLines | LIMITED EDITIE | LIMITED DROP | segel urgency di foto |
| address | VANAF € 24,95 | VANAF € 49,95 | **hook harga** |
| eventDate | T/M ZO 29 NOV. | NU IN DE WINKEL | deadline promo / ketersediaan |
| eventTime | -30% ONLINE | GRATIS RETOUR | benefit utama |
| cta | SHOP DE COLLECTIE | SHOP NU ONLINE | aksi |

## API `setCreative(data)`

```js
window.setCreative({
  format: 'square',              // "square" | "portrait" | "story"
  brand: 'ELIA',                 // nama merek di tengah baris bawah
  headline: ['LINNEN,', 'ZON & LATE', 'ZOMERS'],   // maks 3 baris (string -> pecah \n)
  accentLine: 'Winterzon Editie',// baris script emas
  badgeLines: ['LIMITED', 'EDITIE'],  // maks 2 baris
  address: 'VANAF € 24,95',
  eventDate: 'T/M ZO 29 NOV.',
  eventTime: '-30% ONLINE',
  cta: 'SHOP DE COLLECTIE',
  imageUrl: 'assets/hero.jpg',   // null -> hero disembunyikan
  imageAlt: 'Vrouw in linnen zomerjurk',
  imageMode: 'cover',            // "cover" (foto) | "contain"
  texture: true,                 // grain kertas on/off
  colors: {                      // semua opsional — dioverride per key
    bg: '#F4EEE1',               // kertas cream
    ink: '#27231B',              // tinta — headline 1, frame, CTA bar
    mid: '#5F6B3A',              // olive — headline 2, serif, meander
    accent: '#B3401F',           // terracotta — headline 3, badge, bayangan
    gold: '#BC8A2E',             // emas — baris script
    onAccent: '#F6EFE0'          // teks di atas accent/ink
  }
});
```

Semua teks di-set via `textContent` (aman terhadap XSS); slot tanpa data
otomatis disembunyikan. Setiap teks di-auto-fit ke lebar slot-nya, sehingga
copy pendek/panjang tetap proporsional tanpa overflow.

## Catatan foto

Hero memakai `object-fit: cover` — wajah model sebaiknya dekat pusat vertikal
agar aman pada crop lebar 1080×1080 (±1.9:1). Bila foto produk berupa PNG
transparan (ghost mannequin / packshot), pakai `imageMode: "contain"`.
