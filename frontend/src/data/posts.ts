import type { PostForm } from '../pages/PostsPage';

export const dummyArticles: PostForm[] = [
  {
    title: 'Panduan Laravel untuk Pemula',
    slug: 'panduan-laravel-untuk-pemula',
    excerpt:
      'Pelajari dasar Laravel dari routing hingga database untuk membangun aplikasi web.',
    body: `Laravel merupakan framework PHP yang membantu pengembangan aplikasi web menjadi lebih terstruktur.

Materi yang dipelajari meliputi:
1. Struktur proyek Laravel.
2. Routing dan controller.
3. Model dan migration.
4. Validasi request.
5. Pengujian menggunakan feature test.

Mulailah dengan proyek sederhana, kemudian kembangkan fitur secara bertahap.`,
    status: 'published',
    category_ids: [1, 2],
    tag_ids: [1, 2],
    featured_image_id: '',
    meta_title: 'Panduan Laravel untuk Pemula',
    meta_description:
      'Pelajari Laravel dari routing, controller, model, migration, hingga pengujian aplikasi PHP.',
    
  },
  {
    title: 'Strategi Meningkatkan Penjualan Toko Online',
    slug: 'strategi-meningkatkan-penjualan-toko-online',
    excerpt:
      'Optimalkan halaman produk dan pengalaman belanja untuk meningkatkan konversi toko online.',
    body: `Penjualan toko online dipengaruhi oleh kualitas produk, kejelasan informasi, dan kemudahan transaksi.

Beberapa langkah yang dapat diterapkan:
1. Gunakan foto produk yang jelas.
2. Tulis deskripsi yang informatif.
3. Tampilkan harga dan stok secara akurat.
4. Sederhanakan proses checkout.
5. Evaluasi performa berdasarkan data penjualan.

Lakukan pengujian secara berkala untuk mengetahui strategi yang paling efektif.`,
    status: 'draft',
    category_ids: [3],
    tag_ids: [3, 4],
    featured_image_id: '',
    meta_title: 'Strategi Penjualan Toko Online',
    meta_description:
      'Temukan strategi praktis untuk mengoptimalkan halaman produk, checkout, dan konversi e-commerce.',
    
  },
  {
    title: 'Membangun Dashboard CMS dengan React',
    slug: 'membangun-dashboard-cms-dengan-react',
    excerpt:
      'Kenali komponen reusable dan integrasi API untuk membuat dashboard CMS yang terstruktur.',
    body: `React memungkinkan antarmuka CMS dibangun menggunakan komponen yang dapat digunakan kembali.

Bagian penting dashboard CMS meliputi:
1. Layout admin dan navigasi.
2. Form untuk mengelola konten.
3. Pengambilan data melalui API.
4. Loading state dan penanganan error.
5. Validasi form dan feedback pengguna.

Pisahkan tanggung jawab komponen agar kode lebih mudah diuji dan dirawat.`,
    status: 'published',
    category_ids: [1, 2],
    tag_ids: [5, 6],
    featured_image_id: '',
    meta_title: 'Dashboard CMS dengan React dan TypeScript',
    meta_description:
      'Panduan membangun dashboard CMS dengan React, TypeScript, komponen reusable, dan REST API.',
    
  },
  {
    title: 'Tips Produktivitas untuk Developer',
    slug: 'tips-produktivitas-untuk-developer',
    excerpt:
      'Atur pekerjaan pengembangan agar lebih terfokus, terukur, dan konsisten.',
    body: `Produktivitas developer bukan sekadar menulis kode lebih cepat, tetapi juga mengurangi pekerjaan berulang dan kesalahan.

Coba terapkan beberapa kebiasaan:
1. Tentukan satu target utama setiap sesi.
2. Pecah fitur besar menjadi tugas kecil.
3. Tulis test untuk perilaku penting.
4. Gunakan Git untuk melacak perubahan.
5. Sisihkan waktu untuk review dan dokumentasi.

Evaluasi proses kerja secara berkala agar kebiasaan yang digunakan benar-benar membantu.`,
    status: 'draft',
    category_ids: [4],
    tag_ids: [7, 8],
    featured_image_id: '',
    meta_title: 'Tips Produktivitas Developer',
    meta_description:
      'Tingkatkan produktivitas developer melalui manajemen tugas, pengujian, Git, dan dokumentasi.',
    
  },
  {
    title: 'Praktik Terbaik Mendesain REST API',
    slug: 'praktik-terbaik-mendesain-rest-api',
    excerpt:
      'Pelajari pola API yang konsisten dengan validasi, autentikasi, pagination, dan error handling.',
    body: `REST API yang baik memiliki kontrak request dan response yang jelas serta perilaku yang konsisten.

Hal yang perlu diperhatikan:
1. Gunakan HTTP method sesuai operasi.
2. Validasi semua input dari klien.
3. Lindungi endpoint dengan autentikasi.
4. Terapkan pagination untuk koleksi data.
5. Kembalikan status HTTP dan pesan error yang sesuai.
6. Uji alur sukses dan gagal melalui feature test.

Dokumentasikan kontrak API agar frontend dan backend dapat dikembangkan secara terpisah.`,
    status: 'archived',
    category_ids: [1],
    tag_ids: [1, 9],
    featured_image_id: '',
    meta_title: 'Praktik Terbaik REST API',
    meta_description:
      'Panduan desain REST API dengan validasi, autentikasi, pagination, status HTTP, dan pengujian.',
     
  },
];
