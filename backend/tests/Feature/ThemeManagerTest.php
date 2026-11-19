<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Theme;
use App\Models\User;
use App\Support\ThemeDefaults;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemeManagerTest extends TestCase
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

    private function signInAsAdministrator(): User
    {
        $user = User::factory()->create(['role_id' => $this->administratorRole->id]);
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    private function createTheme(string $name, string $slug): Theme
    {
        $theme = Theme::create([
            'name' => $name,
            'slug' => $slug,
            'status' => 'draft',
        ]);
        $theme->settings()->create([
            'schema_version' => 1,
            'settings' => ThemeDefaults::settings(),
        ]);
        app(\\App\\Services\\ThemeManagerService::class)->recordRevision($theme);

        return $theme;
    }

    public function test_administrator_can_create_theme_with_default_settings_and_initial_revision(): void
    {
        $this->signInAsAdministrator();

        $this->postJson('/api/admin/themes', [
            'name' => 'Editorial',
            'slug' => 'editorial',
            'description' => 'Tema editorial.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Editorial')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.settings.settings.colors.primary', '#3458db');

        $theme = Theme::where('slug', 'editorial')->firstOrFail();
        $this->assertDatabaseHas('theme_revisions', [
            'theme_id' => $theme->id,
            'revision_number' => 1,
        ]);
    }

    public function test_theme_settings_reject_unsafe_values_and_unknown_keys(): void
    {
        $this->signInAsAdministrator();
        $settings = ThemeDefaults::settings();
        $settings['colors']['primary'] = 'url(javascript:alert(1))';

        $this->postJson('/api/admin/themes', [
            'name' => 'Unsafe',
            'slug' => 'unsafe',
            'settings' => $settings,
        ])->assertUnprocessable();

        $settings = ThemeDefaults::settings();
        $settings['customCss'] = 'body { display: none; }';

        $this->postJson('/api/admin/themes', [
            'name' => 'Custom CSS',
            'slug' => 'custom-css',
            'settings' => $settings,
        ])->assertUnprocessable();
    }

    public function test_updating_theme_settings_creates_a_new_revision(): void
    {
        $this->signInAsAdministrator();
        $theme = $this->createTheme('Editorial', 'editorial');
        $settings = ThemeDefaults::settings();
        $settings['colors']['primary'] = '#123456';

        $this->putJson("/api/admin/themes/{$theme->id}", [
            'settings' => $settings,
        ])
            ->assertOk()
            ->assertJsonPath('data.settings.settings.colors.primary', '#123456');

        $this->assertDatabaseHas('theme_revisions', [
            'theme_id' => $theme->id,
            'revision_number' => 1,
        ]);
        $this->assertDatabaseHas('theme_revisions', [
            'theme_id' => $theme->id,
            'revision_number' => 2,
        ]);
    }

    public function test_only_one_theme_can_be_active_and_public_endpoint_returns_current_theme(): void
    {
        $this->signInAsAdministrator();
        $first = $this->createTheme('Editorial', 'editorial');
        $second = $this->createTheme('Minimal', 'minimal');

        $this->postJson("/api/admin/themes/{$first->id}/activate")->assertOk();
        $this->postJson("/api/admin/themes/{$second->id}/activate")->assertOk();

        $this->assertDatabaseCount('theme_activations', 1);
        $this->assertDatabaseHas('theme_activations', [
            'id' => 1,
            'theme_id' => $second->id,
        ]);

        $this->getJson('/api/public/theme')
            ->assertOk()
            ->assertJsonPath('data.theme.id', $second->id)
            ->assertJsonPath('data.settings.colors.primary', '#3458db');
    }

    public function test_public_theme_endpoint_does_not_require_authentication(): void
    {
        $this->getJson('/api/public/theme')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_non_administrator_cannot_manage_themes(): void
    {
        $role = Role::create([
            'name' => 'Author',
            'slug' => 'author',
            'permissions' => ['posts.view.own'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/admin/themes')->assertForbidden();
        $this->postJson('/api/admin/themes', [
            'name' => 'Unauthorized',
            'slug' => 'unauthorized',
        ])->assertForbidden();
    }

    public function test_theme_management_requires_authentication(): void
    {
        $this->getJson('/api/admin/themes')->assertUnauthorized();
        $this->postJson('/api/admin/themes', [
            'name' => 'Guest',
            'slug' => 'guest',
        ])->assertUnauthorized();
    }

    public function test_activation_rejects_theme_without_settings(): void
    {
        $this->signInAsAdministrator();
        $theme = Theme::create([
            'name' => 'Incomplete',
            'slug' => 'incomplete',
            'status' => 'draft',
        ]);

        $this->postJson("/api/admin/themes/{$theme->id}/activate")->assertUnprocessable();
        $this->assertDatabaseCount('theme_activations', 0);
    }
}
