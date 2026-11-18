# T22 — Editorial Sale (Redesign)

Redesain total: iklan diskon komersial bergaya editorial; tidak menggunakan lingkaran dekoratif, badge palsu, atau UI website.

Dinamis: `window.setCreative(data)` mendukung brand, campaignLabel, eyebrow, discountPercent, discountWord, headline, description, cta, imageUrl, finePrint, colors, dan format.

**Keamanan klaim:** contoh menggunakan demoMode=true dan 30% fiktif untuk preview yang jelas ditandai DEMO. Pada mode produksi (`demoMode:false`), wajib `verifiedPromotion:true` dan diskon valid. Jangan gunakan angka demo untuk iklan nyata. `verifiedPromotion` merupakan pernyataan dari sistem/pengguna, bukan verifikasi eksternal.

Render format square/portrait/story melalui Chromium. Gunakan foto berizin; aset preview berasal dari referensi sebelumnya dan tidak boleh dipakai produksi tanpa izin.
