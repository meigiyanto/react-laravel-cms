<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentRevisionTest extends TestCase
{
    use RefreshDatabase;

    private User $administrator;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator-revisions',
            'permissions' => ['*'],
        ]);
        $this->administrator = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($this->administrator, 'sanctum');
    }

    public function test_post_versions_are_recorded_and_can_be_restored_without_losing_current_version(): void
    {
        $post = Post::create([
            'user_id' => $this->administrator->id,
            'title' => 'Versi pertama',
            'slug' => 'versi-pertama',
            'body' => '<p>Konten pertama</p>',
            'status' => 'draft',
        ]);
        $firstRevision = $post->revisions()->firstOrFail();

        $post->update([
            'title' => 'Versi kedua',
            'body' => '<p>Konten kedua</p>',
        ]);

        $this->getJson("/api/posts/{$post->id}/revisions")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.snapshot.title', 'Versi pertama');

        $this->postJson("/api/posts/{$post->id}/revisions/{$firstRevision->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.title', 'Versi pertama')
            ->assertJsonPath('data.body', '<p>Konten pertama</p>');

        $this->assertSame(3, $post->revisions()->count());
        $this->assertDatabaseHas('content_revisions', [
            'revisionable_type' => Post::class,
            'revisionable_id' => $post->id,
            'revision_number' => 3,
        ]);
    }

    public function test_page_versions_are_recorded_and_can_be_restored(): void
    {
        $page = Page::create([
            'user_id' => $this->administrator->id,
            'title' => 'Halaman awal',
            'slug' => 'halaman-awal',
            'body' => '<p>Isi awal</p>',
            'status' => 'draft',
        ]);
        $revision = $page->revisions()->firstOrFail();
        $page->update(['body' => '<p>Isi baru</p>']);

        $this->getJson("/api/pages/{$page->id}/revisions")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->postJson("/api/pages/{$page->id}/revisions/{$revision->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.body', '<p>Isi awal</p>');

        $this->assertSame(3, $page->revisions()->count());
    }

    public function test_revision_cannot_be_restored_to_another_content_item(): void
    {
        $first = Post::create(['title' => 'Satu', 'slug' => 'satu', 'body' => 'Satu', 'status' => 'draft']);
        $second = Post::create(['title' => 'Dua', 'slug' => 'dua', 'body' => 'Dua', 'status' => 'draft']);
        $revision = $first->revisions()->firstOrFail();

        $this->postJson("/api/posts/{$second->id}/revisions/{$revision->id}/restore")
            ->assertNotFound();
    }

    public function test_revision_history_requires_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        $post = Post::create(['title' => 'Privat', 'slug' => 'privat', 'body' => 'Isi', 'status' => 'draft']);

        $this->getJson("/api/posts/{$post->id}/revisions")->assertUnauthorized();
    }
}
