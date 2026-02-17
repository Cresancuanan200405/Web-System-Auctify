import React from 'react';
import { Card } from '../types';
import { formatCurrency, maskCardNumber } from '../utils/helpers';

interface CardDisplayProps {
    card: Card;
    isMain?: boolean;
    onDelete?: (cardId: number) => void;
    onSelect?: (cardId: number) => void;
    showBalance?: boolean;
    selectable?: boolean;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
    card,
    isMain = false,
    onDelete,
    onSelect,
    showBalance = false,
    selectable = false
}) => {
    const getCardGradient = (type: Card['type']) => {
        const gradients = {
            visa: 'linear-gradient(135deg, #1a1f71 0%, #0f4c81 100%)',
            mastercard: 'linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)',
            jcb: 'linear-gradient(135deg, #0e4c96 0%, #15803d 100%)',
            gcash: 'linear-gradient(135deg, #007dfe 0%, #0066d9 100%)',
            maya: 'linear-gradient(135deg, #00d632 0%, #00b82a 100%)'
        };
        return gradients[type];
    };

    const getCardLogo = (type: Card['type']) => {
        // Landbank uses .jpg, others use .png
        const extension = type === 'mastercard' ? 'jpg' : 'png';
        const logoName = type === 'mastercard' ? 'landbank' : type;
        return `/icons/${logoName}.${extension}`;
    };

    const getCardDisplayName = (type: Card['type']) => {
        return type === 'mastercard' ? 'LANDBANK' : type.toUpperCase();
    };

    const handleCardClick = () => {
        if (selectable && onSelect) {
            onSelect(card.id);
        }
    };

    return (
        <div
            className={`payment-card ${selectable ? 'selectable' : ''} ${isMain ? 'main-card' : ''}`}
            style={{ background: getCardGradient(card.type) }}
            onClick={handleCardClick}
        >
            <div className="card-header">
                <img
                    src={getCardLogo(card.type)}
                    alt={getCardDisplayName(card.type)}
                    className="card-logo"
                />
                {isMain && <span className="main-badge">MAIN</span>}
            </div>
            
            <div className="card-number">{maskCardNumber(card.number)}</div>
            
            <div className="card-details">
                <div className="card-holder">
                    <span className="card-label">CARD HOLDER</span>
                    <span className="card-value">{card.name}</span>
                </div>
                <div className="card-expiry">
                    <span className="card-label">EXPIRES</span>
                    <span className="card-value">{card.expiry}</span>
                </div>
            </div>

            {showBalance && (
                <div className="card-balance">
                    <span className="balance-label">Balance</span>
                    <span className="balance-value">{formatCurrency(card.balance || 0)}</span>
                </div>
            )}

            {onDelete && (
                <button
                    className="card-delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this card?')) {
                            onDelete(card.id);
                        }
                    }}
                    title="Delete card"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </button>
            )}
        </div>
    );
};
