<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Layout;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_page_list_only_contains_pages_that_are_published_and_due(): void
    {
        $user = User::factory()->create();

        Page::create([
            'user_id' => $user->id,
            'title' => 'Halaman Terbit',
            'slug' => 'halaman-terbit',
            'body' => '<p>Konten publik.</p>',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);

        Page::create([
            'user_id' => $user->id,
            'title' => 'Halaman Draf',
            'slug' => 'halaman-draf',
            'body' => 'Konten privat.',
            'status' => 'draft',
        ]);

        Page::create([
            'user_id' => $user->id,
            'title' => 'Halaman Terjadwal',
            'slug' => 'halaman-terjadwal',
            'body' => 'Belum waktunya.',
            'status' => 'published',
            'published_at' => now()->addDay(),
        ]);

        $this->getJson('/api/public/pages')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'halaman-terbit');
    }

    public function test_public_can_read_published_page_with_seo_and_featured_image(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('cms-media/cover.webp', 'image-content');

        $user = User::factory()->create();
        $media = Media::create([
            'user_id' => $user->id,
            'disk' => 'public',
            'path' => 'cms-media/cover.webp',
            'original_name' => 'cover.webp',
            'mime_type' => 'image/webp',
            'size' => 13,
            'alt_text' => 'Sampul halaman',
        ]);

        Page::create([
            'user_id' => $user->id,
            'featured_image_id' => $media->id,
            'title' => 'Kebijakan Privasi',
            'slug' => 'privacy-policy',
            'body' => '<p>Isi kebijakan.</p>',
            'status' => 'published',
            'published_at' => now(),
            'meta_title' => 'Kebijakan Privasi | CMS',
            'meta_description' => 'Informasi privasi pengunjung.',
        ]);

        $this->getJson('/api/public/pages/privacy-policy')
            ->assertOk()
            ->assertJsonPath('data.title', 'Kebijakan Privasi')
            ->assertJsonPath('data.body', '<p>Isi kebijakan.</p>')
            ->assertJsonPath('data.meta_title', 'Kebijakan Privasi | CMS')
            ->assertJsonPath('data.meta_description', 'Informasi privasi pengunjung.')
            ->assertJsonPath('data.featured_image.alt_text', 'Sampul halaman')
            ->assertJsonPath('data.featured_image.url', Storage::disk('public')->url('cms-media/cover.webp'));
    }

    public function test_public_cannot_read_draft_archived_or_scheduled_pages(): void
    {
        $user = User::factory()->create();

        foreach ([
            ['slug' => 'draft-private', 'status' => 'draft', 'published_at' => null],
            ['slug' => 'archived-private', 'status' => 'archived', 'published_at' => now()->subDay()],
            ['slug' => 'scheduled-private', 'status' => 'published', 'published_at' => now()->addDay()],
        ] as $attributes) {
            Page::create([
                'user_id' => $user->id,
                'title' => $attributes['slug'],
                'slug' => $attributes['slug'],
                'body' => 'Konten privat.',
                'status' => $attributes['status'],
                'published_at' => $attributes['published_at'],
            ]);

            $this->getJson('/api/public/pages/' . $attributes['slug'])
                ->assertNotFound();
        }
    }

    public function test_public_page_endpoints_do_not_require_authentication(): void
    {
        $this->getJson('/api/public/pages')->assertOk();
        $this->getJson('/api/public/pages/not-existing')->assertNotFound();
    }

    public function test_public_page_renders_assigned_published_layout_definition(): void
    {
        $user = User::factory()->create();
        $layout = Layout::create([
            'name' => 'Landing Layout',
            'slug' => 'landing-layout',
            'description' => 'Layout publik.',
            'status' => 'published',
            'schema_version' => 1,
            'definition' => [
                'version' => 1,
                'sections' => [[
                    'id' => 'hero-main',
                    'type' => 'hero',
                    'settings' => ['width' => 'wide', 'spacing' => 'large', 'background' => 'primary'],
                    'blocks' => [[
                        'id' => 'hero-title',
                        'type' => 'heading',
                        'content' => 'Selamat datang',
                        'settings' => ['align' => 'center', 'size' => 'large'],
                    ]],
                ]],
            ],
            'user_id' => $user->id,
        ]);
        Page::create([
            'user_id' => $user->id,
            'layout_id' => $layout->id,
            'title' => 'Landing',
            'slug' => 'landing',
            'body' => '<p>Legacy content.</p>',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/public/pages/landing')
            ->assertOk()
            ->assertJsonPath('data.layout.name', 'Landing Layout')
            ->assertJsonPath('data.layout.definition.version', 1)
            ->assertJsonPath('data.layout.definition.sections.0.blocks.0.content', 'Selamat datang');
    }

    public function test_public_page_does_not_expose_draft_layout_definition(): void
    {
        $user = User::factory()->create();
        $layout = Layout::create([
            'name' => 'Draft Layout',
            'slug' => 'draft-layout',
            'status' => 'draft',
            'schema_version' => 1,
            'definition' => ['version' => 1, 'sections' => []],
            'user_id' => $user->id,
        ]);
        Page::create([
            'user_id' => $user->id,
            'layout_id' => $layout->id,
            'title' => 'Fallback Page',
            'slug' => 'fallback-page',
            'body' => '<p>Legacy fallback.</p>',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/public/pages/fallback-page')
            ->assertOk()
            ->assertJsonPath('data.layout', null)
            ->assertJsonPath('data.body', '<p>Legacy fallback.</p>');
    }
}
