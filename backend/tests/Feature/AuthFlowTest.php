<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_receive_a_token(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('Password123!'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'Password123!',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonPath('data.token_type', 'Bearer');

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'cms-admin',
        ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('Password123!'),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }

    public function test_dashboard_and_me_require_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();

        $this->getJson('/api/dashboard/stats')
            ->assertUnauthorized();
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->create();
    
        $token = $user->createToken('cms-admin')->plainTextToken;
        $storedToken = PersonalAccessToken::findToken($token);
    
        $this->assertNotNull($storedToken);
    
        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    
        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('success', true);
    
        // Pastikan token benar-benar dihapus dari database.
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $storedToken->id,
        ]);
        
        Auth::forgetGuards();
    
        // Token yang dicabut tidak boleh digunakan lagi.
        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

}
