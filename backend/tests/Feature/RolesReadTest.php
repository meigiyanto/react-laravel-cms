<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RolesReadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    
        Role::create([
            'name' => 'Administrator',
            'slug' => 'administrator',
            'permissions' => ['*'],
        ]);
    
        Role::create([
            'name' => 'Editor',
            'slug' => 'editor',
            'permissions' => ['posts.view'],
        ]);
    }

    public function test_roles_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/admin/roles')
            ->assertUnauthorized();
    }

    public function test_non_administrator_cannot_read_roles(): void
    {
        $role = Role::where('slug', 'editor')->firstOrFail();

        $user = User::factory()->create([
            'role_id' => $role->id,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/roles')
            ->assertForbidden();
    }

    public function test_administrator_can_read_roles_without_permissions_data(): void
    {
        $role = Role::where('slug', 'administrator')->firstOrFail();

        $user = User::factory()->create([
            'role_id' => $role->id,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'name', 'slug'],
                ],
            ]);

        $roles = $response->json('data');
        $names = array_column($roles, 'name');
        $sortedNames = $names;
        sort($sortedNames, SORT_NATURAL | SORT_FLAG_CASE);

        $this->assertSame($sortedNames, $names);

        foreach ($roles as $item) {
            $this->assertArrayNotHasKey('permissions', $item);
        }
    }
}
