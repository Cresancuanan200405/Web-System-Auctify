<?php

namespace App\Http\Controllers\Api;

use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class AddressController extends Controller
{
    /**
     * Get all addresses for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->addresses()->get();
        return response()->json($addresses);
    }

    /**
     * Store a new address
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'region' => 'required|string|max:255',
                'province' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'required|string|max:255',
                'street' => 'required|string|max:255',
                'house_no' => 'required|string|max:50',
            ]);

            // Check if an identical address already exists for this user
            $existingAddress = $request->user()->addresses()
                ->where('first_name', $validated['first_name'])
                ->where('last_name', $validated['last_name'])
                ->where('phone', $validated['phone'])
                ->where('region', $validated['region'])
                ->where('province', $validated['province'])
                ->where('city', $validated['city'])
                ->where('barangay', $validated['barangay'])
                ->where('street', $validated['street'])
                ->where('house_no', $validated['house_no'])
                ->first();

            if ($existingAddress) {
                return response()->json([
                    'message' => 'This address already exists. Please use a different address.'
                ], 409);
            }

            $address = $request->user()->addresses()->create($validated);

            return response()->json($address, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating address',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an address
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $address = Address::find($id);
            
            if (!$address) {
                return response()->json(['message' => 'Address not found'], 404);
            }

            // Ensure the address belongs to the authenticated user
            if ($address->user_id !== $request->user()->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'region' => 'required|string|max:255',
                'province' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'required|string|max:255',
                'street' => 'required|string|max:255',
                'house_no' => 'required|string|max:50',
            ]);

            $address->update($validated);

            return response()->json($address);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating address',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an address
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $address = Address::find($id);
            
            if (!$address) {
                return response()->json(['message' => 'Address not found'], 404);
            }

            // Ensure the address belongs to the authenticated user
            if ($address->user_id !== $request->user()->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $address->delete();

            return response()->json(['message' => 'Address deleted successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error deleting address',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
