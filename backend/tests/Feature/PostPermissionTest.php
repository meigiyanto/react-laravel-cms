<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostPermissionTest extends TestCase
{
    use RefreshDatabase;

    private Role $adminRole;
    private Role $editorRole;
    private Role $authorRole;
    private Role $contributorRole;

    private User $editor;
    private User $author;
    private User $contributor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminRole = Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator',
            'permissions' => ['*'],
        ]);

        $this->editorRole = Role::create([
            'name' => 'Editor',
            'slug' => 'editor',
            'permissions' => [
                'posts.view',
                'posts.create',
                'posts.update',
                'posts.delete',
                'posts.publish',
            ],
        ]);

        $this->authorRole = Role::create([
            'name' => 'Author',
            'slug' => 'author',
            'permissions' => [
                'posts.view.own',
                'posts.create',
                'posts.update.own',
                'categories.view',
            ],
        ]);

        $this->contributorRole = Role::create([
            'name' => 'Contributor',
            'slug' => 'contributor',
            'permissions' => [
                'posts.view.own',
                'posts.create',
                'posts.update.own',
            ],
        ]);

        $this->editor = User::factory()->create([
            'role_id' => $this->editorRole->id,
        ]);

        $this->author = User::factory()->create([
            'role_id' => $this->authorRole->id,
        ]);

        $this->contributor = User::factory()->create([
            'role_id' => $this->contributorRole->id,
        ]);
    }

    private function createPostAs(User $user, string $title): int
    {
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/posts', [
                'title' => $title,
                'slug' => str()->slug($title),
                'body' => '<p>Isi artikel.</p>',
                'status' => 'draft',
            ]);

        $response->assertCreated();

        return $response->json('data.id');
    }

    public function test_author_can_only_list_and_update_own_posts(): void
    {
        $ownPostId = $this->createPostAs(
            $this->author,
            'Artikel Milik Author'
        );

        $otherPostId = $this->createPostAs(
            $this->editor,
            'Artikel Milik Editor'
        );

        $this->actingAs($this->author, 'sanctum');

        $this->getJson('/api/posts')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $ownPostId);

        $this->putJson("/api/posts/{$ownPostId}", [
            'title' => 'Artikel Author Diperbarui',
        ])->assertOk();

        $this->putJson("/api/posts/{$otherPostId}", [
            'title' => 'Percobaan Mengubah Artikel Editor',
        ])->assertForbidden();
    }

    public function test_author_cannot_publish_an_article(): void
    {
        $this->actingAs($this->author, 'sanctum');

        $this->postJson('/api/posts', [
            'title' => 'Artikel Tidak Boleh Terbit',
            'slug' => 'artikel-tidak-boleh-terbit',
            'body' => '<p>Isi artikel.</p>',
            'status' => 'published',
        ])->assertForbidden();
    }

    public function test_contributor_cannot_delete_or_publish_posts(): void
    {
        $postId = $this->createPostAs(
            $this->contributor,
            'Artikel Contributor'
        );

        $this->actingAs($this->contributor, 'sanctum');

        $this->putJson("/api/posts/{$postId}", [
            'status' => 'published',
        ])->assertForbidden();

        $this->deleteJson("/api/posts/{$postId}")
            ->assertForbidden();

        $this->assertDatabaseHas('posts', [
            'id' => $postId,
            'status' => 'draft',
        ]);
    }

    public function test_editor_can_publish_another_users_post(): void
    {
        $postId = $this->createPostAs(
            $this->author,
            'Artikel untuk Diterbitkan Editor'
        );

        $this->actingAs($this->editor, 'sanctum');

        $this->putJson("/api/posts/{$postId}", [
            'status' => 'published',
        ])->assertOk();

        $this->assertDatabaseHas('posts', [
            'id' => $postId,
            'status' => 'published',
        ]);
    }

    public function test_author_cannot_manage_categories_or_pages(): void
    {
        $this->actingAs($this->author, 'sanctum');
    
        // Author boleh membaca kategori, tetapi tidak mengelolanya.
        $this->getJson('/api/categories')->assertOk();
    
        $this->postJson('/api/categories', [
            'name' => 'Kategori Terlarang',
            'slug' => 'kategori-terlarang',
        ])->assertForbidden();
    
        // Author tidak memiliki izin mengelola halaman.
        $this->getJson('/api/pages')->assertForbidden();
    }
    
    public function test_author_can_read_categories_but_cannot_manage_them(): void
    {
        $this->actingAs($this->author, 'sanctum');
    
        $this->getJson('/api/categories')->assertOk();
    
        $this->postJson('/api/categories', [
            'name' => 'Kategori Terlarang',
            'slug' => 'kategori-terlarang',
        ])->assertForbidden();
    
        $this->getJson('/api/pages')->assertForbidden();
    }
}
