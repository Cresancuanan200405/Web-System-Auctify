import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useCards } from '../hooks/useCards';
import { addSellerOrder, useOrderHistory } from '../hooks/useOrderHistory';
import { useWonAuctions } from '../hooks/useWonAuctions';
import { addressService } from '../services/api';
import type { Address, BagAuctionItem, Card } from '../types';
import { formatCurrency } from '../utils/helpers';

interface BagPageProps {
    onNavigateHome: () => void;
    onNavigateToAuction: (auctionId: number) => void;
}

export const BagPage: React.FC<BagPageProps> = ({
    onNavigateHome,
    onNavigateToAuction,
}) => {
    const { authUser } = useAuth();
    const {
        savedCards,
        mainCardId,
        setMainCardId,
        updateCard,
        getCardDisplayName,
    } = useCards();
    const { wonAuctions, isLoadingWonAuctions } = useWonAuctions();
    const { orders, addOrder } = useOrderHistory();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [checkoutItem, setCheckoutItem] = useState<BagAuctionItem | null>(
        null,
    );
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [selectedCardId, setSelectedCardId] = useState<number | null>(
        mainCardId,
    );
    const [checkoutError, setCheckoutError] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const canRenderPortal = typeof document !== 'undefined';

    const activeBagItems = useMemo(
        () =>
            wonAuctions.filter(
                (item) => !orders.some((order) => order.auction_id === item.id),
            ),
        [orders, wonAuctions],
    );

    useEffect(() => {
        setSelectedCardId(mainCardId);
    }, [mainCardId]);

    useEffect(() => {
        if (!checkoutItem) {
            return;
        }

        const { body } = document;
        const previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        return () => {
            body.style.overflow = previousOverflow;
        };
    }, [checkoutItem]);

    useEffect(() => {
        if (!authUser) {
            setAddresses([]);
            return;
        }

        let isActive = true;
        setAddressLoading(true);

        void (async () => {
            try {
                const result = await addressService.getAddresses();
                if (!isActive) {
                    return;
                }

                setAddresses(result);
                setSelectedAddressId(
                    (current) => current || result[0]?.id || '',
                );
            } catch {
                if (isActive) {
                    setAddresses([]);
                }
            } finally {
                if (isActive) {
                    setAddressLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, [authUser]);

    const resolveMediaUrl = (url?: string) => {
        if (!url) {
            return '';
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(
            /\/$/,
            '',
        );
        if (!apiBase) {
            return url;
        }

        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const formatAddress = (address: Address) => {
        return [
            `${address.first_name} ${address.last_name}`.trim(),
            address.street_address,
            address.barangay,
            address.city,
            address.province,
            address.region,
        ]
            .filter(Boolean)
            .join(', ');
    };

    const formatAddressOptionLabel = (address: Address) => {
        const shortAddress = [
            address.street_address,
            address.city,
            address.province,
        ]
            .filter(Boolean)
            .join(', ');
        return compactLabel(shortAddress, 44);
    };

    const formatCardLabel = (card: Card) => {
        return `${getCardDisplayName(card.type)} •••• ${card.number.slice(-4)} • ${formatCurrency(Number(card.balance ?? 0))}`;
    };

    const renderCardBrandLogo = (type: Card['type']) => {
        switch (type) {
            case 'visa':
                return (
                    <svg viewBox="0 0 48 18" role="img" aria-label="Visa">
                        <text
                            x="2"
                            y="13"
                            fontSize="12"
                            fontWeight="800"
                            fill="#ffffff"
                            letterSpacing="0.08em"
                        >
                            VISA
                        </text>
                    </svg>
                );
            case 'mastercard':
                return (
                    <svg viewBox="0 0 44 20" role="img" aria-label="Mastercard">
                        <circle cx="16" cy="10" r="7" fill="#ef4444" />
                        <circle
                            cx="24"
                            cy="10"
                            r="7"
                            fill="#f59e0b"
                            fillOpacity="0.9"
                        />
                    </svg>
                );
            case 'jcb':
                return (
                    <svg viewBox="0 0 32 18" role="img" aria-label="JCB">
                        <text
                            x="2"
                            y="13"
                            fontSize="11"
                            fontWeight="800"
                            fill="#ffffff"
                            letterSpacing="0.06em"
                        >
                            JCB
                        </text>
                    </svg>
                );
            case 'gcash':
                return (
                    <svg viewBox="0 0 48 18" role="img" aria-label="GCash">
                        <text
                            x="2"
                            y="13"
                            fontSize="10"
                            fontWeight="800"
                            fill="#ffffff"
                            letterSpacing="0.06em"
                        >
                            GCASH
                        </text>
                    </svg>
                );
            case 'maya':
                return (
                    <svg viewBox="0 0 40 18" role="img" aria-label="Maya">
                        <text
                            x="2"
                            y="13"
                            fontSize="11"
                            fontWeight="800"
                            fill="#ffffff"
                            letterSpacing="0.08em"
                        >
                            MAYA
                        </text>
                    </svg>
                );
            default:
                return (
                    <svg viewBox="0 0 40 18" role="img" aria-label="Card">
                        <text
                            x="2"
                            y="13"
                            fontSize="10"
                            fontWeight="800"
                            fill="#ffffff"
                        >
                            CARD
                        </text>
                    </svg>
                );
        }
    };

    const compactLabel = (value: string, max = 72) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (normalized.length <= max) {
            return normalized;
        }

        return `${normalized.slice(0, max - 3)}...`;
    };

    const selectedAddress =
        addresses.find((address) => address.id === selectedAddressId) ?? null;
    const selectedCard =
        savedCards.find((card) => card.id === selectedCardId) ?? null;
    const checkoutAmount = Number(checkoutItem?.winning_bid_amount ?? 0);
    const remainingBalance = selectedCard
        ? Number(
              (Number(selectedCard.balance ?? 0) - checkoutAmount).toFixed(2),
          )
        : null;
    const selectedAddressPreview = selectedAddress
        ? formatAddress(selectedAddress)
        : 'No delivery address selected yet.';
    const selectedCardPreview = selectedCard
        ? formatCardLabel(selectedCard)
        : 'No payment card selected yet.';

    const handleOpenCheckout = (item: BagAuctionItem) => {
        setCheckoutItem(item);
        setSelectedAddressId(addresses[0]?.id || '');
        setSelectedCardId(mainCardId ?? savedCards[0]?.id ?? null);
        setCheckoutError('');
    };

    const handleConfirmCheckout = () => {
        if (!checkoutItem) {
            return;
        }

        const selectedAddress = addresses.find(
            (address) => address.id === selectedAddressId,
        );
        const selectedCard = savedCards.find(
            (card) => card.id === selectedCardId,
        );
        const totalAmount = Number(checkoutItem.winning_bid_amount ?? 0);

        if (!selectedAddress) {
            setCheckoutError('Select a delivery address before checkout.');
            return;
        }

        if (!selectedCard) {
            setCheckoutError('Select a payment card before checkout.');
            return;
        }

        if (Number(selectedCard.balance ?? 0) < totalAmount) {
            setCheckoutError(
                'The selected card does not have enough balance for this payment.',
            );
            return;
        }

        setIsCheckingOut(true);

        window.setTimeout(() => {
            updateCard(selectedCard.id, (card) => ({
                ...card,
                balance: Number(
                    (Number(card.balance ?? 0) - totalAmount).toFixed(2),
                ),
            }));

            if (mainCardId !== selectedCard.id) {
                setMainCardId(selectedCard.id);
            }

            addOrder({
                id: `${checkoutItem.id}-${Date.now()}`,
                auction_id: checkoutItem.id,
                title: checkoutItem.title,
                category: checkoutItem.category,
                seller_user_id: checkoutItem.user?.id ?? checkoutItem.user_id,
                seller_name:
                    checkoutItem.user?.seller_registration?.shop_name?.trim() ||
                    checkoutItem.user?.name ||
                    'Unknown Seller',
                seller_shop_name:
                    checkoutItem.user?.seller_registration?.shop_name?.trim() ||
                    checkoutItem.user?.name ||
                    'Unknown Seller',
                buyer_user_id: authUser?.id,
                buyer_name: authUser?.name,
                buyer_email: authUser?.email,
                amount_paid: checkoutItem.winning_bid_amount,
                status: 'processing',
                address_summary: formatAddress(selectedAddress),
                payment_card_label: `${getCardDisplayName(selectedCard.type)} •••• ${selectedCard.number.slice(-4)}`,
                media_url: resolveMediaUrl(checkoutItem.media?.[0]?.url),
                media_type: checkoutItem.media?.[0]?.media_type,
                purchased_at: new Date().toISOString(),
            });

            if ((checkoutItem.user?.id ?? checkoutItem.user_id) > 0) {
                addSellerOrder(checkoutItem.user?.id ?? checkoutItem.user_id, {
                    id: `${checkoutItem.id}-${Date.now()}-seller`,
                    auction_id: checkoutItem.id,
                    title: checkoutItem.title,
                    category: checkoutItem.category,
                    seller_user_id:
                        checkoutItem.user?.id ?? checkoutItem.user_id,
                    seller_name:
                        checkoutItem.user?.seller_registration?.shop_name?.trim() ||
                        checkoutItem.user?.name ||
                        'Unknown Seller',
                    seller_shop_name:
                        checkoutItem.user?.seller_registration?.shop_name?.trim() ||
                        checkoutItem.user?.name ||
                        'Unknown Seller',
                    buyer_user_id: authUser?.id,
                    buyer_name: authUser?.name,
                    buyer_email: authUser?.email,
                    amount_paid: checkoutItem.winning_bid_amount,
                    status: 'processing',
                    address_summary: formatAddress(selectedAddress),
                    payment_card_label: `${getCardDisplayName(selectedCard.type)} •••• ${selectedCard.number.slice(-4)}`,
                    media_url: resolveMediaUrl(checkoutItem.media?.[0]?.url),
                    media_type: checkoutItem.media?.[0]?.media_type,
                    purchased_at: new Date().toISOString(),
                });
            }

            setIsCheckingOut(false);
            setCheckoutItem(null);
            setCheckoutError('');
            toast.success(
                `Checkout complete. Deducted ${formatCurrency(totalAmount)} from your selected card.`,
                { autoClose: 2800 },
            );
        }, 350);
    };

    if (authUser && isLoadingWonAuctions) {
        return (
            <main className="content">
                <div className="bag-page-container">
                    <div className="bag-empty-state">
                        <h1 className="bag-title">Loading your bag...</h1>
                        <p className="bag-subtitle">
                            Checking the auctions you have won.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (authUser && activeBagItems.length > 0) {
        return (
            <main className="content">
                <div className="bag-page-container bag-page-filled">
                    <div className="bag-page-head">
                        <div>
                            <h1 className="bag-page-title">
                                Your Won Auctions
                            </h1>
                            <p className="bag-page-subtitle">
                                Every auction you win is added here
                                automatically.
                            </p>
                        </div>
                        <span className="bag-page-count">
                            {activeBagItems.length} item(s)
                        </span>
                    </div>
                    <div className="bag-item-grid">
                        {activeBagItems.map((item) => {
                            const sellerName =
                                item.user?.seller_registration?.shop_name?.trim() ||
                                item.user?.name ||
                                'Unknown Seller';
                            const firstMedia = item.media?.[0];
                            const mediaUrl = resolveMediaUrl(firstMedia?.url);

                            return (
                                <article
                                    key={item.id}
                                    className="bag-item-card"
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
                                    <div className="bag-item-media-wrap">
                                        {mediaUrl ? (
                                            firstMedia?.media_type ===
                                            'video' ? (
                                                <video
                                                    className="bag-item-media"
                                                    src={mediaUrl}
                                                    muted
                                                    preload="metadata"
                                                />
                                            ) : (
                                                <img
                                                    className="bag-item-media"
                                                    src={mediaUrl}
                                                    alt={item.title}
                                                />
                                            )
                                        ) : (
                                            <div className="bag-item-media bag-item-media-empty">
                                                No Media
                                            </div>
                                        )}
                                    </div>
                                    <div className="bag-item-content">
                                        <p className="bag-item-badge">Won</p>
                                        <p className="bag-item-title">
                                            {item.title}
                                        </p>
                                        <p className="bag-item-meta">
                                            Seller: {sellerName}
                                        </p>
                                        <p className="bag-item-meta">
                                            Winning bid:{' '}
                                            {formatCurrency(
                                                Number(
                                                    item.winning_bid_amount ??
                                                        0,
                                                ),
                                            )}
                                        </p>
                                        <div className="bag-item-actions">
                                            <button
                                                type="button"
                                                className="bag-item-open-btn"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onNavigateToAuction(
                                                        item.id,
                                                    );
                                                }}
                                            >
                                                View Auction
                                            </button>
                                            <button
                                                type="button"
                                                className="bag-item-checkout-btn"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenCheckout(item);
                                                }}
                                            >
                                                Checkout
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
                {checkoutItem &&
                    canRenderPortal &&
                    createPortal(
                        <div
                            className="bag-checkout-overlay"
                            onClick={() =>
                                !isCheckingOut && setCheckoutItem(null)
                            }
                        >
                            <div
                                className="bag-checkout-dialog"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="bag-checkout-head">
                                    <div>
                                        <p className="bag-checkout-kicker">
                                            Secure Checkout
                                        </p>
                                        <h2 className="bag-checkout-title">
                                            Complete your purchase
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        className="bag-checkout-close"
                                        onClick={() => setCheckoutItem(null)}
                                        disabled={isCheckingOut}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="bag-checkout-body">
                                    <div className="bag-checkout-summary">
                                        <p className="bag-checkout-item-title">
                                            {checkoutItem.title}
                                        </p>
                                        <p className="bag-checkout-item-meta">
                                            Winning total:{' '}
                                            {formatCurrency(
                                                Number(
                                                    checkoutItem.winning_bid_amount ??
                                                        0,
                                                ),
                                            )}
                                        </p>
                                    </div>
                                    <label className="bag-checkout-label">
                                        Delivery address
                                        <select
                                            value={selectedAddressId}
                                            onChange={(event) =>
                                                setSelectedAddressId(
                                                    event.target.value,
                                                )
                                            }
                                            disabled={
                                                addressLoading || isCheckingOut
                                            }
                                        >
                                            <option value="">
                                                Select an address
                                            </option>
                                            {addresses.map((address) => (
                                                <option
                                                    key={address.id}
                                                    value={address.id}
                                                >
                                                    {formatAddressOptionLabel(
                                                        address,
                                                    )}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="bag-checkout-field-preview">
                                            {selectedAddressPreview}
                                        </p>
                                    </label>
                                    <div className="bag-checkout-label">
                                        <span>Payment card</span>
                                        <div
                                            className="checkout-card-list"
                                            role="list"
                                            aria-label="Saved payment cards"
                                        >
                                            {savedCards.map((card) => (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    className={`checkout-card-option ${selectedCardId === card.id ? 'is-selected' : ''}`}
                                                    onClick={() =>
                                                        setSelectedCardId(
                                                            card.id,
                                                        )
                                                    }
                                                    disabled={isCheckingOut}
                                                >
                                                    <div
                                                        className={`checkout-card-visual checkout-card-visual-${card.type}`}
                                                    >
                                                        <span
                                                            className="checkout-card-chip"
                                                            aria-hidden="true"
                                                        />
                                                        <span className="checkout-card-brand">
                                                            {renderCardBrandLogo(
                                                                card.type,
                                                            )}
                                                        </span>
                                                        <span className="checkout-card-number">
                                                            ••••{' '}
                                                            {card.number.slice(
                                                                -4,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="checkout-card-meta">
                                                        <span>
                                                            {formatCardLabel(
                                                                card,
                                                            )}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="bag-checkout-field-preview">
                                            {selectedCardPreview}
                                        </p>
                                    </div>

                                    <div
                                        className="checkout-deduction-box"
                                        aria-live="polite"
                                    >
                                        <div className="checkout-deduction-row">
                                            <span>Total deduction</span>
                                            <strong>
                                                {formatCurrency(checkoutAmount)}
                                            </strong>
                                        </div>
                                        <div className="checkout-deduction-row">
                                            <span>
                                                Card balance after payment
                                            </span>
                                            <strong>
                                                {remainingBalance !== null
                                                    ? formatCurrency(
                                                          Math.max(
                                                              0,
                                                              remainingBalance,
                                                          ),
                                                      )
                                                    : '--'}
                                            </strong>
                                        </div>
                                    </div>

                                    {!addresses.length && !addressLoading && (
                                        <p className="bag-checkout-hint">
                                            Add an address in your account
                                            before placing this order.
                                        </p>
                                    )}
                                    {!savedCards.length && (
                                        <p className="bag-checkout-hint">
                                            Add a wallet card in your account
                                            before placing this order.
                                        </p>
                                    )}
                                    {checkoutError && (
                                        <p className="bag-checkout-error">
                                            {checkoutError}
                                        </p>
                                    )}
                                </div>
                                <div className="bag-checkout-actions">
                                    <button
                                        type="button"
                                        className="bag-checkout-cancel"
                                        onClick={() => setCheckoutItem(null)}
                                        disabled={isCheckingOut}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="bag-checkout-submit"
                                        onClick={handleConfirmCheckout}
                                        disabled={
                                            isCheckingOut ||
                                            !addresses.length ||
                                            !savedCards.length
                                        }
                                    >
                                        {isCheckingOut
                                            ? 'Processing...'
                                            : 'Pay Now'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )}
            </main>
        );
    }

    return (
        <main className="content">
            <div className="bag-page-container">
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
                            <rect
                                x="3"
                                y="7"
                                width="18"
                                height="13"
                                rx="2"
                                ry="2"
                            />
                            <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                            <path d="M9 13h6" strokeLinecap="round" />
                        </svg>
                        <div className="sparkle sparkle-1">✨</div>
                        <div className="sparkle sparkle-2">✨</div>
                    </div>
                    <h1 className="bag-title">Your Bag is empty.</h1>
                    <p className="bag-subtitle">
                        {authUser
                            ? 'Win an auction and it will appear here automatically.'
                            : 'Sign in and win an auction to see it in your bag.'}
                    </p>
                    <button
                        type="button"
                        className="bag-cta-btn"
                        onClick={onNavigateHome}
                    >
                        Let's go Shopping!
                    </button>
                </div>
            </div>
        </main>
    );
};
