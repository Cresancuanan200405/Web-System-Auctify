import React, { useState, FormEvent } from 'react';
import { toast } from 'react-toastify';
import { useCards } from '../../hooks/useCards';
import { Card } from '../../types';
import { generateId } from '../../utils/helpers';

type CardActionModal = {
    kind: 'remove' | 'set-main';
    cardId: number;
};

export const MyCardsSection: React.FC = () => {
    const { savedCards, mainCardId, addCard, deleteCard, setMainCardId, getCardDisplayName } = useCards();
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [cardType, setCardType] = useState<Card['type']>('visa');
    const [number, setNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');
    const [cardActionModal, setCardActionModal] = useState<CardActionModal | null>(null);

    const resetForm = () => {
        setCardType('visa');
        setNumber('');
        setExpiry('');
        setCvc('');
        setName('');
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const newCard: Card = {
            id: Math.floor(Math.random() * 1000000),
            type: cardType,
            number,
            expiry,
            cvc,
            name,
            balance: 10000
        };

        addCard(newCard);
        if (mainCardId === null && savedCards.length === 0) {
            setMainCardId(newCard.id);
        }
        toast.success('Card added successfully with ₱10,000 balance!', {
            autoClose: 3500,
        });
        setIsAddingCard(false);
        resetForm();
    };

    const handleRemoveCard = (card: Card) => {
        setCardActionModal({
            kind: 'remove',
            cardId: card.id,
        });
    };

    const handleSetMainCard = (card: Card) => {
        if (mainCardId === card.id) {
            return;
        }
        setCardActionModal({
            kind: 'set-main',
            cardId: card.id,
        });
    };

    const closeCardActionModal = () => {
        setCardActionModal(null);
    };

    const confirmCardAction = () => {
        if (!cardActionModal) {
            return;
        }

        const targetCard = savedCards.find((card) => card.id === cardActionModal.cardId);
        if (!targetCard) {
            setCardActionModal(null);
            return;
        }

        const displayName = getCardDisplayName(targetCard.type);

        if (cardActionModal.kind === 'remove') {
            deleteCard(targetCard.id);
            toast.success('Card removed successfully.', {
                autoClose: 3500,
            });
            setCardActionModal(null);
            return;
        }

        setMainCardId(targetCard.id);
        toast.success(`${displayName} card set as main card.`, {
            autoClose: 2500,
        });
        setCardActionModal(null);
    };

    return (
        <>
            <div className="cards-main">
                <div className="cards-header">
                    <div className="cards-header-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                    </div>
                    <h2 className="cards-header-title">My Cards ({savedCards.length})</h2>
                </div>

                {savedCards.length === 0 ? (
                    <div className="cards-empty-card">
                        <div className="cards-empty-illustration" aria-hidden="true">
                            <div className="cards-empty-face">
                                <div className="cards-empty-eyes" />
                                <div className="cards-empty-smile" />
                            </div>
                        </div>
                        <div className="cards-empty-title">Simplify Shopping</div>
                        <div className="cards-empty-subtitle">
                            Save Your Credit/Debit Cards Today!
                        </div>
                        <div className="cards-empty-text">
                            Trust in us to deliver not only fashion but also the utmost
                            security and convenience.
                        </div>
                        <button
                            type="button"
                            className="cards-empty-button"
                            onClick={() => setIsAddingCard(true)}
                        >
                            Add New Card
                        </button>
                    </div>
                ) : (
                    <div className="cards-list">
                        {savedCards.map((card) => (
                            <div key={card.id} className="saved-card">
                                <div className="saved-card-header">
                                    <img
                                        src={card.type === 'mastercard' ? '/icons/landbank.jpg' : `/icons/${card.type}.png`}
                                        alt={card.type === 'mastercard' ? 'Landbank' : card.type}
                                        className="saved-card-logo"
                                    />
                                    <button
                                        type="button"
                                        className="saved-card-delete"
                                        onClick={() => handleRemoveCard(card)}
                                        aria-label="Delete card"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="saved-card-number">
                                    •••• •••• •••• {card.number.slice(-4)}
                                </div>
                                <div className="saved-card-details">
                                    <div className="saved-card-name">{card.name}</div>
                                    <div className="saved-card-expiry">{card.expiry}</div>
                                </div>
                                <div className="saved-card-balance">
                                    Balance: ₱{card.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <button
                                    type="button"
                                    className={`saved-card-action ${mainCardId === card.id ? 'main' : ''}`}
                                    onClick={() => handleSetMainCard(card)}
                                    disabled={mainCardId === card.id}
                                >
                                    {mainCardId === card.id ? '✓ Main Card' : 'Set as Main'}
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="cards-add-button"
                            onClick={() => setIsAddingCard(true)}
                        >
                            + Add New Card
                        </button>
                    </div>
                )}

                {isAddingCard && (
                    <div className="card-drawer-overlay">
                        <div className="card-drawer-panel">
                            <div className="card-drawer-header">
                                <button
                                    type="button"
                                    className="card-drawer-close"
                                    onClick={() => setIsAddingCard(false)}
                                    aria-label="Close add card panel"
                                >
                                    ×
                                </button>
                                <h2 className="card-drawer-title">Add New Card</h2>
                            </div>

                            <form className="card-drawer-form" onSubmit={handleSubmit}>
                                <div className="card-drawer-field">
                                    <label htmlFor="cardType">Payment Method *</label>
                                    <select
                                        id="cardType"
                                        value={cardType}
                                        onChange={(event) => setCardType(event.target.value as Card['type'])}
                                        required
                                    >
                                        <option value="visa">Visa</option>
                                        <option value="mastercard">Landbank</option>
                                        <option value="jcb">JCB</option>
                                        <option value="gcash">GCash</option>
                                        <option value="maya">Maya</option>
                                    </select>
                                </div>

                                <div className="card-drawer-field">
                                    <label htmlFor="cardNumber">Card Number</label>
                                    <input
                                        id="cardNumber"
                                        type="text"
                                        placeholder="Card Number"
                                        value={number}
                                        onChange={(event) => setNumber(event.target.value)}
                                        required
                                    />
                                </div>

                                <div className="card-drawer-row">
                                    <div className="card-drawer-field">
                                        <label htmlFor="cardExpiry">Valid Thru (MM/YY)</label>
                                        <input
                                            id="cardExpiry"
                                            type="text"
                                            placeholder="MM/YY"
                                            value={expiry}
                                            onChange={(event) => setExpiry(event.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="card-drawer-field">
                                        <label htmlFor="cardCvc">CVC/CVV</label>
                                        <input
                                            id="cardCvc"
                                            type="text"
                                            placeholder="CVC/CVV"
                                            value={cvc}
                                            onChange={(event) => setCvc(event.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="card-drawer-field">
                                    <label htmlFor="cardName">Name on Card</label>
                                    <input
                                        id="cardName"
                                        type="text"
                                        placeholder="Name on Card"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="card-drawer-submit">
                                    Add Card
                                </button>

                                <div className="card-drawer-logos" aria-hidden="true">
                                    <img src="/icons/visa.png" alt="Visa" className="card-logo" />
                                    <img src="/icons/landbank.jpg" alt="Landbank" className="card-logo" />
                                    <img src="/icons/jcb.png" alt="JCB" className="card-logo" />
                                    <img src="/icons/gcash.png" alt="GCash" className="card-logo" />
                                    <img src="/icons/maya.png" alt="Maya" className="card-logo" />
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {cardActionModal && (() => {
                const targetCard = savedCards.find((card) => card.id === cardActionModal.cardId);

                if (!targetCard) {
                    return null;
                }

                const displayName = getCardDisplayName(targetCard.type);
                const isRemoveAction = cardActionModal.kind === 'remove';

                return (
                    <div className="delete-modal-overlay" onClick={closeCardActionModal}>
                        <div className="delete-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="delete-modal-header">
                                <h2 className="delete-modal-title">
                                    {isRemoveAction ? 'Remove this card?' : 'Set as main card?'}
                                </h2>
                            </div>
                            <div className="delete-modal-body">
                                <p className="delete-modal-text">
                                    {isRemoveAction
                                        ? `Are you sure you want to remove your ${displayName} card ending in ${targetCard.number.slice(-4)}?`
                                        : `Set ${displayName} card ending in ${targetCard.number.slice(-4)} as your main card for transactions?`}
                                </p>
                                <div className="delete-modal-actions">
                                    <button
                                        type="button"
                                        className="delete-modal-cancel"
                                        onClick={closeCardActionModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className={isRemoveAction ? 'delete-modal-confirm' : 'confirm-modal-confirm'}
                                        onClick={confirmCardAction}
                                    >
                                        {isRemoveAction ? 'Remove card' : 'Set as main'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};
