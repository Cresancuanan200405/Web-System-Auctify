import React, { useMemo, useState } from 'react';
import { useOrderHistory } from '../../hooks/useOrderHistory';
import { formatCurrency } from '../../utils/helpers';

type ReviewsTab = 'to-review' | 'submitted';

interface ReviewsSectionProps {
    onNavigateToAuction: (auctionId: number, source?: 'home' | 'seller-store' | 'account-orders' | 'account-reviews') => void;
}

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
        const user = JSON.parse(raw) as { id?: number };
        return user.id ? `order_reviews_user-${user.id}` : 'order_reviews_anonymous';
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
        // Ignore local storage failures and keep UI stable.
    }
};

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ onNavigateToAuction }) => {
    const [activeTab, setActiveTab] = useState<ReviewsTab>('to-review');
    const { orders } = useOrderHistory();
    const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHoverRating, setReviewHoverRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviews, setReviews] = useState<Record<string, OrderReview>>(() => loadReviews());

    const handleContinueShopping = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const resolveMediaUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
        if (!apiBase) return url;
        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) {
            return 'Recently';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return 'Recently';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
        }).format(date);
    };

    const deliveredOrders = useMemo(() => {
        return orders
            .filter((order) => order.status === 'delivered')
            .slice()
            .sort((left, right) => new Date(right.purchased_at).getTime() - new Date(left.purchased_at).getTime());
    }, [orders]);

    const ordersToReview = useMemo(() => {
        return deliveredOrders.filter((order) => !reviews[order.id]);
    }, [deliveredOrders, reviews]);

    const submittedReviews = useMemo(() => {
        return deliveredOrders
            .filter((order) => Boolean(reviews[order.id]))
            .map((order) => ({ order, review: reviews[order.id] }));
    }, [deliveredOrders, reviews]);

    const reviewOrder = reviewOrderId ? deliveredOrders.find((order) => order.id === reviewOrderId) ?? null : null;

    const handleSubmitReview = async (orderId: string) => {
        if (reviewRating === 0) {
            return;
        }

        setSubmittingReview(true);
        await new Promise((resolve) => setTimeout(resolve, 600));

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
        window.dispatchEvent(new CustomEvent('auctify-toast', { detail: { type: 'success', message: 'Review submitted! Thank you.' } }));
    };

    const closeReviewModal = () => {
        setReviewOrderId(null);
        setReviewRating(0);
        setReviewHoverRating(0);
        setReviewComment('');
    };

    const handleOpenReviewedProduct = (auctionId: number) => {
        onNavigateToAuction(auctionId, 'account-reviews');
    };

    return (
        <div className="reviews-main">
            {reviewOrder && (
                <div className="orders-modal-backdrop" onClick={closeReviewModal}>
                    <div className="orders-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="orders-modal-header">
                            <h3 className="orders-modal-title">Leave a Review</h3>
                            <button type="button" className="orders-modal-close" onClick={closeReviewModal}>✕</button>
                        </div>
                        <div className="orders-modal-body">
                            <div className="orders-review-product-info">
                                {reviewOrder.media_url && (
                                    <img className="orders-review-media" src={resolveMediaUrl(reviewOrder.media_url)} alt={reviewOrder.title} />
                                )}
                                <div>
                                    <p className="orders-review-product-title">{reviewOrder.title}</p>
                                    <p className="orders-review-seller">Sold by {reviewOrder.seller_name}</p>
                                </div>
                            </div>

                            <div className="orders-review-rating-section">
                                <p className="orders-review-rating-label">How would you rate this product?</p>
                                <div className="orders-review-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`orders-review-star ${star <= (reviewHoverRating || reviewRating) ? 'active' : ''}`}
                                            onClick={() => setReviewRating(star)}
                                            onMouseEnter={() => setReviewHoverRating(star)}
                                            onMouseLeave={() => setReviewHoverRating(0)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                {reviewRating > 0 && (
                                    <p className="orders-review-rating-text">
                                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                                    </p>
                                )}
                            </div>

                            <textarea
                                className="orders-review-textarea"
                                placeholder="Share your experience with this product (optional)..."
                                value={reviewComment}
                                onChange={(event) => setReviewComment(event.target.value)}
                                rows={4}
                            />

                            <div className="orders-modal-actions">
                                <button type="button" className="orders-modal-btn orders-modal-btn-cancel" onClick={closeReviewModal}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="orders-modal-btn orders-modal-btn-submit"
                                    onClick={() => handleSubmitReview(reviewOrder.id)}
                                    disabled={reviewRating === 0 || submittingReview}
                                >
                                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="reviews-tabs">
                <button
                    className={`reviews-tab ${activeTab === 'to-review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('to-review')}
                >
                    To Review ({ordersToReview.length})
                </button>
                <button
                    className={`reviews-tab ${activeTab === 'submitted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submitted')}
                >
                    Submitted ({submittedReviews.length})
                </button>
            </div>

            {activeTab === 'to-review' && ordersToReview.length === 0 && (
                <div className="reviews-empty-card">
                    <div className="reviews-empty-icon" aria-hidden="true">
                        <svg
                            width="90"
                            height="90"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 6.5l1.76 3.57 3.94.57-2.85 2.77.67 3.89L12 15.8l-3.52 1.9.67-3.89-2.85-2.77 3.94-.57z" />
                        </svg>
                    </div>
                    <div className="reviews-empty-text-main">
                        No products to review yet. Start shopping and write a review after the
                        delivery!
                    </div>
                    <button type="button" className="reviews-empty-button" onClick={handleContinueShopping}>
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'to-review' && ordersToReview.length > 0 && (
                <div className="reviews-list">
                    {ordersToReview.map((order) => (
                        <article key={order.id} className="reviews-card">
                            <div className="reviews-card-media-wrap">
                                {order.media_url ? (
                                    order.media_type === 'video' ? (
                                        <video className="reviews-card-media" src={resolveMediaUrl(order.media_url)} preload="metadata" />
                                    ) : (
                                        <img className="reviews-card-media" src={resolveMediaUrl(order.media_url)} alt={order.title} />
                                    )
                                ) : (
                                    <div className="reviews-card-media reviews-card-media-empty">No image</div>
                                )}
                            </div>
                            <div className="reviews-card-copy">
                                <p className="reviews-card-kicker">Delivered product</p>
                                <h3 className="reviews-card-title">{order.title}</h3>
                                <p className="reviews-card-meta">{order.seller_name} • Delivered {formatDate(order.purchased_at)}</p>
                                <p className="reviews-card-price">{formatCurrency(Number(order.amount_paid || 0))}</p>
                            </div>
                            <div className="reviews-card-actions">
                                <button type="button" className="reviews-card-btn" onClick={() => setReviewOrderId(order.id)}>
                                    Review Now
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {activeTab === 'submitted' && submittedReviews.length === 0 && (
                <div className="reviews-empty-card">
                    <div className="reviews-empty-icon" aria-hidden="true">
                        <svg
                            width="90"
                            height="90"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 6.5l1.76 3.57 3.94.57-2.85 2.77.67 3.89L12 15.8l-3.52 1.9.67-3.89-2.85-2.77 3.94-.57z" />
                        </svg>
                    </div>
                    <div className="reviews-empty-text-main">
                        You haven&apos;t submitted any product reviews yet.
                    </div>
                    <button type="button" className="reviews-empty-button" onClick={handleContinueShopping}>
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'submitted' && submittedReviews.length > 0 && (
                <div className="reviews-list">
                    {submittedReviews.map(({ order, review }) => (
                        <button
                            key={order.id}
                            type="button"
                            className="reviews-card reviews-card-submitted reviews-card-clickable"
                            onClick={() => handleOpenReviewedProduct(order.auction_id)}
                        >
                            <div className="reviews-card-media-wrap">
                                {order.media_url ? (
                                    order.media_type === 'video' ? (
                                        <video className="reviews-card-media" src={resolveMediaUrl(order.media_url)} preload="metadata" />
                                    ) : (
                                        <img className="reviews-card-media" src={resolveMediaUrl(order.media_url)} alt={order.title} />
                                    )
                                ) : (
                                    <div className="reviews-card-media reviews-card-media-empty">No image</div>
                                )}
                            </div>
                            <div className="reviews-card-copy">
                                <p className="reviews-card-kicker">Submitted review</p>
                                <h3 className="reviews-card-title">{order.title}</h3>
                                <p className="reviews-card-meta">{order.seller_name} • Reviewed {formatDate(review.reviewedAt)}</p>
                                <div className="reviews-card-stars" aria-label={`${review.rating} out of 5 stars`}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star} className={`reviews-card-star${star <= review.rating ? ' filled' : ''}`}>★</span>
                                    ))}
                                </div>
                                <p className="reviews-card-comment">
                                    {review.comment?.trim() || 'No written feedback provided.'}
                                </p>
                            </div>
                            <div className="reviews-card-actions">
                                <span className="reviews-card-badge">Submitted</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
