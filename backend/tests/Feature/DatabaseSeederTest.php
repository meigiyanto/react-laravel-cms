<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_roles_and_configured_initial_administrator(): void
    {
        Config::set('cms.bootstrap_admin', [
            'name' => 'Initial Administrator',
            'email' => 'initial-admin@example.com',
            'password' => 'Secure-Initial-Password-123',
        ]);

        $this->seed();

        $administratorRole = Role::query()
            ->where('slug', 'administrator')
            ->firstOrFail();

        $administrator = User::query()
            ->where('email', 'initial-admin@example.com')
            ->firstOrFail();

        $this->assertSame($administratorRole->id, $administrator->role_id);
        $this->assertSame('Initial Administrator', $administrator->name);
        $this->assertTrue(Hash::check('Secure-Initial-Password-123', $administrator->password));
    }

    public function test_database_seeder_creates_roles_but_skips_admin_without_credentials(): void
    {
        Config::set('cms.bootstrap_admin', [
            'name' => null,
            'email' => null,
            'password' => null,
        ]);

        $this->seed();

        $this->assertDatabaseHas('roles', ['slug' => 'administrator']);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_bootstrap_seeder_does_not_promote_or_reset_an_existing_account(): void
    {
        $existingUser = User::factory()->create([
            'name' => 'Existing Account',
            'email' => 'existing@example.com',
            'password' => 'Existing-Password-123',
            'role_id' => null,
        ]);

        Config::set('cms.bootstrap_admin', [
            'name' => 'Bootstrap Administrator',
            'email' => 'existing@example.com',
            'password' => 'New-Password-For-Admin-123',
        ]);

        $this->seed();

        $existingUser->refresh();

        $this->assertNull($existingUser->role_id);
        $this->assertTrue(Hash::check('Existing-Password-123', $existingUser->password));
        $this->assertDatabaseCount('users', 1);
    }
}
