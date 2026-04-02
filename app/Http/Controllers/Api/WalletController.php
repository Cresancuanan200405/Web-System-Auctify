<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();

        $transactions = WalletTransaction::query()
            ->where('user_id', $user?->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(static function (WalletTransaction $transaction): array {
                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'amount' => (float) $transaction->amount,
                    'balance_before' => (float) $transaction->balance_before,
                    'balance_after' => (float) $transaction->balance_after,
                    'reference' => $transaction->reference,
                    'description' => $transaction->description,
                    'created_at' => optional($transaction->created_at)?->toISOString(),
                ];
            });

        return response()->json([
            'transactions' => $transactions,
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'wallet_balance' => (float) ($user?->wallet_balance ?? 0),
        ]);
    }

    public function topUp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $user = $request->user();
        $currentBalance = (float) ($user?->wallet_balance ?? 0);
        $nextBalance = round($currentBalance + (float) $validated['amount'], 2);

        if ($user) {
            $user->wallet_balance = $nextBalance;
            $user->save();

            WalletTransaction::query()->create([
                'user_id' => $user->id,
                'type' => 'top-up',
                'amount' => round((float) $validated['amount'], 2),
                'balance_before' => $currentBalance,
                'balance_after' => $nextBalance,
                'reference' => 'wallet-top-up',
                'description' => 'Wallet top up',
            ]);
        }

        return response()->json([
            'message' => 'Wallet balance updated.',
            'wallet_balance' => $nextBalance,
        ]);
    }

    public function spend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $user = $request->user();
        $currentBalance = (float) ($user?->wallet_balance ?? 0);
        $amount = round((float) $validated['amount'], 2);

        if ($currentBalance < $amount) {
            return response()->json([
                'message' => 'Insufficient wallet balance.',
                'wallet_balance' => $currentBalance,
            ], 422);
        }

        $nextBalance = round($currentBalance - $amount, 2);

        if ($user) {
            $user->wallet_balance = $nextBalance;
            $user->save();

            WalletTransaction::query()->create([
                'user_id' => $user->id,
                'type' => 'spend',
                'amount' => $amount,
                'balance_before' => $currentBalance,
                'balance_after' => $nextBalance,
                'reference' => 'wallet-spend',
                'description' => 'Wallet spend',
            ]);
        }

        return response()->json([
            'message' => 'Wallet balance updated.',
            'wallet_balance' => $nextBalance,
        ]);
    }
}