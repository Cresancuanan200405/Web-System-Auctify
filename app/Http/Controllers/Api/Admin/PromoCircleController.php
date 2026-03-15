<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoCircle;
use Illuminate\Http\Request;

class PromoCircleController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => PromoCircle::query()->orderBy('sort_order')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'subtitle_text' => ['required', 'string', 'max:160'],
            'color' => ['required', 'string', 'max:32'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $circle = PromoCircle::query()->create([
            'title' => $validated['title'],
            'subtitle_text' => $validated['subtitle_text'],
            'color' => $validated['color'],
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json(['data' => $circle], 201);
    }

    public function show(PromoCircle $promoCircle)
    {
        return response()->json(['data' => $promoCircle]);
    }

    public function update(Request $request, PromoCircle $promoCircle)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:120'],
            'subtitle_text' => ['sometimes', 'required', 'string', 'max:160'],
            'color' => ['sometimes', 'required', 'string', 'max:32'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $promoCircle->fill($validated);
        $promoCircle->save();

        return response()->json(['data' => $promoCircle]);
    }

    public function destroy(PromoCircle $promoCircle)
    {
        $promoCircle->delete();

        return response()->json(['message' => 'Promo circle deleted.']);
    }
}
