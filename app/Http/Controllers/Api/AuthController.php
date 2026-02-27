<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function googleRedirect(Request $request)
    {
        $frontend = $this->resolveFrontendUrl($request->query('frontend'));
        $statePayload = base64_encode(json_encode([
            'frontend' => $frontend,
        ]));

        /** @var \Laravel\Socialite\Two\AbstractProvider $provider */
        $provider = Socialite::driver('google');

        return $provider
            ->stateless()
            ->with(['state' => $statePayload])
            ->redirect();
    }

    public function googleCallback(Request $request)
    {
        $state = $this->extractState($request);
        $frontendUrl = $this->resolveFrontendUrl($state['frontend'] ?? null);
        $googleUser = null;

        try {
            /** @var \Laravel\Socialite\Two\AbstractProvider $provider */
            $provider = Socialite::driver('google');
            /** @var \Laravel\Socialite\Two\User $googleUser */
            $googleUser = $provider->stateless()->user();
        } catch (\Throwable $error) {
            return redirect()->away($frontendUrl . '/login?google_error=auth_failed');
        }

        if (! $googleUser) {
            return redirect()->away($frontendUrl . '/login?google_error=auth_failed');
        }

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();
        $isNewGoogleAccount = false;

        if (! $user) {
            $isNewGoogleAccount = true;
            $user = User::create([
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'password' => Hash::make(Str::random(64)),
            ]);

            $user->email_verified_at = now();
            $user->save();
        } else {
            if (! $user->google_id) {
                $user->google_id = $googleUser->getId();
            }

            if (! $user->avatar && $googleUser->getAvatar()) {
                $user->avatar = $googleUser->getAvatar();
            }

            if (! $user->email_verified_at) {
                $user->email_verified_at = now();
            }

            $user->save();
        }

        $token = $user->createToken('auth')->plainTextToken;
        $userPayload = base64_encode(json_encode([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_verified' => (bool) $user->is_verified,
            'verified_at' => $user->verified_at,
        ]));

        $redirectUrl = $frontendUrl
            . '/login?google_token=' . urlencode($token)
            . '&google_user=' . urlencode($userPayload)
            . '&google_created=' . ($isNewGoogleAccount ? '1' : '0');

        return redirect()->away($redirectUrl);
    }

    private function resolveFrontendUrl(?string $candidate): string
    {
        if (is_string($candidate) && preg_match('/^https?:\/\//i', $candidate)) {
            return rtrim($candidate, '/');
        }

        return rtrim(config('services.frontend.url'), '/');
    }

    private function extractState(Request $request): array
    {
        $stateRaw = $request->query('state');

        if (! is_string($stateRaw) || $stateRaw === '') {
            return [];
        }

        $decoded = json_decode(base64_decode($stateRaw, true) ?: '', true);

        if (is_array($decoded)) {
            return $decoded;
        }

        return [];
    }

    public function register(RegisterRequest $request)
    {
        $user = User::create($request->validated());
        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();

        $user = User::where('email', $credentials['email'])->first();

        if ($user && ! empty($user->google_id)) {
            return response()->json([
                'message' => 'This account uses Google sign-in. Please continue with Google.',
            ], 422);
        }

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 422);
        }

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->tokens()->delete();

        return response()->json([
            'message' => 'Signed out successfully.',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'birthday' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'in:male,female'],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $firstName = $validated['first_name'] ?? '';
            $lastName = $validated['last_name'] ?? '';
            $user->name = trim($firstName . ' ' . $lastName);
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (isset($validated['birthday'])) {
            $user->birthday = $validated['birthday'];
        }

        if (isset($validated['current_password']) && isset($validated['password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect.',
                ], 422);
            }

            $user->password = Hash::make($validated['password']);
            $user->tokens()->delete();
        }

        $user->save();

        if (isset($validated['password'])) {
            $token = $user->createToken('auth')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Profile updated successfully. Please log in with your new password.',
            ]);
        }

        return response()->json([
            'user' => $user,
            'message' => 'Profile updated successfully.',
        ]);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Account deleted successfully.',
        ]);
    }
}
