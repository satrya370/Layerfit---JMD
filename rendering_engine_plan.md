# Rendering Engine Adaptation Plan — IG Content Builder → LayerFit

Tanggal: 17 November 2026. Status: **rencana implementasi, bukan engine yang sudah selesai**.

Dokumen terkait: `spec.md`, `docs/audit.md`, `docs/architecture.md`, `template_part01_plan.md`, `docs/verification.md`, `TODO.md`.

## 1. Tujuan dan keputusan utama

Mengembangkan engine Puppeteer existing agar menerima konfigurasi creative LayerFit, mengisi template HTML/CSS/Tailwind lokal, merender tiga ukuran, memvalidasi gambar, menyimpan revisi hasil dan melaporkan progress/error. Rendering tidak membutuhkan AI call. Regenerasi strategi/copy adalah tanggung jawab service AI di luar renderer.

**Adaptasi dilakukan pada modul yang dibawa secara selektif ke LayerFit, bukan mengedit repository IG Content Builder asli.** Sistem carousel lama tidak perlu dimigrasikan atau dijalankan melalui n8n agar LayerFit berfungsi. Tidak membuat engine screenshot baru dengan teknologi lain.

Target bertahap:
- Foundation: satu template × tiga ukuran, dua brief sintetis.
- Template Part 01: empat konsep × tiga ukuran = 12 output per brief.
- Acceptance penuh: minimal 15 konsep nyata × tiga ukuran = 45 output per brief; minimal dua brief berbeda diuji.
- Satu output placement memiliki PNG dan JPG jika keduanya diminta; 45 placement berarti 45 PNG atau 45 JPG, bukan 90 konsep. ZIP 45-file satu encoding berbeda dari ZIP kedua encoding yang berisi 90 file gambar.

## 2. Baseline yang diperiksa

### Source asli

`C:\Users\Asus\LayerFit\references\IG-Content-Builder\ig-templates-demo\scripts\build-and-render-demo.mjs`

Reference commit: `9ce00976664d1ac036bc38b75a8cf21621eac719`.

| Area source | Implementasi lama | Perubahan untuk LayerFit |
|---|---|---|
| Baris 10–25 | CLI `--mp-id` membaca JSON plan dari folder tetap | Service bertipe menerima snapshot konfigurasi dan job ID; CLI hanya adapter untuk tes |
| Baris 27–36 | Konstanta carousel: watermark, follow CTA, total slide | Hilangkan asumsi carousel dari jalur LayerFit; brand/copy berasal dari config yang tervalidasi |
| Baris 43–52 | Launch/connect browser, sandbox dinonaktifkan, viewport 1080×1350 | Browser manager dengan ownership, sandbox default, konfigurasi server dan viewport per format |
| Baris 57–83 | Loop slide dan validasi URL remote | Loop task creative/revision/format, resolve owned assets lokal, normalisasi raster |
| Baris 85–91 | Path template dari nama input, `replaceAll` tanpa escaping, placeholder hilang diam-diam | Registry allowlist, safe template composition, required slots dan strict schema |
| Baris 93–102 | setContent, font wait, delay 300ms, screenshot fixed clip | Readiness font/image terukur, layout validation, ukuran eksplisit, PNG/JPG dan verifikasi decode |
| Baris 104–130 | Counter dan log JSON pada akhir batch | Pertahankan isolasi error; tambah durable status per output, timing, revision, manifest dan recovery |

### Prototype lokal yang sudah ada

`C:\Users\Asus\LayerFit\src\server\render\renderer.ts` dan `src/server/assets/normalize.ts` sudah mengadaptasi sebagian baseline: schema, tiga ukuran, normalisasi foto, blok network, bounds check, PNG/JPG, finally browser cleanup. Dua produk sintetis × tiga ukuran berhasil diuji sebelumnya, sebagaimana `docs/verification.md`.

Namun prototype tersebut **belum ada di clone `Layerfit-JMD`**, belum merupakan service aplikasi, dan masih punya batasan:
- Template `productHero` di-hardwire; belum registry yang menerima empat template Part 01.
- Tidak ada database job/output, progress durable, revision, cancellation atau retry/restart.
- `browser.newPage()` berada di luar try per-output; kegagalan itu dapat membatalkan batch.
- `page.close()`/`browser.close()` bisa melempar error dan menutupi error asli; log akhir tidak selalu tertulis ketika fatal error.
- Prevalidation semua input sekaligus bisa menolak seluruh batch; perlu bedakan error envelope dan error per creative.
- Atomic rename tiap file tidak sama dengan transaksi untuk pasangan PNG/JPG dan DB. Filename belum revisioned.
- Pengecekan font `status=loaded` tidak membuktikan font brand yang diminta benar-benar terpakai.
- Decode readiness/bounds masih dasar; belum pengecekan crop, overlap, callout dan semantic slot.
- Normalisasi membatasi gambar ke 1800px; untuk canvas vertikal 1920 perlu kebijakan resolusi per slot, bukan angka tetap tanpa pemeriksaan kualitas.
- Browser lifecycle baru per pemanggilan batch, belum manager yang dipakai worker jangka panjang.

Re-use bagian yang telah diuji; jangan menyalin semua kekurangan prototype sebagai desain final.

## 3. Batas tanggung jawab

| Komponen | Tanggung jawab | Bukan tanggung jawab |
|---|---|---|
| Campaign/AI service | Verifikasi brief/fakta, AI structured output, biaya/token | Screenshot atau CSS layout |
| Template registry | Template/version, HTML/CSS, slots, budgets, fallback, tiga format | Memanggil AI atau mengambil asset dari internet |
| Asset service | Ownership, MIME/byte decode, metadata removal, normalized variants | Menebak foto produk, scraping, background removal |
| Renderer | Snapshot → HTML → Chromium → image buffers + diagnostics | Membuat harga/rating/copy, menerima raw HTML pengguna |
| Job worker | Queue, retry, browser recovery, counters, lifecycle | Mengedit konten kreatif otomatis |
| Output store/export | Atomic files, revision metadata, PNG/JPG/ZIP/manifest | Mengklaim output stale sebagai revision terbaru |

Renderer dapat memeriksa bahwa blok offer/proof memiliki data tervalidasi, tetapi tidak membuktikan kebenaran semantik produk. Grounding klaim tetap wajib di service domain sebelum enqueue.

## 4. Struktur modul yang direncanakan

```text
src/server/render/
  contracts.ts          # request/result/errors/versioned snapshot
  browser-manager.ts    # launch/connect, health, ownership, bounded restart
  render-output.ts      # satu creative revision + satu format
  readiness.ts          # font/image/CSS readiness
  validate-layout.ts    # bounds, overflow, overlap, safe area, image geometry
  fit-typography.ts     # bounded fitting; never truncate factual copy
  encode-output.ts      # Sharp PNG/JPEG validation
  diagnostics.ts       # structured logs, timings, sanitized debug info
src/server/jobs/
  render-worker.ts      # persistent claim/retry/progress/recovery
src/server/assets/
  resolve-render-assets.ts
  normalize-image.ts
src/server/storage/
  output-store.ts
src/server/export/
  build-export.ts
scripts/
  render-layerfit.ts    # trusted local fixture CLI, calls same service
```

Template code mengikuti `template_part01_plan.md`. Jangan menduplikasi engine dalam folder tiap template. Service API dan CLI memakai `render-output` yang sama. Modul yang dipindah dari prototype harus punya attribution/source commit; konfirmasi hak reuse sebelum distribusi eksternal.

## 5. Kontrak engine dan output

### Request: snapshot, bukan data live yang berubah saat rendering

```ts
interface RenderRequest {
  schemaVersion: 1;
  campaignId: string;
  creativeId: string;
  revision: number;
  templateId: string;          // allowlisted registry ID
  templateVersion: string;
  format: 'square' | 'portrait' | 'vertical';
  encodings: Array<'png' | 'jpg'>;
  configSnapshotId: string;    // immutable config + asset hashes
  jobId: string;
}

interface RenderResult {
  status: 'success' | 'failed' | 'cancelled';
  creativeId: string;
  revision: number;
  format: string;
  artifacts: Array<{
    encoding: 'png' | 'jpg';
    storageKey: string;
    width: number;
    height: number;
    bytes: number;
    sha256: string;
  }>;
  diagnostics: {
    templateVersion: string;
    browserVersion: string;
    cssHash: string;
    durationMs: number;
    warnings: string[];
    fittingSteps: number;
  };
  error?: { code: string; stage: string; retryable: boolean; message: string };
}
```

Types di atas rancangan, bukan schema runtime yang sudah tersedia. Validasi ID, enum, ownership, revision, template version dan batas panjang di server. Output path tidak boleh berasal dari input pengguna.

### Format profiles

| Format | Canvas | Layout requirement |
|---|---|---|
| square | 1080×1080 | Layout kompak; slot/typography square |
| portrait | 1080×1350 | Layout 4:5; bukan crop hasil square |
| vertical | 1080×1920 | Layout 9:16; safe content awal top 250, bottom 350, sides 70px |

Device scale factor 1, zoom 1, viewport/clip persis canvas. Safe inset square/portrait mengikuti layout profile (baseline prototype 60/70px, final disepakati saat uji). Background/dekorasi boleh keluar safe box; headline, benefit, CTA, brand/proof dan produk utama wajib mematuhi contract template. Safe-area baseline bukan jaminan seluruh variasi UI Meta.

### Identitas output dan cache

- Kunci logis: campaign + creative + revision + templateVersion + format + encoding.
- Sertakan hash konfigurasi, asset, font dan CSS/build saat menentukan validitas cached output. Jangan memakai hasil versi lama hanya karena creativeId sama.
- Full browser-version pin/build fingerprint untuk regression baseline; hasil antarmesin belum tentu identik byte-for-byte.
- Storage key server-generated, misalnya `campaign/<uuid>/creative/<uuid>/revision/<n>/<format>.<encoding>`; schema path harus mencegah traversal/symlink escape dan menulis hanya dalam storage root yang disetujui.
- Render dari snapshot tidak boleh overwrite config kreatif. Jika pengguna mengedit ketika job berjalan, output lama tersimpan sebagai revisi lama dan tidak menggantikan pointer revisi terbaru.

## CP00 — Baseline, reuse inventory dan regression fixture

- [ ] Pastikan reference clone tetap clean dan catat commit; tidak install/generate output ke clone asli.
- [ ] Inventarisasi renderer prototype dan tes existing; pindahkan hanya modul relevan ke repo LayerFit setelah review.
- [ ] Rekam fixture input, versi browser, node, dependency, serta output baseline dua produk sintetis.
- [ ] Tambahkan attribution dan pisahkan kode carousel dari LayerFit adapter.
- [ ] Periksa lockfile/runtime dan dependency advisories tanpa auto-upgrade paksa.

**Gate:** engineer dapat menunjukkan bagian yang reused vs baru; baseline satu template tiga format reproducible secara fungsional, clone asli tidak berubah. Kegagalan setup dilaporkan, bukan dianggap regression template.

## CP01 — Typed service dan template registry adapter

- [ ] Pecah CLI monolitik menjadi service yang mengembalikan result; `process.exit` hanya di CLI wrapper.
- [ ] Tambahkan schema strict untuk request/snapshot dan registry allowlist template/version.
- [ ] Hapus asumsi tujuh slide, intro/isi/closing, follow CTA dan pagination pada jalur LayerFit.
- [ ] Render format berdasarkan registry; jangan merakit file path dari nama template yang diberikan user.
- [ ] Required slot hilang menghasilkan error jelas; optional slot hilang memicu fallback layout resmi, bukan hapus token diam-diam.
- [ ] Tolak envelope batch invalid sebelum queue. Untuk item creative invalid, tandai item gagal dan teruskan item valid; jangan menciptakan task ambigu/duplicate.
- [ ] CLI memakai fixture lokal trusted dan service yang sama, tanpa child-process shell command dari HTTP input.

**Gate:** registry menerima product-hero prototype dan dapat menambahkan empat template Part 01 tanpa perubahan internal engine. Unknown template/path traversal/raw HTML/config invalid ditolak dengan error terstruktur.

## CP02 — Asset, font dan CSS/Tailwind pipeline offline

- [ ] Resolve photo/logo melalui campaign-owned asset ID, bukan URL/path arbitrer.
- [ ] Validasi actual bytes, static PNG/JPG/WebP, <=10MB dan <=25MP; tolak SVG/animation/corrupt asset. Re-encode metadata-free sesuai spec.
- [ ] Perhitungkan EXIF orientation sebelum geometry/anchor, simpan intrinsic dimensions dan hashes.
- [ ] Cache normalized derivatives secara bounded berdasarkan hash/slot size; hindari decode ulang foto yang sama untuk tiga format.
- [ ] Periksa resolusi cukup untuk rendered slot. Warn jika upscale diperlukan; jangan mengklaim normalisasi menaikkan kualitas.
- [ ] Bundle font berlisensi dan variant weight yang digunakan. Pastikan requested font face benar-benar loaded, bukan sekadar fonts.status.
- [ ] Compile Tailwind sebelum rendering, cache CSS by build hash dan embed lokal; tidak memakai CDN, @import webfont atau runtime Tailwind script.
- [ ] Semua input text di-escape per context; URL internal/embed dibuat server; CSS custom properties hanya dari enum/validated values.
- [ ] Isolasi halaman menggunakan CSP dan request interception default-deny. Hanya allow data MIME yang dibuat resolver/route internal yang di-allowlist; jangan allow sembarang `data:` payload dari user. Blok http(s), file, websocket, redirect/subresource eksternal.

**Gate:** render sukses saat akses internet halaman diblokir; font yang diminta terbukti tersedia; asset tanpa ownership/format valid gagal; CSS Tailwind class tidak hilang setelah compile.

## CP03 — Browser lifecycle dan resource management

- [ ] Satu manager browser per worker proses; satu context/page terisolasi per task; concurrency awal 1.
- [ ] Mode default local launch dengan sandbox. `CHROMIUM_EXECUTABLE_PATH` adalah konfigurasi operator, bukan request field. `CHROMIUM_WS_ENDPOINT` opsional hanya untuk endpoint trusted yang diset server.
- [ ] Manager menutup browser yang diluncurkan sendiri; untuk browser remote hanya menutup page/context miliknya lalu disconnect, bukan mematikan browser bersama.
- [ ] Browser version/runtime dicatat; startup preflight memeriksa executable, write permission, fonts dan compatibility.
- [ ] Tempatkan pembuatan page/context di dalam error boundary; cleanup best-effort dengan timeout tanpa menutupi error utama.
- [ ] Timeout terpisah launch/new-page/content/readiness/screenshot/encode dan deadline total task. Worker watchdog menangani tahap native/hung yang tidak berhenti dengan timeout Promise saja.
- [ ] Page crash/browser disconnect menandai attempt gagal, restart browser bounded, lalu retry task yang eligible. Jangan restart loop tanpa batas.
- [ ] Tutup resource saat shutdown; batasi pending task, memory/cache, bytes output dan lifetime page. Metrics RSS/disk diukur, bukan ditebak.
- [ ] Nonaktifkan animasi/transisi, caret, smooth scroll dan video autoplay; embed hanya konten statis.

**Gate:** injected failure pada newPage, screenshot, cleanup dan disconnect tidak menghapus hasil sukses/menutupi root cause; tidak ada leaked page setelah batch. Uji launch/connect ownership terpisah, dengan remote mode ditandai belum diuji jika tidak tersedia.

## CP04 — Multi-format HTML rendering dan readiness

- [ ] Expand setiap konsep menjadi tiga output task; input tetap satu konfigurasi creative dengan format profile eksplisit.
- [ ] Build HTML dari registry + escaped config + resolved assets/CSS/font; page tidak menerima script user.
- [ ] Terapkan viewport/canvas/clip yang tepat; verifikasi bounding root canvas dan computed layout.
- [ ] Ganti fixed sleep 300ms dengan readiness: compiled style marker, font face loaded, semua image.decode selesai dan ukuran natural valid.
- [ ] Readiness punya deadline dan stable layout check sesudah assets/fonts siap. Jangan menggunakan networkidle sebagai satu-satunya syarat.
- [ ] Jalankan hanya trusted measurement melalui Puppeteer; tidak mengaktifkan runtime script template yang tidak diperlukan. Uji kombinasi JavaScript-disabled dan evaluate/readiness pada browser target.
- [ ] Dukung fallback registry untuk satu foto, optional logo/proof/offer tanpa menyisipkan asset atau claim baru.

**Gate:** tiga hasil punya komposisi format-specific, bukan screenshot di-stretch. Tidak ada foto kosong/font fallback tersembunyi. Empat template Part 01 dapat dirender melalui jalur yang sama.

## CP05 — Layout validation dan bounded fitting

- [ ] Tetapkan semantic selectors, misalnya `data-slot`, `data-required`, `data-safe`, `data-fit-group`, `data-allow-overlap`, `data-image-fit`.
- [ ] Periksa canvas dimensions, required visible slots, ancestor clipping, overflow text, bounds, CTA visibility dan collision yang tidak diizinkan contract.
- [ ] Jangan menandai semua overlap sebagai error: label di atas foto dan overlay scrim sah. Registry menetapkan pasangan allowed/forbidden.
- [ ] Periksa produk contain vs crop: bandingkan image intrinsic/display geometry dan clipping ancestors. Lifestyle/detail crop hanya jika konfigurasi mengizinkan; periksa focal point dan callout anchor terhadap content rect.
- [ ] Optional debug overlay menunjukkan safe box/bounds/collision pada artifact terpisah, bukan export final.
- [ ] Typography fitting mengikuti token step terbatas per group; ukur ulang setelah tiap step. Minimum font/line-height ditentukan template + review keterbacaan.
- [ ] Jika masih overflow setelah budget fitting habis, gagal `LAYOUT_OVERFLOW` dengan field/format dan diagnostics. Tidak truncation/ellipsis, sembunyikan konten, atau re-generate AI diam-diam.
- [ ] Lakukan inspeksi visual contact sheet: geometric validation tidak menjamin glyph legibility, estetika atau kebenaran klaim.

**Gate:** teks panjang/aksen/kata Belanda, callout overlap, font missing dan CTA keluar safe box terdeteksi. Elemen dekorasi yang sengaja full-bleed tidak memicu false failure. Validasi tidak hanya memeriksa tiga elemen sederhana.

## CP06 — Encoding, penyimpanan revision dan manifest

- [ ] Screenshot master PNG setelah layout lulus, lalu encode JPG dari buffer yang sama via Sharp; background flatten eksplisit untuk alpha sebelum JPEG.
- [ ] Decode setiap encoding, verifikasi format/magic, dimensi, byte count dan hash. Jangan hanya percaya extension file atau screenshot API return.
- [ ] Tulis requested artifacts ke staging attempt terisolasi; rename/publish sebelum DB success. Jangan menganggap dua file + DB bisa di-commit atomik dalam satu filesystem operation.
- [ ] Commit metadata/pointer output dalam transaksi setelah seluruh requested artifacts valid. Jika salah satu encoding gagal, task belum sukses; staged/orphan files tidak ditawarkan download.
- [ ] Cleanup scoped untuk temp/orphan milik attempt yang sudah aman dibersihkan; jangan menghapus output revisi lain atau data pengguna.
- [ ] Pertahankan last successful revision. Bila edit/re-render gagal, dashboard menampilkan stale-preview label, bukan gambar lama sebagai hasil baru.
- [ ] Manifest memuat creative/revision, template/version, format, encoding, dimensions, hash, status/warnings dan missing outputs; tanpa secret/raw prompt/PII yang tidak diperlukan.

**Gate:** interupsi antara PNG, JPG dan DB tidak menciptakan success palsu. Output revisi lama masih bisa dilacak dan file baru tidak overwrite filename lama. Semua gambar dapat didecode.

## CP07 — Durable batch worker, progress, retry dan recovery

- [ ] Persist semua output task sebelum processing. Progress berasal dari state SQLite, bukan timer UI atau array in-memory.
- [ ] State job: queued/running/completed/partial/failed/interrupted/cancelled; output task memiliki status dan attempt terpisah. Tambahkan perubahan state schema yang diperlukan secara eksplisit.
- [ ] Claim task dengan transaksi, lease/heartbeat agar worker yang mati dapat terdeteksi. Snapshot/revision immutable selama attempt.
- [ ] Idempotency mencegah duplicate enqueue/double publish untuk task/revision identik; request edit yang mengubah snapshot menghasilkan task baru.
- [ ] Retry hanya transient error (contoh browser crash/timeouts tertentu), maksimal dua retry dengan backoff. Invalid asset/schema/missing font build/layout overflow tidak diulang tanpa perubahan input/config.
- [ ] Saat restart, lease expired menjadi interrupted/recoverable; cek staged/final artifacts dan DB sebelum retry. Jangan reset semua output batch ke nol.
- [ ] Browser restart tak boleh mengulang AI atau mengganti copy; retry hanya placement gagal. Output sukses tidak di-render ulang tanpa alasan versi/config berubah.
- [ ] Cancellation menghentikan queued tasks dan mengizinkan task aktif berhenti pada checkpoint/deadline, dengan status nyata; jangan mengklaim kill screenshot instan jika belum didukung.
- [ ] Admission limits terpusat: jumlah konsep awal 15–30, tiga format, backlog dan resource budget operator. 100+ berarti banyak batch berurutan dengan throttling, bukan mengabaikan batas request.
- [ ] Durasi queue, asset, HTML/readiness, validation/fitting, screenshot, encode/write dan total dicatat. Count placement terpisah dari jumlah encoding files.

**Gate:** satu output gagal tidak membatalkan 44 yang lain; restart melanjutkan task pending; retry tidak menambah token AI; progress dan jumlah file tidak membingungkan user.

## CP08 — Integrasi editor, API dan export

- [ ] Hubungkan job worker ke kontrak API di `docs/architecture.md`; jangan membuat endpoint duplikat yang menerima arbitrary HTML.
- [ ] PATCH creative menghasilkan revision baru dengan optimistic concurrency. Aksi render tidak memanggil AI; regenerate copy melalui AI job terpisah lalu memanggil pipeline render.
- [ ] Poll real job/output status; tampilkan stage, successful placements, failures, stale revisions dan error yang dapat ditindaklanjuti.
- [ ] Individual download melayani validated stored output, bukan render baru setiap download.
- [ ] Bulk ZIP dibangun dari snapshot current revision yang konsisten pada awal export. Jangan mencampur revision jika user mengedit di tengah ZIP build.
- [ ] Full PNG/JPG export berisi 45 current images untuk 15 konsep; partial/favorites export diberi label dan manifest missing-count yang tepat.
- [ ] Encode JPEG on-demand bila belum tersedia menjadi job/operasi lokal tanpa AI; status diperiksa sebelum link tersedia. Stream ZIP dengan batas resource, server-generated names dan request cancellation handling.

**Gate:** create → generate → edit photo/copy → re-render → download revision baru teruji melalui aplikasi ketika backend tersedia. Jika baru CLI/config-level, jangan dilabel browser E2E.

## CP09 — QA, benchmark dan JMD handoff

### Level test

1. Unit: schema, escaping, ownership, registry, path safety, format profile, idempotency, retry classification dan manifest.
2. Renderer integration: actual Chromium, font/image/CSS readiness, dimensions/encoding, clipping, fallback, artifacts.
3. Fault injection: launch/newPage/crash/decode/encode/disk write/full-disk simulation/cleanup/DB commit failures.
4. Browser aplikasi E2E: form/assets/job progress/editor/favorite/export; terpisah dari renderer test.
5. Live AI dan JMD: terpisah dari fixture/local tests; credentials dan izin wajib tersedia.

### Matriks output minimum

| Tahap | Input | Output placement |
|---|---|---|
| Foundation | 1 konsep × 3 format × 2 brief | 6 |
| Part 01 | 4 konsep × 3 format × 2 brief | 24 |
| Final | 15 konsep × 3 format × 2 brief | 90, yaitu dua batch masing-masing 45 |

Setiap placement dicek PNG dan JPG bila dua encoding diminta. Buka/decode semua file dan inspect semua frame contact sheet. Uji satu dan multi foto, logo hilang, copy maksimum, invalid proof/offer, corrupted file, unsupported template, unauthorized path/asset, blocked external requests, concurrent edit, duplicate jobs, restart dan stale export.

### Benchmark dan laporan

- Catat versi mesin/OS/Node/Chrome, concurrency, jumlah template/aset, ukuran input, cold/warm cache dan apakah waktu mencakup browser launch/JPEG/ZIP.
- Ukur total batch, per-placement timing, peak RSS dan total storage; jika sample cukup, laporkan distribusi/p95 dengan sample count. Jangan menggeneralisasi smoke test 5,2 detik menjadi SLA batch 45.
- Catat fallback/fitting/manual correction. Waktu AI/token/cost berasal dari ledger AI, bukan estimasi renderer atau nol palsu.
- Buat prosedur setup, startup/shutdown, recovery, backup/storage cleanup policy dan known limitations.

### JMD gate

Konfirmasi OS, Node, executable/version Chromium, Linux libraries/sandbox/non-root user, fonts, CPU/RAM/disk quota, directory permissions, process supervisor, approved env secret handling, network dan reverse-proxy authentication/TLS. Jangan menambahkan `--no-sandbox` sebagai solusi default. Uji CLI renderer dulu lalu flow aplikasi dengan izin; tidak deploy/ubah infrastruktur sebelum owner menyetujui.

**Gate final:** lint/typecheck/test/build relevan lulus, dua brief baru menghasilkan 45 output valid per batch, editing/retry/ZIP terverifikasi, laporan durasi/failure ada. Production-ready tidak diklaim hanya karena semua screenshot berhasil lokal.

## 6. Error taxonomy awal

| Code | Perlakuan |
|---|---|
| REQUEST_INVALID / TEMPLATE_UNKNOWN / REVISION_CONFLICT | Tolak/enqueue gagal terstruktur; perbaiki input/state |
| ASSET_INVALID / ASSET_FORBIDDEN / FONT_MISSING / CSS_NOT_READY | Gagal deterministik; perbaiki asset/build/ownership |
| LAYOUT_OVERFLOW / SAFE_AREA_VIOLATION / IMAGE_CROP_INVALID | Gagal dengan slot diagnostics; perlu config/layout correction |
| BROWSER_LAUNCH_FAILED / PAGE_CRASH / BROWSER_DISCONNECTED | Recovery bounded jika kondisi transient; configuration failure tidak di-loop |
| READINESS_TIMEOUT / SCREENSHOT_TIMEOUT | Investigasi stage; retry terbatas hanya jika transient |
| ENCODE_FAILED / OUTPUT_INVALID | Jangan publish success; diagnosis input/toolchain |
| STORAGE_FAILED / DB_COMMIT_FAILED | Persist failure/recovery bila mungkin; jangan menyatakan success meski file sebagian ada |

Logging menggunakan correlation job/task/attempt ID; hindari dump base64, secret, browser endpoint credentials, filesystem internals ke response publik. Diagnostic artifacts hanya dalam storage yang disetujui.

## 7. Urutan pengerjaan dan status

`CP00 → CP01 → CP02 → CP03 → CP04 → CP05 → CP06 → CP07 → CP08 → CP09`.

Template Part 01 CP01 berintegrasi dengan engine CP01–CP04. Uji masing-masing template sebelum memperluas ke 15. Engine dapat dibangun tanpa AI credential memakai snapshot fixture sintetis, tetapi acceptance AI/domain/JMD tetap belum lulus.

- [x] Source renderer asli dan prototype dibaca ulang untuk menyusun rencana ini.
- [x] Reuse boundary, gap, kontrak dan CP00–CP09 dirumuskan.
- [ ] Perubahan engine dalam repo Layerfit-JMD diimplementasikan dan diuji.
- [ ] Empat template Part 01 terintegrasi.
- [ ] Target 15 konsep/45 gambar dan full aplikasi diverifikasi.
- [ ] JMD access/config/deployment permission tersedia.

Tidak ada source engine, repository referensi, screenshot, PDF atau infrastruktur yang dimodifikasi melalui pembuatan dokumen ini. Push ke GitHub merupakan tindakan terpisah jika diminta.
