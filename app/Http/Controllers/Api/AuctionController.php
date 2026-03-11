<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Models\Auction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class AuctionController extends Controller
{
    private function transformAuction(Auction $auction): array
    {
        $payload = $auction->toArray();
        $payload['starts_at'] = optional($auction->starts_at)?->toISOString();
        $payload['ends_at'] = optional($auction->ends_at)?->toISOString();
        $payload['created_at'] = optional($auction->created_at)?->toISOString();
        $payload['updated_at'] = optional($auction->updated_at)?->toISOString();
        $payload['status'] = $auction->getComputedStatus();

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
            ->with(['media', 'user.sellerRegistration'])
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
        $auction->increment('page_views');
        $auction->refresh();
        $auction->load(['bids.user', 'media', 'user.sellerRegistration', 'messages.user.sellerRegistration']);

        return response()->json($this->transformAuction($auction));
    }

    public function mine(Request $request)
    {
        $this->syncAuctionStatuses();

        $auctions = Auction::query()
            ->with('media')
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
            ->with(['media', 'user.sellerRegistration', 'bids.user'])
            ->where('ends_at', '<=', now())
            ->whereHas('bids', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->latest('ends_at')
            ->get()
            ->map(function (Auction $auction) {
                $winningBid = $auction->bids->first(function ($bid) use ($auction) {
                    return (float) $bid->amount === (float) $auction->current_price;
                });

                return [
                    'auction' => $auction,
                    'winning_bid' => $winningBid,
                ];
            })
            ->filter(function (array $item) use ($userId) {
                $winningBid = $item['winning_bid'];

                return $winningBid && (int) $winningBid->user_id === $userId;
            })
            ->values()
            ->map(function (array $item) {
                /** @var Auction $auction */
                $auction = $item['auction'];
                $winningBid = $item['winning_bid'];

                return [
                    'id' => $auction->id,
                    'user_id' => $auction->user_id,
                    'title' => $auction->title,
                    'category' => $auction->category,
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
                    'winning_bid_amount' => $winningBid->amount,
                    'winning_bid_at' => optional($winningBid->created_at)?->toISOString(),
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

        return response()->json($this->transformAuction($auction), 201);
    }

    public function update(StoreAuctionRequest $request, Auction $auction)
    {
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

            if ($existingMediaCount + count($newFiles) > 10) {
                return response()->json([
                    'message' => 'You can upload a maximum of 10 media files per product.',
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

        return response()->json($this->transformAuction($auction));
    }

    public function destroy(Request $request, Auction $auction)
    {
        if ((int) $auction->getAttribute('user_id') !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'You are not allowed to delete this auction.',
            ], 403);
        }

        $auction->delete();

        return response()->json([
            'message' => 'Auction deleted.',
        ]);
    }
}
