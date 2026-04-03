<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Auction;
use App\Models\Bid;
use App\Models\BidWinner;
use App\Models\Order;
use App\Models\SellerRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function makeApprovedSeller(): User
    {
        $seller = User::factory()->create();

        SellerRegistration::query()->create([
            'user_id' => $seller->id,
            'shop_name' => 'Approved Seller Shop',
            'contact_email' => $seller->email,
            'contact_phone' => '09170000000',
            'pickup_address_summary' => 'Main pickup point',
            'submit_business_mode' => 'now',
            'seller_type' => 'sole',
            'general_location' => 'Cebu City',
            'registered_address' => 'Cebu City',
            'zip_code' => '6000',
            'primary_document_type' => 'DTI Certificate',
            'primary_document_name' => 'dti-cert.jpg',
            'government_id_type' => 'Passport',
            'government_id_front_name' => 'passport.jpg',
            'business_email' => $seller->email,
            'business_phone_number' => '09170000000',
            'tax_tin' => 'TIN-123',
            'vat_status' => 'non-vat',
            'bir_certificate_name' => 'bir.jpg',
            'submit_sworn_declaration' => 'yes',
            'agree_business_terms' => true,
            'status' => 'approved',
            'submitted_at' => now(),
        ]);

        return $seller;
    }

    private function createWonAuction(User $buyer, User $seller): array
    {
        $auction = Auction::query()->create([
            'user_id' => $seller->id,
            'title' => 'Vintage Watch',
            'category' => 'collectibles',
            'description' => 'Rare item',
            'starting_price' => 1000,
            'max_increment' => 50,
            'current_price' => 1500,
            'starts_at' => now()->subDays(3),
            'ends_at' => now()->subHour(),
            'status' => 'closed',
        ]);

        $bid = Bid::query()->create([
            'auction_id' => $auction->id,
            'user_id' => $buyer->id,
            'amount' => 1500,
        ]);

        $winner = BidWinner::query()->create([
            'auction_id' => $auction->id,
            'bid_id' => $bid->id,
            'winner_user_id' => $buyer->id,
            'seller_user_id' => $seller->id,
            'winning_amount' => 1500,
            'won_at' => now()->subHour(),
        ]);

        $address = Address::query()->create([
            'user_id' => $buyer->id,
            'first_name' => 'Buyer',
            'last_name' => 'One',
            'phone' => '09181111111',
            'region' => 'Region VII',
            'province' => 'Cebu',
            'city' => 'Cebu City',
            'barangay' => 'Lahug',
            'street' => 'Main Street',
            'house_no' => '123',
            'building_name' => null,
            'unit_floor' => null,
            'postal_code' => '6000',
            'notes' => null,
        ]);

        return [$auction, $winner, $address];
    }

    public function test_buyer_can_create_order_from_bid_winner_and_capture_payment(): void
    {
        [$auction, $winner, $address] = $this->createWonAuction(
            User::factory()->create(['wallet_balance' => 5000]),
            $this->makeApprovedSeller(),
        );
        $buyer = User::query()->findOrFail($winner->winner_user_id);

        $response = $this->actingAs($buyer)
            ->postJson('/api/orders/from-bid-winner', [
                'bid_winner_id' => $winner->id,
                'shipping_address_id' => $address->id,
                'total_amount' => 1500,
                'capture_payment' => true,
                'payment' => [
                    'method' => 'wallet',
                    'provider' => 'Auctify Wallet',
                    'provider_reference' => 'TEST-ORDER-001',
                    'status' => 'paid',
                    'amount' => 1500,
                    'currency' => 'PHP',
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('orders', [
            'bid_winner_id' => $winner->id,
            'auction_id' => $auction->id,
            'buyer_user_id' => $buyer->id,
            'seller_user_id' => $auction->user_id,
            'shipping_address_id' => $address->id,
            'payment_status' => 'paid',
            'status' => 'processing',
        ]);

        $this->assertDatabaseHas('order_payments', [
            'provider_reference' => 'TEST-ORDER-001',
            'status' => 'paid',
            'amount' => 1500,
        ]);

        $response->assertJsonPath('order.bid_winner_id', $winner->id);
        $response->assertJsonPath('order.payment_status', 'paid');
    }

    public function test_order_creation_is_restricted_to_winning_buyer(): void
    {
        [$auction, $winner, $address] = $this->createWonAuction(
            User::factory()->create(),
            $this->makeApprovedSeller(),
        );
        $intruder = User::factory()->create();

        $this->actingAs($intruder)
            ->postJson('/api/orders/from-bid-winner', [
                'bid_winner_id' => $winner->id,
                'shipping_address_id' => $address->id,
                'total_amount' => 1500,
            ])
            ->assertStatus(403);

        $this->assertDatabaseMissing('orders', [
            'bid_winner_id' => $winner->id,
            'auction_id' => $auction->id,
        ]);
    }

    public function test_seller_can_update_shipping_and_capture_payment(): void
    {
        $seller = $this->makeApprovedSeller();
        $buyer = User::factory()->create(['wallet_balance' => 5000]);
        [, $winner, $address] = $this->createWonAuction($buyer, $seller);

        $orderResponse = $this->actingAs($buyer)
            ->postJson('/api/orders/from-bid-winner', [
                'bid_winner_id' => $winner->id,
                'shipping_address_id' => $address->id,
                'total_amount' => 1500,
            ])
            ->assertOk();

        $orderId = $orderResponse->json('order.id');

        $this->actingAs($seller)
            ->patchJson("/api/seller/orders/{$orderId}/shipping-status", [
                'status' => 'shipped',
                'shipping_method' => 'standard',
                'carrier' => 'FastShip',
                'tracking_number' => 'TRACK-123',
            ])
            ->assertOk()
            ->assertJsonPath('order.shipping_status', 'shipped');

        $this->actingAs($seller)
            ->postJson("/api/seller/orders/{$orderId}/payments", [
                'method' => 'manual',
                'provider_reference' => 'PAY-123',
                'status' => 'paid',
                'amount' => 1500,
                'currency' => 'PHP',
            ])
            ->assertOk()
            ->assertJsonPath('payment.provider_reference', 'PAY-123');

        $this->assertDatabaseHas('order_shipments', [
            'order_id' => $orderId,
            'tracking_number' => 'TRACK-123',
            'status' => 'shipped',
        ]);

        $this->assertDatabaseHas('order_payments', [
            'order_id' => $orderId,
            'provider_reference' => 'PAY-123',
            'status' => 'paid',
        ]);
    }

    public function test_admin_can_list_shipments_and_payments(): void
    {
        $seller = $this->makeApprovedSeller();
        $buyer = User::factory()->create(['wallet_balance' => 5000]);
        [, $winner, $address] = $this->createWonAuction($buyer, $seller);

        $orderResponse = $this->actingAs($buyer)
            ->postJson('/api/orders/from-bid-winner', [
                'bid_winner_id' => $winner->id,
                'shipping_address_id' => $address->id,
                'total_amount' => 1500,
                'capture_payment' => true,
                'payment' => [
                    'method' => 'wallet',
                    'provider' => 'Auctify Wallet',
                    'provider_reference' => 'ADMIN-LIST-001',
                    'status' => 'paid',
                    'amount' => 1500,
                    'currency' => 'PHP',
                ],
            ])
            ->assertOk();

        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders/shipments')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $orderResponse->json('order.id'),
            ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders/payments')
            ->assertOk()
            ->assertJsonFragment([
                'provider_reference' => 'ADMIN-LIST-001',
            ]);
    }
}
