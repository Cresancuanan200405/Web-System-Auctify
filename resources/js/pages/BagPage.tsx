import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { addSellerOrder, useOrderHistory } from '../hooks/useOrderHistory';
import { useWonAuctions } from '../hooks/useWonAuctions';
import { addressService, orderService } from '../services/api';
import type { Address, BagAuctionItem } from '../types';
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
    const { wonAuctions, isLoadingWonAuctions, refreshWonAuctions } = useWonAuctions();
    const { orders, addOrder } = useOrderHistory();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [checkoutItem, setCheckoutItem] = useState<BagAuctionItem | null>(
        null,
    );
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
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
        if (!address) {
            return 'Invalid address';
        }
        return [
            `${String(address.first_name || '').trim()} ${String(address.last_name || '').trim()}`.trim(),
            String(address.street_address || '').trim(),
            String(address.barangay || '').trim(),
            String(address.city || '').trim(),
            String(address.province || '').trim(),
            String(address.region || '').trim(),
        ]
            .filter((part) => part && part.length > 0)
            .join(', ');
    };

    const formatAddressOptionLabel = (address: Address | null | undefined) => {
        if (!address) {
            return '';
        }
        const shortAddress = [
            String(address.street_address || '').trim(),
            String(address.city || '').trim(),
            String(address.province || '').trim(),
        ]
            .filter((part) => part && part.length > 0)
            .join(', ');
        return compactLabel(shortAddress, 44);
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
    const selectedAddressPreview = selectedAddress
        ? formatAddress(selectedAddress)
        : 'No delivery address selected yet.';

    const handleOpenCheckout = (item: BagAuctionItem) => {
        setCheckoutItem(item);
        setSelectedAddressId(addresses[0]?.id || '');
        setIsAddressConfirmed(false);
        setCheckoutError('');
    };

    const handleConfirmCheckout = () => {
        if (!checkoutItem) {
            return;
        }

        const selectedAddress = addresses.find(
            (address) => address.id === selectedAddressId,
        );
        const totalAmount = Number(checkoutItem.winning_bid_amount ?? 0);

        if (!selectedAddress) {
            setCheckoutError('Select a delivery address before checkout.');
            return;
        }

        if (!isAddressConfirmed) {
            setCheckoutError(
                'Confirm the selected delivery address before submitting your order.',
            );
            return;
        }

        setIsCheckingOut(true);

        const bidWinnerId = checkoutItem.bid_winner?.id;
        if (!bidWinnerId) {
            setCheckoutError(
                'Unable to confirm checkout because the winning bid record is missing.',
            );
            setIsCheckingOut(false);
            return;
        }


        void (async () => {
            try {
                const response = await orderService.createFromBidWinner({
                    bid_winner_id: bidWinnerId,
                    shipping_address_id: Number(selectedAddressId),
                    subtotal_amount: totalAmount,
                    shipping_fee: 0,
                    service_fee: 0,
                    total_amount: totalAmount,
                    capture_payment: true,
                    payment: {
                        method: 'wallet',
                        provider: 'Auctify Wallet',
                        provider_reference: `bag-${checkoutItem.id}-${Date.now()}`,
                        status: 'paid',
                        amount: totalAmount,
                        currency: 'PHP',
                    },
                    meta: {
                        address_summary: formatAddress(selectedAddress),
                        media_url: resolveMediaUrl(checkoutItem.media?.[0]?.url),
                    },
                });

                const createdOrder = response.order;
                const createdShipping = createdOrder.shipping_address;
                const createdAddressSummary = [
                    createdShipping?.first_name && createdShipping?.last_name
                        ? `${createdShipping.first_name} ${createdShipping.last_name}`
                        : '',
                    createdShipping?.street_address,
                    createdShipping?.barangay,
                    createdShipping?.city,
                    createdShipping?.province,
                    createdShipping?.region,
                ]
                    .filter(Boolean)
                    .join(', ');
                const firstMedia =
                    createdOrder.auction?.media?.[0] ?? checkoutItem.media?.[0];
                const sellerName =
                    createdOrder.seller?.name ||
                    checkoutItem.user?.seller_registration?.shop_name?.trim() ||
                    checkoutItem.user?.name ||
                    'Unknown Seller';

                addOrder({
                    id: String(createdOrder.id),
                    auction_id: createdOrder.auction_id,
                    title:
                        createdOrder.auction?.title ??
                        checkoutItem.title,
                    category:
                        createdOrder.auction?.category ?? checkoutItem.category,
                    seller_user_id:
                        createdOrder.seller?.id ??
                        checkoutItem.user?.id ??
                        checkoutItem.user_id,
                    seller_name: sellerName,
                    seller_shop_name: sellerName,
                    buyer_user_id: createdOrder.buyer?.id ?? authUser?.id,
                    buyer_name: createdOrder.buyer?.name ?? authUser?.name,
                    buyer_email:
                        createdOrder.buyer?.email ?? authUser?.email,
                    amount_paid: String(createdOrder.total_amount ?? totalAmount),
                    status: 'processing',
                    address_summary:
                        createdAddressSummary || formatAddress(selectedAddress),
                    payment_card_label:
                        createdOrder.payments?.[0]?.method?.toUpperCase() ||
                        'Auctify Wallet',
                    media_url: resolveMediaUrl(firstMedia?.url),
                    media_type: firstMedia?.media_type,
                    purchased_at:
                        createdOrder.placed_at ??
                        createdOrder.created_at ??
                        new Date().toISOString(),
                });

                if ((createdOrder.seller?.id ?? checkoutItem.user?.id ?? checkoutItem.user_id) > 0) {
                    addSellerOrder(createdOrder.seller?.id ?? checkoutItem.user?.id ?? checkoutItem.user_id, {
                        id: String(createdOrder.id),
                        auction_id: createdOrder.auction_id,
                        title:
                            createdOrder.auction?.title ??
                            checkoutItem.title,
                        category:
                            createdOrder.auction?.category ?? checkoutItem.category,
                        seller_user_id:
                            createdOrder.seller?.id ??
                            checkoutItem.user?.id ??
                            checkoutItem.user_id,
                        seller_name: sellerName,
                        seller_shop_name: sellerName,
                        buyer_user_id: createdOrder.buyer?.id ?? authUser?.id,
                        buyer_name: createdOrder.buyer?.name ?? authUser?.name,
                        buyer_email:
                            createdOrder.buyer?.email ?? authUser?.email,
                        amount_paid: String(createdOrder.total_amount ?? totalAmount),
                        status: 'processing',
                        address_summary:
                            createdAddressSummary || formatAddress(selectedAddress),
                        payment_card_label:
                            createdOrder.payments?.[0]?.method?.toUpperCase() ||
                            'Auctify Wallet',
                        media_url: resolveMediaUrl(firstMedia?.url),
                        media_type: firstMedia?.media_type,
                        purchased_at:
                            createdOrder.placed_at ??
                            createdOrder.created_at ??
                            new Date().toISOString(),
                    });
                }

                setCheckoutItem(null);
                setCheckoutError('');
                toast.success(
                    'Checkout complete. Your order is now queued for seller fulfillment.',
                    { autoClose: 2800 },
                );
                // Refresh won auctions to remove the item from the bag
                await refreshWonAuctions();
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Unable to create order from the winning bid.';
                setCheckoutError(message);
                toast.error(message);
            } finally {
                setIsCheckingOut(false);
            }
        })();
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
                                        <p className="bag-checkout-item-meta">
                                            Wallet payment is automatically
                                            deducted when you win.
                                        </p>
                                    </div>
                                    <label className="bag-checkout-label">
                                        Delivery address
                                        <select
                                            value={selectedAddressId}
                                            onChange={(event) => {
                                                setSelectedAddressId(
                                                    event.target.value,
                                                );
                                                setIsAddressConfirmed(false);
                                                setCheckoutError('');
                                            }}
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
                                    <label className="bag-checkout-confirm-label">
                                        <input
                                            type="checkbox"
                                            checked={isAddressConfirmed}
                                            onChange={(event) => {
                                                setIsAddressConfirmed(
                                                    event.target.checked,
                                                );
                                                setCheckoutError('');
                                            }}
                                            disabled={isCheckingOut || !selectedAddressId}
                                        />
                                        <span>
                                            I confirm this delivery address is correct and can be shared with the seller.
                                        </span>
                                    </label>
                                    <div className="checkout-deduction-box" aria-live="polite">
                                        <div className="checkout-deduction-row">
                                            <span>Winning amount</span>
                                            <strong>
                                                {formatCurrency(
                                                    Number(
                                                        checkoutItem.winning_bid_amount ??
                                                            0,
                                                    ),
                                                )}
                                            </strong>
                                        </div>
                                        <div className="checkout-deduction-row">
                                            <span>Wallet deduction</span>
                                            <strong>
                                                {checkoutItem.bid_winner
                                                    ?.wallet_deducted_at
                                                    ? 'Completed'
                                                    : 'Pending'}
                                            </strong>
                                        </div>
                                    </div>

                                    {checkoutItem.bid_winner
                                        ?.wallet_deduction_failure_reason && (
                                        <p className="bag-checkout-hint">
                                            {
                                                checkoutItem.bid_winner
                                                    .wallet_deduction_failure_reason
                                            }
                                        </p>
                                    )}

                                    {!addresses.length && !addressLoading && (
                                        <p className="bag-checkout-hint">
                                            Add an address in your account
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
                                            !selectedAddressId ||
                                            !isAddressConfirmed
                                        }
                                    >
                                        {isCheckingOut
                                            ? 'Processing...'
                                            : 'Confirm Order'}
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
