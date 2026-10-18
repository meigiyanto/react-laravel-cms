<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaAndPageIndexValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function createMedia(
        string $filename,
        ?string $altText = null
    ): Media {
        return Media::create([
            'disk' => 'public',
            'path' => 'cms-media/' . $filename,
            'original_name' => $filename,
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'alt_text' => $altText,
        ]);
    }

    private function createPage(
        string $title,
        string $slug,
        string $status = 'draft'
    ): Page {
        return Page::create([
            'title' => $title,
            'slug' => $slug,
            'body' => 'Isi halaman untuk pengujian.',
            'status' => $status,
        ]);
    }

    public function test_media_search_matches_original_filename(): void
    {
        $this->createMedia('sepatu-merah.jpg', 'Sepatu merah');
        $this->createMedia('tas-hitam.jpg', 'Tas hitam');

        $this->getJson('/api/media?search=sepatu')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath(
                'data.data.0.original_name',
                'sepatu-merah.jpg'
            );
    }

    public function test_media_search_matches_alt_text(): void
    {
        $this->createMedia('gambar-01.jpg', 'Foto gedung kantor');
        $this->createMedia('gambar-02.jpg', 'Foto ruang rapat');

        $this->getJson('/api/media?search=gedung')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath(
                'data.data.0.alt_text',
                'Foto gedung kantor'
            );
    }

    public function test_media_search_without_matches_returns_empty_results(): void
    {
        $this->createMedia('sepatu-merah.jpg', 'Sepatu merah');

        $this->getJson('/api/media?search=produk-tidak-ada')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.data', []);
    }

    public function test_media_index_rejects_invalid_search_and_page(): void
    {
        $this->getJson('/api/media?search[]=gambar')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search']);

        $this->getJson('/api/media?page=0')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);

        $this->getJson('/api/media?page=bukan-angka')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);
    }

    public function test_page_search_and_status_filter_work_together(): void
    {
        $this->createPage(
            'Tentang Perusahaan',
            'tentang-perusahaan',
            'published'
        );

        $this->createPage(
            'Tentang Tim',
            'tentang-tim',
            'draft'
        );

        $this->createPage(
            'Kontak Kami',
            'kontak-kami',
            'published'
        );

        $this->getJson(
            '/api/pages?search=tentang&status=published&page=1'
        )
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath(
                'data.data.0.slug',
                'tentang-perusahaan'
            )
            ->assertJsonPath('data.data.0.status', 'published');
    }

    public function test_page_search_without_matches_returns_empty_results(): void
    {
        $this->createPage(
            'Tentang Perusahaan',
            'tentang-perusahaan'
        );

        $this->getJson('/api/pages?search=tidak-ditemukan')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.data', []);
    }

    public function test_page_index_rejects_invalid_parameters(): void
    {
        $this->getJson('/api/pages?status=invalid')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->getJson('/api/pages?page=0')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);

        $this->getJson('/api/pages?page=bukan-angka')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);

        $this->getJson('/api/pages?search[]=halaman')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search']);
    }
}
