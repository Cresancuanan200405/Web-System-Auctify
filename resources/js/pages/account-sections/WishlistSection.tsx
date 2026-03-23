import React from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { WishlistItem } from '../../types';

interface WishlistSectionProps {
    onNavigateToAuction: (auctionId: number) => void;
}

export const WishlistSection: React.FC<WishlistSectionProps> = ({
    onNavigateToAuction,
}) => {
    const { authUser } = useAuth();
    const wishlistKey = `wishlist_items_${authUser?.id ?? 'guest'}`;
    const [wishlistItems, setWishlistItems] = useLocalStorage<WishlistItem[]>(
        wishlistKey,
        [],
    );

    const handleGoShopping = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const removeItem = (id: number) => {
        setWishlistItems(wishlistItems.filter((item) => item.id !== id));
        toast.info('Removed from wishlist.', { autoClose: 2200 });
    };

    const formatPeso = (value?: string) => {
        const amount = Number(value ?? 0);
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    };

    return (
        <div className="wishlist-main">
            {wishlistItems.length === 0 ? (
                <div className="wishlist-empty-card">
                    <div className="wishlist-illustration" aria-hidden="true">
                        <div className="wishlist-circle">
                            <svg
                                width="80"
                                height="80"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            >
                                <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                            </svg>
                        </div>
                    </div>
                    <div className="wishlist-title">
                        Your Wishlist is empty.
                    </div>
                    <div className="wishlist-text">
                        Start saving auctions you love and find them all in one
                        place.
                    </div>
                    <button
                        type="button"
                        className="wishlist-button"
                        onClick={handleGoShopping}
                    >
                        Let's go Shopping!
                    </button>
                </div>
            ) : (
                <div className="wishlist-list-card">
                    <div className="wishlist-list-head">
                        <h3>Saved Auctions</h3>
                        <span>{wishlistItems.length} item(s)</span>
                    </div>
                    <div className="wishlist-grid">
                        {wishlistItems.map((item) => (
                            <article
                                key={item.id}
                                className="wishlist-item-card"
                                role="button"
                                tabIndex={0}
                                onClick={() => onNavigateToAuction(item.id)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        onNavigateToAuction(item.id);
                                    }
                                }}
                            >
                                <div className="wishlist-item-media-wrap">
                                    {item.mediaUrl ? (
                                        item.mediaType === 'video' ? (
                                            <video
                                                className="wishlist-item-media"
                                                src={item.mediaUrl}
                                                muted
                                                preload="metadata"
                                            />
                                        ) : (
                                            <img
                                                className="wishlist-item-media"
                                                src={item.mediaUrl}
                                                alt={item.title}
                                            />
                                        )
                                    ) : (
                                        <div className="wishlist-item-media wishlist-item-media-empty">
                                            No Media
                                        </div>
                                    )}
                                </div>
                                <div className="wishlist-item-content">
                                    <p className="wishlist-item-category">
                                        {(
                                            item.category || 'Product'
                                        ).toUpperCase()}
                                    </p>
                                    <p className="wishlist-item-title">
                                        {item.title}
                                    </p>
                                    <p className="wishlist-item-price">
                                        {formatPeso(item.price)}
                                    </p>
                                    <button
                                        type="button"
                                        className="wishlist-item-remove"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            removeItem(item.id);
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
