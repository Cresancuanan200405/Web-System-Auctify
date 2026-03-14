<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomepageConfig;
use Illuminate\Http\Request;

class HomepageConfigController extends Controller
{
    public function show()
    {
        $config = HomepageConfig::query()->first();

        return response()->json([
            'config' => [
                'circles' => $config?->circles ?? [],
                'slides' => $config?->slides ?? [],
                'videoAds' => $config?->video_ads ?? [],
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'circles' => ['required', 'array', 'min:1'],
            'circles.*.id' => ['required', 'string', 'max:120'],
            'circles.*.label' => ['required', 'string', 'max:120'],
            'circles.*.discount' => ['required', 'string', 'max:120'],
            'circles.*.tone' => ['required', 'string', 'in:yellow,black'],
            'slides' => ['required', 'array', 'min:1'],
            'slides.*.id' => ['required', 'string', 'max:120'],
            'slides.*.subtitle' => ['required', 'string', 'max:160'],
            'slides.*.title' => ['required', 'string', 'max:160'],
            'slides.*.price' => ['required', 'string', 'max:120'],
            'slides.*.brands' => ['required', 'array'],
            'slides.*.brands.*' => ['required', 'string', 'max:120'],
            'slides.*.disclaimer' => ['required', 'string', 'max:500'],
            'slides.*.image' => ['nullable', 'string', 'max:500'],
            'videoAds' => ['required', 'array', 'min:1'],
            'videoAds.*.id' => ['required', 'string', 'max:120'],
            'videoAds.*.title' => ['required', 'string', 'max:160'],
            'videoAds.*.subtitle' => ['required', 'string', 'max:160'],
            'videoAds.*.image' => ['nullable', 'string', 'max:500'],
        ]);

        $config = HomepageConfig::query()->firstOrCreate([], [
            'circles' => [],
            'slides' => [],
            'video_ads' => [],
        ]);

        $config->fill([
            'circles' => $validated['circles'],
            'slides' => $validated['slides'],
            'video_ads' => $validated['videoAds'],
        ]);
        $config->save();

        return response()->json([
            'message' => 'Homepage config saved successfully.',
            'config' => [
                'circles' => $config->circles,
                'slides' => $config->slides,
                'videoAds' => $config->video_ads,
            ],
        ]);
    }
}
