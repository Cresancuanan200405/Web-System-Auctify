import { useEffect } from 'react';
import { walletService } from '../services/api';
import type { Card } from '../types';
import { useLocalStorage } from './useLocalStorage';

type WalletMutationResult = {
    ok: boolean;
    message?: string;
};

const WALLET_BALANCE_CACHE_TTL_MS = 5000;
let walletBalanceRequest: Promise<number | null> | null = null;
let walletBalanceCachedAt = 0;
let walletBalanceCachedValue: number | null = null;

const fetchWalletBalance = async (): Promise<number | null> => {
    const now = Date.now();

    if (
        walletBalanceCachedValue !== null &&
        now - walletBalanceCachedAt < WALLET_BALANCE_CACHE_TTL_MS
    ) {
        return walletBalanceCachedValue;
    }

    if (!walletBalanceRequest) {
        walletBalanceRequest = walletService
            .getBalance()
            .then((response) => {
                const value = Number(response.wallet_balance);

                if (!Number.isFinite(value)) {
                    return null;
                }

                const normalized = Math.max(0, value);
                walletBalanceCachedValue = normalized;
                walletBalanceCachedAt = Date.now();
                return normalized;
            })
            .catch(() => null)
            .finally(() => {
                walletBalanceRequest = null;
            });
    }

    return walletBalanceRequest;
};

const getUserStorageScope = () => {
    try {
        const rawUser = window.localStorage.getItem('auth_user');
        if (!rawUser) return 'anonymous';

        const parsedUser = JSON.parse(rawUser) as {
            id?: number;
            email?: string;
        };
        if (parsedUser.id) return `user-${parsedUser.id}`;
        if (parsedUser.email) return `email-${parsedUser.email.toLowerCase()}`;
    } catch {
        // fall through to anonymous scope
    }

    return 'anonymous';
};

const getLegacyCardBalance = (rawCards: string | null): number => {
    if (!rawCards) {
        return 0;
    }

    try {
        const cards = JSON.parse(rawCards) as Array<Pick<Card, 'balance'>>;
        return cards.reduce(
            (total, card) => total + Number(card.balance ?? 0),
            0,
        );
    } catch {
        return 0;
    }
};

export function useWallet() {
    const userStorageScope = getUserStorageScope();
    const walletBalanceKey = `wallet_balance_${userStorageScope}`;
    const legacySavedCardsKey = `saved_cards_${userStorageScope}`;
    const legacyMainCardKey = `main_card_id_${userStorageScope}`;

    const [walletBalance, setWalletBalanceState] = useLocalStorage<number>(
        walletBalanceKey,
        0,
    );

    useEffect(() => {
        const walletStoredValue = window.localStorage.getItem(walletBalanceKey);
        const legacyCardsRaw = window.localStorage.getItem(legacySavedCardsKey);
        const legacyMainCardRaw = window.localStorage.getItem(legacyMainCardKey);

        if (walletStoredValue === null && legacyCardsRaw) {
            setWalletBalanceState(getLegacyCardBalance(legacyCardsRaw));
        }

        if (legacyCardsRaw !== null) {
            window.localStorage.removeItem(legacySavedCardsKey);
        }

        if (legacyMainCardRaw !== null) {
            window.localStorage.removeItem(legacyMainCardKey);
        }

        window.localStorage.removeItem('saved_cards');
        window.localStorage.removeItem('main_card_id');
    }, [legacyMainCardKey, legacySavedCardsKey, setWalletBalanceState, walletBalanceKey]);

    useEffect(() => {
        let isActive = true;

        const syncWalletBalance = async () => {
            const nextBalance = await fetchWalletBalance();

            if (!isActive || nextBalance === null) {
                return;
            }

            setWalletBalanceState(nextBalance);
        };

        void syncWalletBalance();

        return () => {
            isActive = false;
        };
    }, [setWalletBalanceState]);

    const setWalletBalance = (value: number) => {
        const nextValue = Number.isFinite(value) ? Math.max(0, value) : 0;
        setWalletBalanceState(nextValue);
    };

    const addFunds = async (amount: number): Promise<WalletMutationResult> => {
        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                ok: false,
                message: 'Please enter a valid top up amount.',
            };
        }

        const previousBalance = walletBalance;
        const nextBalance = Math.max(0, previousBalance + amount);
        setWalletBalance(nextBalance);

        try {
            const response = await walletService.topUp(amount);
            const updatedBalance = Math.max(0, response.wallet_balance);
            walletBalanceCachedValue = updatedBalance;
            walletBalanceCachedAt = Date.now();
            setWalletBalance(updatedBalance);
            return { ok: true };
        } catch (error) {
            setWalletBalance(previousBalance);

            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to update your wallet balance right now.';

            return { ok: false, message };
        }
    };

    const deductFunds = async (amount: number): Promise<boolean> => {
        if (!Number.isFinite(amount) || amount <= 0) {
            return false;
        }

        const previousBalance = walletBalance;
        const nextBalance = Math.max(0, previousBalance - amount);
        setWalletBalance(nextBalance);

        try {
            const response = await walletService.spend(amount);
            const updatedBalance = Math.max(0, response.wallet_balance);
            walletBalanceCachedValue = updatedBalance;
            walletBalanceCachedAt = Date.now();
            setWalletBalance(updatedBalance);
            return true;
        } catch {
            setWalletBalance(previousBalance);
            return false;
        }
    };

    return {
        walletBalance,
        setWalletBalance,
        addFunds,
        deductFunds,
    };
}