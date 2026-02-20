import { useEffect } from 'react';
import type { Card } from '../types';
import { useLocalStorage } from './useLocalStorage';

export function useCards() {
    const userStorageScope = (() => {
        try {
            const rawUser = window.localStorage.getItem('auth_user');
            if (!rawUser) return 'anonymous';

            const parsedUser = JSON.parse(rawUser) as { id?: number; email?: string };
            if (parsedUser.id) return `user-${parsedUser.id}`;
            if (parsedUser.email) return `email-${parsedUser.email.toLowerCase()}`;
        } catch {
            // fall through to anonymous scope
        }

        return 'anonymous';
    })();

    const scopedSavedCardsKey = `saved_cards_${userStorageScope}`;
    const scopedMainCardKey = `main_card_id_${userStorageScope}`;

    const [savedCards, setSavedCards] = useLocalStorage<Card[]>(scopedSavedCardsKey, []);
    const [mainCardId, setMainCardIdState] = useLocalStorage<number | null>(scopedMainCardKey, null);

    useEffect(() => {
        // One-time migration from legacy shared keys into the current user scope.
        const legacyCardsRaw = window.localStorage.getItem('saved_cards');
        const legacyMainCardRaw = window.localStorage.getItem('main_card_id');
        const scopedCardsRaw = window.localStorage.getItem(scopedSavedCardsKey);
        const scopedMainCardRaw = window.localStorage.getItem(scopedMainCardKey);

        if (scopedCardsRaw === null && legacyCardsRaw) {
            window.localStorage.setItem(scopedSavedCardsKey, legacyCardsRaw);
        }

        if (scopedMainCardRaw === null && legacyMainCardRaw) {
            window.localStorage.setItem(scopedMainCardKey, legacyMainCardRaw);
        }

        // Remove legacy global keys to prevent cross-account leakage.
        window.localStorage.removeItem('saved_cards');
        window.localStorage.removeItem('main_card_id');
    }, [scopedSavedCardsKey, scopedMainCardKey]);

    const addCard = (card: Card) => {
        setSavedCards([...savedCards, card]);
        // Auto-set as main card if it's the first card
        if (savedCards.length === 0) {
            setMainCardIdState(card.id);
        }
    };

    const deleteCard = (cardId: number) => {
        setSavedCards(savedCards.filter(card => card.id !== cardId));
        // Clear main card if deleting the active one
        if (mainCardId === cardId) {
            setMainCardIdState(null);
        }
    };

    const setMainCardId = (cardId: number | null) => {
        setMainCardIdState(cardId);
    };

    const getMainCard = (): Card | undefined => {
        return savedCards.find(card => card.id === mainCardId);
    };

    const getCardDisplayName = (type: Card['type']): string => {
        return type === 'mastercard' ? 'LANDBANK' : type.toUpperCase();
    };

    const getCardLogoPath = (type: Card['type']): string => {
        return type === 'mastercard' ? '/icons/landbank.jpg' : `/icons/${type}.png`;
    };

    return {
        savedCards,
        mainCardId,
        addCard,
        deleteCard,
        setMainCardId,
        getMainCard,
        getCardDisplayName,
        getCardLogoPath
    };
}