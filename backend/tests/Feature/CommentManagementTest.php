<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommentManagementTest extends TestCase
{
    use RefreshDatabase;

    private function userWithPermissions(array $permissions): User
    {
        $role = Role::create([
            'name' => 'Comment Manager',
            'slug' => 'comment-manager-' . uniqid(),
            'permissions' => $permissions,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
        ]);

        Sanctum::actingAs($user);

        return $user;
    }

    private function createPost(): Post
    {
        $author = User::factory()->create();

        return Post::create([
            'user_id' => $author->id,
            'title' => 'Artikel Pengujian',
            'slug' => 'artikel-pengujian-' . uniqid(),
            'body' => 'Isi artikel untuk pengujian komentar.',
            'status' => 'published',
        ]);
    }

    private function createComment(
        Post $post,
        string $status = 'pending',
        array $overrides = [],
    ): Comment {
        return Comment::create(array_merge([
            'post_id' => $post->id,
            'user_id' => null,
            'author_name' => 'Pengunjung',
            'author_email' => 'pengunjung@example.com',
            'body' => 'Komentar untuk pengujian.',
            'status' => $status,
        ], $overrides));
    }

    public function test_user_without_comment_permission_cannot_list_comments(): void
    {
        $this->userWithPermissions(['posts.view']);

        $this->getJson('/api/comments')
            ->assertForbidden();
    }

    public function test_user_with_view_permission_can_list_comments(): void
    {
        $this->userWithPermissions(['comments.view']);

        $post = $this->createPost();

        $comment = $this->createComment($post);

        $this->getJson('/api/comments')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $comment->id)
            ->assertJsonPath('data.data.0.post.title', 'Artikel Pengujian');
    }

    public function test_comments_can_be_filtered_by_status(): void
    {
        $this->userWithPermissions(['comments.view']);

        $post = $this->createPost();

        $pending = $this->createComment($post, 'pending');
        $this->createComment($post, 'approved');

        $this->getJson('/api/comments?status=pending')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $pending->id)
            ->assertJsonPath('data.data.0.status', 'pending');
    }

    public function test_user_with_moderate_permission_can_change_status(): void
    {
        $this->userWithPermissions(['comments.moderate']);

        $post = $this->createPost();
        $comment = $this->createComment($post, 'pending');

        $this->patchJson("/api/comments/{$comment->id}/status", [
            'status' => 'approved',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'status' => 'approved',
        ]);
    }

    public function test_invalid_comment_status_is_rejected(): void
    {
        $this->userWithPermissions(['comments.moderate']);

        $post = $this->createPost();
        $comment = $this->createComment($post, 'pending');

        $this->patchJson("/api/comments/{$comment->id}/status", [
            'status' => 'published',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'status' => 'pending',
        ]);
    }

    public function test_user_without_moderate_permission_cannot_change_status(): void
    {
        $this->userWithPermissions(['comments.view']);

        $post = $this->createPost();
        $comment = $this->createComment($post, 'pending');

        $this->patchJson("/api/comments/{$comment->id}/status", [
            'status' => 'approved',
        ])->assertForbidden();

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'status' => 'pending',
        ]);
    }

    public function test_user_with_delete_permission_can_delete_comment(): void
    {
        $this->userWithPermissions(['comments.delete']);

        $post = $this->createPost();
        $comment = $this->createComment($post);

        $this->deleteJson("/api/comments/{$comment->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('comments', [
            'id' => $comment->id,
        ]);
    }

    public function test_user_without_delete_permission_cannot_delete_comment(): void
    {
        $this->userWithPermissions(['comments.view']);

        $post = $this->createPost();
        $comment = $this->createComment($post);

        $this->deleteJson("/api/comments/{$comment->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
        ]);
    }
}