import React, { useEffect, useMemo, useState } from 'react';
import { auctionService } from '../services/api';
import type { AuctionProduct } from '../types';
import { getAuctionDisplayStatus } from '../utils/auctionStatus';

interface SellerStorePageProps {
    sellerId: number;
    sellerName?: string | null;
    onNavigateSellerDashboard: () => void;
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

export const SellerStorePage: React.FC<SellerStorePageProps> = ({
    sellerId,
    sellerName,
    onNavigateSellerDashboard,
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

    const getProductStatus = (product: AuctionProduct): 'open' | 'closed' | 'scheduled' => {
        return getAuctionDisplayStatus(product);
    };

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            setLoading(true);
            try {
                const allProducts = await auctionService.getAllProducts();
                if (!isActive) {
                    return;
                }

                const sellerProducts = allProducts.filter((item) => item.user_id === sellerId);
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
                    <button type="button" onClick={onNavigateSellerDashboard}>Seller Dashboard</button>
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
                    </div>
                </section>
            </div>
        </main>
    );
};
