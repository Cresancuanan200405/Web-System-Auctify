<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\SellerRegistration;
use App\Models\User;
use App\Support\AdminAudit;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;

class UserMonitorController extends Controller
{
    public function index()
    {
        $candidateColumns = [
            'id',
            'name',
            'email',
            'phone',
            'is_verified',
            'is_admin',
            'is_suspended',
            'suspended_reason',
            'suspended_at',
            'suspended_until',
            'last_login_at',
            'created_at',
            'birthday',
        ];

        $selectColumns = array_values(array_filter(
            $candidateColumns,
            static fn (string $column): bool => Schema::hasColumn('users', $column)
        ));

        $users = User::query()
            ->with('sellerRegistration')
            ->where('is_admin', false)
            ->orderByDesc('id')
            ->get($selectColumns)
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'isVerified' => (bool) $user->is_verified,
                'isAdmin' => (bool) $user->is_admin,
                'isSuspended' => (bool) $user->is_suspended,
                'suspendedReason' => $user->suspended_reason,
                'suspendedAt' => optional($user->suspended_at)?->toIso8601String(),
                'suspendedUntil' => optional($user->suspended_until)?->toIso8601String(),
                'isSeller' => (bool) ($user->sellerRegistration && in_array($user->sellerRegistration->status, ['submitted', 'approved'], true)),
                'sellerStatus' => $user->sellerRegistration?->status,
                'lastSeenAt' => optional($user->last_login_at ?? $user->created_at)?->toIso8601String(),
                'createdAt' => optional($user->created_at)?->toIso8601String(),
            ]);

        return response()->json([
            'users' => $users,
        ]);
    }

    public function show(User $user)
    {
        if ($user->is_admin) {
            abort(404);
        }

        $user->load([
            'sellerRegistration',
            'accountVerifications' => static fn ($query) => $query->latest()->limit(1),
        ]);

        $verification = $user->accountVerifications->first();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'phone' => $user->phone,
                'birthday' => optional($user->birthday)?->toDateString(),
                'isVerified' => (bool) $user->is_verified,
                'isAdmin' => (bool) $user->is_admin,
                'isSuspended' => (bool) $user->is_suspended,
                'suspendedReason' => $user->suspended_reason,
                'suspendedAt' => optional($user->suspended_at)?->toIso8601String(),
                'suspendedUntil' => optional($user->suspended_until)?->toIso8601String(),
                'lastSeenAt' => optional($user->last_login_at ?? $user->created_at)?->toIso8601String(),
                'createdAt' => optional($user->created_at)?->toIso8601String(),
                'updatedAt' => optional($user->updated_at)?->toIso8601String(),
                'sellerRegistration' => $user->sellerRegistration ? [
                    'id' => $user->sellerRegistration->id,
                    'status' => $user->sellerRegistration->status,
                    'shopName' => $user->sellerRegistration->shop_name,
                    'contactEmail' => $user->sellerRegistration->contact_email,
                    'contactPhone' => $user->sellerRegistration->contact_phone,
                    'pickupAddressSummary' => $user->sellerRegistration->pickup_address_summary,
                    'submitBusinessMode' => $user->sellerRegistration->submit_business_mode,
                    'sellerType' => $user->sellerRegistration->seller_type,
                    'companyRegisteredName' => $user->sellerRegistration->company_registered_name,
                    'registeredLastName' => $user->sellerRegistration->registered_last_name,
                    'registeredFirstName' => $user->sellerRegistration->registered_first_name,
                    'registeredMiddleName' => $user->sellerRegistration->registered_middle_name,
                    'registeredSuffix' => $user->sellerRegistration->registered_suffix,
                    'generalLocation' => $user->sellerRegistration->general_location,
                    'registeredAddress' => $user->sellerRegistration->registered_address,
                    'zipCode' => $user->sellerRegistration->zip_code,
                    'primaryDocumentType' => $user->sellerRegistration->primary_document_type,
                    'primaryDocumentName' => $user->sellerRegistration->primary_document_name,
                    'governmentIdType' => $user->sellerRegistration->government_id_type,
                    'governmentIdFrontName' => $user->sellerRegistration->government_id_front_name,
                    'businessEmail' => $user->sellerRegistration->business_email,
                    'businessPhoneNumber' => $user->sellerRegistration->business_phone_number,
                    'taxTin' => $user->sellerRegistration->tax_tin,
                    'vatStatus' => $user->sellerRegistration->vat_status,
                    'birCertificateName' => $user->sellerRegistration->bir_certificate_name,
                    'documentMedia' => [
                        $this->buildSellerRegistrationMediaItem($user->id, 'primary-document', $user->sellerRegistration->primary_document_type ?: 'Primary Document', $user->sellerRegistration->primary_document_name),
                        $this->buildSellerRegistrationMediaItem($user->id, 'government-id', $user->sellerRegistration->government_id_type ?: 'Government ID', $user->sellerRegistration->government_id_front_name),
                        $this->buildSellerRegistrationMediaItem($user->id, 'bir-certificate', 'BIR Certificate', $user->sellerRegistration->bir_certificate_name),
                    ],
                    'submitSwornDeclaration' => $user->sellerRegistration->submit_sworn_declaration,
                    'agreeBusinessTerms' => (bool) $user->sellerRegistration->agree_business_terms,
                    'submittedAt' => optional($user->sellerRegistration->submitted_at)?->toIso8601String(),
                    'revokedAt' => optional($user->sellerRegistration->revoked_at)?->toIso8601String(),
                    'revokedReason' => $user->sellerRegistration->revoked_reason,
                    'createdAt' => optional($user->sellerRegistration->created_at)?->toIso8601String(),
                    'updatedAt' => optional($user->sellerRegistration->updated_at)?->toIso8601String(),
                ] : null,
                'verification' => $verification ? [
                    'status' => $verification->status,
                    'fullName' => $verification->full_name,
                    'phone' => $verification->phone,
                    'address' => $verification->address,
                    'notes' => $verification->notes,
                    'submittedAt' => optional($verification->submitted_at)?->toIso8601String(),
                    'reviewedAt' => optional($verification->reviewed_at)?->toIso8601String(),
                    'media' => [
                        [
                            'key' => 'selfie',
                            'label' => 'Selfie Verification',
                            'fileName' => $verification->selfie_path ? basename($verification->selfie_path) : null,
                            'uploaded' => (bool) $verification->selfie_path,
                            'mimeType' => $this->resolveDocumentMimeType($verification->selfie_path),
                            'previewUrl' => $this->verificationMediaUrl($user->id, 'selfie', $verification->selfie_path),
                        ],
                        [
                            'key' => 'government-id',
                            'label' => 'Government ID',
                            'fileName' => $verification->government_id_path ? basename($verification->government_id_path) : null,
                            'uploaded' => (bool) $verification->government_id_path,
                            'mimeType' => $this->resolveDocumentMimeType($verification->government_id_path),
                            'previewUrl' => $this->verificationMediaUrl($user->id, 'government-id', $verification->government_id_path),
                        ],
                        [
                            'key' => 'utility-bill',
                            'label' => 'Utility Bill',
                            'fileName' => $verification->utility_bill_path ? basename($verification->utility_bill_path) : null,
                            'uploaded' => (bool) $verification->utility_bill_path,
                            'mimeType' => $this->resolveDocumentMimeType($verification->utility_bill_path),
                            'previewUrl' => $this->verificationMediaUrl($user->id, 'utility-bill', $verification->utility_bill_path),
                        ],
                        [
                            'key' => 'bank-statement',
                            'label' => 'Bank Statement',
                            'fileName' => $verification->bank_statement_path ? basename($verification->bank_statement_path) : null,
                            'uploaded' => (bool) $verification->bank_statement_path,
                            'mimeType' => $this->resolveDocumentMimeType($verification->bank_statement_path),
                            'previewUrl' => $this->verificationMediaUrl($user->id, 'bank-statement', $verification->bank_statement_path),
                        ],
                    ],
                ] : null,
            ],
        ]);
    }

    private function resolveDocumentMimeType(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $extension = strtolower(pathinfo(parse_url($path, PHP_URL_PATH) ?? $path, PATHINFO_EXTENSION));

        $mimeMap = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'jfif' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp',
            'tif' => 'image/tiff',
            'tiff' => 'image/tiff',
            'pdf' => 'application/pdf',
        ];

        if ($extension === '') {
            return null;
        }

        return $mimeMap[$extension] ?? null;
    }

    private function verificationMediaUrl(int $userId, string $key, ?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, '/storage/')) {
            return $path;
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        return MediaStorage::url($path);
    }

    public function verificationMedia(User $user, string $key)
    {
        if ($user->is_admin) {
            abort(404);
        }

        $verification = $user->accountVerifications()->latest()->first();
        if (! $verification) {
            abort(404);
        }

        $pathByKey = [
            'selfie' => $verification->selfie_path,
            'government-id' => $verification->government_id_path,
            'utility-bill' => $verification->utility_bill_path,
            'bank-statement' => $verification->bank_statement_path,
        ];

        if (! array_key_exists($key, $pathByKey)) {
            abort(404);
        }

        $path = $pathByKey[$key];
        if (! $path) {
            abort(404);
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return redirect()->away($path);
        }

        if (str_starts_with($path, '/storage/')) {
            return redirect()->to($path);
        }

        if (Storage::disk('local')->exists($path)) {
            return response()->file(Storage::disk('local')->path($path));
        }

        if (Storage::disk('public')->exists($path)) {
            return response()->file(Storage::disk('public')->path($path));
        }

        if (MediaStorage::exists($path)) {
            return redirect()->away(MediaStorage::url($path));
        }

        abort(404);
    }

    public function sellerRegistrationMedia(User $user, string $key)
    {
        if ($user->is_admin) {
            abort(404);
        }

        $registration = SellerRegistration::query()->where('user_id', $user->id)->first();
        if (! $registration) {
            abort(404);
        }

        $nameByKey = [
            'primary-document' => $registration->primary_document_name,
            'government-id' => $registration->government_id_front_name,
            'bir-certificate' => $registration->bir_certificate_name,
        ];

        if (! array_key_exists($key, $nameByKey)) {
            abort(404);
        }

        $resolved = $this->resolveStoredFileLocation($user->id, $nameByKey[$key]);

        if (! $resolved) {
            abort(404);
        }

        if ($resolved['type'] === 'url') {
            return redirect()->away($resolved['value']);
        }

        if ($resolved['type'] === 'public_path') {
            return redirect()->to($resolved['value']);
        }

        if ($resolved['type'] === 'media_url') {
            return redirect()->away($resolved['value']);
        }

        return response()->file(Storage::disk($resolved['disk'])->path($resolved['path']));
    }

    public function suspend(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
            'duration_unit' => ['nullable', 'string', 'in:minutes,hours,days'],
            'duration_value' => ['nullable', 'integer', 'min:1', 'max:525600'],
        ]);

        $suspendedUntil = null;
        $durationUnit = $validated['duration_unit'] ?? null;
        $durationValue = isset($validated['duration_value']) ? (int) $validated['duration_value'] : null;
        if ($durationUnit && $durationValue) {
            $suspendedUntil = now()->add($durationUnit, $durationValue);
        }

        $user->forceFill([
            'is_suspended' => true,
            'suspended_reason' => $validated['reason'],
            'suspended_at' => now(),
            'suspended_until' => $suspendedUntil,
        ])->save();

        $user->tokens()->delete();

        $this->logAction($request, $user, 'suspend-account', $validated['reason']);

        AdminNotification::notify(
            'user',
            'User suspended',
            "{$user->name} was suspended by admin.",
            [
                'user_id' => $user->id,
                'reason' => $validated['reason'],
                'suspended_until' => optional($user->suspended_until)?->toIso8601String(),
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'User account suspended successfully.',
            'suspended_until' => optional($user->suspended_until)?->toIso8601String(),
        ]);
    }

    public function unsuspend(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        if (! $user->is_suspended) {
            return response()->json([
                'message' => 'User account is not suspended.',
            ], 422);
        }

        $user->forceFill([
            'is_suspended' => false,
            'suspended_reason' => null,
            'suspended_at' => null,
            'suspended_until' => null,
        ])->save();

        $this->logAction($request, $user, 'unsuspend-account', $validated['reason']);

        AdminNotification::notify(
            'user',
            'User unsuspended',
            "{$user->name} was unsuspended by admin.",
            [
                'user_id' => $user->id,
                'reason' => $validated['reason'],
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'User account unsuspended successfully.',
        ]);
    }

    public function revokeSeller(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $registration = SellerRegistration::query()->where('user_id', $user->id)->first();
        if (! $registration) {
            return response()->json([
                'message' => 'User is not registered as seller.',
            ], 422);
        }

        $previousStatus = (string) $registration->status;

        $registration->forceFill([
            'status' => 'revoked',
            'revoked_reason' => $validated['reason'],
            'revoked_at' => now(),
        ])->save();

        $user->forceFill([
            'is_verified' => false,
            'verified_at' => null,
            'verification_revoked_at' => now(),
        ])->save();

        $this->logAction($request, $user, 'revoke-seller', $validated['reason'], [
            'seller_registration_id' => $registration->id,
            'previous_status' => $previousStatus,
        ]);

        AdminNotification::notify(
            'seller',
            'Seller access revoked',
            "{$user->name}'s seller access was revoked.",
            [
                'user_id' => $user->id,
                'seller_registration_id' => $registration->id,
                'reason' => $validated['reason'],
                'previous_status' => $previousStatus,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'Seller role revoked successfully.',
        ]);
    }

    public function approveSeller(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $registration = SellerRegistration::query()->where('user_id', $user->id)->first();
        if (! $registration) {
            return response()->json([
                'message' => 'User is not registered as seller.',
            ], 422);
        }

        $previousStatus = (string) $registration->status;

        $registration->forceFill([
            'status' => 'approved',
            'revoked_reason' => null,
            'revoked_at' => null,
        ])->save();

        $user->forceFill([
            'is_verified' => true,
            'verified_at' => now(),
            'verification_revoked_at' => null,
        ])->save();

        $this->logAction($request, $user, 'approve-seller', $validated['reason'], [
            'seller_registration_id' => $registration->id,
            'previous_status' => $previousStatus,
        ]);

        AdminNotification::notify(
            'seller',
            'Seller approved',
            "{$user->name}'s seller request was approved.",
            [
                'user_id' => $user->id,
                'seller_registration_id' => $registration->id,
                'reason' => $validated['reason'],
                'previous_status' => $previousStatus,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'Seller request approved successfully.',
        ]);
    }

    public function rejectSeller(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $registration = SellerRegistration::query()->where('user_id', $user->id)->first();
        if (! $registration) {
            return response()->json([
                'message' => 'User is not registered as seller.',
            ], 422);
        }

        $previousStatus = (string) $registration->status;

        $registration->forceFill([
            'status' => 'rejected',
            'revoked_reason' => $validated['reason'],
            'revoked_at' => now(),
        ])->save();

        $user->forceFill([
            'is_verified' => false,
            'verified_at' => null,
            'verification_revoked_at' => now(),
        ])->save();

        $this->logAction($request, $user, 'reject-seller', $validated['reason'], [
            'seller_registration_id' => $registration->id,
            'previous_status' => $previousStatus,
        ]);

        AdminNotification::notify(
            'seller',
            'Seller rejected',
            "{$user->name}'s seller request was rejected.",
            [
                'user_id' => $user->id,
                'seller_registration_id' => $registration->id,
                'reason' => $validated['reason'],
                'previous_status' => $previousStatus,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'Seller request rejected successfully.',
        ]);
    }

    public function unrevokeSeller(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $registration = SellerRegistration::query()->where('user_id', $user->id)->first();
        if (! $registration) {
            return response()->json([
                'message' => 'User is not registered as seller.',
            ], 422);
        }

        if ($registration->status !== 'revoked') {
            return response()->json([
                'message' => 'Seller account is not revoked.',
            ], 422);
        }

        $registration->forceFill([
            'status' => 'submitted',
            'revoked_reason' => null,
            'revoked_at' => null,
        ])->save();

        $user->forceFill([
            'is_verified' => false,
            'verified_at' => null,
            'verification_revoked_at' => now(),
        ])->save();

        $this->logAction($request, $user, 'unrevoke-seller', $validated['reason'], [
            'seller_registration_id' => $registration->id,
        ]);

        AdminNotification::notify(
            'seller',
            'Seller access restored',
            "{$user->name}'s seller access was restored.",
            [
                'user_id' => $user->id,
                'seller_registration_id' => $registration->id,
                'reason' => $validated['reason'],
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json([
            'message' => 'Seller role restored successfully.',
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($response = $this->guardAdminTargetMutation($user)) {
            return $response;
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $snapshot = [
            'email' => $user->email,
            'name' => $user->name,
        ];

        $this->logAction($request, $user, 'delete-account', $validated['reason'], $snapshot);

        AdminNotification::notify(
            'user',
            'User deleted',
            "{$user->name}'s account was deleted by admin.",
            [
                'user_id' => $user->id,
                'reason' => $validated['reason'],
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'User account deleted successfully.',
        ]);
    }

    private function logAction(Request $request, User $targetUser, string $action, string $reason, array $details = []): void
    {
        AdminAudit::log($request, $action, $reason, $targetUser->id, $details);
    }

    private function guardAdminTargetMutation(User $user): ?JsonResponse
    {
        if (! $user->is_admin) {
            return null;
        }

        return response()->json([
            'message' => 'Admin accounts are managed separately and cannot be modified here.',
        ], 422);
    }

    private function buildSellerRegistrationMediaItem(int $userId, string $key, string $label, ?string $fileName): array
    {
        $resolved = $this->resolveStoredFileLocation($userId, $fileName);

        return [
            'key' => $key,
            'label' => $label,
            'fileName' => $fileName,
            'uploaded' => (bool) $fileName,
            'mimeType' => $this->resolveDocumentMimeType($fileName),
            'previewUrl' => $resolved ? $this->resolvedPreviewUrl($userId, $key, $resolved) : null,
            'isResolved' => (bool) $resolved,
        ];
    }

    private function resolvedPreviewUrl(int $userId, string $key, array $resolved): string
    {
        if ($resolved['type'] === 'url' || $resolved['type'] === 'public_path' || $resolved['type'] === 'media_url') {
            return $resolved['value'];
        }

        return '/api/admin/users/' . $userId . '/seller-registration-media/' . $key;
    }

    private function resolveStoredFileLocation(int $userId, ?string $value): ?array
    {
        if (! $value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return ['type' => 'url', 'value' => $value];
        }

        if (str_starts_with($value, '/')) {
            return ['type' => 'public_path', 'value' => $value];
        }

        $trimmedValue = trim($value);
        $candidatePaths = [$trimmedValue, ltrim($trimmedValue, '/')];

        if (str_starts_with(ltrim($trimmedValue, '/'), 'storage/')) {
            $candidatePaths[] = substr(ltrim($trimmedValue, '/'), strlen('storage/'));
        }

        $baseName = basename($trimmedValue);
        $folders = [
            'verification/user-' . $userId,
            'seller-registration/user-' . $userId,
            'seller/user-' . $userId,
            'uploads/seller-registration/user-' . $userId,
        ];

        foreach ($folders as $folder) {
            $candidatePaths[] = $folder . '/' . $baseName;
        }

        foreach (array_unique($candidatePaths) as $path) {
            if (MediaStorage::exists($path)) {
                return ['type' => 'media_url', 'value' => MediaStorage::url($path)];
            }

            if (Storage::disk('local')->exists($path)) {
                return ['type' => 'disk_file', 'disk' => 'local', 'path' => $path];
            }

            if (Storage::disk('public')->exists($path)) {
                return ['type' => 'disk_file', 'disk' => 'public', 'path' => $path];
            }
        }

        return null;
    }
}
