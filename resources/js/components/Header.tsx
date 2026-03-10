import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { useWonAuctions } from '../hooks/useWonAuctions';
import { useCards } from '../hooks/useCards';
import type { AccountSection } from '../types';
import { formatCurrency } from '../utils/helpers';

interface HeaderProps {
    onNavigateHome: () => void;
    disableHomeNavigation?: boolean;
    isSellerMode?: boolean;
    onNavigateLogin: () => void;
    onNavigateRegister: () => void;
    onNavigateAccount: (section?: AccountSection) => void;
    onNavigateSellerDashboard: () => void;
    showSellerDashboardButton: boolean;
    onNavigateOrdersLogin: () => void;
    onNavigateBag: () => void;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onNavigateHome,
    disableHomeNavigation = false,
    isSellerMode = false,
    onNavigateLogin,
    onNavigateRegister,
    onNavigateAccount,
    onNavigateSellerDashboard,
    showSellerDashboardButton,
    onNavigateOrdersLogin,
    onNavigateBag,
    onLogout
}) => {
    const { authUser } = useAuth();
    const { savedCards, mainCardId } = useCards();
    const { wonAuctions, wonAuctionCount, isLoadingWonAuctions } = useWonAuctions();
    const { orders } = useOrderHistory();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const brandLabel = isSellerMode ? 'AUCTIFY Seller' : 'AUCTIFY';

    const mainCard = savedCards.find(card => card.id === mainCardId);
    const activeBagItems = wonAuctions.filter((item) => !orders.some((order) => order.auction_id === item.id));
    const activeBagCount = activeBagItems.length;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // TODO: Implement search navigation
            console.log('Search for:', searchQuery);
        }
    };

    const getCardLogo = (type: string) => {
        const extension = type === 'mastercard' ? 'jpg' : 'png';
        const logoName = type === 'mastercard' ? 'landbank' : type;
        return `/icons/${logoName}.${extension}`;
    };

    return (
        <header className="topbar">
            {disableHomeNavigation ? (
                <span className="brand brand-static">{brandLabel}</span>
            ) : (
                <button type="button" onClick={onNavigateHome} className="brand brand-button">{brandLabel}</button>
            )}
            {!isSellerMode && (
                <form className="search-bar" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        placeholder="Search for auctions, items, categories..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="search-btn" aria-label="Search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </button>
                </form>
            )}
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
                        {authUser?.is_verified && <span className="verified-badge">✓ Verified</span>}
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
                                {!isSellerMode && (
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
                                )}
                                {!isSellerMode && (
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
                                )}
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() => onNavigateAccount('wishlist')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                                        </svg>
                                        <span>Wishlist</span>
                                    </div>
                                )}
                                {!isSellerMode && (
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
                                )}
                                {showSellerDashboardButton && !isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={onNavigateSellerDashboard}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="8" height="8" rx="1" />
                                            <rect x="13" y="3" width="8" height="5" rx="1" />
                                            <rect x="13" y="10" width="8" height="11" rx="1" />
                                            <rect x="3" y="13" width="8" height="8" rx="1" />
                                        </svg>
                                        <span>Seller Dashboard</span>
                                    </div>
                                )}
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() => onNavigateAccount('reviews')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9" />
                                        </svg>
                                        <span>Reviews</span>
                                    </div>
                                )}
                                <div className="dropdown-item clickable">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <span>FAQ</span>
                                </div>
                                <div
                                    onClick={() => setIsLogoutModalOpen(true)}
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
                                <div className="dropdown-item clickable" onClick={onNavigateOrdersLogin}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="16" rx="2" />
                                        <path d="M7 8h10M7 12h10M7 16h6" />
                                    </svg>
                                    <span>Orders</span>
                                </div>
                                <div className="dropdown-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <span>FAQ</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {!isSellerMode && (
                    <span
                        className="fav-link"
                        aria-label="Favorites"
                        onClick={() => (authUser ? onNavigateAccount('wishlist') : onNavigateLogin())}
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                        </svg>
                    </span>
                )}
                {!isSellerMode && (
                    <div className="dropdown-wrapper bag-dropdown">
                        <span
                            className="dropdown-trigger"
                            aria-label="Shopping Bag"
                            role="button"
                            tabIndex={0}
                            onClick={onNavigateBag}
                        >
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
                            {authUser && activeBagCount > 0 && <span className="bag-count-badge">{activeBagCount}</span>}
                        </span>
                        <div className="dropdown-menu bag-menu">
                            {authUser && activeBagCount > 0 ? (
                                <div className="bag-menu-list">
                                    <div className="bag-menu-head">
                                        <h3 className="bag-title">Won Auctions</h3>
                                        <span className="bag-menu-count">{activeBagCount} item(s)</span>
                                    </div>
                                    <div className="bag-menu-items">
                                        {activeBagItems.slice(0, 3).map((item) => {
                                            const sellerName = item.user?.seller_registration?.shop_name?.trim() || item.user?.name || 'Unknown Seller';

                                            return (
                                                <div key={item.id} className="bag-menu-item">
                                                    <p className="bag-menu-item-title">{item.title}</p>
                                                    <p className="bag-menu-item-meta">Seller: {sellerName}</p>
                                                    <p className="bag-menu-item-meta">Winning bid: {formatCurrency(Number(item.winning_bid_amount ?? 0))}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button type="button" className="bag-cta-btn bag-menu-cta" onClick={onNavigateBag}>
                                        Open Bag
                                    </button>
                                </div>
                            ) : (
                                <div className="bag-empty-state">
                                    <div className="bag-icon-wrapper">
                                        <svg
                                            className="bag-icon"
                                            width="80"
                                            height="80"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
                                            <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                                            <path d="M12 12v3" strokeLinecap="round" />
                                            <circle cx="12" cy="15" r="0.5" fill="currentColor" />
                                        </svg>
                                        <div className="sparkle sparkle-1">✨</div>
                                        <div className="sparkle sparkle-2">✨</div>
                                    </div>
                                    <h3 className="bag-title">{isLoadingWonAuctions ? 'Loading your bag...' : 'Your Bag is empty.'}</h3>
                                    <p className="bag-subtitle">
                                        {authUser
                                            ? 'Won auctions will appear here automatically.'
                                            : 'Sign in and win a bid to see your bag items here.'}
                                    </p>
                                    <button
                                        type="button"
                                        className="bag-cta-btn"
                                        onClick={onNavigateHome}
                                    >
                                        Let's go Shopping!
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isLogoutModalOpen && (
                <div
                    className="delete-modal-overlay"
                    onClick={() => setIsLogoutModalOpen(false)}
                >
                    <div
                        className="delete-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">Logout from account?</h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Are you sure you want to log out? You will need to sign in again to access your account.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() => setIsLogoutModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() => {
                                        setIsLogoutModalOpen(false);
                                        onLogout();
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};
