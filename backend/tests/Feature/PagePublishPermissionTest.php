<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PagePublishPermissionTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithPermissions(
        array $permissions
    ): User {
        $role = Role::create([
            'name' => 'Test Role',
            'slug' => 'test-role-' . uniqid(),
            'permissions' => $permissions,
        ]);

        return User::factory()->create([
            'role_id' => $role->id,
        ]);
    }

    private function createDraftPage(User $user): Page
    {
        return Page::create([
            'user_id' => $user->id,
            'title' => 'Draft Page',
            'slug' => 'draft-page-' . uniqid(),
            'body' => '<p>Draft content</p>',
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    public function test_user_without_publish_permission_cannot_create_published_page(): void
    {
        $user = $this->createUserWithPermissions([
            'pages.create',
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/pages', [
            'title' => 'Unauthorized Published Page',
            'slug' => 'unauthorized-published-page',
            'body' => '<p>Page content</p>',
            'status' => 'published',
        ]);

        $response->assertForbidden();

        $this->assertDatabaseMissing('pages', [
            'slug' => 'unauthorized-published-page',
        ]);
    }

    public function test_user_without_publish_permission_cannot_publish_draft_page(): void
    {
        $user = $this->createUserWithPermissions([
            'pages.update',
        ]);

        $page = $this->createDraftPage($user);

        $this->actingAs($user, 'sanctum');

        $response = $this->patchJson(
            "/api/pages/{$page->id}",
            ['status' => 'published']
        );

        $response->assertForbidden();

        $this->assertDatabaseHas('pages', [
            'id' => $page->id,
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    public function test_user_with_publish_permission_can_publish_draft_page(): void
    {
        $user = $this->createUserWithPermissions([
            'pages.update',
            'pages.publish',
        ]);

        $page = $this->createDraftPage($user);

        $this->actingAs($user, 'sanctum');

        $response = $this->patchJson(
            "/api/pages/{$page->id}",
            ['status' => 'published']
        );

        $response->assertSuccessful();

        $this->assertDatabaseHas('pages', [
            'id' => $page->id,
            'status' => 'published',
        ]);

        $this->assertNotNull($page->fresh()->published_at);
    }
}