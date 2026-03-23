import React, { useEffect, useMemo, useRef, useState } from 'react';
import { auctionService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { useWonAuctions } from '../hooks/useWonAuctions';
import { useCards } from '../hooks/useCards';
import type { AccountSection, AuctionProduct } from '../types';
import { formatCurrency } from '../utils/helpers';

const RECENT_SEARCHES_KEY = 'header_recent_searches';
const MAX_RECENT_SEARCHES = 6;

interface HeaderProps {
    onNavigateHome: () => void;
    disableHomeNavigation?: boolean;
    isSellerMode?: boolean;
    onNavigateToAuction: (auctionId: number) => void;
    onNavigateLogin: () => void;
    onNavigateRegister: () => void;
    onNavigateAdminLogin: () => void;
    onNavigateAccount: (section?: AccountSection) => void;
    onNavigateSellerProfile: () => void;
    onNavigateSellerDashboard: () => void;
    onNavigateSellerStore: (sellerId: number, sellerName?: string) => void;
    showSellerDashboardButton: boolean;
    onNavigateOrdersLogin: () => void;
    onNavigateBag: () => void;
    enableHomeSearchSuggestions?: boolean;
    maxHomeSearchResults?: number;
    onLogout: () => void;
}

type HeaderSearchResultItem =
    | { kind: 'product'; id: string; product: AuctionProduct; score: number }
    | {
          kind: 'seller';
          id: string;
          sellerId: number;
          sellerName: string;
          shopName: string;
          productCount: number;
          thumbnailUrl?: string;
          score: number;
      };

export const Header: React.FC<HeaderProps> = ({
    onNavigateHome,
    disableHomeNavigation = false,
    isSellerMode = false,
    onNavigateToAuction,
    onNavigateLogin,
    onNavigateRegister,
    onNavigateAdminLogin,
    onNavigateAccount,
    onNavigateSellerProfile,
    onNavigateSellerDashboard,
    onNavigateSellerStore,
    showSellerDashboardButton,
    onNavigateOrdersLogin,
    onNavigateBag,
    enableHomeSearchSuggestions = true,
    maxHomeSearchResults = 8,
    onLogout,
}) => {
    const { authUser } = useAuth();
    const { savedCards, mainCardId } = useCards();
    const { wonAuctions, wonAuctionCount, isLoadingWonAuctions } =
        useWonAuctions();
    const { orders } = useOrderHistory();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchProducts, setSearchProducts] = useState<AuctionProduct[]>([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        try {
            const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
            return raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
            return [];
        }
    });
    const searchContainerRef = useRef<HTMLFormElement | null>(null);
    const brandLabel = isSellerMode ? 'AUCTIFY Seller' : 'AUCTIFY';
    const shouldShowSellerDetails = isSellerMode;
    const searchResultLimit = Math.min(
        20,
        Math.max(3, Number(maxHomeSearchResults || 8)),
    );

    const mainCard = savedCards.find((card) => card.id === mainCardId);
    const activeBagItems = wonAuctions.filter(
        (item) => !orders.some((order) => order.auction_id === item.id),
    );
    const activeBagCount = activeBagItems.length;

    useEffect(() => {
        if (!isSearchModalOpen || isSellerMode || searchProducts.length > 0) {
            return;
        }

        let isActive = true;

        const loadProducts = async () => {
            setIsSearchLoading(true);
            try {
                const products = await auctionService.getAllProducts();
                if (!isActive) {
                    return;
                }

                setSearchProducts(products);
            } catch {
                if (isActive) {
                    setSearchProducts([]);
                }
            } finally {
                if (isActive) {
                    setIsSearchLoading(false);
                }
            }
        };

        void loadProducts();

        return () => {
            isActive = false;
        };
    }, [isSearchModalOpen, isSellerMode, searchProducts.length]);

    useEffect(() => {
        if (!isSearchModalOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node)
            ) {
                setIsSearchModalOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchModalOpen(false);
            }
        };

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isSearchModalOpen]);

    useEffect(() => {
        setActiveSearchIndex(0);
    }, [searchQuery, isSearchModalOpen]);

    const persistRecentSearch = (value: string) => {
        const normalized = value.trim();
        if (!normalized) {
            return;
        }

        setRecentSearches((prev) => {
            const next = [
                normalized,
                ...prev.filter(
                    (item) => item.toLowerCase() !== normalized.toLowerCase(),
                ),
            ].slice(0, MAX_RECENT_SEARCHES);
            window.localStorage.setItem(
                RECENT_SEARCHES_KEY,
                JSON.stringify(next),
            );
            return next;
        });
    };

    const filteredSearchProducts = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) {
            return [];
        }

        return searchProducts.filter((product) => {
            const category = product.category?.toLowerCase() ?? '';
            const subcategory = product.subcategory?.toLowerCase() ?? '';
            const description = product.description?.toLowerCase() ?? '';
            return (
                product.title.toLowerCase().includes(normalized) ||
                category.includes(normalized) ||
                subcategory.includes(normalized) ||
                description.includes(normalized)
            );
        });
    }, [searchProducts, searchQuery]);

    const filteredSellerResults = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) {
            return [] as HeaderSearchResultItem[];
        }

        const sellerMap = new Map<
            number,
            {
                sellerId: number;
                sellerName: string;
                shopName: string;
                productCount: number;
                thumbnailUrl?: string;
            }
        >();

        searchProducts.forEach((product) => {
            const sellerId = Number(product.user?.id ?? product.user_id);
            if (!Number.isFinite(sellerId) || sellerId <= 0) {
                return;
            }

            const sellerName =
                product.user?.name?.trim() || `Seller #${sellerId}`;
            const shopName =
                product.user?.seller_registration?.shop_name?.trim() ||
                sellerName;

            const sellerSearchBlob = `${sellerName} ${shopName}`.toLowerCase();
            if (!sellerSearchBlob.includes(normalized)) {
                return;
            }

            const thumbnail =
                (product.media ?? []).find(
                    (media) => media.media_type === 'image',
                ) ?? product.media?.[0];

            const existing = sellerMap.get(sellerId);
            if (!existing) {
                sellerMap.set(sellerId, {
                    sellerId,
                    sellerName,
                    shopName,
                    productCount: 1,
                    thumbnailUrl: thumbnail?.url,
                });
                return;
            }

            existing.productCount += 1;
            if (!existing.thumbnailUrl && thumbnail?.url) {
                existing.thumbnailUrl = thumbnail.url;
            }
        });

        return Array.from(sellerMap.values()).map((entry) => {
            const sellerBlob =
                `${entry.sellerName} ${entry.shopName}`.toLowerCase();
            let score = 1;
            if (entry.shopName.toLowerCase().startsWith(normalized)) {
                score += 3;
            }
            if (entry.sellerName.toLowerCase().startsWith(normalized)) {
                score += 2;
            }
            if (sellerBlob.includes(normalized)) {
                score += 1;
            }

            return {
                kind: 'seller' as const,
                id: `seller-${entry.sellerId}`,
                ...entry,
                score,
            };
        });
    }, [searchProducts, searchQuery]);

    const searchResults = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) {
            return [] as HeaderSearchResultItem[];
        }

        const productResults = filteredSearchProducts.map((product) => {
            const haystack =
                `${product.title} ${product.category ?? ''} ${product.subcategory ?? ''} ${product.description ?? ''}`.toLowerCase();
            let score = 1;
            if (product.title.toLowerCase().startsWith(normalized)) {
                score += 3;
            }
            if ((product.category ?? '').toLowerCase().startsWith(normalized)) {
                score += 2;
            }
            if (
                (product.subcategory ?? '').toLowerCase().startsWith(normalized)
            ) {
                score += 2;
            }
            if (haystack.includes(normalized)) {
                score += 1;
            }

            return {
                kind: 'product' as const,
                id: `product-${product.id}`,
                product,
                score,
            };
        });

        return [...productResults, ...filteredSellerResults]
            .sort((left, right) => right.score - left.score)
            .slice(0, searchResultLimit);
    }, [
        filteredSearchProducts,
        filteredSellerResults,
        searchQuery,
        searchResultLimit,
    ]);

    const renderHighlightedText = (value: string, query: string) => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            return value;
        }

        const lowerValue = value.toLowerCase();
        const lowerQuery = normalizedQuery.toLowerCase();
        const matchIndex = lowerValue.indexOf(lowerQuery);

        if (matchIndex === -1) {
            return value;
        }

        const before = value.slice(0, matchIndex);
        const match = value.slice(
            matchIndex,
            matchIndex + normalizedQuery.length,
        );
        const after = value.slice(matchIndex + normalizedQuery.length);

        return (
            <>
                {before}
                <mark className="header-search-highlight">{match}</mark>
                {after}
            </>
        );
    };

    const openSearchResult = (
        result: HeaderSearchResultItem,
        nextQuery?: string,
    ) => {
        if (nextQuery?.trim()) {
            persistRecentSearch(nextQuery);
        }

        setIsSearchModalOpen(false);

        if (result.kind === 'product') {
            onNavigateToAuction(result.product.id);
            return;
        }

        onNavigateSellerStore(
            result.sellerId,
            result.shopName || result.sellerName,
        );
    };

    const handleSearchInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (!searchResults.length) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveSearchIndex((prev) => (prev + 1) % searchResults.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveSearchIndex(
                (prev) =>
                    (prev - 1 + searchResults.length) % searchResults.length,
            );
            return;
        }

        if (
            event.key === 'Enter' &&
            searchQuery.trim() &&
            searchResults[activeSearchIndex]
        ) {
            event.preventDefault();
            openSearchResult(searchResults[activeSearchIndex], searchQuery);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = searchQuery.trim();
        if (!normalized) {
            if (enableHomeSearchSuggestions) {
                setIsSearchModalOpen(true);
            }
            return;
        }

        persistRecentSearch(normalized);
        setIsSearchModalOpen(enableHomeSearchSuggestions);

        if (searchResults.length > 0) {
            openSearchResult(
                searchResults[activeSearchIndex] ?? searchResults[0],
                normalized,
            );
        }
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const getCardLogo = (type: string) => {
        const extension = type === 'mastercard' ? 'jpg' : 'png';
        const logoName = type === 'mastercard' ? 'landbank' : type;
        return `/icons/${logoName}.${extension}`;
    };

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

    return (
        <header className="topbar">
            {disableHomeNavigation ? (
                <span className="brand brand-static">{brandLabel}</span>
            ) : (
                <button
                    type="button"
                    onClick={onNavigateHome}
                    className="brand brand-button"
                >
                    {brandLabel}
                </button>
            )}
            {!isSellerMode && (
                <form
                    className="search-bar"
                    onSubmit={handleSearch}
                    ref={searchContainerRef}
                >
                    <input
                        type="text"
                        placeholder="Search for auctions, items, categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            if (enableHomeSearchSuggestions) {
                                setIsSearchModalOpen(true);
                            }
                        }}
                        onKeyDown={handleSearchInputKeyDown}
                    />
                    <button
                        type="submit"
                        className="search-btn"
                        aria-label="Search"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    {enableHomeSearchSuggestions && isSearchModalOpen && (
                        <div className="header-search-panel">
                            <div className="header-search-panel-head">
                                <h4>Recent searches</h4>
                                {recentSearches.length > 0 && (
                                    <button
                                        type="button"
                                        className="header-search-clear-btn"
                                        onClick={clearRecentSearches}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="header-search-recent-list header-search-recent-list-modern">
                                {recentSearches.length === 0 && (
                                    <p className="header-search-empty">
                                        No recent searches yet.
                                    </p>
                                )}
                                {recentSearches.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className="header-search-recent-chip header-search-recent-chip-modern"
                                        onClick={() => setSearchQuery(item)}
                                    >
                                        <span
                                            className="header-search-recent-icon"
                                            aria-hidden="true"
                                        >
                                            ◷
                                        </span>
                                        <span>{item}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="header-search-live-list-wrap">
                                {isSearchLoading && (
                                    <p className="header-search-empty">
                                        Loading products...
                                    </p>
                                )}
                                {!isSearchLoading && !searchQuery.trim() && (
                                    <p className="header-search-empty">
                                        Type to search products, shops, or
                                        sellers.
                                    </p>
                                )}
                                {!isSearchLoading &&
                                    searchQuery.trim() &&
                                    searchResults.length === 0 && (
                                        <p className="header-search-empty">
                                            No matching products, shops, or
                                            sellers found.
                                        </p>
                                    )}

                                {!isSearchLoading &&
                                    searchResults.length > 0 && (
                                        <div className="header-search-results header-search-results-modern">
                                            {searchResults.map(
                                                (result, resultIndex) => {
                                                    if (
                                                        result.kind ===
                                                        'product'
                                                    ) {
                                                        const product =
                                                            result.product;
                                                        const thumbnail =
                                                            (
                                                                product.media ??
                                                                []
                                                            ).find(
                                                                (media) =>
                                                                    media.media_type ===
                                                                    'image',
                                                            ) ??
                                                            product.media?.[0];

                                                        return (
                                                            <button
                                                                key={result.id}
                                                                type="button"
                                                                className={`header-search-result-card${searchResults[activeSearchIndex]?.id === result.id ? 'active' : ''}`}
                                                                onClick={() =>
                                                                    openSearchResult(
                                                                        result,
                                                                        searchQuery,
                                                                    )
                                                                }
                                                                onMouseEnter={() =>
                                                                    setActiveSearchIndex(
                                                                        resultIndex,
                                                                    )
                                                                }
                                                            >
                                                                <div className="header-search-result-thumb-wrap">
                                                                    {thumbnail ? (
                                                                        <img
                                                                            className="header-search-result-thumb"
                                                                            src={resolveMediaUrl(
                                                                                thumbnail.url,
                                                                            )}
                                                                            alt={
                                                                                product.title
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <div className="header-search-result-thumb header-search-result-thumb-empty">
                                                                            No
                                                                            image
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="header-search-result-copy">
                                                                    <p className="header-search-result-title">
                                                                        {renderHighlightedText(
                                                                            product.title,
                                                                            searchQuery,
                                                                        )}
                                                                    </p>
                                                                    <p className="header-search-result-meta">
                                                                        {renderHighlightedText(
                                                                            `${product.category || 'Uncategorized'}${product.subcategory ? ` • ${product.subcategory}` : ''}`,
                                                                            searchQuery,
                                                                        )}{' '}
                                                                        •
                                                                        Product
                                                                    </p>
                                                                </div>
                                                                <span className="header-search-result-price">
                                                                    {formatCurrency(
                                                                        Number(
                                                                            product.current_price ||
                                                                                product.starting_price ||
                                                                                0,
                                                                        ),
                                                                    )}
                                                                </span>
                                                            </button>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            key={result.id}
                                                            type="button"
                                                            className={`header-search-result-card${searchResults[activeSearchIndex]?.id === result.id ? 'active' : ''}`}
                                                            onClick={() =>
                                                                openSearchResult(
                                                                    result,
                                                                    searchQuery,
                                                                )
                                                            }
                                                            onMouseEnter={() =>
                                                                setActiveSearchIndex(
                                                                    resultIndex,
                                                                )
                                                            }
                                                        >
                                                            <div className="header-search-result-thumb-wrap">
                                                                {result.thumbnailUrl ? (
                                                                    <img
                                                                        className="header-search-result-thumb"
                                                                        src={resolveMediaUrl(
                                                                            result.thumbnailUrl,
                                                                        )}
                                                                        alt={
                                                                            result.shopName
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <div className="header-search-result-thumb header-search-result-thumb-empty">
                                                                        Shop
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="header-search-result-copy">
                                                                <p className="header-search-result-title">
                                                                    {renderHighlightedText(
                                                                        result.shopName,
                                                                        searchQuery,
                                                                    )}
                                                                </p>
                                                                <p className="header-search-result-meta">
                                                                    {renderHighlightedText(
                                                                        result.sellerName,
                                                                        searchQuery,
                                                                    )}{' '}
                                                                    •{' '}
                                                                    {
                                                                        result.productCount
                                                                    }{' '}
                                                                    listing
                                                                    {result.productCount >
                                                                    1
                                                                        ? 's'
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                            <span className="header-search-result-price">
                                                                Shop
                                                            </span>
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                            </div>
                        </div>
                    )}
                </form>
            )}
            <div className="actions">
                <div className="dropdown-wrapper">
                    <span
                        className="dropdown-trigger login-trigger"
                        aria-label={
                            authUser ? 'Account menu' : 'Login or Register'
                        }
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
                            {authUser
                                ? `Hi, ${authUser.name.split(' ')[0]}`
                                : 'Login / Register'}
                        </span>
                        {authUser?.is_verified && (
                            <span className="verified-badge">✓ Verified</span>
                        )}
                    </span>
                    <div className="dropdown-menu">
                        {authUser ? (
                            <>
                                <div
                                    onClick={() =>
                                        shouldShowSellerDetails
                                            ? onNavigateSellerProfile()
                                            : onNavigateAccount('details')
                                    }
                                    className="dropdown-item clickable"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-3 2.5-5 8-5s8 2 8 5" />
                                    </svg>
                                    <span>
                                        {shouldShowSellerDetails
                                            ? 'Seller Details'
                                            : 'Details'}
                                    </span>
                                </div>
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() =>
                                            onNavigateAccount('cashback')
                                        }
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M12 7v10M9 9h3.5a2.5 2.5 0 0 1 0 5H10" />
                                        </svg>
                                        <span>Cashback</span>
                                        <span className="dropdown-amount">
                                            Php 0.00
                                        </span>
                                    </div>
                                )}
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() =>
                                            onNavigateAccount('wallet')
                                        }
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <rect
                                                x="3"
                                                y="7"
                                                width="18"
                                                height="12"
                                                rx="2"
                                            />
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
                                                ? formatCurrency(
                                                      mainCard.balance || 0,
                                                  )
                                                : 'Php 0.00'}
                                        </span>
                                    </div>
                                )}
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() =>
                                            onNavigateAccount('wishlist')
                                        }
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                                        </svg>
                                        <span>Wishlist</span>
                                    </div>
                                )}
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() =>
                                            onNavigateAccount('orders')
                                        }
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <rect
                                                x="3"
                                                y="4"
                                                width="18"
                                                height="16"
                                                rx="2"
                                            />
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
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <rect
                                                x="3"
                                                y="3"
                                                width="8"
                                                height="8"
                                                rx="1"
                                            />
                                            <rect
                                                x="13"
                                                y="3"
                                                width="8"
                                                height="5"
                                                rx="1"
                                            />
                                            <rect
                                                x="13"
                                                y="10"
                                                width="8"
                                                height="11"
                                                rx="1"
                                            />
                                            <rect
                                                x="3"
                                                y="13"
                                                width="8"
                                                height="8"
                                                rx="1"
                                            />
                                        </svg>
                                        <span>Seller Dashboard</span>
                                    </div>
                                )}
                                {!isSellerMode && (
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() =>
                                            onNavigateAccount('reviews')
                                        }
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9" />
                                        </svg>
                                        <span>Reviews</span>
                                    </div>
                                )}
                                <div className="dropdown-item clickable">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" />
                                        <line
                                            x1="12"
                                            y1="17"
                                            x2="12.01"
                                            y2="17"
                                        />
                                    </svg>
                                    <span>FAQ</span>
                                </div>
                                <div
                                    onClick={() => setIsLogoutModalOpen(true)}
                                    className="dropdown-item clickable"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                        <path d="M10 17l5-5-5-5" />
                                        <path d="M13.8 12H3" />
                                    </svg>
                                    <span>Logout</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    onClick={onNavigateLogin}
                                    className="dropdown-item clickable"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                                    </svg>
                                    Login
                                </div>
                                <div
                                    onClick={onNavigateRegister}
                                    className="dropdown-item clickable"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <line x1="19" y1="8" x2="19" y2="14" />
                                        <line x1="22" y1="11" x2="16" y2="11" />
                                    </svg>
                                    Register
                                </div>
                                <div
                                    onClick={onNavigateAdminLogin}
                                    className="dropdown-item clickable"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <rect
                                            x="3"
                                            y="11"
                                            width="18"
                                            height="10"
                                            rx="2"
                                        />
                                        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                                        <path d="M12 15v2" />
                                    </svg>
                                    <span>Admin Login</span>
                                </div>
                                <div
                                    className="dropdown-item clickable"
                                    onClick={onNavigateOrdersLogin}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <rect
                                            x="3"
                                            y="4"
                                            width="18"
                                            height="16"
                                            rx="2"
                                        />
                                        <path d="M7 8h10M7 12h10M7 16h6" />
                                    </svg>
                                    <span>Orders</span>
                                </div>
                                <div className="dropdown-item">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" />
                                        <line
                                            x1="12"
                                            y1="17"
                                            x2="12.01"
                                            y2="17"
                                        />
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
                        onClick={() =>
                            authUser
                                ? onNavigateAccount('wishlist')
                                : onNavigateLogin()
                        }
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
                                <rect
                                    x="4"
                                    y="7"
                                    width="16"
                                    height="13"
                                    rx="2"
                                    ry="2"
                                />
                                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                            </svg>
                            {authUser && activeBagCount > 0 && (
                                <span className="bag-count-badge">
                                    {activeBagCount}
                                </span>
                            )}
                        </span>
                        <div className="dropdown-menu bag-menu">
                            {authUser && activeBagCount > 0 ? (
                                <div className="bag-menu-list">
                                    <div className="bag-menu-head">
                                        <h3 className="bag-title">
                                            Won Auctions
                                        </h3>
                                        <span className="bag-menu-count">
                                            {activeBagCount} item(s)
                                        </span>
                                    </div>
                                    <div className="bag-menu-items">
                                        {activeBagItems
                                            .slice(0, 3)
                                            .map((item) => {
                                                const sellerName =
                                                    item.user?.seller_registration?.shop_name?.trim() ||
                                                    item.user?.name ||
                                                    'Unknown Seller';
                                                const thumbnailMedia =
                                                    (item.media ?? []).find(
                                                        (media) =>
                                                            media.media_type ===
                                                            'image',
                                                    ) ?? item.media?.[0];

                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className="bag-menu-item bag-menu-item-button"
                                                        onClick={() =>
                                                            onNavigateToAuction(
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        <div className="bag-menu-item-media-wrap">
                                                            {thumbnailMedia ? (
                                                                <img
                                                                    className="bag-menu-item-media"
                                                                    src={resolveMediaUrl(
                                                                        thumbnailMedia.url,
                                                                    )}
                                                                    alt={
                                                                        item.title
                                                                    }
                                                                />
                                                            ) : (
                                                                <div className="bag-menu-item-media-empty">
                                                                    No image
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="bag-menu-item-content">
                                                            <p className="bag-menu-item-kicker">
                                                                Won auction
                                                            </p>
                                                            <p className="bag-menu-item-title">
                                                                {item.title}
                                                            </p>
                                                            <p className="bag-menu-item-meta">
                                                                Seller:{' '}
                                                                {sellerName}
                                                            </p>
                                                            <p className="bag-menu-item-price">
                                                                Winning bid:{' '}
                                                                {formatCurrency(
                                                                    Number(
                                                                        item.winning_bid_amount ??
                                                                            0,
                                                                    ),
                                                                )}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                    <button
                                        type="button"
                                        className="bag-cta-btn bag-menu-cta"
                                        onClick={onNavigateBag}
                                    >
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
                                            <rect
                                                x="3"
                                                y="7"
                                                width="18"
                                                height="13"
                                                rx="2"
                                                ry="2"
                                            />
                                            <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                                            <path
                                                d="M12 12v3"
                                                strokeLinecap="round"
                                            />
                                            <circle
                                                cx="12"
                                                cy="15"
                                                r="0.5"
                                                fill="currentColor"
                                            />
                                        </svg>
                                        <div className="sparkle sparkle-1">
                                            ✨
                                        </div>
                                        <div className="sparkle sparkle-2">
                                            ✨
                                        </div>
                                    </div>
                                    <h3 className="bag-title">
                                        {isLoadingWonAuctions
                                            ? 'Loading your bag...'
                                            : 'Your Bag is empty.'}
                                    </h3>
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
                            <h2 className="delete-modal-title">
                                Logout from account?
                            </h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Are you sure you want to log out? You will need
                                to sign in again to access your account.
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
