<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsersManagementTest extends TestCase
{
    use RefreshDatabase;

    private Role $administratorRole;
    private Role $editorRole;
    private Role $authorRole;

    private User $administrator;
    private User $editor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->administratorRole = Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator',
            'permissions' => ['*'],
        ]);

        $this->editorRole = Role::create([
            'name' => 'Editor',
            'slug' => 'editor',
            'permissions' => ['posts.view'],
        ]);

        $this->authorRole = Role::create([
            'name' => 'Author',
            'slug' => 'author',
            'permissions' => ['posts.create'],
        ]);

        $this->administrator = User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]);

        $this->editor = User::factory()->create([
            'role_id' => $this->editorRole->id,
        ]);
    }

    public function test_users_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_non_administrator_cannot_manage_users(): void
    {
        $this->actingAs($this->editor, 'sanctum');

        $this->getJson('/api/admin/users')->assertForbidden();

        $this->postJson('/api/admin/users', [
            'name' => 'Pengguna Baru',
            'email' => 'baru@example.com',
            'password' => 'Password123!',
            'role_id' => $this->authorRole->id,
        ])->assertForbidden();

        $this->putJson('/api/admin/users/' . $this->editor->id, [
            'name' => 'Nama Diubah',
        ])->assertForbidden();

        $this->putJson('/api/admin/users/' . $this->editor->id . '/role', [
            'role_id' => $this->authorRole->id,
        ])->assertForbidden();
    }

    public function test_administrator_can_search_and_paginate_users(): void
    {
        User::factory()->create([
            'name' => 'Pencarian Khusus',
            'email' => 'khusus@example.com',
            'role_id' => $this->authorRole->id,
        ]);

        $this->actingAs($this->administrator, 'sanctum');

        $this->getJson('/api/admin/users?search=khusus')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.email', 'khusus@example.com');

        $this->getJson('/api/admin/users?page=0')
            ->assertUnprocessable();

        $this->getJson('/api/admin/users?search[]=tidak-valid')
            ->assertUnprocessable();

        $this->getJson('/api/admin/users?per_page=101')
            ->assertUnprocessable();
    }

    public function test_administrator_can_create_user(): void
    {
        $this->actingAs($this->administrator, 'sanctum');

        $response = $this->postJson('/api/admin/users', [
            'name' => 'Penulis Baru',
            'email' => 'penulis@example.com',
            'password' => 'Password123!',
            'role_id' => $this->authorRole->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Penulis Baru')
            ->assertJsonPath('data.role.slug', 'author')
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', [
            'email' => 'penulis@example.com',
            'role_id' => $this->authorRole->id,
        ]);
    }

    public function test_create_user_validates_input(): void
    {
        $this->actingAs($this->administrator, 'sanctum');

        $this->postJson('/api/admin/users', [
            'name' => '',
            'email' => 'bukan-email',
            'password' => '123',
            'role_id' => 999999,
        ])->assertUnprocessable()
          ->assertJsonValidationErrors([
              'name',
              'email',
              'password',
              'role_id',
          ]);
    }

    public function test_administrator_can_update_user_profile(): void
    {
        $this->actingAs($this->administrator, 'sanctum');

        $this->putJson('/api/admin/users/' . $this->editor->id, [
            'name' => 'Editor Diperbarui',
            'email' => 'editor-baru@example.com',
        ])->assertOk()
          ->assertJsonPath('data.name', 'Editor Diperbarui')
          ->assertJsonPath('data.email', 'editor-baru@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $this->editor->id,
            'name' => 'Editor Diperbarui',
            'email' => 'editor-baru@example.com',
        ]);
    }

    public function test_administrator_can_assign_role(): void
    {
        $this->actingAs($this->administrator, 'sanctum');

        $this->putJson('/api/admin/users/' . $this->editor->id . '/role', [
            'role_id' => $this->authorRole->id,
        ])->assertOk()
          ->assertJsonPath('data.role.slug', 'author');

        $this->assertDatabaseHas('users', [
            'id' => $this->editor->id,
            'role_id' => $this->authorRole->id,
        ]);
    }

    public function test_last_administrator_cannot_be_demoted(): void
    {
        $this->actingAs($this->administrator, 'sanctum');

        $this->putJson(
            '/api/admin/users/' . $this->administrator->id . '/role',
            ['role_id' => $this->editorRole->id]
        )->assertUnprocessable()
         ->assertJsonValidationErrors(['role_id']);

        $this->assertDatabaseHas('users', [
            'id' => $this->administrator->id,
            'role_id' => $this->administratorRole->id,
        ]);
    }
}
