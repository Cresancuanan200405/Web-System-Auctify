import { useLocalStorage } from './useLocalStorage';
import type { Card } from '../types';

export function useCards() {
    const [savedCards, setSavedCards] = useLocalStorage<Card[]>('saved_cards', []);
    const [mainCardId, setMainCardIdState] = useLocalStorage<number | null>('main_card_id', null);

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