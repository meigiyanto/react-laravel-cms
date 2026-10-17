<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Media;
use App\Models\Page;
use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CmsContentRelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_relations_work(): void
    {
        $user = User::factory()->create();

        $media = Media::create([
            'user_id' => $user->id,
            'disk' => 'public',
            'path' => 'posts/cover.jpg',
            'original_name' => 'cover.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'alt_text' => 'Gambar sampul artikel',
        ]);

        $category = Category::create([
            'name' => 'Teknologi',
            'slug' => 'teknologi',
            'description' => 'Artikel teknologi',
        ]);

        $tag = Tag::create([
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);

        $post = Post::create([
            'user_id' => $user->id,
            'featured_image_id' => $media->id,
            'title' => 'Mengenal Laravel',
            'slug' => 'mengenal-laravel',
            'body' => 'Isi artikel tentang Laravel.',
            'status' => 'draft',
        ]);

        $post->categories()->attach($category);
        $post->tags()->attach($tag);

        $this->assertTrue($post->user->is($user));
        $this->assertTrue($post->featuredImage->is($media));
        $this->assertTrue($post->categories->contains($category));
        $this->assertTrue($post->tags->contains($tag));
        $this->assertTrue($user->posts->contains($post));
        $this->assertTrue($media->posts->contains($post));
    }

    public function test_page_relations_work(): void
    {
        $user = User::factory()->create();

        $media = Media::create([
            'disk' => 'public',
            'path' => 'pages/about.jpg',
            'alt_text' => 'Foto profil perusahaan',
        ]);

        $page = Page::create([
            'user_id' => $user->id,
            'featured_image_id' => $media->id,
            'title' => 'Tentang Kami',
            'slug' => 'tentang-kami',
            'body' => 'Informasi tentang perusahaan.',
            'status' => 'draft',
        ]);

        $this->assertTrue($page->user->is($user));
        $this->assertTrue($page->featuredImage->is($media));
        $this->assertTrue($user->pages->contains($page));
        $this->assertTrue($media->pages->contains($page));
    }

    public function test_content_can_exist_without_author_or_cover_image(): void
    {
        $post = Post::create([
            'title' => 'Artikel Tanpa Sampul',
            'slug' => 'artikel-tanpa-sampul',
            'body' => 'Isi artikel.',
            'status' => 'draft',
        ]);

        $page = Page::create([
            'title' => 'Halaman Kontak',
            'slug' => 'kontak',
            'body' => 'Informasi kontak.',
            'status' => 'draft',
        ]);

        $this->assertNull($post->user);
        $this->assertNull($post->featuredImage);
        $this->assertNull($page->user);
        $this->assertNull($page->featuredImage);
    }
}
