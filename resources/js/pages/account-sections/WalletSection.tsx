import React from 'react';
import { toast } from 'react-toastify';
import { useCards } from '../../hooks/useCards';
import { formatCurrency } from '../../utils/helpers';

export const WalletSection: React.FC = () => {
    const { savedCards, mainCardId, setMainCardId, getMainCard } = useCards();
    const mainCard = getMainCard();

    const getCardLogo = (type: string) => {
        const extension = type === 'mastercard' ? 'jpg' : 'png';
        const logoName = type === 'mastercard' ? 'landbank' : type;
        return `/icons/${logoName}.${extension}`;
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
                    <button type="button" className="wallet-balance-link">
                        How does it work?
                    </button>
                </div>
            </div>

            {savedCards.length > 0 && (
                <div className="wallet-cards-section">
                    <h3 className="wallet-cards-title">Select Main Card for Transactions</h3>
                    <div className="wallet-cards-list">
                        {savedCards.map((card: any) => (
                                <div
                                    key={card.id}
                                    className={`wallet-card-item ${mainCardId === card.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setMainCardId(card.id);
                                        const displayName = card.type === 'mastercard' ? 'LANDBANK' : card.type.toUpperCase();
                                        toast.success(`${displayName} card set as main card.`, {
                                            autoClose: 2500,
                                        });
                                    }}
                                >
                                <div className="wallet-card-radio">
                                    <input
                                        type="radio"
                                        name="main-card"
                                        checked={mainCardId === card.id}
                                        onChange={() => setMainCardId(card.id)}
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
        </div>
    );
};
