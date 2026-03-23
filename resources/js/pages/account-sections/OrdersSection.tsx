import React, { useState } from 'react';
import { useOrderHistory } from '../../hooks/useOrderHistory';
import { formatCurrency } from '../../utils/helpers';

interface OrdersSectionProps {
    onNavigateToAuction: (
        auctionId: number,
        source?: 'home' | 'seller-store' | 'account-orders',
    ) => void;
    onNavigateSellerStore: (
        sellerId: number,
        sellerName?: string,
        source?: 'home' | 'seller-dashboard' | 'account-orders' | null,
    ) => void;
}

type OrdersTab =
    | 'all'
    | 'unpaid'
    | 'processing'
    | 'delivered'
    | 'returns'
    | 'cancelled';

interface OrderReview {
    orderId: string;
    rating: number;
    comment: string;
    reviewedAt: string;
}

const getReviewsKey = () => {
    try {
        const raw = window.localStorage.getItem('auth_user');
        if (!raw) return 'order_reviews_anonymous';
        const u = JSON.parse(raw) as { id?: number };
        return u.id ? `order_reviews_user-${u.id}` : 'order_reviews_anonymous';
    } catch {
        return 'order_reviews_anonymous';
    }
};

const loadReviews = (): Record<string, OrderReview> => {
    try {
        const raw = window.localStorage.getItem(getReviewsKey());
        return raw ? (JSON.parse(raw) as Record<string, OrderReview>) : {};
    } catch {
        return {};
    }
};

const saveReview = (review: OrderReview) => {
    try {
        const existing = loadReviews();
        existing[review.orderId] = review;
        window.localStorage.setItem(getReviewsKey(), JSON.stringify(existing));
    } catch {
        // ignore
    }
};

export const OrdersSection: React.FC<OrdersSectionProps> = ({
    onNavigateToAuction,
    onNavigateSellerStore,
}) => {
    const [activeTab, setActiveTab] = useState<OrdersTab>('all');
    const { orders } = useOrderHistory();

    // Dialog state
    const [trackOrderId, setTrackOrderId] = useState<string | null>(null);
    const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHoverRating, setReviewHoverRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviews, setReviews] = useState<Record<string, OrderReview>>(() =>
        loadReviews(),
    );

    const handleContinueShopping = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleOpenProduct = (auctionId?: number) => {
        if (!auctionId) {
            return;
        }

        onNavigateToAuction(auctionId, 'account-orders');
    };

    const handleOpenSellerStore = (
        sellerUserId?: number,
        sellerName?: string,
    ) => {
        if (!sellerUserId) {
            return;
        }

        onNavigateSellerStore(sellerUserId, sellerName, 'account-orders');
    };

    const resolveMediaUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(
            /\/$/,
            '',
        );
        if (!apiBase) return url;
        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const getStatusStep = (status: string): 1 | 2 | 3 => {
        if (status === 'processing') return 2;
        if (status === 'delivered') return 3;
        return 1;
    };

    const calculateEstimatedDelivery = (purchasedAt: string): string => {
        const orderDate = new Date(purchasedAt);
        const estimatedDate = new Date(
            orderDate.getTime() + 5 * 24 * 60 * 60 * 1000,
        );
        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(estimatedDate);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    // Handlers
    const handleContactSeller = (
        sellerUserId?: number,
        sellerName?: string,
    ) => {
        if (!sellerUserId) {
            window.dispatchEvent(
                new CustomEvent('auctify-toast', {
                    detail: {
                        type: 'error',
                        message: 'Seller chat is unavailable for this order.',
                    },
                }),
            );
            return;
        }

        window.dispatchEvent(
            new CustomEvent('open-auctify-chat', {
                detail: { sellerUserId, sellerName },
            }),
        );
    };

    const handleSubmitReview = async (orderId: string) => {
        if (reviewRating === 0) return;
        setSubmittingReview(true);
        await new Promise((r) => setTimeout(r, 600));

        const review: OrderReview = {
            orderId,
            rating: reviewRating,
            comment: reviewComment.trim(),
            reviewedAt: new Date().toISOString(),
        };

        saveReview(review);
        setReviews((prev) => ({ ...prev, [orderId]: review }));
        setSubmittingReview(false);
        setReviewOrderId(null);
        setReviewRating(0);
        setReviewHoverRating(0);
        setReviewComment('');
        window.dispatchEvent(
            new CustomEvent('auctify-toast', {
                detail: {
                    type: 'success',
                    message: 'Review submitted! Thank you.',
                },
            }),
        );
    };

    const visibleOrders = orders.filter((order) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'unpaid' || activeTab === 'returns') return false;
        return order.status === activeTab;
    });

    const trackOrder = trackOrderId
        ? orders.find((o) => o.id === trackOrderId)
        : null;
    const reviewOrder = reviewOrderId
        ? orders.find((o) => o.id === reviewOrderId)
        : null;

    const emptyOrderIcon = (
        <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
        >
            <path d="M3 9h18l-2 9H5z" />
            <path d="M8 9l1-4h6l1 4" />
        </svg>
    );

    return (
        <div className="orders-main">
            {/* Track Package Modal */}
            {trackOrder && (
                <div
                    className="orders-modal-backdrop"
                    onClick={() => setTrackOrderId(null)}
                >
                    <div
                        className="orders-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="orders-modal-header">
                            <h3 className="orders-modal-title">
                                Track Package
                            </h3>
                            <button
                                type="button"
                                className="orders-modal-close"
                                onClick={() => setTrackOrderId(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="orders-modal-body">
                            <div className="orders-track-order-info">
                                {trackOrder.media_url && (
                                    <div className="orders-track-media-wrap">
                                        {trackOrder.media_type === 'video' ? (
                                            <video
                                                className="orders-track-media"
                                                src={resolveMediaUrl(
                                                    trackOrder.media_url,
                                                )}
                                                preload="metadata"
                                            />
                                        ) : (
                                            <img
                                                className="orders-track-media"
                                                src={resolveMediaUrl(
                                                    trackOrder.media_url,
                                                )}
                                                alt={trackOrder.title}
                                            />
                                        )}
                                    </div>
                                )}
                                <div className="orders-track-details">
                                    <p className="orders-track-order-id">
                                        Order #
                                        {trackOrder.id
                                            .substring(0, 8)
                                            .toUpperCase()}
                                    </p>
                                    <p className="orders-track-title">
                                        {trackOrder.title}
                                    </p>
                                    <p className="orders-track-seller">
                                        Sold by: {trackOrder.seller_name}
                                    </p>
                                </div>
                            </div>

                            <div className="orders-track-timeline">
                                <div
                                    className={`orders-track-event ${getStatusStep(trackOrder.status) >= 1 ? 'active' : ''}`}
                                >
                                    <div className="orders-track-event-dot"></div>
                                    <div className="orders-track-event-content">
                                        <p className="orders-track-event-title">
                                            Payment Confirmed
                                        </p>
                                        <p className="orders-track-event-desc">
                                            Your payment has been received and
                                            the order is confirmed.
                                        </p>
                                        <p className="orders-track-event-time">
                                            {formatDate(
                                                trackOrder.purchased_at,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="orders-track-event-connector"></div>
                                <div
                                    className={`orders-track-event ${getStatusStep(trackOrder.status) >= 2 ? 'active' : 'pending'}`}
                                >
                                    <div className="orders-track-event-dot"></div>
                                    <div className="orders-track-event-content">
                                        <p className="orders-track-event-title">
                                            Order Processing
                                        </p>
                                        <p className="orders-track-event-desc">
                                            The seller is preparing your item
                                            for shipment.
                                        </p>
                                        {getStatusStep(trackOrder.status) >=
                                            2 && (
                                            <p className="orders-track-event-time">
                                                {formatDate(
                                                    trackOrder.purchased_at,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="orders-track-event-connector"></div>
                                <div
                                    className={`orders-track-event ${getStatusStep(trackOrder.status) >= 3 ? 'active' : 'pending'}`}
                                >
                                    <div className="orders-track-event-dot"></div>
                                    <div className="orders-track-event-content">
                                        <p className="orders-track-event-title">
                                            Delivered
                                        </p>
                                        <p className="orders-track-event-desc">
                                            Your item has been delivered
                                            successfully.
                                        </p>
                                        {getStatusStep(trackOrder.status) >=
                                            3 && (
                                            <p className="orders-track-event-time">
                                                Delivered
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="orders-track-summary-grid">
                                <div>
                                    <p className="orders-track-meta-label">
                                        Delivery Address
                                    </p>
                                    <p className="orders-track-meta-value">
                                        {trackOrder.address_summary ||
                                            'Not provided'}
                                    </p>
                                </div>
                                <div>
                                    <p className="orders-track-meta-label">
                                        Estimated Delivery
                                    </p>
                                    <p className="orders-track-meta-value">
                                        {calculateEstimatedDelivery(
                                            trackOrder.purchased_at,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="orders-track-meta-label">
                                        Current Status
                                    </p>
                                    <span
                                        className={`orders-item-status orders-item-status-${trackOrder.status}`}
                                    >
                                        {trackOrder.status
                                            .charAt(0)
                                            .toUpperCase() +
                                            trackOrder.status.slice(1)}
                                    </span>
                                </div>
                                <div>
                                    <p className="orders-track-meta-label">
                                        Payment
                                    </p>
                                    <p className="orders-track-meta-value">
                                        {trackOrder.payment_card_label ||
                                            'Not specified'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Review Modal */}
            {reviewOrder && (
                <div
                    className="orders-modal-backdrop"
                    onClick={() => {
                        setReviewOrderId(null);
                        setReviewRating(0);
                        setReviewHoverRating(0);
                        setReviewComment('');
                    }}
                >
                    <div
                        className="orders-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="orders-modal-header">
                            <h3 className="orders-modal-title">
                                Leave a Review
                            </h3>
                            <button
                                type="button"
                                className="orders-modal-close"
                                onClick={() => {
                                    setReviewOrderId(null);
                                    setReviewRating(0);
                                    setReviewHoverRating(0);
                                    setReviewComment('');
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="orders-modal-body">
                            {reviews[reviewOrder.id] ? (
                                <div className="orders-review-done">
                                    <p className="orders-review-done-label">
                                        You reviewed this item
                                    </p>
                                    <div className="orders-review-stars-display">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <span
                                                key={s}
                                                className={`orders-review-star-display ${s <= reviews[reviewOrder.id].rating ? 'filled' : ''}`}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                    {reviews[reviewOrder.id].comment && (
                                        <p className="orders-review-done-comment">
                                            "{reviews[reviewOrder.id].comment}"
                                        </p>
                                    )}
                                    <p className="orders-review-done-date">
                                        Reviewed on{' '}
                                        {formatDate(
                                            reviews[reviewOrder.id].reviewedAt,
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="orders-review-product-info">
                                        {reviewOrder.media_url && (
                                            <img
                                                className="orders-review-media"
                                                src={resolveMediaUrl(
                                                    reviewOrder.media_url,
                                                )}
                                                alt={reviewOrder.title}
                                            />
                                        )}
                                        <div>
                                            <p className="orders-review-product-title">
                                                {reviewOrder.title}
                                            </p>
                                            <p className="orders-review-seller">
                                                Sold by{' '}
                                                {reviewOrder.seller_name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="orders-review-rating-section">
                                        <p className="orders-review-rating-label">
                                            How would you rate this product?
                                        </p>
                                        <div className="orders-review-stars">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className={`orders-review-star ${star <= (reviewHoverRating || reviewRating) ? 'active' : ''}`}
                                                    onClick={() =>
                                                        setReviewRating(star)
                                                    }
                                                    onMouseEnter={() =>
                                                        setReviewHoverRating(
                                                            star,
                                                        )
                                                    }
                                                    onMouseLeave={() =>
                                                        setReviewHoverRating(0)
                                                    }
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                        {reviewRating > 0 && (
                                            <p className="orders-review-rating-text">
                                                {
                                                    [
                                                        '',
                                                        'Poor',
                                                        'Fair',
                                                        'Good',
                                                        'Very Good',
                                                        'Excellent',
                                                    ][reviewRating]
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <textarea
                                        className="orders-review-textarea"
                                        placeholder="Share your experience with this product (optional)..."
                                        value={reviewComment}
                                        onChange={(e) =>
                                            setReviewComment(e.target.value)
                                        }
                                        rows={4}
                                    />

                                    <div className="orders-modal-actions">
                                        <button
                                            type="button"
                                            className="orders-modal-btn orders-modal-btn-cancel"
                                            onClick={() => {
                                                setReviewOrderId(null);
                                                setReviewRating(0);
                                                setReviewHoverRating(0);
                                                setReviewComment('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="orders-modal-btn orders-modal-btn-submit"
                                            onClick={() =>
                                                handleSubmitReview(
                                                    reviewOrder.id,
                                                )
                                            }
                                            disabled={
                                                reviewRating === 0 ||
                                                submittingReview
                                            }
                                        >
                                            {submittingReview
                                                ? 'Submitting...'
                                                : 'Submit Review'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="orders-header">
                <div className="orders-header-icon" aria-hidden="true">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    >
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M7 8h10" />
                        <path d="M7 12h10" />
                    </svg>
                </div>
                <h2 className="orders-header-title">Orders &amp; Tracking</h2>
            </div>

            <div className="orders-tabs">
                {(
                    [
                        'all',
                        'unpaid',
                        'processing',
                        'delivered',
                        'returns',
                        'cancelled',
                    ] as OrdersTab[]
                ).map((tab) => (
                    <button
                        key={tab}
                        className={`orders-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'returns'
                            ? 'Returns/Exchanges'
                            : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {visibleOrders.length > 0 ? (
                <div className="orders-list">
                    {visibleOrders.map((order) => (
                        <article key={order.id} className="o2card">
                            {/* ── Seller header ── */}
                            <div className="o2card-seller-row">
                                <div className="o2card-seller-info">
                                    <div
                                        className="o2card-seller-avatar"
                                        aria-hidden="true"
                                    >
                                        🏪
                                    </div>
                                    <button
                                        type="button"
                                        className="o2card-seller-name"
                                        onClick={() =>
                                            handleOpenSellerStore(
                                                order.seller_user_id,
                                                order.seller_name,
                                            )
                                        }
                                    >
                                        {order.seller_name}
                                    </button>
                                </div>
                                <span
                                    className={`o2card-badge o2card-badge-${order.status}`}
                                >
                                    {order.status === 'processing'
                                        ? 'Processing'
                                        : order.status === 'delivered'
                                          ? 'Delivered'
                                          : 'Cancelled'}
                                </span>
                            </div>

                            {/* ── Product row ── */}
                            <button
                                type="button"
                                className="o2card-product-row"
                                onClick={() =>
                                    handleOpenProduct(order.auction_id)
                                }
                            >
                                <div className="o2card-img-wrap">
                                    {order.media_url ? (
                                        order.media_type === 'video' ? (
                                            <video
                                                className="o2card-img"
                                                src={resolveMediaUrl(
                                                    order.media_url,
                                                )}
                                                preload="metadata"
                                            />
                                        ) : (
                                            <img
                                                className="o2card-img"
                                                src={resolveMediaUrl(
                                                    order.media_url,
                                                )}
                                                alt={order.title}
                                            />
                                        )
                                    ) : (
                                        <div className="o2card-img-placeholder">
                                            <svg
                                                width="28"
                                                height="28"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#c7c7c7"
                                                strokeWidth="1.5"
                                            >
                                                <rect
                                                    x="3"
                                                    y="3"
                                                    width="18"
                                                    height="18"
                                                    rx="3"
                                                />
                                                <circle cx="9" cy="10" r="2" />
                                                <path d="m21 15-5.5-5.5L5 21" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="o2card-product-info">
                                    <p className="o2card-order-id">
                                        Order #
                                        {order.id.substring(0, 8).toUpperCase()}
                                    </p>
                                    <h4 className="o2card-title">
                                        {order.title}
                                    </h4>
                                    <p className="o2card-ordered-date">
                                        {formatDate(order.purchased_at)}
                                    </p>
                                </div>
                                <div className="o2card-amount-col">
                                    <p className="o2card-amount-label">
                                        Order Total
                                    </p>
                                    <p className="o2card-amount">
                                        {formatCurrency(
                                            Number(order.amount_paid ?? 0),
                                        )}
                                    </p>
                                </div>
                            </button>

                            {/* ── Progress stepper ── */}
                            <div className="o2card-stepper">
                                {(
                                    [
                                        { label: 'Paid', step: 1 },
                                        { label: 'Processing', step: 2 },
                                        { label: 'Delivered', step: 3 },
                                    ] as { label: string; step: number }[]
                                ).map(({ label, step }, idx) => (
                                    <React.Fragment key={label}>
                                        <div
                                            className="o2card-step"
                                            data-done={
                                                getStatusStep(order.status) >=
                                                step
                                                    ? 'true'
                                                    : 'false'
                                            }
                                        >
                                            <div className="o2card-step-dot">
                                                {getStatusStep(order.status) >=
                                                    step && (
                                                    <svg
                                                        width="11"
                                                        height="11"
                                                        viewBox="0 0 12 12"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <polyline points="1.5,6 4.5,9 10.5,3" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="o2card-step-label">
                                                {label}
                                            </span>
                                        </div>
                                        {idx < 2 && (
                                            <div
                                                className="o2card-step-line"
                                                data-done={
                                                    getStatusStep(
                                                        order.status,
                                                    ) > step
                                                        ? 'true'
                                                        : 'false'
                                                }
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* ── Action buttons ── */}
                            <div className="o2card-actions">
                                <button
                                    type="button"
                                    className="o2card-btn o2card-btn-outline"
                                    onClick={() =>
                                        handleContactSeller(
                                            order.seller_user_id,
                                            order.seller_name,
                                        )
                                    }
                                >
                                    💬 Contact Seller
                                </button>
                                <button
                                    type="button"
                                    className="o2card-btn o2card-btn-outline"
                                    onClick={() => setReviewOrderId(order.id)}
                                >
                                    ⭐{' '}
                                    {reviews[order.id]
                                        ? 'View Review'
                                        : 'Leave Review'}
                                </button>
                                <button
                                    type="button"
                                    className="o2card-btn o2card-btn-primary"
                                    onClick={() => setTrackOrderId(order.id)}
                                >
                                    📦 Track Package
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : activeTab === 'all' ? (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        {emptyOrderIcon}
                    </div>
                    <div className="orders-empty-title">
                        No products at this moment
                    </div>
                    <div className="orders-empty-text">
                        Once you place an order, it will show here so you can
                        track its status.
                    </div>
                    <button
                        type="button"
                        className="orders-empty-button"
                        onClick={handleContinueShopping}
                    >
                        Continue Shopping
                    </button>
                </div>
            ) : null}

            {activeTab === 'unpaid' && visibleOrders.length === 0 && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        {emptyOrderIcon}
                    </div>
                    <div className="orders-empty-title">
                        You have no unpaid orders
                    </div>
                    <div className="orders-empty-text">
                        Any orders waiting for payment will appear here until
                        you complete checkout.
                    </div>
                    <button
                        type="button"
                        className="orders-empty-button"
                        onClick={handleContinueShopping}
                    >
                        Go to Checkout
                    </button>
                </div>
            )}

            {activeTab === 'processing' && visibleOrders.length === 0 && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        {emptyOrderIcon}
                    </div>
                    <div className="orders-empty-title">
                        No processing orders right now
                    </div>
                    <div className="orders-empty-text">
                        When sellers are preparing your items, you&apos;ll see
                        those orders in this tab.
                    </div>
                    <button
                        type="button"
                        className="orders-empty-button"
                        onClick={handleContinueShopping}
                    >
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'delivered' && visibleOrders.length === 0 && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        {emptyOrderIcon}
                    </div>
                    <div className="orders-empty-title">
                        No delivered orders yet
                    </div>
                    <div className="orders-empty-text">
                        Once your items arrive, your completed orders will be
                        listed here.
                    </div>
                    <button type="button" className="orders-empty-button">
                        Start Bidding
                    </button>
                </div>
            )}

            {activeTab === 'returns' && visibleOrders.length === 0 && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        {emptyOrderIcon}
                    </div>
                    <div className="orders-empty-title">
                        No returns or exchanges
                    </div>
                    <div className="orders-empty-text">
                        Any items you send back or exchange will be tracked in
                        this tab.
                    </div>
                    <button type="button" className="orders-empty-button">
                        View Return Policy
                    </button>
                </div>
            )}

            {activeTab === 'cancelled' && visibleOrders.length === 0 && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        {emptyOrderIcon}
                    </div>
                    <div className="orders-empty-title">
                        You have no cancelled orders
                    </div>
                    <div className="orders-empty-text">
                        If any orders are cancelled, you&apos;ll see them listed
                        here for your reference.
                    </div>
                    <button
                        type="button"
                        className="orders-empty-button"
                        onClick={handleContinueShopping}
                    >
                        Continue Shopping
                    </button>
                </div>
            )}
        </div>
    );
};
