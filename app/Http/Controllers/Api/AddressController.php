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
                'street_address' => 'required|string|max:255',
                'building_name' => 'nullable|string|max:255',
                'unit_floor' => 'nullable|string|max:255',
                'postal_code' => 'nullable|string|max:20',
                'notes' => 'nullable|string|max:500',
            ]);

            // Map frontend fields to database columns
            $addressData = [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone' => $validated['phone'],
                'region' => $validated['region'],
                'province' => $validated['province'],
                'city' => $validated['city'],
                'barangay' => $validated['barangay'],
                'street' => $validated['street_address'],
                'building_name' => $validated['building_name'] ?? null,
                'unit_floor' => $validated['unit_floor'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'house_no' => $this->buildHouseNoFromPayload($validated),
            ];

            // Check if an identical address already exists for this user
            $existingAddress = $request->user()->addresses()
                ->where('first_name', $addressData['first_name'])
                ->where('last_name', $addressData['last_name'])
                ->where('phone', $addressData['phone'])
                ->where('region', $addressData['region'])
                ->where('province', $addressData['province'])
                ->where('city', $addressData['city'])
                ->where('barangay', $addressData['barangay'])
                ->where('street', $addressData['street'])
                ->where('house_no', $addressData['house_no'])
                ->first();

            if ($existingAddress) {
                return response()->json([
                    'message' => 'This address already exists. Please use a different address.'
                ], 409);
            }

            $address = $request->user()->addresses()->create($addressData);

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
                'street_address' => 'required|string|max:255',
                'building_name' => 'nullable|string|max:255',
                'unit_floor' => 'nullable|string|max:255',
                'postal_code' => 'nullable|string|max:20',
                'notes' => 'nullable|string|max:500',
            ]);

            $addressData = [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone' => $validated['phone'],
                'region' => $validated['region'],
                'province' => $validated['province'],
                'city' => $validated['city'],
                'barangay' => $validated['barangay'],
                'street' => $validated['street_address'],
                'building_name' => $validated['building_name'] ?? null,
                'unit_floor' => $validated['unit_floor'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'house_no' => $this->buildHouseNoFromPayload($validated),
            ];

            $address->update($addressData);

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

    /**
     * Build a single house_no string from optional building/unit/postal/notes fields.
     */
    private function buildHouseNoFromPayload(array $data): string
    {
        $parts = [];

        if (!empty($data['building_name'] ?? null)) {
            $parts[] = $data['building_name'];
        }

        if (!empty($data['unit_floor'] ?? null)) {
            $parts[] = 'Unit/Floor: ' . $data['unit_floor'];
        }

        if (!empty($data['postal_code'] ?? null)) {
            $parts[] = 'Postal: ' . $data['postal_code'];
        }

        if (!empty($data['notes'] ?? null)) {
            $parts[] = 'Notes: ' . $data['notes'];
        }

        if (empty($parts)) {
            return 'N/A';
        }

        return implode(' | ', $parts);
    }
}
