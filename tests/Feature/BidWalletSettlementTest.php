<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Auction;
use App\Models\Bid;
use App\Models\BidWinner;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BidWalletSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_time_bid_requires_acknowledgement(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create(['wallet_balance' => 5000]);

        $auction = Auction::query()->create([
            'user_id' => $seller->id,
            'title' => 'Console Bundle',
            'category' => 'electronics',
            'description' => 'Used console with accessories',
            'starting_price' => 100,
            'max_increment' => 10,
            'current_price' => 100,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
            'status' => 'open',
        ]);

        $this->actingAs($buyer)
            ->postJson("/api/auctions/{$auction->id}/bids", [
                'amount' => 120,
            ])
            ->assertStatus(409)
            ->assertJsonPath('code', 'FIRST_BID_ACK_REQUIRED');

        $this->actingAs($buyer)
            ->postJson("/api/auctions/{$auction->id}/bids", [
                'amount' => 120,
                'acknowledge_auto_deduct' => true,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('bids', [
            'auction_id' => $auction->id,
            'user_id' => $buyer->id,
            'amount' => 120,
        ]);
    }

    public function test_closed_auction_sync_creates_winner_and_deducts_wallet_once(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create(['wallet_balance' => 5000]);

        $auction = Auction::query()->create([
            'user_id' => $seller->id,
            'title' => 'Vintage Camera',
            'category' => 'collectibles',
            'description' => 'Classic camera unit',
            'starting_price' => 1000,
            'max_increment' => 50,
            'current_price' => 1500,
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subMinute(),
            'status' => 'closed',
        ]);

        Bid::query()->create([
            'auction_id' => $auction->id,
            'user_id' => $buyer->id,
            'amount' => 1500,
        ]);

        $this->getJson("/api/auctions/{$auction->id}")
            ->assertOk();

        $winner = BidWinner::query()
            ->where('auction_id', $auction->id)
            ->first();

        $this->assertNotNull($winner);
        $this->assertNotNull($winner?->wallet_deducted_at);

        $buyer->refresh();
        $this->assertSame('3500.00', number_format((float) $buyer->wallet_balance, 2, '.', ''));

        $reference = 'auction-win-' . $winner->id;

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $buyer->id,
            'type' => 'spend',
            'amount' => 1500,
            'reference' => $reference,
        ]);

        $this->getJson("/api/auctions/{$auction->id}")
            ->assertOk();

        $this->assertSame(
            1,
            WalletTransaction::query()
                ->where('reference', $reference)
                ->count(),
        );
    }

    public function test_order_creation_fails_when_wallet_deduction_is_unsettled(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create(['wallet_balance' => 500]);

        $auction = Auction::query()->create([
            'user_id' => $seller->id,
            'title' => 'Premium Figure',
            'category' => 'collectibles',
            'description' => 'Limited edition',
            'starting_price' => 1000,
            'max_increment' => 50,
            'current_price' => 1500,
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subMinute(),
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
            'won_at' => now()->subMinute(),
        ]);

        $address = Address::query()->create([
            'user_id' => $buyer->id,
            'first_name' => 'Buyer',
            'last_name' => 'User',
            'phone' => '09170000000',
            'region' => 'Region VII',
            'province' => 'Cebu',
            'city' => 'Cebu City',
            'barangay' => 'Lahug',
            'street' => 'Main',
            'house_no' => '123',
            'building_name' => null,
            'unit_floor' => null,
            'postal_code' => '6000',
            'notes' => null,
        ]);

        $this->actingAs($buyer)
            ->postJson('/api/orders/from-bid-winner', [
                'bid_winner_id' => $winner->id,
                'shipping_address_id' => $address->id,
                'total_amount' => 1500,
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Insufficient wallet balance at auction close.',
            ]);

        $winner->refresh();
        $this->assertNotNull($winner->wallet_deduction_failed_at);
        $this->assertSame(
            'Insufficient wallet balance at auction close.',
            $winner->wallet_deduction_failure_reason,
        );
    }

    public function test_active_reservations_prevent_bid_overcommit_and_release_after_outbid(): void
    {
        $sellerOne = User::factory()->create();
        $sellerTwo = User::factory()->create();
        $buyer = User::factory()->create(['wallet_balance' => 1000]);
        $competitor = User::factory()->create(['wallet_balance' => 2000]);

        $auctionOne = Auction::query()->create([
            'user_id' => $sellerOne->id,
            'title' => 'Auction One',
            'category' => 'collectibles',
            'description' => 'Lot 1',
            'starting_price' => 600,
            'max_increment' => 50,
            'current_price' => 600,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHours(3),
            'status' => 'open',
        ]);

        $auctionTwo = Auction::query()->create([
            'user_id' => $sellerTwo->id,
            'title' => 'Auction Two',
            'category' => 'collectibles',
            'description' => 'Lot 2',
            'starting_price' => 300,
            'max_increment' => 50,
            'current_price' => 300,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHours(3),
            'status' => 'open',
        ]);

        $this->actingAs($buyer)
            ->postJson("/api/auctions/{$auctionOne->id}/bids", [
                'amount' => 700,
                'acknowledge_auto_deduct' => true,
            ])
            ->assertStatus(201);

        $this->actingAs($buyer)
            ->postJson("/api/auctions/{$auctionTwo->id}/bids", [
                'amount' => 400,
                'acknowledge_auto_deduct' => true,
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Your available wallet balance is not enough for this bid once active reservations are considered.',
            ]);

        $this->actingAs($competitor)
            ->postJson("/api/auctions/{$auctionOne->id}/bids", [
                'amount' => 800,
                'acknowledge_auto_deduct' => true,
            ])
            ->assertStatus(201);

        $this->actingAs($buyer)
            ->postJson("/api/auctions/{$auctionTwo->id}/bids", [
                'amount' => 400,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('wallet_reservations', [
            'auction_id' => $auctionOne->id,
            'user_id' => $competitor->id,
            'status' => 'active',
            'amount' => 800,
        ]);

        $this->assertDatabaseHas('wallet_reservations', [
            'auction_id' => $auctionTwo->id,
            'user_id' => $buyer->id,
            'status' => 'active',
            'amount' => 400,
        ]);
    }

    public function test_settlement_command_processes_closed_auction_winners(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create(['wallet_balance' => 3000]);

        $auction = Auction::query()->create([
            'user_id' => $seller->id,
            'title' => 'Command Settlement Auction',
            'category' => 'collectibles',
            'description' => 'Settles via command',
            'starting_price' => 1000,
            'max_increment' => 50,
            'current_price' => 1200,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->subMinute(),
            'status' => 'closed',
        ]);

        Bid::query()->create([
            'auction_id' => $auction->id,
            'user_id' => $buyer->id,
            'amount' => 1200,
        ]);

        $this->artisan('auctions:settle-winners --limit=10')
            ->assertExitCode(0);

        $winner = BidWinner::query()->where('auction_id', $auction->id)->first();

        $this->assertNotNull($winner);
        $this->assertNotNull($winner?->wallet_deducted_at);
        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $buyer->id,
            'reference' => 'auction-win-' . $winner?->id,
            'amount' => 1200,
        ]);
    }
}
