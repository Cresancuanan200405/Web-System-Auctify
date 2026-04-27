<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CarouselSlide;
use Illuminate\Http\Request;

class CarouselSlideController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => CarouselSlide::query()->orderBy('sort_order')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'small_header_text' => ['required', 'string', 'max:160'],
            'main_title' => ['required', 'string', 'max:160'],
            'discount_text' => ['required', 'string', 'max:120'],
            'brand_tags' => ['nullable', 'array'],
            'brand_tags.*' => ['required', 'string', 'max:120'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'description_text' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $slide = CarouselSlide::query()->create([
            'small_header_text' => $validated['small_header_text'],
            'main_title' => $validated['main_title'],
            'discount_text' => $validated['discount_text'],
            'brand_tags' => $validated['brand_tags'] ?? [],
            'image_path' => $validated['image_path'] ?? null,
            'description_text' => $validated['description_text'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
            'updated_by_admin_user_id' => $request->user()?->id,
        ]);

        return response()->json(['data' => $slide], 201);
    }

    public function show(CarouselSlide $carouselSlide)
    {
        return response()->json(['data' => $carouselSlide]);
    }

    public function update(Request $request, CarouselSlide $carouselSlide)
    {
        $validated = $request->validate([
            'small_header_text' => ['sometimes', 'required', 'string', 'max:160'],
            'main_title' => ['sometimes', 'required', 'string', 'max:160'],
            'discount_text' => ['sometimes', 'required', 'string', 'max:120'],
            'brand_tags' => ['nullable', 'array'],
            'brand_tags.*' => ['required', 'string', 'max:120'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'description_text' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $carouselSlide->fill($validated);
        $carouselSlide->updated_by_admin_user_id = $request->user()?->id;
        $carouselSlide->save();

        return response()->json(['data' => $carouselSlide]);
    }

    public function destroy(CarouselSlide $carouselSlide)
    {
        $carouselSlide->delete();

        return response()->json(['message' => 'Carousel slide deleted.']);
    }
}
