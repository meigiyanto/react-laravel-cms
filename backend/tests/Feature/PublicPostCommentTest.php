<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPostCommentTest extends TestCase
{
    use RefreshDatabase;

    private User $author;
    private Post $published;
    private Post $draft;

    protected function setUp(): void
    {
        parent::setUp();
        $role = Role::create(['name' => 'Author', 'slug' => 'author-public-test', 'permissions' => ['*']]);
        $this->author = User::factory()->create(['role_id' => $role->id]);
        $this->published = Post::create([
            'user_id' => $this->author->id,
            'title' => 'Artikel Terbit', 'slug' => 'artikel-terbit',
            'body' => '<p>Isi artikel publik.</p>', 'status' => 'published',
            'published_at' => now(),
        ]);
        $this->draft = Post::create([
            'user_id' => $this->author->id,
            'title' => 'Artikel Draft', 'slug' => 'artikel-draft',
            'body' => '<p>Isi rahasia.</p>', 'status' => 'draft',
        ]);
    }

    public function test_public_index_only_returns_published_posts(): void
    {
        $this->getJson('/api/public/posts')->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.slug', 'artikel-terbit');
    }

    public function test_public_cannot_read_draft_post(): void
    {
        $this->getJson('/api/public/posts/artikel-draft')->assertNotFound();
    }

    public function test_public_can_submit_comment_but_it_starts_pending(): void
    {
        $this->postJson('/api/public/posts/artikel-terbit/comments', [
            'name' => 'Pengunjung', 'email' => 'pengunjung@example.com', 'body' => 'Artikel yang menarik.',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('comments', [
            'post_id' => $this->published->id,
            'email' => 'pengunjung@example.com',
            'status' => 'pending',
        ]);
        $this->getJson('/api/public/posts/artikel-terbit/comments')->assertJsonPath('data.total', 0);
    }

    public function test_public_cannot_comment_on_draft(): void
    {
        $this->postJson('/api/public/posts/artikel-draft/comments', [
            'name' => 'Pengunjung', 'email' => 'pengunjung@example.com', 'body' => 'Komentar pada draft.',
        ])->assertNotFound();
    }

    public function test_public_comment_requires_valid_fields_and_blank_honeypot(): void
    {
        $this->postJson('/api/public/posts/artikel-terbit/comments', [
            'name' => 'A', 'email' => 'bukan-email', 'body' => 'x', 'website' => 'spam.example',
        ])->assertUnprocessable();
    }

    public function test_only_approved_comments_are_public(): void
    {
        Comment::create([
            'post_id' => $this->published->id, 'name' => 'Menunggu', 'email' => 'pending@example.com',
            'body' => 'Komentar pending', 'status' => 'pending',
        ]);
        Comment::create([
            'post_id' => $this->published->id, 'name' => 'Disetujui', 'email' => 'approved@example.com',
            'body' => 'Komentar tampil', 'status' => 'approved',
        ]);

        $this->getJson('/api/public/posts/artikel-terbit/comments')->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.name', 'Disetujui')
            ->assertJsonMissing(['email' => 'approved@example.com']);
    }

    public function test_admin_can_moderate_comment_but_public_cannot(): void
    {
        $comment = Comment::create([
            'post_id' => $this->published->id, 'name' => 'Pengunjung', 'email' => 'visitor@example.com',
            'body' => 'Komentar', 'status' => 'pending',
        ]);

        $this->patchJson("/api/admin/comments/{$comment->id}/status", ['status' => 'approved'])
            ->assertUnauthorized();

        $adminRole = Role::create(['name' => 'Administrator', 'slug' => 'administrator', 'permissions' => ['*']]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/comments/{$comment->id}/status", ['status' => 'approved'])
            ->assertOk();
        $this->assertDatabaseHas('comments', ['id' => $comment->id, 'status' => 'approved']);
    }
    
    public function test_public_cannot_comment_when_post_disables_comments(): void
    {
        $this->published->update(['allow_comments' => false]);
    
        $this->postJson('/api/public/posts/artikel-terbit/comments', [
            'name' => 'Pengunjung',
            'email' => 'pengunjung@example.com',
            'body' => 'Saya ingin berkomentar.',
        ])->assertForbidden()
            ->assertJsonPath('success', false);
    
        $this->assertDatabaseMissing('comments', [
            'post_id' => $this->published->id,
            'email' => 'pengunjung@example.com',
        ]);
    }
    
    public function test_featured_public_posts_only_returns_featured_published_posts(): void
    {
        $this->published->update(['is_featured' => true]);
    
        Post::create([
            'user_id' => $this->author->id,
            'title' => 'Artikel Biasa',
            'slug' => 'artikel-biasa',
            'body' => 'Isi artikel biasa.',
            'status' => 'published',
            'published_at' => now(),
            'is_featured' => false,
        ]);
    
        $this->getJson('/api/public/posts?featured=1')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.slug', 'artikel-terbit')
            ->assertJsonPath('data.data.0.is_featured', true);
    }
}
