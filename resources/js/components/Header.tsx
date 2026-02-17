import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCards } from '../hooks/useCards';
import { formatCurrency } from '../utils/helpers';
import { AccountSection } from '../types';

interface HeaderProps {
    onNavigateHome: () => void;
    onNavigateLogin: () => void;
    onNavigateRegister: () => void;
    onNavigateAccount: (section?: AccountSection) => void;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onNavigateHome,
    onNavigateLogin,
    onNavigateRegister,
    onNavigateAccount,
    onLogout
}) => {
    const { authUser } = useAuth();
    const { savedCards, mainCardId } = useCards();

    const mainCard = savedCards.find(card => card.id === mainCardId);

    const getCardLogo = (type: string) => {
        const extension = type === 'mastercard' ? 'jpg' : 'png';
        const logoName = type === 'mastercard' ? 'landbank' : type;
        return `/icons/${logoName}.${extension}`;
    };

    return (
        <header className="topbar">
            <a onClick={onNavigateHome} className="brand">AUCTIFY</a>
            <div className="search-bar">
                <input type="text" placeholder="Search for auctions, items, categories..." />
                <button className="search-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                </button>
            </div>
            <div className="actions">
                <div className="dropdown-wrapper">
                    <span
                        className="dropdown-trigger login-trigger"
                        aria-label={authUser ? 'Account menu' : 'Login or Register'}
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-3 2.5-5 8-5s8 2 8 5" />
                        </svg>
                        <span>
                            {authUser ? `Hi, ${authUser.name.split(' ')[0]}` : 'Login / Register'}
                        </span>
                    </span>
                    <div className="dropdown-menu">
                        {authUser ? (
                            <>
                                <div onClick={() => onNavigateAccount('details')} className="dropdown-item clickable">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-3 2.5-5 8-5s8 2 8 5" />
                                    </svg>
                                    <span>Details</span>
                                </div>
                                <div
                                    className="dropdown-item clickable"
                                    onClick={() => onNavigateAccount('cashback')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M12 7v10M9 9h3.5a2.5 2.5 0 0 1 0 5H10" />
                                    </svg>
                                    <span>Cashback</span>
                                    <span className="dropdown-amount">Php 0.00</span>
                                </div>
                                <div className="dropdown-item clickable" onClick={() => onNavigateAccount('wallet')}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="7" width="18" height="12" rx="2" />
                                        <path d="M7 7V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2" />
                                        <path d="M7 12h4" />
                                    </svg>
                                    <span>Wallet</span>
                                    {mainCard && (
                                        <img
                                            src={getCardLogo(mainCard.type)}
                                            alt="Card logo"
                                            className="dropdown-card-icon"
                                        />
                                    )}
                                    <span className="dropdown-amount">
                                        {mainCard
                                            ? formatCurrency(mainCard.balance || 0)
                                            : 'Php 0.00'
                                        }
                                    </span>
                                </div>
                                <div
                                    className="dropdown-item clickable"
                                    onClick={() => onNavigateAccount('wishlist')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                                    </svg>
                                    <span>Wishlist</span>
                                </div>
                                <div
                                    className="dropdown-item clickable"
                                    onClick={() => onNavigateAccount('orders')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="16" rx="2" />
                                        <path d="M7 8h10M7 12h10M7 16h6" />
                                    </svg>
                                    <span>Orders</span>
                                </div>
                                <div
                                    className="dropdown-item clickable"
                                    onClick={() => onNavigateAccount('reviews')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9" />
                                    </svg>
                                    <span>Reviews</span>
                                </div>
                                <div className="dropdown-item clickable">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <span>FAQ</span>
                                </div>
                                <div
                                    onClick={onLogout}
                                    className="dropdown-item clickable"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                        <path d="M10 17l5-5-5-5" />
                                        <path d="M13.8 12H3" />
                                    </svg>
                                    <span>Logout</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div onClick={onNavigateLogin} className="dropdown-item clickable">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                                    </svg>
                                    Login
                                </div>
                                <div onClick={onNavigateRegister} className="dropdown-item clickable">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <line x1="19" y1="8" x2="19" y2="14" />
                                        <line x1="22" y1="11" x2="16" y2="11" />
                                    </svg>
                                    Register
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="dropdown-wrapper bag-dropdown">
                    <span className="dropdown-trigger" aria-label="Shopping Bag">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <rect x="4" y="7" width="16" height="13" rx="2" ry="2" />
                            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                        </svg>
                    </span>
                    <div className="dropdown-menu bag-menu">
                        <div className="bag-empty-state">
                            <div className="bag-icon-wrapper">
                                <svg className="bag-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="7" width="18" height="13" rx="2" ry="2"/>
                                    <path d="M8 7V5a4 4 0 0 1 8 0v2"/>
                                    <path d="M12 12v3" strokeLinecap="round"/>
                                    <circle cx="12" cy="15" r="0.5" fill="currentColor"/>
                                </svg>
                                <div className="sparkle sparkle-1">✨</div>
                                <div className="sparkle sparkle-2">✨</div>
                            </div>
                            <h3 className="bag-title">Your Bag is empty.</h3>
                            <p className="bag-subtitle">Start filling it up with your favourites.</p>
                            <button className="bag-cta-btn">See what's new</button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
