<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
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

    public function test_administrator_can_create_update_and_delete_unused_categories(): void
    {
        $this->actingAs(User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]), 'sanctum');

        $created = $this->postJson('/api/categories', [
            'name' => 'Laravel Framework',
            'description' => 'Artikel tentang Laravel.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Laravel Framework')
            ->assertJsonPath('data.slug', 'laravel-framework')
            ->assertJsonPath('data.description', 'Artikel tentang Laravel.');

        $categoryId = $created->json('data.id');

        $this->putJson("/api/categories/{$categoryId}", [
            'name' => 'Laravel',
            'description' => 'Panduan Laravel.',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Laravel')
            ->assertJsonPath('data.slug', 'laravel')
            ->assertJsonPath('data.description', 'Panduan Laravel.');

        $this->deleteJson("/api/categories/{$categoryId}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('categories', ['id' => $categoryId]);
    }

    public function test_category_slug_is_generated_uniquely_when_name_is_reused(): void
    {
        $this->actingAs(User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]), 'sanctum');

        Category::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $this->postJson('/api/categories', ['name' => 'Laravel'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'laravel-2');
    }

    public function test_category_in_use_by_a_post_cannot_be_deleted(): void
    {
        $this->actingAs(User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]), 'sanctum');

        $category = Category::create([
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);
        $post = Post::create([
            'title' => 'Artikel Laravel',
            'slug' => 'artikel-laravel',
            'body' => 'Isi artikel.',
            'status' => 'draft',
        ]);
        $post->categories()->attach($category);

        $this->deleteJson("/api/categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Kategori masih digunakan oleh artikel.');

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_unauthenticated_user_cannot_access_category_management(): void
    {
        $this->getJson('/api/categories')->assertUnauthorized();
        $this->postJson('/api/categories', ['name' => 'Laravel'])->assertUnauthorized();
    }
}
