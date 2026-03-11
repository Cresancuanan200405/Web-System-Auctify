import React, { useEffect, useMemo, useState } from 'react';
import { auctionService } from '../services/api';
import type { AuctionProduct, OrderHistoryItem } from '../types';
import { getAuctionDisplayStatus } from '../utils/auctionStatus';

interface SellerStorePageProps {
    sellerId: number;
    sellerName?: string | null;
    onNavigateSellerDashboard: () => void;
    onNavigateBack?: () => void;
    backBreadcrumbLabel?: string;
    onNavigateToAuction: (auctionId: number) => void;
    onMessageSeller: () => void;
    canMessageSeller: boolean;
}

const PRICE_FILTERS = [
    { key: 'under1000', label: 'PHP 0 - PHP 1000', min: 0, max: 1000 },
    { key: '1000to3000', label: 'PHP 1000 - PHP 3000', min: 1000, max: 3000 },
    { key: '3000to5000', label: 'PHP 3000 - PHP 5000', min: 3000, max: 5000 },
    { key: 'above5000', label: 'PHP > 5000', min: 5000, max: Number.POSITIVE_INFINITY },
] as const;

interface StoredOrderReview {
    orderId: string;
    rating: number;
    comment: string;
    reviewedAt: string;
}

interface SellerStoreReviewItem {
    id: string;
    orderId: string;
    auctionId: number;
    rating: number;
    comment: string;
    reviewedAt: string;
    buyerName: string;
    buyerEmail: string;
    productTitle: string;
    productMediaUrl?: string;
}

export const SellerStorePage: React.FC<SellerStorePageProps> = ({
    sellerId,
    sellerName,
    onNavigateSellerDashboard,
    onNavigateBack,
    backBreadcrumbLabel = 'Seller Dashboard',
    onNavigateToAuction,
    onMessageSeller,
    canMessageSeller,
}) => {
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedPriceKeys, setSelectedPriceKeys] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<Array<'open' | 'closed' | 'scheduled'>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'latest' | 'price-asc' | 'price-desc' | 'name-asc'>('latest');
    const [selectedReviewRating, setSelectedReviewRating] = useState<number>(0);

    const getProductStatus = (product: AuctionProduct): 'open' | 'closed' | 'scheduled' => {
        return getAuctionDisplayStatus(product);
    };

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            setLoading(true);
            try {
                const sellerProducts = await auctionService.getSellerStoreProducts(sellerId);
                if (!isActive) {
                    return;
                }

                setProducts(sellerProducts);
            } catch {
                if (isActive) {
                    setProducts([]);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            isActive = false;
        };
    }, [sellerId]);

    const categories = useMemo(() => {
        const bucket = new Set<string>();
        products.forEach((item) => {
            const category = item.category?.trim();
            if (category) {
                bucket.add(category);
            }
        });
        return Array.from(bucket.values()).sort((a, b) => a.localeCompare(b));
    }, [products]);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const nextProducts = products.filter((product) => {
            const category = product.category?.trim() ?? '';
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(category);

            const numericPrice = Number(product.current_price || product.starting_price || 0);
            const matchesPrice =
                selectedPriceKeys.length === 0 ||
                selectedPriceKeys.some((priceKey) => {
                    const rule = PRICE_FILTERS.find((item) => item.key === priceKey);
                    if (!rule) {
                        return false;
                    }
                    return numericPrice >= rule.min && numericPrice <= rule.max;
                });

            const status = getProductStatus(product);
            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(status);
            const matchesSearch =
                normalizedSearch.length === 0 ||
                product.title.toLowerCase().includes(normalizedSearch) ||
                category.toLowerCase().includes(normalizedSearch);

            return matchesCategory && matchesPrice && matchesStatus && matchesSearch;
        });

        nextProducts.sort((left, right) => {
            if (sortOrder === 'price-asc') {
                return Number(left.current_price || left.starting_price || 0) - Number(right.current_price || right.starting_price || 0);
            }

            if (sortOrder === 'price-desc') {
                return Number(right.current_price || right.starting_price || 0) - Number(left.current_price || left.starting_price || 0);
            }

            if (sortOrder === 'name-asc') {
                return left.title.localeCompare(right.title);
            }

            return new Date(right.created_at ?? '').getTime() - new Date(left.created_at ?? '').getTime();
        });

        return nextProducts;
    }, [products, searchTerm, selectedCategories, selectedPriceKeys, selectedStatuses, sortOrder]);

    const sellerReviews = useMemo<SellerStoreReviewItem[]>(() => {
        try {
            const normalizeOrderId = (value: string) => value.replace(/-seller$/, '');
            const sellerOrderKey = `seller_order_history_user-${sellerId}`;
            const sellerOrdersRaw = window.localStorage.getItem(sellerOrderKey);
            const sellerOrders = sellerOrdersRaw ? (JSON.parse(sellerOrdersRaw) as OrderHistoryItem[]) : [];

            if (sellerOrders.length === 0) {
                return [];
            }

            const orderById = new Map<string, OrderHistoryItem>();
            const orderByAuctionAndBuyer = new Map<string, OrderHistoryItem>();
            sellerOrders.forEach((order) => {
                const normalizedOrderId = normalizeOrderId(String(order.id));
                orderById.set(normalizedOrderId, order);

                if (order.buyer_user_id != null) {
                    orderByAuctionAndBuyer.set(`${String(order.auction_id)}-${String(order.buyer_user_id)}`, order);
                }
            });

            const collected: SellerStoreReviewItem[] = [];

            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (!key || !key.startsWith('order_reviews_user-')) {
                    continue;
                }

                const buyerUserId = key.replace('order_reviews_user-', '');

                const raw = window.localStorage.getItem(key);
                if (!raw) {
                    continue;
                }

                const parsed = JSON.parse(raw) as Record<string, StoredOrderReview>;
                Object.values(parsed).forEach((review) => {
                    const normalizedReviewOrderId = normalizeOrderId(String(review.orderId));
                    let matchingOrder = orderById.get(normalizedReviewOrderId);

                    if (!matchingOrder && buyerUserId) {
                        const auctionIdFromReview = normalizedReviewOrderId.split('-')[0];
                        matchingOrder = orderByAuctionAndBuyer.get(`${auctionIdFromReview}-${buyerUserId}`);
                    }

                    if (!matchingOrder) {
                        return;
                    }

                    const rating = Number(review.rating);
                    if (!Number.isFinite(rating) || rating <= 0) {
                        return;
                    }

                    collected.push({
                        id: `${review.orderId}-${review.reviewedAt}`,
                        orderId: normalizedReviewOrderId,
                        auctionId: matchingOrder.auction_id,
                        rating: Math.max(1, Math.min(5, Math.round(rating))),
                        comment: review.comment?.trim() || 'No written feedback provided.',
                        reviewedAt: review.reviewedAt,
                        buyerName: matchingOrder.buyer_name || 'Verified Buyer',
                        buyerEmail: matchingOrder.buyer_email || '',
                        productTitle: matchingOrder.title,
                        productMediaUrl: matchingOrder.media_url,
                    });
                });
            }

            return collected.sort((left, right) => new Date(right.reviewedAt).getTime() - new Date(left.reviewedAt).getTime());
        } catch {
            return [];
        }
    }, [sellerId]);

    const filteredSellerReviews = useMemo(() => {
        if (selectedReviewRating === 0) {
            return sellerReviews;
        }

        return sellerReviews.filter((review) => review.rating === selectedReviewRating);
    }, [sellerReviews, selectedReviewRating]);

    const reviewAverage = useMemo(() => {
        if (filteredSellerReviews.length === 0) {
            return 0;
        }

        const total = filteredSellerReviews.reduce((accumulator, item) => accumulator + item.rating, 0);
        return total / filteredSellerReviews.length;
    }, [filteredSellerReviews]);

    const formatPeso = (value?: string) => {
        const amount = Number(value ?? 0);
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    };

    const resolveMediaUrl = (url?: string) => {
        if (!url) {
            return '';
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
        if (!apiBase) {
            return url;
        }

        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const formatDate = (value?: string | null) => {
        if (!value) {
            return '--';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const formatReviewDate = (value?: string | null) => {
        if (!value) {
            return 'Recently';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'Recently';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
            return 'VB';
        }

        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    };

    const toggleCategory = (category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
        );
    };

    const togglePriceKey = (key: string) => {
        setSelectedPriceKeys((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
        );
    };

    const toggleStatus = (status: 'open' | 'closed' | 'scheduled') => {
        setSelectedStatuses((prev) =>
            prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
        );
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedPriceKeys([]);
        setSelectedStatuses([]);
        setSearchTerm('');
        setSortOrder('latest');
    };

    const sellerTitle = sellerName?.trim() || `Shop #${sellerId}`;
    const activeFilterCount = selectedCategories.length + selectedPriceKeys.length + selectedStatuses.length;

    return (
        <main className="content seller-store-content">
            <div className="seller-store-shell">
                <div className="page-breadcrumb seller-store-breadcrumb">
                    <button type="button" onClick={onNavigateBack ?? onNavigateSellerDashboard}>{backBreadcrumbLabel}</button>
                    <span>›</span>
                    <span className="seller-store-shop-label">Shop Name: {sellerTitle}</span>
                </div>

                <header className="seller-store-hero">
                    <div className="seller-store-hero-copy">
                        <p className="seller-store-hero-kicker">Seller Storefront</p>
                        <h1>{sellerTitle}</h1>
                        <p>{filteredProducts.length} item(s) found</p>
                    </div>
                    <div className="seller-store-hero-actions">
                        {canMessageSeller && (
                            <button
                                type="button"
                                className="seller-store-message-btn"
                                onClick={onMessageSeller}
                            >
                                Message Seller
                            </button>
                        )}
                        <button
                            type="button"
                            className="seller-store-clear-btn"
                            onClick={clearAllFilters}
                            disabled={activeFilterCount === 0 && !searchTerm.trim() && sortOrder === 'latest'}
                        >
                            Clear Filters
                        </button>
                    </div>
                </header>

                <section className="seller-store-layout">
                    <aside className="seller-store-sidebar">
                        <div className="seller-store-panel">
                            <div className="seller-store-panel-head">
                                <h3>Categories</h3>
                                <span>{selectedCategories.length} selected</span>
                            </div>
                            <div className="seller-store-options">
                                {categories.length === 0 && <p className="seller-store-empty-filter">No categories yet.</p>}
                                {categories.map((category) => (
                                    <label key={category} className="seller-store-check-row">
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.includes(category)}
                                            onChange={() => toggleCategory(category)}
                                        />
                                        <span>{category}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="seller-store-panel">
                            <div className="seller-store-panel-head">
                                <h3>Status</h3>
                                <span>{selectedStatuses.length} selected</span>
                            </div>
                            <div className="seller-store-options">
                                <label className="seller-store-check-row">
                                    <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes('open')}
                                        onChange={() => toggleStatus('open')}
                                    />
                                    <span>Open</span>
                                </label>
                                <label className="seller-store-check-row">
                                    <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes('closed')}
                                        onChange={() => toggleStatus('closed')}
                                    />
                                    <span>Closed</span>
                                </label>
                                <label className="seller-store-check-row">
                                    <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes('scheduled')}
                                        onChange={() => toggleStatus('scheduled')}
                                    />
                                    <span>Scheduled</span>
                                </label>
                            </div>
                        </div>

                        <div className="seller-store-panel">
                            <div className="seller-store-panel-head">
                                <h3>Price</h3>
                                <span>{selectedPriceKeys.length} selected</span>
                            </div>
                            <div className="seller-store-options">
                                {PRICE_FILTERS.map((item) => (
                                    <label key={item.key} className="seller-store-check-row">
                                        <input
                                            type="checkbox"
                                            checked={selectedPriceKeys.includes(item.key)}
                                            onChange={() => togglePriceKey(item.key)}
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <div className="seller-store-main">
                        <header className="seller-store-header">
                            <div className="seller-store-toolbar">
                                <input
                                    type="search"
                                    className="seller-store-search"
                                    placeholder="Search products"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                                <select
                                    className="seller-store-sort"
                                    value={sortOrder}
                                    onChange={(event) => setSortOrder(event.target.value as 'latest' | 'price-asc' | 'price-desc' | 'name-asc')}
                                >
                                    <option value="latest">Latest</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                    <option value="name-asc">Name: A to Z</option>
                                </select>
                            </div>
                            <p className="seller-store-filter-meta">
                                {activeFilterCount > 0 ? `${activeFilterCount} filter(s) active` : 'No filters applied'}
                            </p>
                        </header>

                        {loading && <p className="seller-store-state">Loading seller products...</p>}
                        {!loading && filteredProducts.length === 0 && (
                            <p className="seller-store-state">No products matched your filters.</p>
                        )}

                        {!loading && filteredProducts.length > 0 && (
                            <div className="seller-store-grid">
                                {filteredProducts.map((product) => {
                                    const status = getProductStatus(product);
                                    const thumbnail = (product.media ?? []).find((media) => media.media_type === 'image');
                                    const videoCount = (product.media ?? []).filter((media) => media.media_type === 'video').length;
                                    const imageCount = (product.media ?? []).filter((media) => media.media_type === 'image').length;
                                    const bidCount = Number(product.bids_count ?? 0);

                                    return (
                                        <article
                                            key={product.id}
                                            className="seller-store-card"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => onNavigateToAuction(product.id)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    onNavigateToAuction(product.id);
                                                }
                                            }}
                                        >
                                            <div className="seller-store-card-media-wrap">
                                                <span className={`seller-store-card-status seller-store-card-status-${status}`}>
                                                    {status}
                                                </span>
                                                {thumbnail ? (
                                                    <img className="seller-store-card-media" src={resolveMediaUrl(thumbnail.url)} alt={product.title} />
                                                ) : (
                                                    <div className="seller-store-card-media seller-store-card-media-empty">No image</div>
                                                )}
                                            </div>
                                            <div className="seller-store-card-body">
                                                <div className="seller-store-card-topline">
                                                    <p className="seller-store-card-category">{(product.category || 'Product').toUpperCase()}</p>
                                                    <span className="seller-store-card-bids">{bidCount} bid{bidCount === 1 ? '' : 's'}</span>
                                                </div>
                                                <p className="seller-store-card-title" title={product.title}>{product.title}</p>
                                                <p className="seller-store-card-deadline">Ends: {formatDate(product.ends_at)}</p>
                                                <div className="seller-store-card-metrics">
                                                    <span>{imageCount} image{imageCount === 1 ? '' : 's'}</span>
                                                    <span>{videoCount} video{videoCount === 1 ? '' : 's'}</span>
                                                </div>
                                                <div className="seller-store-card-pricing">
                                                    <div>
                                                        <p className="seller-store-card-price-label">Current bid</p>
                                                        <p className="seller-store-card-price">{formatPeso(product.current_price || product.starting_price)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="seller-store-card-price-label">Starting</p>
                                                        <p className="seller-store-card-start">{formatPeso(product.starting_price)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && (
                            <section className="seller-store-reviews-box">
                                <div className="seller-store-reviews-head">
                                    <div>
                                        <p className="seller-store-reviews-kicker">Buyer Feedback</p>
                                        <h3>What buyers say about this store</h3>
                                    </div>
                                    <div className="seller-store-reviews-summary" aria-label="Store review summary">
                                        <p className="seller-store-reviews-score">{reviewAverage > 0 ? reviewAverage.toFixed(1) : '0.0'}</p>
                                        <div className="seller-store-reviews-stars" aria-hidden="true">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span
                                                    key={star}
                                                    className={`seller-store-star${star <= Math.round(reviewAverage) ? ' is-filled' : ''}`}
                                                >
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                        <p className="seller-store-reviews-count">
                                            {filteredSellerReviews.length} review{filteredSellerReviews.length === 1 ? '' : 's'}
                                            {selectedReviewRating > 0 && ` • ${sellerReviews.length} total`}
                                        </p>
                                    </div>
                                </div>

                                <div className="seller-store-review-filters" aria-label="Review star filters">
                                    <button
                                        type="button"
                                        className={`seller-store-review-filter-btn${selectedReviewRating === 0 ? ' active' : ''}`}
                                        onClick={() => setSelectedReviewRating(0)}
                                    >
                                        All
                                    </button>
                                    {[5, 4, 3, 2, 1].map((rating) => (
                                        <button
                                            key={rating}
                                            type="button"
                                            className={`seller-store-review-filter-btn${selectedReviewRating === rating ? ' active' : ''}`}
                                            onClick={() => setSelectedReviewRating(rating)}
                                        >
                                            {rating}★
                                        </button>
                                    ))}
                                </div>

                                {sellerReviews.length === 0 && (
                                    <p className="seller-store-reviews-empty">No buyer reviews yet. New feedback will appear here after completed orders are reviewed.</p>
                                )}

                                {sellerReviews.length > 0 && filteredSellerReviews.length === 0 && (
                                    <p className="seller-store-reviews-empty">No reviews found for {selectedReviewRating}★ yet.</p>
                                )}

                                {filteredSellerReviews.length > 0 && (
                                    <div className="seller-store-reviews-grid">
                                        {filteredSellerReviews.map((review) => (
                                            <article key={review.id} className="seller-store-review-card">
                                                <div className="seller-store-review-top">
                                                    <div className="seller-store-review-avatar" aria-hidden="true">
                                                        {getInitials(review.buyerName)}
                                                    </div>
                                                    <div className="seller-store-review-identity">
                                                        <p className="seller-store-review-buyer">{review.buyerName}</p>
                                                        <p className="seller-store-review-meta">{review.buyerEmail || 'Verified buyer'} • {formatReviewDate(review.reviewedAt)}</p>
                                                    </div>
                                                    <div className="seller-store-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span key={star} className={`seller-store-star${star <= review.rating ? ' is-filled' : ''}`}>★</span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="seller-store-review-body">
                                                    <p className="seller-store-review-text">{review.comment}</p>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="seller-store-review-product"
                                                    onClick={() => onNavigateToAuction(review.auctionId)}
                                                    title="View product"
                                                >
                                                    {review.productMediaUrl ? (
                                                        <img
                                                            className="seller-store-review-product-thumb"
                                                            src={resolveMediaUrl(review.productMediaUrl)}
                                                            alt={review.productTitle}
                                                        />
                                                    ) : (
                                                        <div className="seller-store-review-product-thumb seller-store-review-product-thumb-empty">No image</div>
                                                    )}
                                                    <div>
                                                        <p className="seller-store-review-product-label">Reviewed item</p>
                                                        <p className="seller-store-review-product-title" title={review.productTitle}>{review.productTitle}</p>
                                                    </div>
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
};
