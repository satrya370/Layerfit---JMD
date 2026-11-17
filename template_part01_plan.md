# Template Part 01 — HTML/CSS/Tailwind Implementation Plan

Tanggal: 17 November 2026. Status: **rencana, belum implementasi**.

## 1. Tujuan dan batas scope

Membangun empat keluarga template iklan dinamis berdasarkan empat screenshot dalam `Template-example/`, menggunakan HTML, CSS dan Tailwind yang dikompilasi lokal. CP berarti **checkpoint**: paket kerja bertahap dengan output dan acceptance criteria yang bisa diuji sebelum lanjut.

Part 01 mencakup **4 konsep × 3 format = 12 output per brief**, bukan 15 konsep atau 45 gambar. Dengan dua brief uji: 24 PNG dan, jika ekspor JPEG dijalankan, 24 JPG. Variasi warna, copy, dan ukuran tidak dihitung sebagai konsep baru. Sebelas konsep tambahan berada di part berikutnya.

Referensi diikuti pada pola komposisi, hierarki, dan pendekatan visual; bukan menyalin logo, foto, brand, klaim, atau identitas kompetitor. Screenshot bukan bukti performa iklan, lisensi aset, ataupun verifikasi data produk. Tidak ada data durasi tayang/ROAS yang telah dibuktikan.

Dokumen induk: `spec.md`, `docs/architecture.md`, `docs/audit.md`, dan `TODO.md`. Local prototype hanya menggunakan aset sintetis. Implementasi resmi, aset brand asli, dan deployment JMD tetap memerlukan akses/konfirmasi.

## 2. Hasil pemeriksaan referensi

| ID | File referensi | Struktur yang terlihat | Adaptasi yang direncanakan |
|---|---|---|---|
| T01 | `Screenshot 2026-11-17 114011.png` | Latar cream, headline serif hijau besar dua baris, foto shaker/bag dominan, tiga pill manfaat berpanah, pill harga di bawah, domain footer | **Annotated Product Hero**: headline editorial + foto shaker/scene dominan + callout 1–3 dengan anchor yang dinormalisasi ke product-stage canvas + CTA/offer opsional |
| T02 | `Screenshot 2026-11-17 114036.png` | Dua foto full-height berdampingan, garis pemisah putih, headline kiri atas, label panel, daftar silang/centang di bawah, logo kanan atas | **Dual Panel Comparison**: perbandingan hanya dengan bukti yang valid; default dua konteks/manfaat produk sendiri, bukan klaim bahwa kompetitor lebih buruk |
| T03 | `Screenshot 2026-11-17 114058.png` | Latar charcoal, blok social proof di atas, promo dan kode sangat besar, tiga benefit/service rows, dua foto bundar, strip informasi footer | **Dark Offer Stack**: poster bertingkat dengan headline/offer, daftar fakta, dua aperture foto, footer/CTA; social proof/promo hanya jika terverifikasi |
| T04 | `Screenshot 2026-11-17 114125.png` | Latar abu hangat, rating kecil di atas, headline sans tebal dengan frasa merah, subheadline italic, foto landscape besar, price banner dan logo bawah | **Editorial Reframe**: hook dua bagian dengan accent phrase + subheadline + image block + CTA/offer footer |

### Yang tidak boleh disalin sebagai default

- T01: harga €45/€30, klaim waktu 15 detik, USB-C, atau tidak perlu bola shaker.
- T02: pernyataan negatif tentang merek lain, kemampuan otomatis, atau kemampuan membersihkan rambut tanpa bukti.
- T03: diskon 5%, kode EXTRA5, pengiriman besok, gratis retur, Klarna, badge Trustpilot, ataupun urgensi satu hari.
- T04: rating 4.8, 500+ review, harga €299, label Black Friday, dan bundle dua produk.
- Semua logo/domain/foto referensi tidak menjadi bagian output LayerFit. Jangan memakai screenshot utuh sebagai background untuk menghindari implementasi template.

## 3. Keputusan implementasi

### HTML + CSS + Tailwind

- Tailwind dipakai untuk primitive layout dan komponen umum; CSS khusus untuk canvas dimensions, typography, callout geometry, serta layout tiap format.
- Compile Tailwind saat build, bukan browser/CDN runtime. CSS hasil build di-inline atau dimuat dari bundle lokal yang dikendalikan renderer.
- Semua class layout statis dalam source atau dipetakan melalui enum. Hindari class dinamis seperti `bg-${input}` yang hilang saat build/purge.
- Warna, font, spacing dan dimensi lewat CSS custom properties dari konfigurasi tervalidasi; input pengguna tidak boleh menjadi CSS/class/HTML bebas.
- Pin versi Tailwind setelah memeriksa runtime dan setup build; dokumentasikan versi dan lockfile. Tidak perlu mengganti renderer yang sudah ada hanya untuk memakai Tailwind.
- Gunakan CSS Grid/Flex untuk komposisi utama. Absolute positioning hanya untuk elemen seperti callout/brand mark dengan bounds terukur.
- Format creative ditentukan eksplisit (`data-format`/layout profile), bukan hanya breakpoint layar dashboard. Thumbnail dashboard boleh diperkecil; export tidak menggunakan transform-scale satu layout untuk semua ukuran.

### Lokasi engine existing

Repo `Layerfit-JMD` saat perencanaan berisi dokumentasi dan screenshot referensi yang belum tracked; source prototype sebelumnya masih di workspace `C:\Users\Asus\LayerFit`. Jangan menganggap renderer tersedia di repo ini. CP01 harus memeriksa lalu membawa modul yang relevan secara selektif dengan attribution, tanpa `node_modules`, `.env`, artifacts atau clone referensi. Jangan mengubah clone IG Content Builder asli.

### Struktur file yang diusulkan

```text
src/templates/
  schema.ts
  registry.ts
  render-template.ts
  shared/
    canvas.ts
    brand-header.ts
    image-slot.ts
    benefit-list.ts
    callout.ts
    offer-block.ts
    proof-block.ts
    footer.ts
  part01/
    annotated-hero.ts
    dual-panel.ts
    dark-offer-stack.ts
    editorial-reframe.ts
  styles/
    tailwind.css
    tokens.css
    part01.css
tests/templates/part01/
  schema.test.ts
  template.test.ts
  render.test.ts
fixtures/templates/part01/
  apparel.json
  bottle.json
scripts/
  render-template-part01.ts
```

Struktur ini proposal, boleh menyesuaikan aplikasi existing saat implementasi. Build CSS dan renderer tetap satu pipeline; tidak perlu menambah framework preview khusus.

## 4. Kontrak data template

Seluruh template menerima konfigurasi terstruktur; renderer menerima asset ID yang sudah diverifikasi dan di-resolve server-side. Template tidak memilih path atau URL eksternal dari input bebas.

```ts
type TemplatePart01Id =
  | 'annotated-hero'
  | 'dual-panel'
  | 'dark-offer-stack'
  | 'editorial-reframe';

type CreativeFormat = 'square' | 'portrait' | 'vertical';

interface TemplatePart01Config {
  schemaVersion: 1;
  templateId: TemplatePart01Id;
  brand: {
    name: string;
    logoAssetId?: string;
    primary: string;
    secondary: string;
    accent: string;
    fontHeadingId: string;
    fontBodyId: string;
  };
  copy: {
    headline: string;
    accentPhrase?: string;
    body?: string;
    cta: string;
    benefits: Array<{ text: string; factIds: string[] }>;
  };
  assets: Array<{
    assetId: string;
    role: 'product' | 'lifestyle' | 'detail';
    focalPoint?: { x: number; y: number }; // normalized 0..1
    allowCrop: boolean;
  }>;
  callouts?: Array<{
    benefitIndex: number;
    anchor: { x: number; y: number }; // normalized image content coordinates
  }>;
  offerFactId?: string;
  proofFactId?: string;
  comparisonEvidenceId?: string;
}
```

Ini kontrak rencana, bukan schema runtime yang sudah dibuat. CP01 harus menambahkan validasi strict, memastikan asset/fact milik campaign yang sama, dan mendefinisikan bentuk `offer`, `proof` dan bukti comparison di server. Jangan merender badge hanya karena sebuah ID ada; cek isi, status verified, masa berlaku, dan relevansi produk.

### Aturan copy/aset

- Batas induk: headline <=90, body <=240, CTA <=32 karakter. Budget visual per template lebih ketat dan diuji dengan teks Belanda panjang, bukan bergantung pada jumlah karakter saja.
- Rekomendasi awal: T01 headline 55, pill manfaat 30; T02 label panel 22, bullet 42; T03 headline 55, benefit 48; T04 headline total 85 dan subheadline 100. Ini budget awal, bukan jaminan teks pasti muat.
- Klaim headline, body, CTA, benefit, comparison, offer dan proof tetap harus melewati kebijakan fakta. Angka, diskon, review, urgency dan fulfillment tidak disimpulkan dari screenshot.
- Tidak ada asset wajib tambahan yang harus dicari dari internet. Satu foto harus tetap dapat menghasilkan semua empat keluarga dengan fallback yang jelas.
- Logo yang belum tersedia menggunakan brand-name text, bukan logo kompetitor. Font memakai bundle lokal yang lisensinya valid; fallback dicatat, bukan diam-diam dianggap font brand sudah tersedia.

## CP00 — Reference mapping dan desain kontrak

**Tujuan:** mengunci apa yang diadaptasi dan apa yang tidak.

Pekerjaan:
- [x] Catat empat reference ID/path, hierarki elemen, karakter tipografi dan kebutuhan aset sebagaimana tabel di atas.
- [x] Buat wireframe internal awal empat konsep untuk tiga format; Part 01 CP00–CP02 menyelesaikan detail T01 saja.
- [x] Tetapkan default tone visual mengikuti brand tokens, bukan identitas brand referensi.
- [x] Draft schema T01 dan kontrak slot; ownership/fakta serta offer validation tetap tanggung jawab aplikasi/engine dan belum full terintegrasi.

Output: reference mapping, T01 wireframes tiga format (`templates/part01/README.md`), draft registry dan schema contract. Wireframe detail T02–T04 tetap perlu dibuat saat CP03–CP05.

**Status partial:** komposisi empat konsep sudah dibedakan di reference map; wireframe/contract T01 tersedia dan sensitive claims dibatasi. T02–T04 wireframe dan schema conditional masih harus didefinisikan sebelum template masing-masing.

## CP01 — Foundation, design tokens dan local Tailwind build

Pekerjaan:
- [ ] Periksa source renderer prototype; adaptasi lifecycle Puppeteer dengan attribution dan dependency audit.
- [x] Setup TypeScript dan Tailwind local compile, reusable CSS tokens dan tiga format profiles di `templates/part01`.
- [ ] Buat registry yang mendefinisikan slot, field budgets, layout per format dan fallback untuk empat ID (baru T01 adapter; shared registry belum lengkap).
- [x] Implementasikan escape HTML, input schema, dan allowlist system font pada T01. Ownership check asset/fact serta raster byte decode tetap pada integration boundary dan belum full diuji di app.
- [x] Buat komponen T01 image-slot, benefit-list, CTA/footer, brand text fallback dan conditional verified offer. Komponen reusable lintas 4 konsep belum diekstrak.
- [x] Hubungkan Tailwind build ke template smoke harness; tes tunggu font/image dan blokir network eksternal pada harness. Integrasi ke renderer/job production belum tersedia.

Output: fondasi template yang menerima data dinamis dan T01, tanpa implementasi seluruh UI campaign. Artifact smoke lokal: `templates/part01/artifacts/template-part01/`.

**Status partial:** build Tailwind lokal tanpa CDN, input escaping/schema, system font allowlist, PNG fixture tertanam dan tiga format teruji; font brand bundled, ownership resolver, registry empat template, dan integration ke renderer utama belum selesai.

## CP02 — T01 Annotated Product Hero

Komposisi:
- Area atas headline serif besar, warna brand gelap di atas background netral.
- Area tengah foto dominan; 1–3 callout pill dan konektor mengarah ke bagian relevan jika anchor valid.
- Footer CTA atau offer yang terverifikasi. Jika tidak ada offer, ruangnya dipakai CTA/brand, bukan harga dummy.

Adaptasi format:
- **Square:** headline ringkas di atas; produk di kiri/tengah dan callout di rail kanan, footer pendek.
- **Portrait:** headline atas, foto tengah lebih tinggi, callout kanan, CTA/brand bawah.
- **Vertical:** seluruh copy/produk penting berada di safe content box; tambahan tinggi untuk ruang foto/spacing, bukan stretch.

Fallback:
- Foto tanpa background transparan dimasukkan ke frame netral, bukan background removal otomatis.
- Jika objek tidak teridentifikasi/anchor tidak disetel, manfaat menjadi rail di samping atau bawah foto **tanpa panah palsu**.
- Koordinat anchor saat ini dinormalisasi relatif terhadap seluruh product-stage canvas agar bisa diatur dari editor/preview. Pemetaannya ke titik objek setelah contain/letterbox harus dilakukan oleh preview/editor yang mengetahui geometri foto; jangan mengirim anchor yang dikarang.

**Status partial:** T01 menerima satu foto, benefit facts, optional stage anchors, CTA dan promo opsional; smoke tiga format lulus untuk dua fixture produk. Teks maksimum, raster validation dari upload nyata, akurasi anchor terhadap titik objek, offer expiry/ownership, dan integrasi editor/renderer belum terverifikasi.

## CP03 — T02 Dual Panel Comparison

Komposisi:
- Dua panel dengan divider kuat, judul/label, 2–3 bullet per panel dan area brand/CTA yang terpisah.
- Jika foto lifestyle memang tersedia dan crop diizinkan, boleh memakai cover dengan focal point; foto produk utama default contain.
- Gradient/scrim lokal menjaga kontras copy di atas foto.

Mode data:
1. **Comparison terverifikasi:** kedua sisi punya sumber/asset dan bukti klaim yang jelas. Label netral; klaim negatif terhadap kompetitor ditolak tanpa bukti.
2. **Default dual-benefit:** dua keunggulan/konteks produk sendiri; tanpa simbol silang atau pernyataan bahwa sisi lain buruk.
3. **Single-photo fallback:** satu panel foto contain dan satu panel informasi brand. Tetap dua-area composition, bukan berpura-pura memiliki dua foto/kondisi.

Adaptasi format:
- **Square/portrait:** dua panel berdampingan, bullet pendek dan area CTA sendiri.
- **Vertical:** dua panel bertumpuk dalam safe box supaya foto/copy tidak terlalu sempit; hierarki label dan bullet tetap sama.

**Status: complete untuk gate template-level lokal (17 November 2026).** Uji two-photo dual-benefit dan single-photo information fallback pada square/portrait/vertical; config `verified-comparison` tanpa evidence ditolak. Contact sheet enam PNG ditinjau; text, CTA, dan safe bounds terlihat di tiga ukuran. Ini belum engine integration, belum membuktikan fakta pada fixture sintetis, dan bukan approval desain brand. Positive verified-comparison visual, maksimum copy, asset ownership, dan JMD masih pending.

## CP04 — T03 Dark Offer Stack

Komposisi:
- Background gelap, headline atau offer dominan, optional proof block, tiga baris fakta, dua image aperture, footer CTA.
- Gunakan tint/kontras brand, bukan otomatis meniru Trustpilot green atau Klarna identity.

Conditional behavior:
- Tanpa promo valid: tampilkan headline produk, bukan kode/diskon dummy.
- Tanpa bukti review: proof block dihilangkan dan ruang diatur ulang. Jangan mengganti dengan bintang dekoratif yang menyerupai rating asli.
- Provider pembayaran/layanan hanya muncul jika pengguna menyediakan fakta dan aset berlisensi yang relevan.
- Promo kadaluarsa/urgency tidak terverifikasi: render error pada data promo atau non-promo variant eksplisit; jangan diam-diam mempublikasikan harga salah.

Foto:
- Dua foto tersedia: dua frame circular/rounded dengan object-fit sesuai peran aset.
- Satu foto: satu foto lebih besar + panel fakta; tidak perlu menggandakan foto seolah dua produk berbeda.
- Produk contain di dalam aperture; jika lingkaran akan memotong produk, pakai rounded frame atau skala internal yang menjaga siluet.

Adaptasi format:
- **Square:** grid kompak copy/fakta dan foto; bukan seluruh elemen reference dipadatkan vertikal.
- **Portrait:** headline → benefit → foto → CTA.
- **Vertical:** struktur poster bertingkat, footer masuk safe box, bukan strip di tepi bawah canvas.

**Gate:** mode promo valid dan mode tanpa promo/proof sama-sama layak visual; invalid proof/promo tidak lolos; foto tidak terpotong; tiga format valid.

**Status partial (17 November 2026):** T03 renders six placements (two synthetic configurations × three formats), including no-offer/no-proof and explicit test-only offer/proof slots. Missing referenced facts fail closed; PNG/JPEG dimensions, text/safe geometry, crop policy and all six PNGs were reviewed. Real expiry/eligibility validation remains in the domain service and is not part of this isolated template package; long copy, real brand and engine integration remain pending.

**Status partial (17 November 2026):** T03 renders six placements (two synthetic configurations × three formats), including no-offer/no-proof and explicit test-only offer/proof slots. Missing referenced facts fail closed; PNG/JPEG dimensions, text/safe geometry, crop policy and all six PNGs were reviewed. Real expiry/eligibility validation remains in the domain service and is not part of this isolated template package; positive valid comparison/social-proof assertions, long copy, real brand and engine integration remain pending.

## CP05 — T04 Editorial Reframe

Komposisi:
- Headline bold dengan satu frasa accent; subheadline editorial; foto besar dalam frame; footer CTA/offer + brand.
- Proof strip opsional. Jika tidak ada data valid, hilangkan dan rapikan jarak.
- Accent phrase adalah text span tervalidasi, bukan HTML dari AI. Atur wrap lewat layout yang aman, bukan bergantung pada line-break hardcoded untuk satu produk.

Adaptasi format:
- **Square:** headline 2–3 baris dengan foto lebih rendah dan footer ringkas.
- **Portrait:** judul/subheadline → foto landscape → footer; hindari area kosong berlebihan.
- **Vertical:** headline dan foto memperoleh ruang lebih besar di safe box, tidak mengecilkan semua teks untuk mempertahankan screenshot asli.

Fallback:
- Tanpa lifestyle photo: gunakan foto produk contain dalam image block netral.
- Tanpa offer: footer CTA; tanpa logo: brand text; tanpa accent phrase: headline tetap utuh.

**Gate:** headline panjang tidak memotong frasa accent; body/subheadline opsional tidak meninggalkan gap janggal; tidak ada fake bundle/review/Black Friday badge; tiga format valid.

## CP06 — Multi-format QA dan fallback matrix

Dataset: dua product brief sintetis yang berbeda (apparel dan reusable bottle); facts/photos lokal sendiri. Tidak menggunakan foto kompetitor dari screenshot. Tambahkan fixtures terpisah untuk data promo/proof yang diberi label **simulasi**, bukan dipresentasikan sebagai klaim brand nyata.

Test matrix:
- [ ] 4 template × 3 format × 2 produk = 24 PNG; JPEG diuji 24 file jika encoding keduanya diaktifkan.
- [ ] Decode semua file dengan Sharp dan cek magic/format + width/height yang tepat.
- [ ] Headline/body pendek dan maksimum; teks Belanda dengan kata panjang, tanda baca dan karakter beraksen.
- [ ] Satu foto vs beberapa foto; rasio foto portrait/square/landscape; logo ada/tidak ada.
- [ ] Font load gagal, gambar korup, referensi asset tidak dimiliki campaign, warna/font invalid.
- [ ] Offer/proof hilang, invalid, kedaluwarsa; comparison tanpa evidence.
- [ ] Output tidak berisi placeholder mentah, HTML dari input, URL eksternal, atau brand/domain kompetitor.
- [ ] Tidak ada overflow/clipping; teks/CTA berada dalam safe box; callout tidak overlap; product silhouette tidak terpotong.
- [ ] Vertical memakai baseline top 250px, bottom 350px, sides 70px dari spec; review overlay placement diperlukan, bukan jaminan semua UI Meta aman.
- [ ] Buat contact sheet per produk dan per format; inspeksi visual semua frame, bukan satu sampel saja.
- [ ] Failure satu output tidak menghapus hasil sukses; re-render layout tidak membuat AI call.
- [ ] Jalankan lint, typecheck, unit/integration render tests dan catat durasi aktual tanpa janji kecepatan.

Penanganan copy terlalu panjang: render dengan token typography yang diperbolehkan → bounded font adjustment sampai minimum keterbacaan yang disepakati → jika masih gagal, laporkan error spesifik field/template/format. Jangan memotong teks atau menutup overflow diam-diam untuk membuat test seolah berhasil.

**Gate:** seluruh output valid dalam matrix utama; kasus negatif gagal secara terkontrol; contact sheet ditinjau dan batasan ditulis. Screenshot hasil render bukan bukti bahwa dashboard/editor/AI sudah selesai.

## CP07 — Registry integration dan handoff

- [ ] Daftarkan empat template beserta ID/version/capabilities dan fallback di registry utama.
- [ ] Hubungkan ke endpoint/job renderer existing jika sudah tersedia; jangan membangun backend paralel khusus template.
- [ ] Uji perubahan konfigurasi (headline/CTA/photo) menghasilkan revisi baru tanpa AI call; jika editor/DB belum tersedia, laporkan pengujian sebagai config-level saja.
- [ ] Dokumentasikan cara compile CSS, menjalankan batch uji dan menemukan artifacts.
- [ ] Buat laporan hasil, waktu render, error/fallback, dan daftar pending; update TODO dengan bukti nyata.
- [ ] Review desain brand sebelum memakai aset nyata. Tidak deploy atau push assets/referensi ke remote tanpa instruksi.

**Gate:** empat template reusable menerima brief baru tanpa perubahan source; output dan manifest mengidentifikasi template/version/format; status UI/AI/integrasi dipisahkan dari status template.

## 5. Urutan dan dependency

`CP00 → CP01 → CP02 → CP03 → CP04 → CP05 → CP06 → CP07`.

Tiap template CP02–CP05 wajib punya smoke render tiga format sebelum lanjut; jangan menumpuk empat implementasi tanpa uji lalu baru menemukan masalah font/aset di akhir. Tidak menetapkan estimasi jam atau SLA sebelum benchmark dan setup environment selesai.

Prioritas jika waktu terbatas: kontrak data + offline render → empat komposisi nyata → fallback + tiga format → validasi visual → integrasi. Jangan mengganti empat konsep dengan satu layout dan banyak variasi warna untuk mengejar jumlah.

## 6. Checklist status saat dokumen dibuat

- [x] Empat screenshot lokal dibuka dan diperiksa.
- [x] Empat pola komposisi dan risiko klaim dipetakan dalam rencana ini.
- [x] Rencana CP00–CP07, data contract, format adaptation, fallback dan QA disusun.
- [x] CP00 partial: reference map empat screenshot dan wireframe/schema T01 tersedia; wireframe dan conditional contract T02–T04 pending.
- [x] CP01 partial: Tailwind local build, design tokens, strict T01 schema, locale/font allowlist dan smoke harness tersedia; production renderer, ownership resolver, font bundle dan shared registry pending.
- [x] CP02 partial: Annotated Product Hero dirender pada 3 format dengan dua aset sintetis; visual dan file dimensions diperiksa. Full long-copy/offer/anchor-mapping QA pending.
- [x] CP03 complete at template-level gate: Dual Panel renders 2-photo and 1-photo fallback scenarios in 3 formats; comparison mode without evidence is rejected; six PNG outputs visually inspected. Engine integration/brand approval still pending.
- [x] CP04 partial: Dark Offer Stack renders offer/proof-absent and explicit test-only fact-present variants in 3 formats; IDs resolve only from supplied facts; real fact-expiry/domain validation remains pending.
- [x] CP04 partial: Dark Offer Stack renders offer/proof-absent and explicitly test-only fact-present variants in 3 formats; IDs resolve only from supplied facts; real fact-expiry/domain validation remains pending.
- [ ] HTML/CSS/Tailwind untuk empat referensi diimplementasikan.
- [ ] Batch 24 output lintas dua brief diuji.
- [ ] Integrasi registry/editor/job diuji.
- [ ] JMD dan real brand test dilakukan.

Pembuatan plan tidak menandai CP implementasi selesai. Dokumentasi ini tidak mengubah status 15-konsep/45-image acceptance di spec induk.
