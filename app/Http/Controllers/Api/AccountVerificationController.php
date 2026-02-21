<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AccountVerificationController extends Controller
{
    public function status(Request $request)
    {
        $user = $request->user();
        $verification = $user->accountVerifications()->latest()->first();

        return response()->json([
            'user' => [
                'is_verified' => (bool) $user->is_verified,
                'verified_at' => $user->verified_at,
            ],
            'verification' => $this->formatVerification($verification),
        ]);
    }

    public function sendOtp(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:500'],
            'privacy_accepted' => ['accepted'],
        ]);

        $user = $request->user();
        $verification = $this->resolveDraft($user->id);

        $otp = (string) random_int(100000, 999999);

        $verification->fill([
            'status' => 'draft',
            'full_name' => $validated['full_name'],
            'date_of_birth' => $validated['date_of_birth'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'privacy_agreed_at' => now(),
            'phone_otp_code' => Hash::make($otp),
            'phone_otp_expires_at' => now()->addMinutes(10),
            'phone_verified_at' => null,
        ]);

        $verification->save();

        return response()->json([
            'message' => 'OTP sent successfully. Please confirm your phone number.',
            'verification' => $this->formatVerification($verification),
            'dev_otp' => config('app.debug') ? $otp : null,
        ]);
    }

    public function confirmOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'otp' => ['required', 'digits:6'],
        ]);

        $user = $request->user();
        $verification = $user->accountVerifications()
            ->where('status', 'draft')
            ->latest()
            ->first();

        if (! $verification || $verification->phone !== $validated['phone']) {
            return response()->json([
                'message' => 'No active verification request found for this phone number.',
            ], 422);
        }

        if (! $verification->phone_otp_expires_at || now()->greaterThan($verification->phone_otp_expires_at)) {
            return response()->json([
                'message' => 'OTP has expired. Please request a new one.',
            ], 422);
        }

        if (! $verification->phone_otp_code || ! Hash::check($validated['otp'], $verification->phone_otp_code)) {
            return response()->json([
                'message' => 'Invalid OTP. Please try again.',
            ], 422);
        }

        $verification->phone_verified_at = now();
        $verification->save();

        return response()->json([
            'message' => 'Phone number verified successfully.',
            'verification' => $this->formatVerification($verification),
        ]);
    }

    public function uploadDocuments(Request $request)
    {
        $validated = $request->validate([
            'government_id' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'selfie' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'utility_bill' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'bank_statement' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $user = $request->user();
        $verification = $user->accountVerifications()
            ->where('status', 'draft')
            ->latest()
            ->first();

        if (! $verification) {
            return response()->json([
                'message' => 'Start step 2 first before uploading documents.',
            ], 422);
        }

        if (! $verification->phone_verified_at) {
            return response()->json([
                'message' => 'Please verify your phone number before uploading documents.',
            ], 422);
        }

        $baseDir = 'verification/user-' . $user->id;

        $verification->government_id_path = $request->file('government_id')->store($baseDir, 'local');
        $verification->selfie_path = $request->file('selfie')->store($baseDir, 'local');

        if ($request->hasFile('utility_bill')) {
            $verification->utility_bill_path = $request->file('utility_bill')->store($baseDir, 'local');
        }

        if ($request->hasFile('bank_statement')) {
            $verification->bank_statement_path = $request->file('bank_statement')->store($baseDir, 'local');
        }

        $verification->save();

        return response()->json([
            'message' => 'Documents uploaded and saved for review.',
            'verification' => $this->formatVerification($verification),
        ]);
    }

    public function finalize(Request $request)
    {
        $validated = $request->validate([
            'verification_terms_accepted' => ['accepted'],
        ]);

        $user = $request->user();
        $verification = $user->accountVerifications()
            ->where('status', 'draft')
            ->latest()
            ->first();

        if (! $verification) {
            return response()->json([
                'message' => 'No active verification draft found.',
            ], 422);
        }

        if (! $verification->privacy_agreed_at || ! $verification->phone_verified_at) {
            return response()->json([
                'message' => 'Please complete personal information and OTP verification first.',
            ], 422);
        }

        if (! $verification->government_id_path || ! $verification->selfie_path) {
            return response()->json([
                'message' => 'Government ID and selfie are required.',
            ], 422);
        }

        if (! ($validated['verification_terms_accepted'] ?? false)) {
            return response()->json([
                'message' => 'You must accept Auctify Verification Terms.',
            ], 422);
        }

        $verification->status = 'approved';
        $verification->terms_agreed = true;
        $verification->submitted_at = now();
        $verification->reviewed_at = now();
        $verification->save();

        $user->is_verified = true;
        $user->verified_at = now();
        $user->verification_revoked_at = null;
        $user->save();

        return response()->json([
            'message' => 'Verification completed successfully. Your account is now verified.',
            'user' => $user,
            'verification' => $this->formatVerification($verification),
        ]);
    }

    public function revoke(Request $request)
    {
        $user = $request->user();

        if (! $user->is_verified) {
            return response()->json([
                'message' => 'Your account is not currently verified.',
            ], 422);
        }

        $latestApproved = $user->accountVerifications()
            ->where('status', 'approved')
            ->latest()
            ->first();

        if ($latestApproved) {
            $latestApproved->status = 'revoked';
            $latestApproved->notes = 'Verification revoked by user for privacy.';
            $latestApproved->reviewed_at = now();
            $latestApproved->save();
        }

        $user->is_verified = false;
        $user->verification_revoked_at = now();
        $user->save();

        return response()->json([
            'message' => 'Verification has been revoked. Auctioneer trust badge has been removed.',
            'user' => $user,
        ]);
    }

    private function resolveDraft(int $userId): AccountVerification
    {
        $draft = AccountVerification::query()
            ->where('user_id', $userId)
            ->where('status', 'draft')
            ->latest()
            ->first();

        if ($draft) {
            return $draft;
        }

        return AccountVerification::create([
            'user_id' => $userId,
            'status' => 'draft',
        ]);
    }

    private function formatVerification(?AccountVerification $verification): ?array
    {
        if (! $verification) {
            return null;
        }

        return [
            'id' => $verification->id,
            'status' => $verification->status,
            'full_name' => $verification->full_name,
            'date_of_birth' => optional($verification->date_of_birth)->format('Y-m-d'),
            'phone' => $verification->phone,
            'address' => $verification->address,
            'privacy_agreed_at' => $verification->privacy_agreed_at,
            'phone_verified_at' => $verification->phone_verified_at,
            'government_id_uploaded' => (bool) $verification->government_id_path,
            'selfie_uploaded' => (bool) $verification->selfie_path,
            'utility_bill_uploaded' => (bool) $verification->utility_bill_path,
            'bank_statement_uploaded' => (bool) $verification->bank_statement_path,
            'government_id_name' => $verification->government_id_path ? basename($verification->government_id_path) : null,
            'selfie_name' => $verification->selfie_path ? basename($verification->selfie_path) : null,
            'utility_bill_name' => $verification->utility_bill_path ? basename($verification->utility_bill_path) : null,
            'bank_statement_name' => $verification->bank_statement_path ? basename($verification->bank_statement_path) : null,
            'submitted_at' => $verification->submitted_at,
            'reviewed_at' => $verification->reviewed_at,
        ];
    }
}
