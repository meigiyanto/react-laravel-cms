<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaPermissionTest extends TestCase
{
    use RefreshDatabase;

    private Role $adminRole;
    private Role $authorRole;
    private Role $viewerRole;
    private Role $updaterRole;
    private Role $deleterRole;

    private User $admin;
    private User $author;
    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->adminRole = Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator',
            'permissions' => ['*'],
        ]);

        $this->authorRole = Role::create([
            'name' => 'Media Author',
            'slug' => 'media-author',
            'permissions' => [
                'media.view.own',
                'media.create',
                'media.update.own',
                'media.delete.own',
            ],
        ]);

        $this->viewerRole = Role::create([
            'name' => 'Media Viewer',
            'slug' => 'media-viewer',
            'permissions' => ['media.view.own'],
        ]);

        $this->updaterRole = Role::create([
            'name' => 'Media Updater',
            'slug' => 'media-updater',
            'permissions' => ['media.update.own'],
        ]);

        $this->deleterRole = Role::create([
            'name' => 'Media Deleter',
            'slug' => 'media-deleter',
            'permissions' => ['media.delete.own'],
        ]);

        $this->admin = User::factory()->create([
            'role_id' => $this->adminRole->id,
        ]);

        $this->author = User::factory()->create([
            'role_id' => $this->authorRole->id,
        ]);

        $this->otherUser = User::factory()->create([
            'role_id' => $this->authorRole->id,
        ]);
    }

    private function createMedia(
        User $user,
        string $filename = 'gambar.jpg',
        ?string $altText = null
    ): Media {
        return Media::create([
            'user_id' => $user->id,
            'disk' => 'public',
            'path' => 'cms-media/' . $filename,
            'original_name' => $filename,
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'alt_text' => $altText,
        ]);
    }

    public function test_guest_cannot_access_media_endpoints(): void
    {
        $media = $this->createMedia($this->author);

        $this->getJson('/api/media')->assertUnauthorized();

        $this->getJson("/api/media/{$media->id}")
            ->assertUnauthorized();

        $this->postJson('/api/media', [])
            ->assertUnauthorized();

        $this->putJson("/api/media/{$media->id}", [
            'alt_text' => 'Perubahan',
        ])->assertUnauthorized();

        $this->deleteJson("/api/media/{$media->id}")
            ->assertUnauthorized();
    }

    public function test_user_with_view_own_permission_sees_only_own_media(): void
    {
        $ownMedia = $this->createMedia(
            $this->author,
            'media-sendiri.jpg'
        );

        $this->createMedia(
            $this->otherUser,
            'media-pengguna-lain.jpg'
        );

        $this->actingAs($this->author, 'sanctum')
            ->getJson('/api/media')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath(
                'data.data.0.id',
                $ownMedia->id
            );
    }

    public function test_user_with_view_own_permission_can_view_own_media(): void
    {
        $media = $this->createMedia($this->author);

        $this->actingAs($this->author, 'sanctum')
            ->getJson("/api/media/{$media->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $media->id);
    }

    public function test_user_with_view_own_permission_cannot_view_others_media(): void
    {
        $media = $this->createMedia($this->otherUser);

        $this->actingAs($this->author, 'sanctum')
            ->getJson("/api/media/{$media->id}")
            ->assertForbidden();
    }

    public function test_user_with_create_permission_can_upload_media(): void
    {
        $this->actingAs($this->author, 'sanctum')
            ->postJson('/api/media', [
                'file' => UploadedFile::fake()->image('produk.jpg'),
                'alt_text' => 'Foto produk',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath(
                'data.original_name',
                'produk.jpg'
            )
            ->assertJsonPath(
                'data.user_id',
                $this->author->id
            );

        $this->assertDatabaseHas('media', [
            'user_id' => $this->author->id,
            'original_name' => 'produk.jpg',
            'alt_text' => 'Foto produk',
        ]);

        $this->assertCount(
            1,
            Storage::disk('public')->allFiles('cms-media')
        );
    }

    public function test_user_with_update_own_permission_can_update_own_media(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->updaterRole->id,
        ]);

        $media = $this->createMedia($user);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/media/{$media->id}", [
                'alt_text' => 'Teks alternatif baru',
            ])
            ->assertOk();

        $this->assertDatabaseHas('media', [
            'id' => $media->id,
            'alt_text' => 'Teks alternatif baru',
        ]);
    }

    public function test_user_with_update_own_permission_cannot_update_others_media(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->updaterRole->id,
        ]);

        $media = $this->createMedia($this->otherUser);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/media/{$media->id}", [
                'alt_text' => 'Perubahan terlarang',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('media', [
            'id' => $media->id,
            'alt_text' => null,
        ]);
    }

    public function test_user_with_delete_own_permission_can_delete_own_media(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->deleterRole->id,
        ]);

        $media = $this->createMedia($user);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/media/{$media->id}")
            ->assertOk();

        $this->assertDatabaseMissing('media', [
            'id' => $media->id,
        ]);
    }

    public function test_user_with_delete_own_permission_cannot_delete_others_media(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->deleterRole->id,
        ]);

        $media = $this->createMedia($this->otherUser);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/media/{$media->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('media', [
            'id' => $media->id,
        ]);
    }

    public function test_administrator_can_view_media_owned_by_other_users(): void
    {
        $media = $this->createMedia($this->otherUser);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/media/{$media->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $media->id);
    }

    public function test_user_without_media_create_permission_cannot_upload(): void
    {
        $user = User::factory()->create([
            'role_id' => $this->viewerRole->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/media', [
                'file' => UploadedFile::fake()->image('gambar.jpg'),
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('media', [
            'user_id' => $user->id,
        ]);
    }
    
    public function test_user_with_create_own_permission_cannot_upload_media(): void
    {
        $role = Role::create([
            'name' => 'Media Create Own',
            'slug' => 'media-create-own',
            'permissions' => ['media.create.own'],
        ]);
    
        $user = User::factory()->create([
            'role_id' => $role->id,
        ]);
    
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/media', [
                'file' => UploadedFile::fake()->image('gambar.jpg'),
            ])
            ->assertForbidden();
    
        $this->assertDatabaseMissing('media', [
            'user_id' => $user->id,
        ]);
    }
}
