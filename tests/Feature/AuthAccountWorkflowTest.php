<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAccountWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_completes_auth_flow_from_register_to_logout(): void
    {
        $registerResponse = $this->postJson('/api/auth/register', [
            'name' => 'Integration User',
            'email' => 'integration@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $registerResponse
            ->assertCreated()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'integration@example.com',
            'password' => 'password123',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ]);

        $token = $loginResponse->json('token');

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'integration@example.com');

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Signed out successfully.');

        $userId = $loginResponse->json('user.id');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $userId,
            'tokenable_type' => User::class,
        ]);
    }

    public function test_guards_account_navigation_endpoints_and_allows_authenticated_access(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->getJson('/api/addresses')->assertUnauthorized();

        $user = User::factory()->create();
        $token = $user->createToken('integration')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->withToken($token)
            ->getJson('/api/addresses')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_deletes_account_and_invalidates_session_workflow(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('password123'),
        ]);

        $token = $user->createToken('delete-workflow')->plainTextToken;

        $this->withToken($token)
            ->deleteJson('/api/auth/delete-account')
            ->assertOk()
            ->assertJsonPath('message', 'Account deleted successfully.');

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'tokenable_type' => User::class,
        ]);
    }
}
