<?php

namespace App\Http\Controllers\Api;

use App\Models\AdminNotification;
use App\Models\SellerRegistration;
use App\Support\MediaStorage;
use Illuminate\Http\UploadedFile;
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
        $existing = SellerRegistration::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing && $existing->status === 'revoked') {
            $message = $existing->revoked_reason
                ? 'Seller privileges are revoked. Reason: ' . $existing->revoked_reason
                : 'Seller privileges are revoked by admin.';

            return response()->json([
                'message' => $message,
                'account_status' => 'seller_revoked',
                'reason' => $existing->revoked_reason,
            ], 403);
        }

        $validated = $request->validate([
            'shop_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'required|string|max:50',
            'pickup_address_summary' => 'required|string|max:2000',
            'submit_business_mode' => 'required|in:now,later',
            'seller_type' => 'required|in:sole,corp,opc',
            'company_registered_name' => 'nullable|string|max:255',
            'registered_last_name' => 'nullable|string|max:255',
            'registered_first_name' => 'nullable|string|max:255',
            'registered_middle_name' => 'nullable|string|max:255',
            'registered_suffix' => 'nullable|string|max:50',
            'general_location' => 'required|string|max:255',
            'registered_address' => 'required|string|max:2000',
            'zip_code' => 'required|string|max:20',
            'primary_document_type' => 'required_if:submit_business_mode,now|nullable|string|max:255',
            'primary_document_name' => 'required_if:submit_business_mode,now|nullable|string|max:255',
            'primary_document_file' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:10240',
            'government_id_type' => 'required_if:submit_business_mode,now|nullable|string|max:255',
            'government_id_front_name' => 'required_if:submit_business_mode,now|nullable|string|max:255',
            'government_id_front_file' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:10240',
            'business_email' => 'required|email|max:255',
            'business_email_otp' => 'nullable|string|max:20',
            'business_phone_number' => 'required|string|max:50',
            'business_phone_otp' => 'nullable|string|max:20',
            'tax_tin' => 'required_if:submit_business_mode,now|nullable|string|max:255',
            'vat_status' => 'required_if:submit_business_mode,now|nullable|in:vat,non-vat',
            'bir_certificate_name' => 'required_if:submit_business_mode,now|nullable|string|max:255',
            'bir_certificate_file' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:10240',
            'submit_sworn_declaration' => 'required_if:submit_business_mode,now|nullable|in:yes,no',
            'agree_business_terms' => 'required|accepted',
        ]);

        $userId = $request->user()->id;

        $primaryDocumentPath = $this->storeRegistrationDocument(
            $request->file('primary_document_file'),
            $userId,
            'primary-document'
        );
        if ($primaryDocumentPath) {
            $validated['primary_document_name'] = $primaryDocumentPath;
        }

        $governmentIdPath = $this->storeRegistrationDocument(
            $request->file('government_id_front_file'),
            $userId,
            'government-id'
        );
        if ($governmentIdPath) {
            $validated['government_id_front_name'] = $governmentIdPath;
        }

        $birCertificatePath = $this->storeRegistrationDocument(
            $request->file('bir_certificate_file'),
            $userId,
            'bir-certificate'
        );
        if ($birCertificatePath) {
            $validated['bir_certificate_name'] = $birCertificatePath;
        }

        $registration = SellerRegistration::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                ...$validated,
                'submit_business_mode' => $validated['submit_business_mode'] ?? 'now',
                'status' => 'submitted',
                'submitted_at' => now(),
            ]
        );

        $request->user()->forceFill([
            'is_verified' => false,
            'verified_at' => null,
            'verification_revoked_at' => now(),
        ])->save();

        $user = $request->user();
        AdminNotification::notify(
            'kyc',
            'Seller KYC submitted',
            "{$user->name} submitted a seller registration request.",
            ['user_id' => $user->id]
        );

        return response()->json([
            'message' => 'Seller registration submitted successfully.',
            'registration' => $registration,
        ]);
    }

    public function updateShippingSettings(Request $request): JsonResponse
    {
        $existing = SellerRegistration::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing && $existing->status === 'revoked') {
            $message = $existing->revoked_reason
                ? 'Seller privileges are revoked. Reason: ' . $existing->revoked_reason
                : 'Seller privileges are revoked by admin.';

            return response()->json([
                'message' => $message,
                'account_status' => 'seller_revoked',
                'reason' => $existing->revoked_reason,
            ], 403);
        }

        $validated = $request->validate([
            'shop_name' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'pickup_address_summary' => 'nullable|string|max:2000',
            'general_location' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
        ]);

        $registration = SellerRegistration::firstOrNew(['user_id' => $request->user()->id]);

        $registration->fill($validated);
        if (! $registration->exists) {
            $registration->agree_business_terms = true;
            $registration->submit_business_mode = 'now';
            $registration->status = 'submitted';
            $registration->submitted_at = now();
        }

        $registration->save();

        $request->user()->forceFill([
            'is_verified' => false,
            'verified_at' => null,
            'verification_revoked_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Shipping settings updated successfully.',
            'registration' => $registration,
        ]);
    }

    private function storeRegistrationDocument(?UploadedFile $file, int $userId, string $prefix): ?string
    {
        if (! $file) {
            return null;
        }

        $storedPath = MediaStorage::store(
            $file,
            'seller-registration/user-' . $userId . '/' . $prefix
        );

        if (! is_string($storedPath) || trim($storedPath) === '') {
            return null;
        }

        return MediaStorage::url($storedPath);
    }
}
