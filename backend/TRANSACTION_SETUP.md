# Tabungan Purpose dan email transaksi

1. Backup database. Periksa `SHOW CREATE TABLE transactions` dan `SHOW CREATE TABLE financial_goals`: keduanya harus memakai InnoDB. Sesuaikan tipe `goal_id` pada migrasi dengan tipe persis `financial_goals.id` (termasuk UNSIGNED bila ada).
2. Jalankan `migrations/001-transaction-goal.sql` sekali sebelum merilis backend/frontend. Migrasi hanya menambahkan relasi nullable, indeks, dan foreign key. Saldo Purpose dan transaksi lama tidak dipindahkan atau dihitung ulang.
3. Isi variabel EmailJS pada backend menggunakan `.env.example`. Hubungkan tiga layanan Gmail melalui EmailJS: Naufal, Zihra, dan admin. Jangan memakai satu service umum karena pengirim aktual mengikuti akun layanan yang terhubung.
4. Pada template EmailJS, gunakan To Email `{{to_email}}`, To Name `{{to_name}}`, From Name `{{from_name}}`, Reply To `{{reply_to}}`, Subject `{{subject}}`. Gunakan alamat pengirim default dari layanan Gmail yang dipilih. Sertakan `{{actor_name}}`, `{{transaction_type}}`, `{{amount}}`, `{{goal_name}}`, `{{transaction_date}}`, `{{balance_before}}`, `{{balance_after}}`, dan `{{description}}` di isi email. Saldo sebelum/sesudah adalah saldo ledger pelaku, bukan saldo Purpose; ledger admin mengikuti pencatatan investasi yang sudah ada.
5. Aktifkan pengiriman dari aplikasi non-browser pada pengaturan keamanan EmailJS. Kredensial hanya berada di backend.

Routing: Naufal ke Zihra (`zihraangelina07@gmail.com`), Zihra ke Naufal (`muhammadnaufalaufarifqi@gmail.com`), Zipal Admin dari `naufaldev001@gmail.com` ke keduanya.

Transaksi baru wajib memiliki Purpose. Saldo bertambah/berkurang atomik bersama transaksi; edit dan pembatalan mengoreksi selisih pada Purpose yang sama. Transaksi lama tetap tidak memiliki Purpose. Purpose yang mempunyai transaksi tidak dapat dihapus (foreign key RESTRICT).

API menunggu hasil EmailJS sebelum mengembalikan respons. Jika email gagal, transaksi tetap berhasil dan UI menampilkan peringatan agar pengguna tidak mengulang transaksi. Tidak ada jaminan penerimaan inbox atau retry otomatis: periksa log backend dan dashboard EmailJS untuk kegagalan/rate limit. Uji pengiriman nyata setelah konfigurasi, menggunakan akun dan transaksi uji yang disepakati.

Pemeriksaan lokal: `node --test backend/tests/*.test.js`; build dari direktori frontend dengan `node node_modules/vite/bin/vite.js build`.

Referensi: https://www.emailjs.com/docs/sdk/send/ dan https://www.emailjs.com/docs/user-guide/connecting-email-services/
