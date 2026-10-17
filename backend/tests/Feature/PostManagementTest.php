<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Media;
use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_posts(): void
    {
        $this->getJson('/api/posts')->assertUnauthorized();
        $this->postJson('/api/posts', [])->assertUnauthorized();
    }

    public function test_create_post_saves_categories_tags_featured_image_and_seo_metadata(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $categoryA = Category::create(['name' => 'Teknologi', 'slug' => 'teknologi']);
        $categoryB = Category::create(['name' => 'Tutorial', 'slug' => 'tutorial']);
        $tagA = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $tagB = Tag::create(['name' => 'PHP', 'slug' => 'php']);
        $media = Media::create([
            'user_id' => $user->id,
            'disk' => 'public',
            'path' => 'cms-media/cover.jpg',
            'original_name' => 'cover.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'alt_text' => 'Sampul Laravel',
        ]);

        $response = $this->postJson('/api/posts', [
            'title' => 'Mengenal Laravel',
            'slug' => '',
            'excerpt' => ' Ringkasan artikel ',
            'body' => 'Isi artikel.',
            'status' => 'draft',
            'category_ids' => [$categoryA->id, $categoryB->id],
            'tag_ids' => [$tagA->id, $tagB->id],
            'featured_image_id' => $media->id,
            'meta_title' => ' Laravel SEO ',
            'meta_description' => ' Deskripsi SEO ',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title', 'Mengenal Laravel')
            ->assertJsonPath('data.slug', 'mengenal-laravel')
            ->assertJsonPath('data.featured_image_id', $media->id)
            ->assertJsonPath('data.meta_title', 'Laravel SEO')
            ->assertJsonPath('data.meta_description', 'Deskripsi SEO')
            ->assertJsonCount(2, 'data.categories')
            ->assertJsonCount(2, 'data.tags')
            ->assertJsonPath('data.featured_image.id', $media->id);

        $postId = $response->json('data.id');
        $this->assertDatabaseHas('posts', [
            'id' => $postId,
            'user_id' => $user->id,
            'featured_image_id' => $media->id,
            'meta_title' => 'Laravel SEO',
            'meta_description' => 'Deskripsi SEO',
            'published_at' => null,
        ]);
        $this->assertDatabaseHas('category_post', [
            'post_id' => $postId, 'category_id' => $categoryA->id,
        ]);
        $this->assertDatabaseHas('post_tag', [
            'post_id' => $postId, 'tag_id' => $tagA->id,
        ]);
    }

    public function test_show_returns_editor_relations_and_seo_fields(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
        $category = Category::create(['name' => 'Teknologi', 'slug' => 'teknologi']);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $post = Post::create([
            'title' => 'Artikel',
            'slug' => 'artikel',
            'body' => 'Isi',
            'status' => 'draft',
            'meta_title' => 'Meta',
            'meta_description' => 'Deskripsi meta',
        ]);
        $post->categories()->attach($category);
        $post->tags()->attach($tag);

        $this->getJson("/api/posts/{$post->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $post->id)
            ->assertJsonPath('data.meta_title', 'Meta')
            ->assertJsonPath('data.meta_description', 'Deskripsi meta')
            ->assertJsonPath('data.categories.0.id', $category->id)
            ->assertJsonPath('data.tags.0.id', $tag->id);
    }

    public function test_update_changes_relations_and_metadata_but_omitted_relations_remain_unchanged(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
        $oldCategory = Category::create(['name' => 'Lama', 'slug' => 'lama']);
        $newCategory = Category::create(['name' => 'Baru', 'slug' => 'baru']);
        $oldTag = Tag::create(['name' => 'Old', 'slug' => 'old']);
        $newTag = Tag::create(['name' => 'New', 'slug' => 'new']);
        $post = Post::create([
            'title' => 'Artikel',
            'slug' => 'artikel',
            'body' => 'Isi lama',
            'status' => 'draft',
            'meta_title' => 'SEO lama',
        ]);
        $post->categories()->attach($oldCategory);
        $post->tags()->attach($oldTag);

        $this->putJson("/api/posts/{$post->id}", [
            'title' => 'Artikel diperbarui',
            'body' => 'Isi baru',
            'category_ids' => [$newCategory->id],
            'tag_ids' => [$newTag->id],
            'featured_image_id' => null,
            'meta_title' => 'SEO baru',
            'meta_description' => 'Deskripsi baru',
            'status' => 'published',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Artikel diperbarui')
            ->assertJsonPath('data.meta_title', 'SEO baru')
            ->assertJsonPath('data.featured_image_id', null)
            ->assertJsonCount(1, 'data.categories')
            ->assertJsonPath('data.categories.0.id', $newCategory->id)
            ->assertJsonCount(1, 'data.tags')
            ->assertJsonPath('data.tags.0.id', $newTag->id);

        $this->assertDatabaseMissing('category_post', [
            'post_id' => $post->id, 'category_id' => $oldCategory->id,
        ]);
        $this->assertDatabaseMissing('post_tag', [
            'post_id' => $post->id, 'tag_id' => $oldTag->id,
        ]);
        $this->assertNotNull($post->fresh()->published_at);

        // Omitted relation keys are not interpreted as empty selections.
        $this->putJson("/api/posts/{$post->id}", [
            'title' => 'Judul kedua',
        ])->assertOk();

        $this->assertDatabaseHas('category_post', [
            'post_id' => $post->id, 'category_id' => $newCategory->id,
        ]);
        $this->assertDatabaseHas('post_tag', [
            'post_id' => $post->id, 'tag_id' => $newTag->id,
        ]);
    }

    public function test_update_can_clear_categories_tags_and_seo_values(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
        $category = Category::create(['name' => 'Teknologi', 'slug' => 'teknologi']);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $post = Post::create([
            'title' => 'Artikel',
            'slug' => 'artikel',
            'body' => 'Isi',
            'status' => 'draft',
            'meta_title' => 'SEO',
            'meta_description' => 'Deskripsi',
        ]);
        $post->categories()->attach($category);
        $post->tags()->attach($tag);

        $this->putJson("/api/posts/{$post->id}", [
            'category_ids' => [],
            'tag_ids' => [],
            'meta_title' => null,
            'meta_description' => null,
        ])->assertOk()
            ->assertJsonCount(0, 'data.categories')
            ->assertJsonCount(0, 'data.tags')
            ->assertJsonPath('data.meta_title', null)
            ->assertJsonPath('data.meta_description', null);

        $this->assertDatabaseMissing('category_post', [
            'post_id' => $post->id, 'category_id' => $category->id,
        ]);
        $this->assertDatabaseMissing('post_tag', [
            'post_id' => $post->id, 'tag_id' => $tag->id,
        ]);
    }

    public function test_invalid_foreign_ids_duplicate_ids_status_and_seo_lengths_are_rejected(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->postJson('/api/posts', [
            'title' => 'Artikel',
            'body' => 'Isi',
            'status' => 'not-a-status',
            'category_ids' => [99999],
            'tag_ids' => [99999],
            'featured_image_id' => 99999,
            'meta_title' => str_repeat('x', 256),
            'meta_description' => str_repeat('x', 501),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'status',
                'category_ids.0',
                'tag_ids.0',
                'featured_image_id',
                'meta_title',
                'meta_description',
            ]);
    }

    public function test_duplicate_category_or_tag_ids_are_rejected(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
        $category = Category::create(['name' => 'Teknologi', 'slug' => 'teknologi']);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $this->postJson('/api/posts', [
            'title' => 'Artikel',
            'body' => 'Isi',
            'status' => 'draft',
            'category_ids' => [$category->id, $category->id],
            'tag_ids' => [$tag->id, $tag->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_ids.1', 'tag_ids.1']);
    }

    public function test_published_at_is_set_on_publish_and_cleared_when_unpublished(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
        $post = Post::create([
            'title' => 'Artikel',
            'slug' => 'artikel',
            'body' => 'Isi',
            'status' => 'draft',
        ]);

        $this->putJson("/api/posts/{$post->id}", ['status' => 'published'])
            ->assertOk();
        $this->assertNotNull($post->fresh()->published_at);

        $this->putJson("/api/posts/{$post->id}", ['status' => 'archived'])
            ->assertOk();
        $this->assertNull($post->fresh()->published_at);
    }

    public function test_delete_removes_post_and_pivot_relations(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
        $category = Category::create(['name' => 'Teknologi', 'slug' => 'teknologi']);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $post = Post::create([
            'title' => 'Artikel',
            'slug' => 'artikel',
            'body' => 'Isi',
            'status' => 'draft',
        ]);
        $post->categories()->attach($category);
        $post->tags()->attach($tag);

        $this->deleteJson("/api/posts/{$post->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
        $this->assertDatabaseMissing('category_post', ['post_id' => $post->id]);
        $this->assertDatabaseMissing('post_tag', ['post_id' => $post->id]);
    }
    
    public function test_partial_update_preserves_custom_slug(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    
        $post = Post::create([
            'title' => 'Artikel Laravel',
            'slug' => 'panduan-laravel-khusus',
            'body' => 'Isi artikel',
            'status' => 'draft',
        ]);
    
        $this->putJson("/api/posts/{$post->id}", [
            'status' => 'published',
        ])->assertOk()
          ->assertJsonPath('data.slug', 'panduan-laravel-khusus');
    
        $this->assertDatabaseHas('posts', [
            'id' => $post->id,
            'slug' => 'panduan-laravel-khusus',
        ]);
    }
}
