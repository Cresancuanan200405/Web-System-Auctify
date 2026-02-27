<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Models\Auction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Arr;

class AuctionController extends Controller
{
    private function syncAuctionStatuses(): void
    {
        Auction::query()
            ->where('status', 'open')
            ->where('ends_at', '<=', now())
            ->update(['status' => 'closed']);
    }

    public function index()
    {
        $this->syncAuctionStatuses();

        $auctions = Auction::query()
            ->with('media')
            ->withCount('bids')
            ->latest()
            ->get();

        return response()->json($auctions);
    }

    public function show(Auction $auction)
    {
        $this->syncAuctionStatuses();
        $auction->refresh();
        $auction->load(['bids.user', 'media', 'user']);

        return response()->json($auction);
    }

    public function mine(Request $request)
    {
        $this->syncAuctionStatuses();

        $auctions = Auction::query()
            ->with('media')
            ->withCount('bids')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($auctions);
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

        $auction = Auction::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'current_price' => $validated['starting_price'],
            'starts_at' => $validated['starts_at'] ?? now(),
            'ends_at' => $validated['ends_at'] ?? now()->addDays(7),
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

        return response()->json($auction->load('media'), 201);
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

        return response()->json($auction->load('media'));
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
