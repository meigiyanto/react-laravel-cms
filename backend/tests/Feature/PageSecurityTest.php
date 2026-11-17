<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_html_is_sanitized_on_create_and_update(): void
    {
        $role = Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator-page-security',
            'permissions' => ['*'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/pages', [
                'title' => 'Halaman Aman',
                'slug' => 'halaman-aman-security',
                'body' => '<p onclick="alert(1)">Aman</p><script>alert(1)</script>',
                'status' => 'draft',
            ])
            ->assertCreated();

        $pageId = $response->json('data.id');
        $createdBody = strtolower($response->json('data.body'));

        $this->assertStringContainsString('aman', $createdBody);
        $this->assertStringNotContainsString('<script', $createdBody);
        $this->assertStringNotContainsString('onclick', $createdBody);

        $updated = $this->putJson("/api/pages/{$pageId}", [
            'body' => '<p onmouseover="alert(1)">Konten baru</p><script>alert(2)</script>',
        ])->assertOk();

        $updatedBody = strtolower($updated->json('data.body'));

        $this->assertStringContainsString('konten baru', $updatedBody);
        $this->assertStringNotContainsString('<script', $updatedBody);
        $this->assertStringNotContainsString('onmouseover', $updatedBody);
        $this->assertDatabaseHas('pages', [
            'id' => $pageId,
            'body' => $updated->json('data.body'),
        ]);
    }
}
