<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Role;
use App\Models\Tag;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagManagementTest extends TestCase
{
    use RefreshDatabase;

    private Role $administratorRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->administratorRole = Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator',
            'permissions' => ['*'],
        ]);
    }

    public function test_administrator_can_create_update_and_delete_unused_tags(): void
    {
        $this->actingAs(User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]), 'sanctum');

        $created = $this->postJson('/api/tags', ['name' => 'Laravel Framework'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Laravel Framework')
            ->assertJsonPath('data.slug', 'laravel-framework');

        $tagId = $created->json('data.id');

        $this->putJson("/api/tags/{$tagId}", ['name' => 'Laravel'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Laravel')
            ->assertJsonPath('data.slug', 'laravel');

        $this->deleteJson("/api/tags/{$tagId}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('tags', ['id' => $tagId]);
    }

    public function test_tag_slug_is_generated_uniquely_when_name_is_reused(): void
    {
        $this->actingAs(User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]), 'sanctum');

        Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $this->postJson('/api/tags', ['name' => 'Laravel'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'laravel-2');
    }

    public function test_tag_in_use_by_a_post_cannot_be_deleted(): void
    {
        $this->actingAs(User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]), 'sanctum');

        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $post = Post::create([
            'title' => 'Artikel Laravel',
            'slug' => 'artikel-laravel',
            'body' => 'Isi artikel.',
            'status' => 'draft',
        ]);
        $post->tags()->attach($tag);

        $this->deleteJson("/api/tags/{$tag->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Tag masih digunakan oleh artikel. Lepaskan tag dari artikel terlebih dahulu.');

        $this->assertDatabaseHas('tags', ['id' => $tag->id]);
    }

    public function test_editor_can_manage_tags_but_author_and_contributor_are_read_only(): void
    {
        $this->seed(RoleSeeder::class);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $editor = User::factory()->create([
            'role_id' => Role::where('slug', 'editor')->value('id'),
        ]);
        $this->actingAs($editor, 'sanctum')
            ->postJson('/api/tags', ['name' => 'PHP'])
            ->assertCreated();

        foreach (['author', 'contributor'] as $roleSlug) {
            $user = User::factory()->create([
                'role_id' => Role::where('slug', $roleSlug)->value('id'),
            ]);

            $this->actingAs($user, 'sanctum')
                ->getJson('/api/tags')
                ->assertOk()
                ->assertJsonFragment(['id' => $tag->id, 'name' => 'Laravel', 'slug' => 'laravel'])
                ->postJson('/api/tags', ['name' => 'Tidak Diizinkan'])
                ->assertForbidden();

            $this->actingAs($user, 'sanctum')
                ->putJson("/api/tags/{$tag->id}", ['name' => 'Ubah Tag'])
                ->assertForbidden();

            $this->actingAs($user, 'sanctum')
                ->deleteJson("/api/tags/{$tag->id}")
                ->assertForbidden();
        }
    }

    public function test_unauthenticated_user_cannot_access_tag_management(): void
    {
        $this->getJson('/api/tags')->assertUnauthorized();
        $this->postJson('/api/tags', ['name' => 'Laravel'])->assertUnauthorized();
    }
}
