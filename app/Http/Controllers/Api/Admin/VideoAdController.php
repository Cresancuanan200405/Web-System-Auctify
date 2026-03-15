<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\VideoAd;
use Illuminate\Http\Request;

class VideoAdController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => VideoAd::query()->orderBy('sort_order')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'video_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $videoAd = VideoAd::query()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'video_url' => $validated['video_url'] ?? null,
            'image_url' => $validated['image_url'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json(['data' => $videoAd], 201);
    }

    public function show(VideoAd $videoAd)
    {
        return response()->json(['data' => $videoAd]);
    }

    public function update(Request $request, VideoAd $videoAd)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'video_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $videoAd->fill($validated);
        $videoAd->save();

        return response()->json(['data' => $videoAd]);
    }

    public function destroy(VideoAd $videoAd)
    {
        $videoAd->delete();

        return response()->json(['message' => 'Video ad deleted.']);
    }
}
