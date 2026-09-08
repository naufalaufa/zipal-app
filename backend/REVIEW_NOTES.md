# Catatan pemeriksaan

Perubahan ini menangani transaksi, Purpose, riwayat, dan notifikasi email. Pengujian saldo dan email memakai database/provider tiruan, bukan database produksi atau inbox Gmail nyata. Build memeriksa seluruh frontend; tidak membuktikan seluruh alur UI bebas regresi.

Temuan lama di luar perubahan ini yang perlu ditindaklanjuti:

- `routes/auth.js`: reset password menerima username dan password baru tanpa bukti kepemilikan akun; login membandingkan password langsung di SQL.
- `routes/profile.js`: perubahan profil/password menerima ID dari body tanpa middleware autentikasi.
- `routes/seed.js`: GET `/sync-excel-data` mereset tabel transaksi tanpa autentikasi. Jangan gunakan endpoint ini pada data yang sudah dialokasikan ke Purpose karena saldo Purpose tidak direkonsiliasi oleh proses seed lama.
- `frontend/src/pages/Investment.jsx`: saldo cash dihitung sebagai total withdraw admin dikurangi jumlah daftar withdraw admin yang sama, sehingga normalnya nol. Perbaikan model pencatatan pembelian aset/transfer investasi memerlukan pekerjaan terpisah. Pemilihan Purpose dan hasil notifikasi kini tersedia juga pada formulir ini agar kontrak API tetap sesuai.
- Pemeriksaan lint menyeluruh menemukan masalah lama pada CancelOrEditDepositModal, DashboardLayout, Dashboard, dan LogActivities. Perubahan fungsi lain untuk merapikan seluruh lint tidak termasuk patch ini.

Jalankan migrasi dan konfigurasi EmailJS sesuai TRANSACTION_SETUP.md sebelum rilis. Uji manual ketiga akun, dua tab browser dengan transaksi bersamaan, edit/cancel transaksi lama dan baru, Purpose kosong/dihapus, saldo tidak cukup, serta email provider gagal di staging.
