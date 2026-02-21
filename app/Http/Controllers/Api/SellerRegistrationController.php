<?php

namespace App\Http\Controllers\Api;

use App\Models\SellerRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SellerRegistrationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $registration = SellerRegistration::where('user_id', $request->user()->id)->first();

        return response()->json([
            'registration' => $registration,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shop_name' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'pickup_address_summary' => 'nullable|string|max:2000',
            'submit_business_mode' => 'nullable|in:now,later',
            'seller_type' => 'nullable|in:sole,corp,opc',
            'company_registered_name' => 'nullable|string|max:255',
            'registered_last_name' => 'nullable|string|max:255',
            'registered_first_name' => 'nullable|string|max:255',
            'registered_middle_name' => 'nullable|string|max:255',
            'registered_suffix' => 'nullable|string|max:50',
            'general_location' => 'nullable|string|max:255',
            'registered_address' => 'nullable|string|max:2000',
            'zip_code' => 'nullable|string|max:20',
            'primary_document_type' => 'nullable|string|max:255',
            'primary_document_name' => 'nullable|string|max:255',
            'government_id_type' => 'nullable|string|max:255',
            'government_id_front_name' => 'nullable|string|max:255',
            'business_email' => 'nullable|email|max:255',
            'business_email_otp' => 'nullable|string|max:20',
            'business_phone_number' => 'nullable|string|max:50',
            'business_phone_otp' => 'nullable|string|max:20',
            'tax_tin' => 'nullable|string|max:255',
            'vat_status' => 'nullable|in:vat,non-vat',
            'bir_certificate_name' => 'nullable|string|max:255',
            'submit_sworn_declaration' => 'nullable|in:yes,no',
            'agree_business_terms' => 'required|accepted',
        ]);

        $registration = SellerRegistration::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                ...$validated,
                'submit_business_mode' => $validated['submit_business_mode'] ?? 'now',
                'status' => 'submitted',
                'submitted_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Seller registration submitted successfully.',
            'registration' => $registration,
        ]);
    }
}
