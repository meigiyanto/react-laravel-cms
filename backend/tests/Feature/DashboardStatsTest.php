<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    private function createRole(
        string $name,
        array $permissions
    ): Role {
        return Role::create([
            'name' => $name,
            'slug' => strtolower(str_replace(' ', '-', $name)),
            'permissions' => $permissions,
        ]);
    }

    private function createUserWithPermissions(
        string $name,
        array $permissions
    ): User {
        $role = $this->createRole($name, $permissions);

        return User::factory()->create([
            'role_id' => $role->id,
        ]);
    }

    private function createPost(
        User $user,
        string $title,
        string $status
    ): Post {
        return Post::create([
            'user_id' => $user->id,
            'title' => $title,
            'slug' => str()->slug($title),
            'body' => 'Isi artikel untuk pengujian.',
            'status' => $status,
        ]);
    }

    public function test_guest_cannot_access_dashboard_stats(): void
    {
        $this->getJson('/api/dashboard/stats')
            ->assertUnauthorized();
    }

    public function test_user_without_posts_view_permission_cannot_access_stats(): void
    {
        $user = $this->createUserWithPermissions(
            'Restricted User',
            ['posts.create']
        );

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard/stats')
            ->assertForbidden();
    }

    public function test_posts_view_permission_returns_stats_for_all_users_posts(): void
    {
        $viewer = $this->createUserWithPermissions(
            'Statistics Viewer',
            ['posts.view']
        );

        $authorA = User::factory()->create();
        $authorB = User::factory()->create();

        $this->createPost($authorA, 'Published A', 'published');
        $this->createPost($authorA, 'Draft A', 'draft');
        $this->createPost($authorB, 'Archived B', 'archived');
        $this->createPost($authorB, 'Published B', 'published');
        $this->createPost($viewer, 'Draft Viewer', 'draft');

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.published', 2)
            ->assertJsonPath('data.draft', 2)
            ->assertJsonPath('data.archived', 1);
    }

    public function test_posts_view_own_permission_returns_only_own_post_stats(): void
    {
        $author = $this->createUserWithPermissions(
            'Own Posts Author',
            ['posts.view.own']
        );

        $otherUser = User::factory()->create();

        $this->createPost($author, 'Own Published', 'published');
        $this->createPost($author, 'Own Draft', 'draft');
        $this->createPost($author, 'Own Archived', 'archived');

        $this->createPost($otherUser, 'Other Published', 'published');
        $this->createPost($otherUser, 'Other Published Two', 'published');
        $this->createPost($otherUser, 'Other Draft', 'draft');
        $this->createPost($otherUser, 'Other Archived', 'archived');

        $this->actingAs($author, 'sanctum')
            ->getJson('/api/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.published', 1)
            ->assertJsonPath('data.draft', 1)
            ->assertJsonPath('data.archived', 1);
    }

    public function test_wildcard_permission_returns_stats_for_all_users_posts(): void
    {
        $admin = $this->createUserWithPermissions(
            'Administrator',
            ['*']
        );

        $otherUser = User::factory()->create();

        $this->createPost($admin, 'Admin Draft', 'draft');
        $this->createPost($otherUser, 'Other Published', 'published');
        $this->createPost($otherUser, 'Other Archived', 'archived');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.published', 1)
            ->assertJsonPath('data.draft', 1)
            ->assertJsonPath('data.archived', 1);
    }
}
