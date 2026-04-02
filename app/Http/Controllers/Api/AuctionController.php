<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Models\AdminNotification;
use App\Models\AdminSetting;
use App\Models\Auction;
use App\Models\Bid;
use App\Models\BidWinner;
use App\Models\SellerRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class AuctionController extends Controller
{
    private function resolveWinningBid(Auction $auction): ?Bid
    {
        if ($auction->getComputedStatus() !== 'closed') {
            return null;
        }

        return $auction->bids()
            ->where('amount', $auction->current_price)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
    }

    private function syncBidWinnerRecord(Auction $auction): ?BidWinner
    {
        $winningBid = $this->resolveWinningBid($auction);

        if (! $winningBid) {
            return null;
        }

        return BidWinner::query()->updateOrCreate(
            ['auction_id' => $auction->id],
            [
                'bid_id' => $winningBid->id,
                'winner_user_id' => $winningBid->user_id,
                'seller_user_id' => $auction->user_id,
                'winning_amount' => $winningBid->amount,
                'won_at' => $winningBid->created_at,
            ]
        );
    }

    private function ensureSellerCanManageAuctions(Request $request): ?JsonResponse
    {
        $registration = SellerRegistration::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $registration) {
            return response()->json([
                'message' => 'You must complete seller registration before managing listings.',
                'account_status' => 'seller_not_registered',
            ], 403);
        }

        if ($registration->status === 'revoked') {
            $message = $registration->revoked_reason
                ? 'Seller privileges are revoked. Reason: ' . $registration->revoked_reason
                : 'Seller privileges are revoked by admin.';

            return response()->json([
                'message' => $message,
                'account_status' => 'seller_revoked',
                'reason' => $registration->revoked_reason,
            ], 403);
        }

        if ((string) $registration->status === 'submitted') {
            return response()->json([
                'message' => 'Your seller registration is under admin review. You can publish products once approved.',
                'account_status' => 'seller_pending_approval',
            ], 403);
        }

        if ((string) $registration->status !== 'approved') {
            return response()->json([
                'message' => 'Your seller profile is not active yet.',
                'account_status' => 'seller_pending',
            ], 403);
        }

        return null;
    }

    private function transformAuction(Auction $auction): array
    {
        $payload = $auction->toArray();
        $payload['starts_at'] = optional($auction->starts_at)?->toISOString();
        $payload['ends_at'] = optional($auction->ends_at)?->toISOString();
        $payload['created_at'] = optional($auction->created_at)?->toISOString();
        $payload['updated_at'] = optional($auction->updated_at)?->toISOString();
        $payload['status'] = $auction->getComputedStatus();

        if ($auction->relationLoaded('bidWinner') && $auction->bidWinner) {
            $payload['bid_winner'] = [
                'id' => $auction->bidWinner->id,
                'auction_id' => $auction->bidWinner->auction_id,
                'bid_id' => $auction->bidWinner->bid_id,
                'winner_user_id' => $auction->bidWinner->winner_user_id,
                'seller_user_id' => $auction->bidWinner->seller_user_id,
                'winning_amount' => $auction->bidWinner->winning_amount,
                'won_at' => optional($auction->bidWinner->won_at)?->toISOString(),
            ];
        }

        return $payload;
    }

    private function syncAuctionStatuses(): void
    {
        // Keep status time-derived at read time; avoid persisting accidental closures.
    }

    public function index(Request $request)
    {
        $this->syncAuctionStatuses();

        $query = Auction::query()
            ->with(['media', 'user.sellerRegistration', 'bidWinner'])
            ->withCount('bids')
            ->latest();

        if (! $request->boolean('include_closed')) {
            $query->where('ends_at', '>=', now()->subMinutes(30));
        }

        if ($request->filled('seller_id')) {
            $query->where('user_id', (int) $request->query('seller_id'));
        }

        $auctions = $query->get();

        return response()->json(
            $auctions
                ->map(fn (Auction $auction) => $this->transformAuction($auction))
                ->values()
        );
    }

    public function show(Auction $auction)
    {
        $this->syncAuctionStatuses();
        $this->syncBidWinnerRecord($auction);
        $auction->increment('page_views');
        $auction->refresh();
        $auction->load([
            'bids.user',
            'media',
            'user.sellerRegistration',
            'messages.user.sellerRegistration',
            'bidWinner',
        ]);

        return response()->json($this->transformAuction($auction));
    }

    public function mine(Request $request)
    {
        $blocked = $this->ensureSellerCanManageAuctions($request);
        if ($blocked) {
            return $blocked;
        }

        $this->syncAuctionStatuses();

        $auctions = Auction::query()
            ->with(['media', 'bidWinner'])
            ->withCount([
                'bids',
                'messages',
                'bids as unique_bidders_count' => function ($query) {
                    $query->select(DB::raw('COUNT(DISTINCT user_id)'));
                },
            ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        $auctions->each(function (Auction $auction): void {
            $this->syncBidWinnerRecord($auction);
            $auction->load('bidWinner');
        });

        return response()->json(
            $auctions
                ->map(fn (Auction $auction) => $this->transformAuction($auction))
                ->values()
        );
    }

    public function won(Request $request)
    {
        $this->syncAuctionStatuses();

        $userId = (int) $request->user()->id;

        $items = Auction::query()
            ->with(['media', 'user.sellerRegistration', 'bids.user', 'bidWinner'])
            ->where('ends_at', '<=', now())
            ->whereHas('bids', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->latest('ends_at')
            ->get()
            ->map(function (Auction $auction) {
                $winnerRecord = $this->syncBidWinnerRecord($auction);
                $winningBid = $winnerRecord
                    ? $auction->bids->firstWhere('id', $winnerRecord->bid_id)
                    : null;

                return [
                    'auction' => $auction,
                    'winning_bid' => $winningBid,
                    'winner_record' => $winnerRecord,
                ];
            })
            ->filter(function (array $item) use ($userId) {
                $winnerRecord = $item['winner_record'];

                return $winnerRecord
                    && (int) $winnerRecord->winner_user_id === $userId;
            })
            ->values()
            ->map(function (array $item) {
                /** @var Auction $auction */
                $auction = $item['auction'];
                $winningBid = $item['winning_bid'];
                /** @var BidWinner $winnerRecord */
                $winnerRecord = $item['winner_record'];

                return [
                    'id' => $auction->id,
                    'user_id' => $auction->user_id,
                    'title' => $auction->title,
                    'category' => $auction->category,
                    'subcategory' => $auction->subcategory,
                    'description' => $auction->description,
                    'starting_price' => $auction->starting_price,
                    'max_increment' => $auction->max_increment,
                    'current_price' => $auction->current_price,
                    'starts_at' => optional($auction->starts_at)?->toISOString(),
                    'ends_at' => optional($auction->ends_at)?->toISOString(),
                    'status' => $auction->getComputedStatus(),
                    'media' => $auction->media,
                    'created_at' => optional($auction->created_at)?->toISOString(),
                    'updated_at' => optional($auction->updated_at)?->toISOString(),
                    'user' => $auction->user,
                    'winning_bid_amount' => $winnerRecord->winning_amount,
                    'winning_bid_at' => optional($winnerRecord->won_at)?->toISOString(),
                    'bid_winner' => [
                        'id' => $winnerRecord->id,
                        'auction_id' => $winnerRecord->auction_id,
                        'bid_id' => $winnerRecord->bid_id,
                        'winner_user_id' => $winnerRecord->winner_user_id,
                        'seller_user_id' => $winnerRecord->seller_user_id,
                        'winning_amount' => $winnerRecord->winning_amount,
                        'won_at' => optional($winnerRecord->won_at)?->toISOString(),
                    ],
                ];
            });

        return response()->json([
            'items' => $items,
        ]);
    }

    public function media(string $path)
    {
        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        $absolutePath = Storage::disk('public')->path($path);

        return response()->file($absolutePath);
    }

    public function store(StoreAuctionRequest $request)
    {
        $blocked = $this->ensureSellerCanManageAuctions($request);
        if ($blocked) {
            return $blocked;
        }

        $this->syncAuctionStatuses();

        $validated = $request->validated();

        $startMode = $validated['start_mode'] ?? 'now';
        $endTimeMode = $validated['end_time_mode'] ?? 'days';
        $endTimeValue = max(1, (int) ($validated['end_time_value'] ?? 7));

        $startsAt = ($startMode === 'scheduled' && ! empty($validated['starts_at']))
            ? Carbon::parse($validated['starts_at'])->utc()
            : Carbon::now('UTC');

        $endsAt = $startsAt->copy();
        if ($endTimeMode === 'hours') {
            $endsAt->addHours($endTimeValue);
        } elseif ($endTimeMode === 'minutes') {
            $endsAt->addMinutes($endTimeValue);
        } else {
            $endsAt->addDays($endTimeValue);
        }

        $persisted = Arr::except($validated, [
            'start_mode',
            'end_time_mode',
            'end_time_value',
            'starts_at',
            'ends_at',
        ]);

        $auction = Auction::create([
            ...$persisted,
            'user_id' => $request->user()->id,
            'current_price' => $validated['starting_price'],
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);

        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                $mimeType = $file->getMimeType() ?: '';
                $auction->media()->create([
                    'file_path' => $file->store('auction-media', 'public'),
                    'media_type' => str_starts_with($mimeType, 'video/') ? 'video' : 'image',
                ]);
            }
        }

        $auction->load('media');

        AdminNotification::notify(
            'seller',
            'New seller listing created',
            "{$request->user()->name} listed \"{$auction->title}\".",
            [
                'auction_id' => $auction->id,
                'seller_user_id' => $request->user()->id,
                'category' => $auction->category,
                'starting_price' => (float) $auction->starting_price,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json($this->transformAuction($auction), 201);
    }

    public function update(StoreAuctionRequest $request, Auction $auction)
    {
        $blocked = $this->ensureSellerCanManageAuctions($request);
        if ($blocked) {
            return $blocked;
        }

        $this->syncAuctionStatuses();

        if ((int) $auction->getAttribute('user_id') !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'You are not allowed to update this auction.',
            ], 403);
        }

        $validated = $request->validated();

        if (! array_key_exists('starts_at', $validated) && empty($auction->getAttribute('starts_at'))) {
            $validated['starts_at'] = now();
        }

        $removedMediaIds = collect($validated['removed_media_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->values();

        $auction->update(Arr::except($validated, ['removed_media_ids', 'media']));

        if ($removedMediaIds->isNotEmpty()) {
            $mediaToRemove = $auction->media()
                ->whereIn('id', $removedMediaIds)
                ->get();

            foreach ($mediaToRemove as $media) {
                if (! empty($media->file_path)) {
                    Storage::disk('public')->delete($media->file_path);
                }
                $media->delete();
            }
        }

        if ($request->hasFile('media')) {
            $newFiles = $request->file('media');
            $existingMediaCount = $auction->media()->count();
            $maxMediaFiles = max(1, (int) AdminSetting::getValue('max_listing_media_files', 10));

            if ($existingMediaCount + count($newFiles) > $maxMediaFiles) {
                return response()->json([
                    'message' => "You can upload a maximum of {$maxMediaFiles} media files per product.",
                ], 422);
            }

            foreach ($newFiles as $file) {
                $mimeType = $file->getMimeType() ?: '';
                $auction->media()->create([
                    'file_path' => $file->store('auction-media', 'public'),
                    'media_type' => str_starts_with($mimeType, 'video/') ? 'video' : 'image',
                ]);
            }
        }

        $auction->load('media');

        AdminNotification::notify(
            'seller',
            'Seller listing updated',
            "{$request->user()->name} updated listing \"{$auction->title}\".",
            [
                'auction_id' => $auction->id,
                'seller_user_id' => $request->user()->id,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json($this->transformAuction($auction));
    }

    public function destroy(Request $request, Auction $auction)
    {
        $blocked = $this->ensureSellerCanManageAuctions($request);
        if ($blocked) {
            return $blocked;
        }

        if ((int) $auction->getAttribute('user_id') !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'You are not allowed to delete this auction.',
            ], 403);
        }

        $auction->delete();

        AdminNotification::notify(
            'seller',
            'Seller listing removed',
            "{$request->user()->name} removed listing \"{$auction->title}\".",
            [
                'auction_id' => $auction->id,
                'seller_user_id' => $request->user()->id,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'Auction deleted.',
        ]);
    }
}
