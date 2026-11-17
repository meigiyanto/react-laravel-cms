<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ArticleSeeder extends Seeder
{
    public function run(): void
    {
        // Gunakan user yang sudah tersedia sebagai penulis.
        // Buat user baru jika database belum memiliki user.
        $userId = User::query()->value('id')
            ?? User::factory()->create()->id;

        $articles = [
            // 30 artikel published
            ['title' => 'Panduan Lengkap Laravel untuk Pemula', 'status' => 'published'],
            ['title' => 'Memahami MVC pada Framework Laravel', 'status' => 'published'],
            ['title' => 'Cara Membuat REST API dengan Laravel', 'status' => 'published'],
            ['title' => 'Mengenal Eloquent ORM dan Relasi Database', 'status' => 'published'],
            ['title' => 'Tutorial Laravel Authentication', 'status' => 'published'],
            ['title' => 'Mengelola Middleware pada Laravel', 'status' => 'published'],
            ['title' => 'Membuat Validasi Form yang Aman', 'status' => 'published'],
            ['title' => 'Panduan Laravel Migration dan Seeder', 'status' => 'published'],
            ['title' => 'Menerapkan Pagination pada Laravel', 'status' => 'published'],
            ['title' => 'Upload Gambar dan File di Laravel', 'status' => 'published'],
            ['title' => 'Membuat CRUD dengan Laravel', 'status' => 'published'],
            ['title' => 'Mengenal Service Container Laravel', 'status' => 'published'],
            ['title' => 'Membuat Sistem Role dan Permission', 'status' => 'published'],
            ['title' => 'Optimasi Query Database Laravel', 'status' => 'published'],
            ['title' => 'Menggunakan Laravel Queue untuk Background Job', 'status' => 'published'],
            ['title' => 'Membuat Email Notification di Laravel', 'status' => 'published'],
            ['title' => 'Strategi Testing Feature pada Laravel', 'status' => 'published'],
            ['title' => 'Mengamankan REST API dengan Sanctum', 'status' => 'published'],
            ['title' => 'Menerapkan Caching untuk Aplikasi Laravel', 'status' => 'published'],
            ['title' => 'Membuat Slug SEO-Friendly untuk Artikel', 'status' => 'published'],
            ['title' => 'Dasar-Dasar Desain Database Relasional', 'status' => 'published'],
            ['title' => 'Tips Menulis Kode PHP yang Bersih', 'status' => 'published'],
            ['title' => 'Mengenal Git Branch dan Workflow Tim', 'status' => 'published'],
            ['title' => 'Membangun Dashboard Admin yang Efektif', 'status' => 'published'],
            ['title' => 'Strategi SEO On-Page untuk Blog', 'status' => 'published'],
            ['title' => 'Cara Meningkatkan Kecepatan Website', 'status' => 'published'],
            ['title' => 'Mengenal HTTP Status Code untuk API', 'status' => 'published'],
            ['title' => 'Menerapkan Pagination dan Filter Data', 'status' => 'published'],
            ['title' => 'Praktik Terbaik Pengelolaan Environment', 'status' => 'published'],
            ['title' => 'Checklist Deployment Aplikasi Laravel', 'status' => 'published'],

            // 10 artikel draft
            ['title' => 'Rancangan Sistem Komentar dan Moderasi', 'status' => 'draft'],
            ['title' => 'Membangun Fitur Pencarian Artikel', 'status' => 'draft'],
            ['title' => 'Integrasi Editor Konten Rich Text', 'status' => 'draft'],
            ['title' => 'Rencana Pengembangan Multi Bahasa', 'status' => 'draft'],
            ['title' => 'Membuat Sistem Revisi Artikel', 'status' => 'draft'],
            ['title' => 'Analisis Performa Aplikasi CMS', 'status' => 'draft'],
            ['title' => 'Membangun Fitur Bookmark Artikel', 'status' => 'draft'],
            ['title' => 'Panduan Integrasi Media Library', 'status' => 'draft'],
            ['title' => 'Menyusun Strategi Backup Database', 'status' => 'draft'],
            ['title' => 'Rencana Fitur Newsletter untuk Pembaca', 'status' => 'draft'],

            // 10 artikel archived
            ['title' => 'Pengantar PHP Versi Lama', 'status' => 'archived'],
            ['title' => 'Tutorial Dasar HTML untuk Pemula', 'status' => 'archived'],
            ['title' => 'Mengenal CSS Layout Tradisional', 'status' => 'archived'],
            ['title' => 'Dasar JavaScript Sebelum ES6', 'status' => 'archived'],
            ['title' => 'Panduan Awal Menggunakan Git', 'status' => 'archived'],
            ['title' => 'Pengenalan Database MySQL', 'status' => 'archived'],
            ['title' => 'Membuat Website Statis Sederhana', 'status' => 'archived'],
            ['title' => 'Konsep Dasar Pemrograman Berorientasi Objek', 'status' => 'archived'],
            ['title' => 'Pengenalan Framework Web PHP', 'status' => 'archived'],
            ['title' => 'Catatan Migrasi CMS Versi Pertama', 'status' => 'archived'],
        ];

        foreach ($articles as $index => $article) {
            $slug = Str::slug($article['title']);

            $publishedAt = $article['status'] === 'published' ? now()->subDays($index + 1) : null;

            Post::updateOrCreate(
                ['slug' => $slug],
                [
                    'user_id' => $userId,
                    'title' => $article['title'],
                    'excerpt' => "Ringkasan artikel: {$article['title']}. Pelajari konsep, langkah penerapan, dan praktik terbaiknya.",
                    'body' => $this->makeBody($article['title']),
                    'status' => $article['status'],
                    'published_at' => $publishedAt,
                    'meta_title' => Str::limit($article['title'], 60, ''),
                    'meta_description' => Str::limit(
                        "Pelajari {$article['title']} melalui panduan praktis dan penjelasan yang mudah dipahami.",
                        160,
                        ''
                    ),
                    'is_featured' => false,
                    'allow_comments' => true,
                ]
            );
        }

        $this->command?->info('ArticleSeeder selesai: 30 published, 10 draft, 10 archived.');
    }

    private function makeBody(string $title): string
    {
        return <<<HTML
<h2>Pendahuluan</h2>
<p>{$title} merupakan topik penting untuk dipahami dalam pengembangan aplikasi web. Artikel ini menyajikan pengantar, konsep utama, dan langkah penerapan yang dapat dipelajari secara bertahap.</p>

<h2>Konsep Utama</h2>
<p>Mulailah dengan memahami kebutuhan, tujuan, dan komponen yang terlibat. Pastikan setiap bagian memiliki tanggung jawab yang jelas dan mudah dipelihara.</p>

<h2>Langkah Penerapan</h2>
<ol>
    <li>Identifikasi kebutuhan dan tujuan implementasi.</li>
    <li>Siapkan lingkungan kerja dan konfigurasi yang sesuai.</li>
    <li>Terapkan solusi secara bertahap dan terstruktur.</li>
    <li>Uji hasil implementasi untuk memastikan fungsinya berjalan dengan benar.</li>
</ol>

<h2>Praktik Terbaik</h2>
<p>Gunakan kode yang mudah dibaca, validasi input, tangani kemungkinan kesalahan, dan tambahkan pengujian agar perubahan berikutnya tetap aman.</p>

<h2>Kesimpulan</h2>
<p>Dengan memahami {$title}, proses pengembangan dapat dilakukan secara lebih terarah. Sesuaikan penerapan dengan kebutuhan proyek dan lakukan evaluasi secara berkala.</p>
HTML;
    }
}