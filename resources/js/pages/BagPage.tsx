import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { addSellerOrder, useOrderHistory } from '../hooks/useOrderHistory';
import { useWallet } from '../hooks/useWallet';
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
    const { walletBalance, deductFunds } = useWallet();
    const { wonAuctions, isLoadingWonAuctions } = useWonAuctions();
    const { orders, addOrder } = useOrderHistory();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [checkoutItem, setCheckoutItem] = useState<BagAuctionItem | null>(
        null,
    );
    const [selectedAddressId, setSelectedAddressId] = useState('');
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

    const compactLabel = (value: string, max = 72) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (normalized.length <= max) {
            return normalized;
        }

        return `${normalized.slice(0, max - 3)}...`;
    };

    const selectedAddress =
        addresses.find((address) => address.id === selectedAddressId) ?? null;
    const checkoutAmount = Number(checkoutItem?.winning_bid_amount ?? 0);
    const selectedAddressPreview = selectedAddress
        ? formatAddress(selectedAddress)
        : 'No delivery address selected yet.';
    const remainingBalance = Number(
        (walletBalance - checkoutAmount).toFixed(2),
    );

    const handleOpenCheckout = (item: BagAuctionItem) => {
        setCheckoutItem(item);
        setSelectedAddressId(addresses[0]?.id || '');
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

        if (walletBalance < totalAmount) {
            setCheckoutError(
                'Your wallet balance does not have enough funds for this payment.',
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
                await orderService.createFromBidWinner({
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

                deductFunds(totalAmount);

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
                    payment_card_label: 'Auctify Wallet',
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
                        payment_card_label: 'Auctify Wallet',
                        media_url: resolveMediaUrl(checkoutItem.media?.[0]?.url),
                        media_type: checkoutItem.media?.[0]?.media_type,
                        purchased_at: new Date().toISOString(),
                    });
                }

                setCheckoutItem(null);
                setCheckoutError('');
                toast.success(
                    `Checkout complete. Deducted ${formatCurrency(totalAmount)} from your wallet.`,
                    { autoClose: 2800 },
                );
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
                                    <div className="checkout-deduction-box" aria-live="polite">
                                        <div className="checkout-deduction-row">
                                            <span>Wallet balance</span>
                                            <strong>
                                                {formatCurrency(walletBalance)}
                                            </strong>
                                        </div>
                                        <div className="checkout-deduction-row">
                                            <span>Balance after payment</span>
                                            <strong>
                                                {formatCurrency(
                                                    Math.max(0, remainingBalance),
                                                )}
                                            </strong>
                                        </div>
                                    </div>

                                    {!addresses.length && !addressLoading && (
                                        <p className="bag-checkout-hint">
                                            Add an address in your account
                                            before placing this order.
                                        </p>
                                    )}
                                    {walletBalance <= 0 && (
                                        <p className="bag-checkout-hint">
                                            Add funds to your wallet before
                                            placing this order.
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
                                            walletBalance <= 0 ||
                                            walletBalance < checkoutAmount
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
