import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useCards } from '../../hooks/useCards';
import { formatCurrency } from '../../utils/helpers';

export const WalletSection: React.FC = () => {
    const { savedCards, mainCardId, setMainCardId, getMainCard } = useCards();
    const [pendingMainCardId, setPendingMainCardId] = useState<number | null>(null);
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const mainCard = getMainCard();

    const getCardLogo = (type: string) => {
        const extension = type === 'mastercard' ? 'jpg' : 'png';
        const logoName = type === 'mastercard' ? 'landbank' : type;
        return `/icons/${logoName}.${extension}`;
    };

    const openMainCardConfirm = (cardId: number) => {
        setPendingMainCardId(cardId);
    };

    const closeMainCardConfirm = () => {
        setPendingMainCardId(null);
    };

    const confirmMainCardChange = () => {
        if (pendingMainCardId === null) return;

        const targetCard = savedCards.find((card) => card.id === pendingMainCardId);
        if (!targetCard) {
            setPendingMainCardId(null);
            return;
        }

        setMainCardId(targetCard.id);
        const displayName = targetCard.type === 'mastercard' ? 'LANDBANK' : targetCard.type.toUpperCase();
        toast.success(`${displayName} card set as main card.`, {
            autoClose: 2500,
        });
        setPendingMainCardId(null);
    };

    return (
        <div className="wallet-main">
            <div className="wallet-header">
                <div className="wallet-header-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="3" y="7" width="18" height="12" rx="3" />
                        <path d="M7 7V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                    </svg>
                </div>
                <h2 className="wallet-header-title">My Wallet</h2>
            </div>

            <div className="wallet-balance-card">
                <div className="wallet-balance-illustration" aria-hidden="true">
                    {mainCard ? (
                        <img
                            src={getCardLogo(mainCard.type)}
                            alt={`${mainCard.type} logo`}
                            className="wallet-balance-card-logo"
                        />
                    ) : (
                        <>
                            <div className="wallet-illustration-main" />
                            <div className="wallet-illustration-line" />
                        </>
                    )}
                </div>
                <div className="wallet-balance-content">
                    <div className="wallet-balance-label">You have</div>
                    <div className="wallet-balance-amount">
                        {mainCard ? formatCurrency(mainCard.balance || 0) : 'Php 0.00'}
                    </div>
                    <div className="wallet-balance-subtext">available in wallet credit</div>
                    <button 
                        type="button" 
                        className="wallet-balance-link"
                        onClick={() => setShowHowItWorks(true)}
                    >
                        How does it work?
                    </button>
                </div>
            </div>

            {savedCards.length > 0 && (
                <div className="wallet-cards-section">
                    <h3 className="wallet-cards-title">Select Main Card for Transactions</h3>
                    <div className="wallet-cards-list">
                        {savedCards.map((card) => (
                                <div
                                    key={card.id}
                                    className={`wallet-card-item ${mainCardId === card.id ? 'active' : ''}`}
                                    onClick={() => openMainCardConfirm(card.id)}
                                >
                                <div className="wallet-card-radio">
                                    <input
                                        type="radio"
                                        name="main-card"
                                        checked={mainCardId === card.id}
                                        onChange={() => openMainCardConfirm(card.id)}
                                    />
                                </div>
                                <img
                                    src={getCardLogo(card.type)}
                                    alt={card.type === 'mastercard' ? 'Landbank' : card.type}
                                    className="wallet-card-logo"
                                />
                                <div className="wallet-card-info">
                                    <div className="wallet-card-number">
                                        •••• •••• •••• {card.number.slice(-4)}
                                    </div>
                                    <div className="wallet-card-name">{card.name}</div>
                                </div>
                                <div className="wallet-card-balance">
                                    {formatCurrency(card.balance || 0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {savedCards.length === 0 && (
                <div className="wallet-empty-state">
                    <p>No cards added yet. Add a card in the "My Cards" section to get started.</p>
                </div>
            )}

            <div className="wallet-code-card">
                <div className="wallet-code-header">
                    <div className="wallet-code-icon" aria-hidden="true">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                        >
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="M7 9h10" />
                            <path d="M9 13h2" />
                            <path d="M13 13h2" />
                        </svg>
                    </div>
                    <div className="wallet-code-title">Have a store credit code?</div>
                </div>
                <div className="wallet-code-input-row">
                    <input
                        type="text"
                        className="wallet-code-input"
                        placeholder="Enter store credit code"
                    />
                    <button type="button" className="wallet-code-apply">
                        Apply
                    </button>
                </div>
            </div>
            {pendingMainCardId !== null && (() => {
                const targetCard = savedCards.find((card) => card.id === pendingMainCardId);

                if (!targetCard) {
                    return null;
                }

                const displayName = targetCard.type === 'mastercard' ? 'LANDBANK' : targetCard.type.toUpperCase();

                return (
                    <div className="delete-modal-overlay" onClick={closeMainCardConfirm}>
                        <div
                            className="delete-modal"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="delete-modal-header">
                                <h2 className="delete-modal-title">Set as main card?</h2>
                            </div>
                            <div className="delete-modal-body">
                                <p className="delete-modal-text">
                                    {`Set ${displayName} card ending in ${targetCard.number.slice(-4)} as your main card for transactions?`}
                                </p>
                                <div className="delete-modal-actions">
                                    <button
                                        type="button"
                                        className="delete-modal-cancel"
                                        onClick={closeMainCardConfirm}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="confirm-modal-confirm"
                                        onClick={confirmMainCardChange}
                                    >
                                        Set as main
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {showHowItWorks && (
                <div className="delete-modal-overlay" onClick={() => setShowHowItWorks(false)}>
                    <div
                        className="delete-modal delete-modal-large"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">How does My Wallet work?</h2>
                            <button
                                type="button"
                                className="delete-modal-close"
                                onClick={() => setShowHowItWorks(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="wallet-info-content">
                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">💳 What is My Wallet?</h3>
                                    <p className="wallet-info-text">
                                        My Wallet is your centralized payment hub on Auctify. It displays the available balance from your main card and allows you to manage which payment method you want to use for transactions.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">💰 Wallet Balance</h3>
                                    <p className="wallet-info-text">
                                        Your wallet balance shows the available credit from your currently selected main card. This is the amount you can use to bid on auctions and make purchases on Auctify.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">🎯 Main Card Selection</h3>
                                    <p className="wallet-info-text">
                                        You can select which card you want to use as your main payment method. All your transactions on Auctify will use your main card's balance. Simply click on a card from your saved cards to set it as your main card.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">💳 Supported Payment Methods</h3>
                                    <p className="wallet-info-text">
                                        Auctify supports multiple payment methods:
                                    </p>
                                    <ul className="wallet-info-list">
                                        <li>Visa</li>
                                        <li>Mastercard / Landbank</li>
                                        <li>JCB</li>
                                        <li>GCash</li>
                                        <li>Maya</li>
                                    </ul>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">🎁 Store Credit Codes</h3>
                                    <p className="wallet-info-text">
                                        If you have a store credit code from Auctify, you can redeem it in your wallet. Enter the code and click Apply to add the credit to your selected main card.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">ℹ️ Important Notes</h3>
                                    <ul className="wallet-info-list">
                                        <li>Your wallet automatically reflects updates to your selected card's balance</li>
                                        <li>You must have at least one saved card in "My Cards" to use your wallet</li>
                                        <li>Changing your main card will affect future transactions</li>
                                        <li>All transaction history can be viewed in your account details</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="confirm-modal-confirm"
                                    onClick={() => setShowHowItWorks(false)}
                                >
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
