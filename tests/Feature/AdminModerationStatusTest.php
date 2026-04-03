<?php

namespace Tests\Feature;

use App\Models\SellerRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminModerationStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_suspended_account_cannot_login_and_gets_status_payload(): void
    {
        $user = User::factory()->create([
            'email' => 'suspended@example.com',
            'password' => Hash::make('password123'),
            'is_suspended' => true,
            'suspended_reason' => 'Repeated policy violations',
            'suspended_at' => now(),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'suspended')
            ->assertJsonPath('reason', 'Repeated policy violations');
    }

    public function test_deleted_account_email_cannot_login_or_register_again(): void
    {
        DB::table('admin_user_actions')->insert([
            'admin_user_id' => null,
            'target_user_id' => null,
            'action' => 'delete-account',
            'reason' => 'Fraudulent behavior',
            'details' => json_encode([
                'email' => 'deleted@example.com',
                'name' => 'Deleted User',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'deleted@example.com',
            'password' => 'password123',
        ])
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'deleted')
            ->assertJsonPath('reason', 'Fraudulent behavior');

        $this->postJson('/api/auth/register', [
            'name' => 'Deleted User',
            'email' => 'deleted@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'deleted')
            ->assertJsonPath('reason', 'Fraudulent behavior');
    }

    public function test_revoked_seller_cannot_use_seller_endpoints(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('seller-revoked')->plainTextToken;

        SellerRegistration::query()->create([
            'user_id' => $user->id,
            'shop_name' => 'Revoked Shop',
            'agree_business_terms' => true,
            'status' => 'revoked',
            'revoked_reason' => 'Counterfeit items',
            'revoked_at' => now(),
            'submitted_at' => now(),
        ]);

        $this->withToken($token)
            ->getJson('/api/seller/products')
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'seller_revoked')
            ->assertJsonPath('reason', 'Counterfeit items');

        $this->withToken($token)
            ->postJson('/api/seller/registration', [
                'shop_name' => 'Attempted Return',
                'agree_business_terms' => true,
            ])
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'seller_revoked')
            ->assertJsonPath('reason', 'Counterfeit items');
    }

    public function test_admin_revoke_seller_also_removes_user_verification_status(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'admin_mfa_enabled' => true,
            'admin_mfa_secret' => encrypt('JBSWY3DPEHPK3PXP'),
        ]);
        $adminToken = $admin->createToken('admin-moderation')->plainTextToken;

        $user = User::factory()->create([
            'is_verified' => true,
            'verified_at' => now(),
            'verification_revoked_at' => null,
        ]);

        SellerRegistration::query()->create([
            'user_id' => $user->id,
            'shop_name' => 'Verified Seller Shop',
            'agree_business_terms' => true,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        Cache::put('admin-mfa-step-up:'.$admin->id, time(), now()->addMinutes(10));

        $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$user->id}/revoke-seller", [
                'reason' => 'Policy breach',
            ])
            ->assertOk();

        $user->refresh();

        $this->assertFalse((bool) $user->is_verified);
        $this->assertNull($user->verified_at);
        $this->assertNotNull($user->verification_revoked_at);

        $this->assertDatabaseHas('seller_registrations', [
            'user_id' => $user->id,
            'status' => 'revoked',
            'revoked_reason' => 'Policy breach',
        ]);
    }

    public function test_revoked_seller_cannot_start_account_verification_flow(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('verification-revoked')->plainTextToken;

        SellerRegistration::query()->create([
            'user_id' => $user->id,
            'shop_name' => 'Revoked Verification Shop',
            'agree_business_terms' => true,
            'status' => 'revoked',
            'revoked_reason' => 'Abuse of platform',
            'revoked_at' => now(),
            'submitted_at' => now(),
        ]);

        $this->withToken($token)
            ->postJson('/api/auth/verification/send-otp', [
                'full_name' => 'Revoked User',
                'date_of_birth' => '1999-01-01',
                'phone' => '09123456789',
                'address' => 'Sample street, Sample city',
                'privacy_accepted' => true,
            ])
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'seller_revoked')
            ->assertJsonPath('reason', 'Abuse of platform');
    }

    public function test_admin_can_unsuspend_account(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $adminToken = $admin->createToken('admin-unsuspend')->plainTextToken;

        $user = User::factory()->create([
            'is_suspended' => true,
            'suspended_reason' => 'Policy breach',
            'suspended_at' => now(),
            'suspended_until' => now()->addDays(2),
        ]);

        $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$user->id}/unsuspend", [
                'reason' => 'Appeal approved',
            ])
            ->assertOk();

        $user->refresh();
        $this->assertFalse((bool) $user->is_suspended);
        $this->assertNull($user->suspended_reason);
        $this->assertNull($user->suspended_at);
        $this->assertNull($user->suspended_until);
    }

    public function test_admin_can_unrevoke_seller_account(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $adminToken = $admin->createToken('admin-unrevoke')->plainTextToken;

        $user = User::factory()->create();
        SellerRegistration::query()->create([
            'user_id' => $user->id,
            'shop_name' => 'Revoked Shop',
            'agree_business_terms' => true,
            'status' => 'revoked',
            'revoked_reason' => 'Policy violation',
            'revoked_at' => now(),
            'submitted_at' => now(),
        ]);

        $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$user->id}/unrevoke-seller", [
                'reason' => 'Appeal approved',
            ])
            ->assertOk();

        $this->assertDatabaseHas('seller_registrations', [
            'user_id' => $user->id,
            'status' => 'submitted',
            'revoked_reason' => null,
            'revoked_at' => null,
        ]);
    }

    public function test_admin_user_listing_excludes_admin_accounts(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $adminToken = $admin->createToken('admin-users-list')->plainTextToken;

        $customer = User::factory()->create(['is_admin' => false]);

        $response = $this->withToken($adminToken)
            ->getJson('/api/admin/users')
            ->assertOk();

        $userIds = collect($response->json('users'))->pluck('id')->all();

        $this->assertContains($customer->id, $userIds);
        $this->assertNotContains($admin->id, $userIds);
    }

    public function test_admin_can_preview_seller_registration_media_when_file_exists(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $adminToken = $admin->createToken('admin-seller-media')->plainTextToken;

        $user = User::factory()->create(['is_admin' => false]);
        $storedPath = 'verification/user-'.$user->id.'/primary-doc.jpg';
        Storage::disk('local')->put($storedPath, 'fake-image-content');

        SellerRegistration::query()->create([
            'user_id' => $user->id,
            'shop_name' => 'Media Shop',
            'agree_business_terms' => true,
            'status' => 'submitted',
            'primary_document_type' => 'DTI Certificate',
            'primary_document_name' => 'primary-doc.jpg',
            'submitted_at' => now(),
        ]);

        $this->withToken($adminToken)
            ->get('/api/admin/users/'.$user->id.'/seller-registration-media/primary-document')
            ->assertOk();
    }

    public function test_admin_accounts_endpoint_returns_only_admin_identities(): void
    {
        $currentAdmin = User::factory()->create(['is_admin' => true]);
        $currentToken = $currentAdmin->createToken('admin-accounts')->plainTextToken;

        $otherAdmin = User::factory()->create(['is_admin' => true]);
        $customer = User::factory()->create(['is_admin' => false]);

        $response = $this->withToken($currentToken)
            ->getJson('/api/admin/accounts')
            ->assertOk();

        $accounts = collect($response->json('accounts'));
        $ids = $accounts->pluck('id')->all();

        $this->assertContains($currentAdmin->id, $ids);
        $this->assertContains($otherAdmin->id, $ids);
        $this->assertNotContains($customer->id, $ids);

        $currentEntry = $accounts->firstWhere('id', $currentAdmin->id);
        $this->assertTrue((bool) ($currentEntry['isCurrent'] ?? false));
    }

    public function test_suspension_with_duration_expires_and_allows_login(): void
    {
        $user = User::factory()->create([
            'email' => 'temporary-suspended@example.com',
            'password' => Hash::make('password123'),
            'is_suspended' => true,
            'suspended_reason' => 'Temporary suspension',
            'suspended_at' => now()->subDay(),
            'suspended_until' => now()->subMinute(),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ]);

        $user->refresh();
        $this->assertFalse((bool) $user->is_suspended);
        $this->assertNull($user->suspended_until);
    }

    public function test_suspended_account_cannot_open_direct_message_threads(): void
    {
        $user = User::factory()->create([
            'is_suspended' => true,
            'suspended_reason' => 'Spam messages',
            'suspended_at' => now(),
        ]);

        $token = $user->createToken('direct-message-suspended')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/direct-messages/threads')
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'suspended')
            ->assertJsonPath('reason', 'Spam messages');
    }

    public function test_cannot_open_direct_message_thread_with_deleted_contact(): void
    {
        $user = User::factory()->create();
        $contact = User::factory()->create([
            'email' => 'deleted-contact@example.com',
        ]);

        DB::table('admin_user_actions')->insert([
            'admin_user_id' => null,
            'target_user_id' => $contact->id,
            'action' => 'delete-account',
            'reason' => 'Fraudulent behavior',
            'details' => json_encode([
                'email' => $contact->email,
                'name' => $contact->name,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $user->createToken('direct-message-deleted-contact')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/direct-messages/threads/{$contact->id}")
            ->assertStatus(403)
            ->assertJsonPath('account_status', 'deleted')
            ->assertJsonPath('reason', 'Fraudulent behavior');
    }
}
