<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleHtmlSanitizationTest extends TestCase
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
    
    public function test_create_post_sanitizes_unsafe_html(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]);
        
        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/posts', [
            'title' => 'Tes keamanan HTML',
            'body' => <<<'HTML'
<h2>Konten aman</h2>
<script>alert('xss')</script>
<p onclick="alert(1)">Paragraf</p>
<a href="javascript:alert(1)">Tautan</a>
<img src="https://example.com/foto.jpg" onerror="alert(1)">
HTML,
            'status' => 'draft',
        ]);

        $response->assertCreated();

        $body = $response->json('data.body');
        $lower = strtolower($body);

        $this->assertStringContainsString('<h2>', $body);
        $this->assertStringNotContainsString('<script', $lower);
        $this->assertStringNotContainsString('onclick', $lower);
        $this->assertStringNotContainsString('onerror', $lower);
        $this->assertStringNotContainsString('javascript:', $lower);

        $this->assertSame($body, Post::findOrFail(
            $response->json('data.id')
        )->body);
    }

    public function test_update_post_sanitizes_unsafe_html(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->administratorRole->id,
        ]);
        
        $this->actingAs($user, 'sanctum');

        $post = Post::create([
            'title' => 'Artikel uji',
            'slug' => 'artikel-uji',
            'body' => '<p>Konten awal</p>',
            'status' => 'draft',
        ]);

        $response = $this->putJson("/api/posts/{$post->id}", [
            'body' => <<<'HTML'
<p onmouseover="alert(1)">Konten baru</p>
<script>alert('xss')</script>
<a href="javascript:alert(1)">Klik</a>
HTML,
        ]);

        $response->assertOk();

        $body = $response->json('data.body');
        $lower = strtolower($body);

        $this->assertStringContainsString('Konten baru', $body);
        $this->assertStringNotContainsString('<script', $lower);
        $this->assertStringNotContainsString('onmouseover', $lower);
        $this->assertStringNotContainsString('javascript:', $lower);

        $this->assertSame($body, $post->fresh()->body);
    }
}
