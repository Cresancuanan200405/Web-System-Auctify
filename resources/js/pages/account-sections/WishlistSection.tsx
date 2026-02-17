import React from 'react';

export const WishlistSection: React.FC = () => {
    return (
        <div className="wishlist-main">
            <div className="wishlist-empty-card">
                <div className="wishlist-illustration" aria-hidden="true">
                    <div className="wishlist-circle">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                        </svg>
                    </div>
                </div>
                <div className="wishlist-title">Your Wishlist is empty.</div>
                <div className="wishlist-text">
                    Start saving auctions you love and find them all in one place.
                </div>
                <button type="button" className="wishlist-button">
                    Let's go Shopping!
                </button>
            </div>
        </div>
    );
};
