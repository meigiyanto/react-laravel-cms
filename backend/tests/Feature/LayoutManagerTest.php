<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LayoutManagerTest extends TestCase
{
    use RefreshDatabase;

    private function administrator(): User
    {
        $role = Role::create(['name' => 'Administrator', 'slug' => 'administrator', 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    private function definition(): array
    {
        return ['version' => 1, 'sections' => [[
            'id' => 'hero-main', 'type' => 'hero',
            'settings' => ['width' => 'wide', 'spacing' => 'large', 'background' => 'primary'],
            'blocks' => [
                ['id' => 'hero-title', 'type' => 'heading', 'content' => 'Welcome', 'settings' => ['align' => 'center', 'size' => 'large']],
                ['id' => 'hero-copy', 'type' => 'text', 'content' => 'A safe layout.', 'settings' => ['align' => 'center']],
            ],
        ]]];
    }

    public function test_administrator_can_create_layout_and_first_revision(): void
    {
        $user = $this->administrator();
        $this->postJson('/api/admin/layouts', ['name' => 'Landing Page', 'definition' => $this->definition()])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'landing-page')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.revisions_count', 1);
        $this->assertDatabaseHas('layout_revisions', ['revision_number' => 1, 'user_id' => $user->id]);
    }

    public function test_layout_update_records_immutable_revision_snapshot(): void
    {
        $this->administrator();
        $create = $this->postJson('/api/admin/layouts', ['name' => 'Landing', 'definition' => $this->definition()])->assertCreated();
        $id = $create->json('data.id');
        $original = $this->definition();
        $changed = $original;
        $changed['sections'][0]['blocks'][0]['content'] = 'Updated';
        $this->putJson("/api/admin/layouts/{$id}", ['definition' => $changed])->assertOk()->assertJsonPath('data.revisions_count', 2);
        $this->assertDatabaseCount('layout_revisions', 2);
        $this->assertSame('Welcome', \App\Models\Layout::findOrFail($id)->revisions()->where('revision_number', 1)->firstOrFail()->definition['sections'][0]['blocks'][0]['content']);
    }

    public function test_layout_definition_rejects_unknown_components_and_arbitrary_markup(): void
    {
        $this->administrator();
        $invalid = $this->definition();
        $invalid['sections'][0]['blocks'][0]['type'] = 'script';
        $this->postJson('/api/admin/layouts', ['name' => 'Unsafe', 'definition' => $invalid])->assertUnprocessable();
        $invalid = $this->definition();
        $invalid['sections'][0]['customHtml'] = '<script>alert(1)</script>';
        $this->postJson('/api/admin/layouts', ['name' => 'Unsafe', 'definition' => $invalid])->assertUnprocessable();
    }

    public function test_layout_definition_requires_unique_ids_and_known_token_settings(): void
    {
        $this->administrator();
        $invalid = $this->definition();
        $invalid['sections'][0]['blocks'][1]['id'] = 'hero-title';
        $this->postJson('/api/admin/layouts', ['name' => 'Duplicate IDs', 'definition' => $invalid])->assertUnprocessable();
        $invalid = $this->definition();
        $invalid['sections'][0]['settings']['background'] = 'url(javascript:alert(1))';
        $this->postJson('/api/admin/layouts', ['name' => 'Unsafe token', 'definition' => $invalid])->assertUnprocessable();
    }

    public function test_layout_endpoints_require_administrator(): void
    {
        $role = Role::create(['name' => 'Author', 'slug' => 'author', 'permissions' => ['posts.view.own']]);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]), 'sanctum');
        $this->getJson('/api/admin/layouts')->assertForbidden();
        auth()->guard('sanctum')->forgetUser();
        $this->getJson('/api/admin/layouts')->assertUnauthorized();
    }

    public function test_layout_supports_safe_button_links_and_rejects_unsafe_protocols(): void
    {
        $this->administrator();
        $definition = $this->definition();
        $definition['sections'][0]['blocks'][] = [
            'id' => 'hero-button', 'type' => 'button', 'content' => 'Hubungi kami',
            'settings' => ['variant' => 'primary', 'url' => '/contact', 'target' => '_blank'],
        ];
        $this->postJson('/api/admin/layouts', ['name' => 'Linked CTA', 'definition' => $definition])
            ->assertCreated()
            ->assertJsonPath('data.definition.sections.0.blocks.2.settings.url', '/contact');
        $definition['sections'][0]['blocks'][2]['settings']['url'] = 'javascript:alert(1)';
        $this->postJson('/api/admin/layouts', ['name' => 'Unsafe CTA', 'definition' => $definition])->assertUnprocessable();
    }

    public function test_layout_image_block_must_reference_an_image_in_media_library(): void
    {
        $this->administrator();
        $user = User::factory()->create();
        $media = Media::create(['user_id' => $user->id, 'disk' => 'public', 'path' => 'cms-media/document.pdf', 'original_name' => 'document.pdf', 'mime_type' => 'application/pdf', 'size' => 100]);
        $definition = $this->definition();
        $definition['sections'][0]['blocks'][] = ['id' => 'hero-image', 'type' => 'image', 'content' => '', 'media_id' => $media->id, 'settings' => []];
        $this->postJson('/api/admin/layouts', ['name' => 'Invalid Image', 'definition' => $definition])->assertUnprocessable();
    }


    public function test_layout_accepts_dynamic_content_blocks_and_rejects_unsafe_video_urls(): void
    {
        $this->administrator();
        $definition = $this->definition();
        $definition['sections'][0]['blocks'] = [
            ['id' => 'feature-card', 'type' => 'card', 'content' => "Cepat\nDeskripsi fitur", 'settings' => []],
            ['id' => 'testimonial', 'type' => 'quote', 'content' => "Produk bagus\nPelanggan", 'settings' => []],
            ['id' => 'feature-list', 'type' => 'list', 'content' => "Cepat\nAman", 'settings' => []],
            ['id' => 'faq-item', 'type' => 'accordion', 'content' => "Bagaimana?\nBegini caranya.", 'settings' => []],
            ['id' => 'video-item', 'type' => 'video', 'content' => 'Tonton video', 'settings' => ['url' => 'https://cdn.example.test/demo.mp4']],
            ['id' => 'separator', 'type' => 'divider', 'content' => '', 'settings' => []],
        ];
        $this->postJson('/api/admin/layouts', ['name' => 'Dynamic Blocks', 'definition' => $definition])->assertCreated();
        $definition['sections'][0]['blocks'][4]['settings']['url'] = 'javascript:alert(1)';
        $this->postJson('/api/admin/layouts', ['name' => 'Unsafe Video', 'definition' => $definition])->assertUnprocessable();
    }

}
