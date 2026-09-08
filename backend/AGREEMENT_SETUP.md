# Agreement dan kontak footer

## Struktur

Frontend tetap memakai React, Ant Design, router `/dashboard/agreement`, axios `api`, dan layout yang sudah ada. Username database yang sudah digunakan adalah `zihraangelina` dan `naufalaufa`; alias `zihra` dan `naufal` juga dikenali. Akun `zipaladmin` harus memiliki role `admin`. Identitas/role untuk Agreement dan kontak dibaca ulang dari database melalui JWT, bukan dipercaya dari localStorage atau body request.

Login yang sudah ada menyimpan `accessToken`. Interceptor kini membaca key tersebut dengan fallback `token` untuk sesi lama. Logout menghapus semua token.

## Instalasi dan migration

Jalankan dari root project (Node 20+ direkomendasikan):

```powershell
cd backend
npm ci --legacy-peer-deps
npm run migrate:agreement
npm test
cd ../frontend
npm ci
npm run lint
npm run build
```

`--legacy-peer-deps` diperlukan oleh peer dependency Cloudinary yang sudah ada di project; fitur ini menambahkan `pdf-lib` dan `pngjs` saja. File package-lock ikut diperbarui.

Migration memakai koneksi `DB_*` dari `backend/.env` atau environment hosting. Backup database terlebih dahulu. Script `scripts/migrate-agreement.js` menjalankan `migrations/002-agreement-workflow.sql`, kemudian menyimpan isi asli ketujuh pasal dari `data/agreementTemplate.json` dan hash SHA-256-nya sebagai versi pertama. Script boleh dijalankan ulang: versi yang sudah tersimpan, tanda tangan, dan PDF tidak ditimpa. Perubahan JSON di source tidak mengubah perjanjian yang sudah dibuat.

Dua tabel baru: `agreements` menyimpan nomor, snapshot isi, hash, status, metadata pengesahan, dan dua PDF; `agreement_applications` menyimpan ID agreement, ID pengguna, pihak, PNG, applied, signed_at UTC, dan hash versi yang disetujui. Tabel menggunakan InnoDB. ID pengguna divalidasi terhadap tabel users pada setiap request. Unique constraints membatasi satu Apply per pengguna/pihak/perjanjian.

Tabel lama `agreement_signatures` tidak dihapus atau ditimpa. Signature lama tidak otomatis dianggap menyetujui versi ini karena belum terkait agreement ID dan snapshot isi. Kedua pihak melakukan Apply pada alur baru. Isi tujuh pasal tetap sama; pengesahan lokal di React diganti dengan pengesahan persisten.

Migration ini terpisah dari `001-transaction-goal.sql` milik fitur transaksi sebelumnya. Jika migration transaksi belum dijalankan, tetap lakukan sesuai TRANSACTION_SETUP.md sebelum memakai transaksi versi tersebut.

## Alur aplikasi

1. Masing-masing pihak membaca pasal, mencentang persetujuan, menggambar tanda tangan, dan klik Apply. PNG diperiksa juga di server untuk menolak gambar kosong/rusak. Apply langsung mengunci tanda tangan.
2. Hanya akun `zipaladmin` dengan role `admin` dapat mengesahkan setelah kedua Apply lengkap. Semua perubahan memakai transaction database dan row lock; request bersamaan tidak dapat mengesahkan dua kali. Kegagalan pembuatan PDF membatalkan pengesahan.
3. Status menjadi `WAITING_EMETERAI`. PDF tersedia lewat endpoint terautentikasi, berisi seluruh pasal, nomor, kedua tanda tangan, waktu masing-masing Apply, waktu pengesahan, dan area e-Meterai kosong.
4. Admin mengunduh PDF, memprosesnya di EZMeterai secara manual, kemudian memilih hasil PDF dan mengonfirmasi bahwa isi/signature/e-Meterai sudah diperiksa. Tidak ada API EZMeterai, auto-send, atau gambar meterai buatan.
5. Upload berhasil mengubah status menjadi `FINAL`. File tidak dapat diganti; semua Apply/pengesahan ulang ditolak. Kedua pihak dan admin bisa mengunduh dokumen final.

PDF disimpan di MySQL MEDIUMBLOB supaya tahan restart dan deployment Vercel, serta tidak menjadi public URL. Pastikan `max_allowed_packet` database lebih besar dari 8 MB dan backup mencakup tabel dokumen. Batas upload 4 MB disesuaikan dengan request body hosting saat ini; gunakan PDF standar, tidak terenkripsi, maksimum 30 halaman. Validasi memeriksa ekstensi, MIME, header/trailer, parsing PDF, dan konten aktif. Byte PDF bermeterai disimpan persis tanpa di-reserialize agar tanda tangan kriptografis penyedia tidak dirusak. SHA-256 disimpan untuk audit. Aplikasi tidak memverifikasi keaslian e-Meterai secara online; pemeriksaan dokumen dilakukan admin sebelum upload.

Status diperbarui setiap 15 detik dan saat halaman mendapat fokus. Gambar canvas tetap proporsional saat layar berubah ukuran. Footer membuka `wa.me` atau `mailto:` setelah klik pengguna; admin memilih penerima lewat dropdown.

## API

| Endpoint | Akses |
| --- | --- |
| GET /auth/me | JWT valid, identitas dari DB |
| GET /agreement/status | Kedua pihak atau ZipalAdmin |
| POST /agreement/sign | Pemilik signature, DRAFT, belum Apply, consent dan content_hash sesuai |
| POST /agreement/approve | ZipalAdmin + admin, kedua Apply lengkap, DRAFT |
| GET /agreement/pdf/draft | Kedua pihak/admin, PDF sudah dibuat |
| POST /agreement/final | ZipalAdmin + admin, WAITING_EMETERAI; multipart document + confirmed |
| GET /agreement/pdf/final | Kedua pihak/admin, FINAL |

Seluruh respons Agreement memakai Cache-Control: no-store. File download memerlukan Authorization, tidak memakai URL publik atau credential frontend.

## Pengujian

`npm test` mencakup kebijakan ownership/role, penguncian status, PNG kosong, validasi PDF, rollback saat PDF gagal, dua pengesahan bersamaan (database tiruan), persistensi antar instance service, dan alur HTTP dengan JWT serta multipart. Tes tidak terhubung ke database produksi, tidak mengirim email/WhatsApp, dan tidak mengunggah ke EZMeterai.

`node scripts/preview-agreement.js` menghasilkan PDF contoh bertanda CONTOH UJI di `tmp/pdfs` menggunakan garis sintetis. Ini hanya untuk QA layout, bukan dokumen sah atau tanda tangan asli. Render dengan Poppler untuk memeriksa hasilnya.

Pemeriksaan integrasi MySQL nyata dan deployment masih perlu dilakukan setelah migration pada staging. Masalah keamanan lama pada reset password/profile/seed tercatat di REVIEW_NOTES.md; perlu diperbaiki sebelum mengandalkan keamanan aplikasi keseluruhan di internet. Endpoint Agreement baru memverifikasi JWT dan identitas DB, tetapi tidak menggantikan kebutuhan mengamankan endpoint akun lama.

Referensi library: https://pdf-lib.js.org/docs/api/classes/pdfdocument dan https://expressjs.com/en/resources/middleware/multer/
