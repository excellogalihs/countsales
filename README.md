# Count Sales

Sistem penjualan dan laporan keuangan untuk toko komputer. Aplikasi menangani
produk seperti LCD/monitor, flash drive, printer, tinta, RAM, SSD/HDD, keyboard,
mouse, kabel, adaptor, komponen PC, dan aksesori komputer.

## Teknologi

- **TanStack Start + React 19** untuk halaman dan navigasi.
- **Tailwind CSS + komponen shadcn/ui** untuk antarmuka responsif.
- **Supabase (PostgreSQL)** sebagai database persisten.
- **Drizzle** untuk menyimpan riwayat skema database.

## Menjalankan aplikasi

```bash
bun install
bun run dev
```

Aplikasi berjalan di `http://localhost:8080`.

Perintah lain:

```bash
bun run test      # menjalankan unit test
bun run build     # membangun aplikasi untuk produksi
bun run lint      # memeriksa gaya kode
```

Konfigurasi koneksi Supabase dibaca dari `.env`
(`VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Halaman

| Halaman | Rute | Status |
| --- | --- | --- |
| Dashboard | `/` | Kerangka + kondisi kosong |
| Produk | `/produk` | CRUD produk & filter stok |
| Kategori | `/kategori` | CRUD kategori |
| Kasir | `/kasir` | Transaksi penjualan |
| Riwayat Penjualan | `/penjualan` | Riwayat, detail, dan struk |
| Pembelian Stok | `/pembelian` | Pembelian, penerimaan, pembayaran |
| Supplier | `/supplier` | CRUD supplier |
| Pengeluaran | `/pengeluaran` | CRUD biaya operasional |
| Laporan Keuangan | `/laporan` | Laba rugi, arus kas, persediaan |
| Pengaturan | `/pengaturan` | Info toko & struk, pengguna dan hak akses |

## Peran pengguna

- **Admin** — pengaturan, produk, pembelian, pengeluaran, laporan, dan
  pengelolaan pengguna.
- **Kasir** — penjualan (Kasir) dan riwayat transaksi.

Akun pertama (Admin) dibuat dari layar masuk saat aplikasi belum punya akun.
Setelah itu, hanya Admin yang dapat menambah pengguna, mengubah peran, dan
mereset kata sandi melalui **Pengaturan → Pengguna**. Kata sandi disimpan
sebagai hash oleh Supabase Auth dan tidak pernah ditulis ke tabel aplikasi.
Izin juga ditegakkan di database lewat RLS, bukan hanya dengan menyembunyikan
tombol.

## Catatan pengembangan

- Tidak ada data contoh atau angka penjualan statis. Laporan hanya menghitung
  data yang benar-benar tersimpan di database dan menampilkan kondisi kosong
  jika belum ada data.
- Pengaturan toko (nama, alamat, telepon, logo, header/footer struk) tersimpan
  di database dan dipakai pada struk cetak.
- Skrip `lint` saat ini masih melaporkan banyak masalah format Prettier yang
  sudah ada sebelumnya di seluruh proyek.
