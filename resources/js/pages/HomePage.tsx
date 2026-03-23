import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    getDefaultHomePageConfig,
    normalizeHomePageConfig,
} from '../lib/homePageConfig';
import { adminApi } from '../services/adminApi';
import { auctionService } from '../services/api';
import type { AuctionProduct, WishlistItem } from '../types';
import {
    getAuctionDashboardDisappearanceTime,
    getAuctionDisplayStatus,
    isAuctionVisibleOnDashboard,
} from '../utils/auctionStatus';

interface HomePageProps {
    selectedCategory: string | null;
    selectedSubcategory?: string | null;
    featureFlags?: {
        enableVideoAds: boolean;
        enableCarousel: boolean;
        enablePromoCircles: boolean;
    };
    isCategoryPage?: boolean;
    onNavigateHome?: () => void;
    onNavigateCategory?: (category: string) => void;
    onNavigateToRegister: () => void;
    onNavigateToBrowse?: () => void;
    onNavigateToWishlist: () => void;
    onNavigateToAuction: (auctionId: number) => void;
}

const DASHBOARD_GRACE_PERIOD_MS = 30 * 60 * 1000;
const CATEGORY_PAGE_SIZE = 12;

const getDashboardDisappearanceTime = (product: AuctionProduct) => {
    return getAuctionDashboardDisappearanceTime(
        product,
        DASHBOARD_GRACE_PERIOD_MS,
    );
};

const getProductDisplayStatus = (
    product: AuctionProduct,
    referenceTime = Date.now(),
): 'open' | 'closed' | 'scheduled' => {
    return getAuctionDisplayStatus(product, referenceTime);
};

const isVisibleOnDashboard = (
    product: AuctionProduct,
    referenceTime = Date.now(),
) => {
    return isAuctionVisibleOnDashboard(
        product,
        referenceTime,
        DASHBOARD_GRACE_PERIOD_MS,
    );
};

const formatRemainingCountdown = (targetTime: number) => {
    const diff = Math.max(0, targetTime - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m ${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
};

const DashboardDisappearanceCountdown: React.FC<{
    targetTime: number;
    onExpire: () => void;
}> = ({ targetTime, onExpire }) => {
    const [label, setLabel] = useState(() =>
        formatRemainingCountdown(targetTime),
    );

    useEffect(() => {
        if (targetTime <= Date.now()) {
            onExpire();
            return;
        }

        const interval = window.setInterval(() => {
            if (targetTime <= Date.now()) {
                window.clearInterval(interval);
                onExpire();
                return;
            }

            setLabel(formatRemainingCountdown(targetTime));
        }, 1000);

        return () => window.clearInterval(interval);
    }, [onExpire, targetTime]);

    return <p className="home-product-expiry-note">Disappears in {label}</p>;
};

export const HomePage: React.FC<HomePageProps> = ({
    selectedCategory,
    selectedSubcategory,
    featureFlags,
    isCategoryPage = false,
    onNavigateHome,
    onNavigateCategory,
    onNavigateToRegister,
    onNavigateToBrowse,
    onNavigateToWishlist,
    onNavigateToAuction,
}) => {
    void selectedSubcategory;
    void featureFlags;
    void onNavigateToBrowse;

    const { authUser } = useAuth();
    const carouselRef = useRef<HTMLDivElement>(null);
    const productsSectionRef = useRef<HTMLElement | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [categoryPage, setCategoryPage] = useState(1);
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [wishlistPulseId, setWishlistPulseId] = useState<number | null>(null);
    const [expiredProductIds, setExpiredProductIds] = useState<number[]>([]);
    const [homePageConfig, setHomePageConfig] = useState(
        getDefaultHomePageConfig(),
    );

    const carouselSlides = homePageConfig.slides;
    const promoCircles = homePageConfig.circles;
    const videoAds = homePageConfig.videoAds;
    const miniSlides = homePageConfig.miniSlides ?? [];
    const [currentMiniSlide, setCurrentMiniSlide] = useState(0);

    const wishlistKey = `wishlist_items_${authUser?.id ?? 'guest'}`;
    const [wishlistItems, setWishlistItems] = useLocalStorage<WishlistItem[]>(
        wishlistKey,
        [],
    );

    useEffect(() => {
        let isActive = true;

        const fetchHomeConfig = async () => {
            try {
                const response = await adminApi.getPublicHomepageConfig();
                if (!isActive) {
                    return;
                }

                setHomePageConfig(normalizeHomePageConfig(response.config));
            } catch {
                if (isActive) {
                    setHomePageConfig(getDefaultHomePageConfig());
                }
            }
        };

        void fetchHomeConfig();

        return () => {
            isActive = false;
        };
    }, []);

    const scrollCarouselLeft = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollCarouselRight = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    const scrollMiniCarouselLeft = () => {
        setCurrentMiniSlide(
            (prev) =>
                (prev - 1 + miniSlides.length) % Math.max(1, miniSlides.length),
        );
    };

    const scrollMiniCarouselRight = () => {
        setCurrentMiniSlide(
            (prev) => (prev + 1) % Math.max(1, miniSlides.length),
        );
    };

    useEffect(() => {
        if (isCategoryPage) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
        }, 5000); // Auto-rotate every 5 seconds

        return () => clearInterval(interval);
    }, [carouselSlides.length, isCategoryPage]);

    useEffect(() => {
        if (currentSlide < carouselSlides.length) {
            return;
        }

        setCurrentSlide(0);
    }, [carouselSlides.length, currentSlide]);

    useEffect(() => {
        if (isCategoryPage || miniSlides.length === 0) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentMiniSlide((prev) => (prev + 1) % miniSlides.length);
        }, 7000);

        return () => clearInterval(interval);
    }, [miniSlides.length, isCategoryPage]);

    useEffect(() => {
        if (currentMiniSlide < miniSlides.length) {
            return;
        }
        setCurrentMiniSlide(0);
    }, [miniSlides.length, currentMiniSlide]);

    useEffect(() => {
        let isActive = true;

        const fetchProducts = async () => {
            setProductsLoading(true);
            try {
                const data = await auctionService.getAllProducts();
                if (isActive) {
                    setProducts(data);
                    setExpiredProductIds([]);
                }
            } catch {
                if (isActive) {
                    setProducts([]);
                    setExpiredProductIds([]);
                }
            } finally {
                if (isActive) {
                    setProductsLoading(false);
                }
            }
        };

        fetchProducts();

        return () => {
            isActive = false;
        };
    }, []);

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

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(
            /\/$/,
            '',
        );
        if (!apiBase) {
            return url;
        }

        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const currentSlideData = carouselSlides[currentSlide] ?? carouselSlides[0];

    const isInWishlist = (productId: number) =>
        wishlistItems.some((item) => item.id === productId);

    const notifyWishlistAdded = () => {
        toast.success('Added to wishlist.', {
            autoClose: 2200,
        });
    };

    const toggleWishlist = (product: AuctionProduct) => {
        if (!authUser) {
            onNavigateToWishlist();
            return;
        }

        const displayStatus = getProductDisplayStatus(product);
        const exists = isInWishlist(product.id);
        if (exists) {
            setWishlistItems(
                wishlistItems.filter((item) => item.id !== product.id),
            );
            toast.info('Removed from wishlist.', { autoClose: 2200 });
            return;
        }

        if (displayStatus === 'closed') {
            toast.info('Closed auctions cannot be added to wishlist.');
            return;
        }

        const firstMedia = product.media?.[0];
        const entry: WishlistItem = {
            id: product.id,
            title: product.title,
            category: product.category,
            price: product.current_price || product.starting_price,
            mediaUrl: resolveMediaUrl(firstMedia?.url),
            mediaType: firstMedia?.media_type,
        };

        setWishlistItems([...wishlistItems, entry]);
        notifyWishlistAdded();
        setWishlistPulseId(product.id);
        window.setTimeout(() => {
            setWishlistPulseId((prev) => (prev === product.id ? null : prev));
        }, 260);
    };

    const visibleProducts = useMemo(() => {
        return products
            .filter((product) => !expiredProductIds.includes(product.id))
            .filter((product) => isVisibleOnDashboard(product));
    }, [expiredProductIds, products]);

    const normalizedSelectedCategory =
        selectedCategory?.trim().toLowerCase() ?? null;

    const selectedCategoryProducts = useMemo(() => {
        if (!normalizedSelectedCategory) {
            return [];
        }

        return visibleProducts.filter((product) => {
            const categoryLabel =
                product.category?.trim().toLowerCase() || 'others';
            return categoryLabel === normalizedSelectedCategory;
        });
    }, [normalizedSelectedCategory, visibleProducts]);

    const totalCategoryPages = Math.max(
        1,
        Math.ceil(selectedCategoryProducts.length / CATEGORY_PAGE_SIZE),
    );

    useEffect(() => {
        setCategoryPage(1);
    }, [selectedCategory]);

    useEffect(() => {
        if (categoryPage > totalCategoryPages) {
            setCategoryPage(totalCategoryPages);
        }
    }, [categoryPage, totalCategoryPages]);

    useEffect(() => {
        if (!selectedCategory) {
            return;
        }

        productsSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, [selectedCategory]);

    const paginatedCategoryProducts = useMemo(() => {
        const startIndex = (categoryPage - 1) * CATEGORY_PAGE_SIZE;
        return selectedCategoryProducts.slice(
            startIndex,
            startIndex + CATEGORY_PAGE_SIZE,
        );
    }, [categoryPage, selectedCategoryProducts]);

    const renderProductCard = (product: AuctionProduct) => {
        const thumbnailMedia = (product.media ?? []).find(
            (media) => media.media_type === 'image',
        );
        const displayStatus = getProductDisplayStatus(product);
        const isWishlistDisabled =
            displayStatus === 'closed' && !isInWishlist(product.id);
        const disappearanceTime =
            displayStatus === 'closed'
                ? getDashboardDisappearanceTime(product)
                : null;
        const sellerName =
            product.user?.seller_registration?.shop_name?.trim() ||
            product.user?.name ||
            `Seller #${product.user_id}`;

        return (
            <article
                key={product.id}
                className={`home-product-card home-product-card-clickable home-product-card-status-${displayStatus}`}
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
                <div className="home-product-image-wrap">
                    {thumbnailMedia ? (
                        <img
                            className="home-product-image"
                            src={resolveMediaUrl(thumbnailMedia.url)}
                            alt={product.title}
                        />
                    ) : (
                        <div className="home-product-image home-product-image-placeholder">
                            No image
                        </div>
                    )}
                </div>

                <div className="home-product-content">
                    <div className="home-product-meta-row">
                        <p className="home-product-brand">
                            {(product.category || 'Product').toUpperCase()}
                        </p>
                        <span
                            className={`home-product-status-chip home-product-status-chip-${displayStatus}`}
                        >
                            {displayStatus}
                        </span>
                    </div>
                    <p className="home-product-name">{product.title}</p>
                    <p className="home-product-seller" title={sellerName}>
                        Sold by {sellerName}
                    </p>
                    <div className="home-product-price-row">
                        <div>
                            <p className="home-product-price-label">
                                Current bid
                            </p>
                            <p className="home-product-price">
                                {formatPeso(
                                    product.current_price ||
                                        product.starting_price,
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            className={`home-product-wishlist-btn-bottom ${isInWishlist(product.id) ? 'active' : ''} ${wishlistPulseId === product.id ? 'pulse' : ''}`}
                            aria-label={
                                isWishlistDisabled
                                    ? 'Closed auction cannot be wishlisted'
                                    : 'Add to wishlist'
                            }
                            disabled={isWishlistDisabled}
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleWishlist(product);
                            }}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            >
                                <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                            </svg>
                        </button>
                    </div>
                    {displayStatus === 'closed' && disappearanceTime && (
                        <DashboardDisappearanceCountdown
                            targetTime={disappearanceTime}
                            onExpire={() => {
                                setExpiredProductIds((prev) =>
                                    prev.includes(product.id)
                                        ? prev
                                        : [...prev, product.id],
                                );
                            }}
                        />
                    )}
                </div>
            </article>
        );
    };

    const categoryRows = useMemo(() => {
        const groups = new Map<string, AuctionProduct[]>();

        visibleProducts.forEach((product) => {
            const category = product.category?.trim() || 'Others';
            const existing = groups.get(category) ?? [];
            existing.push(product);
            groups.set(category, existing);
        });

        const priority = ['Electronics', 'Collectibles', 'Art'];

        return Array.from(groups.entries())
            .sort(([a], [b]) => {
                const aPriority = priority.findIndex(
                    (item) => item.toLowerCase() === a.toLowerCase(),
                );
                const bPriority = priority.findIndex(
                    (item) => item.toLowerCase() === b.toLowerCase(),
                );

                if (aPriority !== -1 || bPriority !== -1) {
                    if (aPriority === -1) {
                        return 1;
                    }
                    if (bPriority === -1) {
                        return -1;
                    }
                    return aPriority - bPriority;
                }

                return a.localeCompare(b);
            })
            .map(([category, items]) => ({ category, items }));
    }, [visibleProducts]);

    return (
        <main className="content">
            {isCategoryPage && (
                <div
                    className="page-breadcrumb home-category-breadcrumb"
                    aria-label="Category breadcrumb navigation"
                >
                    <button type="button" onClick={() => onNavigateHome?.()}>
                        Home
                    </button>
                    <span aria-hidden="true">/</span>
                    <button
                        type="button"
                        className="page-breadcrumb-current page-breadcrumb-current-button"
                        onClick={() => {
                            if (selectedCategory) {
                                onNavigateCategory?.(selectedCategory);
                            }
                        }}
                        disabled={!selectedCategory}
                    >
                        {selectedCategory || 'Category'}
                    </button>
                </div>
            )}

            {!isCategoryPage && (
                <>
                    <div className="carousel-container">
                        <button
                            className="carousel-btn carousel-btn-prev"
                            onClick={scrollCarouselLeft}
                            aria-label="Previous"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <div className="brand-carousel" ref={carouselRef}>
                            {promoCircles.map((circle) => (
                                <div key={circle.id} className="brand-circle">
                                    <div className={`circle ${circle.tone}`}>
                                        <span className="circle-text">
                                            {circle.label}
                                        </span>
                                    </div>
                                    <p className="circle-label">
                                        {circle.discount}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <button
                            className="carousel-btn carousel-btn-next"
                            onClick={scrollCarouselRight}
                            aria-label="Next"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    <div
                        className="hero-banner"
                        style={{
                            backgroundImage: `url('${currentSlideData?.image || ''}')`,
                        }}
                    >
                        <div className="hero-banner-overlay"></div>
                        <div className="hero-content">
                            <h2 className="hero-subtitle">
                                {currentSlideData?.subtitle || 'FEATURED SALE'}
                            </h2>
                            <h1 className="hero-title">
                                {currentSlideData?.title ||
                                    'Featured Collection'}
                            </h1>
                            <h1 className="hero-price">
                                {currentSlideData?.price || 'Up to 0% Off'}
                            </h1>
                            <div className="hero-brands">
                                {(currentSlideData?.brands || []).map(
                                    (brand, idx) => (
                                        <span key={idx}>{brand}</span>
                                    ),
                                )}
                            </div>
                            <button
                                className="hero-btn"
                                onClick={onNavigateToRegister}
                            >
                                BID NOW →
                            </button>
                            <p className="hero-disclaimer">
                                {currentSlideData?.disclaimer ||
                                    'Limited offer.'}
                            </p>
                        </div>
                        <div className="hero-carousel-nav">
                            {carouselSlides.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`carousel-dot ${currentSlide === idx ? 'active' : ''}`}
                                    onClick={() => setCurrentSlide(idx)}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {miniSlides.length > 0 &&
                        (() => {
                            const currentMiniSlideData =
                                miniSlides[currentMiniSlide] ?? miniSlides[0];
                            return (
                                <div
                                    className="mini-carousel-banner"
                                    style={{
                                        backgroundImage:
                                            currentMiniSlideData?.image
                                                ? `url('${resolveMediaUrl(currentMiniSlideData.image)}')`
                                                : undefined,
                                    }}
                                    aria-label="Mini carousel"
                                >
                                    <div className="mini-carousel-overlay" />
                                    <div className="mini-carousel-body">
                                        <div className="mini-carousel-text">
                                            <span className="mini-carousel-eyebrow">
                                                {currentMiniSlideData?.subtitle ||
                                                    'FEATURED'}
                                            </span>
                                            <h2 className="mini-carousel-title">
                                                {currentMiniSlideData?.title ||
                                                    'Featured Auctions'}
                                            </h2>
                                            <p className="mini-carousel-price">
                                                {currentMiniSlideData?.price ||
                                                    ''}
                                            </p>
                                            {(
                                                currentMiniSlideData?.brands ??
                                                []
                                            ).length > 0 && (
                                                <div className="mini-carousel-brands">
                                                    {(
                                                        currentMiniSlideData?.brands ??
                                                        []
                                                    ).map((brand, idx) => (
                                                        <span key={idx}>
                                                            {brand}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mini-carousel-controls">
                                        <button
                                            className="mini-carousel-arrow"
                                            onClick={scrollMiniCarouselLeft}
                                            aria-label="Previous mini slide"
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                            >
                                                <polyline points="15 18 9 12 15 6" />
                                            </svg>
                                        </button>
                                        <div className="mini-carousel-dots">
                                            {miniSlides.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`mini-carousel-dot ${idx === currentMiniSlide ? 'active' : ''}`}
                                                    onClick={() =>
                                                        setCurrentMiniSlide(idx)
                                                    }
                                                    aria-label={`Go to mini slide ${idx + 1}`}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            className="mini-carousel-arrow"
                                            onClick={scrollMiniCarouselRight}
                                            aria-label="Next mini slide"
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                            >
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                    <section
                        className="video-ad-section"
                        aria-label="Homepage video ads"
                    >
                        <div className="video-ad-grid">
                            {videoAds.map((video) => {
                                const videoUrl = resolveMediaUrl(
                                    video.videoUrl,
                                );
                                const imageUrl = resolveMediaUrl(
                                    video.imageUrl || video.image,
                                );

                                return (
                                    <article
                                        key={video.id}
                                        className={`video-ad-placeholder ${videoUrl ? 'has-video' : 'has-image'}`}
                                        style={
                                            !videoUrl && imageUrl
                                                ? {
                                                      backgroundImage: `url('${imageUrl}')`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        {videoUrl && (
                                            <video
                                                className="video-ad-media"
                                                src={videoUrl}
                                                poster={imageUrl || undefined}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                preload="metadata"
                                                controls
                                            />
                                        )}
                                        <div className="video-ad-overlay" />
                                        <div className="video-ad-copy">
                                            <div className="video-ad-label">
                                                {video.title}
                                            </div>
                                            <div className="video-ad-size">
                                                {video.description ||
                                                    video.subtitle}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            <section
                className="home-products-section"
                aria-label="Recommended products"
                id="home-products-section"
                ref={productsSectionRef}
            >
                <h2 className="home-products-title">
                    {isCategoryPage && selectedCategory
                        ? `${selectedCategory} Auctions`
                        : 'You Might Like This'}
                </h2>

                {productsLoading && (
                    <p className="home-products-state">Loading products...</p>
                )}

                {!productsLoading && products.length === 0 && (
                    <p className="home-products-state">
                        No products available yet.
                    </p>
                )}

                {!productsLoading && selectedCategory && (
                    <>
                        <div className="home-category-result-meta">
                            <p className="home-category-result-title">
                                {selectedCategory}
                            </p>
                            <p className="home-category-result-count">
                                {selectedCategoryProducts.length} products found
                            </p>
                        </div>

                        {selectedCategoryProducts.length === 0 && (
                            <p className="home-products-state">
                                No products available in this category yet.
                            </p>
                        )}

                        {selectedCategoryProducts.length > 0 && (
                            <>
                                <div className="home-products-grid">
                                    {paginatedCategoryProducts.map(
                                        renderProductCard,
                                    )}
                                </div>

                                {totalCategoryPages > 1 && (
                                    <div
                                        className="home-pagination"
                                        role="navigation"
                                        aria-label="Category product pagination"
                                    >
                                        <button
                                            type="button"
                                            className="home-pagination-btn"
                                            onClick={() =>
                                                setCategoryPage((prev) =>
                                                    Math.max(1, prev - 1),
                                                )
                                            }
                                            disabled={categoryPage === 1}
                                        >
                                            Previous
                                        </button>

                                        <div className="home-pagination-pages">
                                            {Array.from(
                                                { length: totalCategoryPages },
                                                (_, index) => index + 1,
                                            ).map((page) => (
                                                <button
                                                    key={page}
                                                    type="button"
                                                    className={`home-pagination-page ${page === categoryPage ? 'active' : ''}`}
                                                    onClick={() =>
                                                        setCategoryPage(page)
                                                    }
                                                    aria-label={`Go to page ${page}`}
                                                    aria-current={
                                                        page === categoryPage
                                                            ? 'page'
                                                            : undefined
                                                    }
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="home-pagination-btn"
                                            onClick={() =>
                                                setCategoryPage((prev) =>
                                                    Math.min(
                                                        totalCategoryPages,
                                                        prev + 1,
                                                    ),
                                                )
                                            }
                                            disabled={
                                                categoryPage ===
                                                totalCategoryPages
                                            }
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {!productsLoading &&
                    !selectedCategory &&
                    categoryRows.length > 0 && (
                        <div className="home-category-rows">
                            {categoryRows.map((row) => (
                                <section
                                    key={row.category}
                                    className="home-category-row"
                                    aria-label={`${row.category} products`}
                                >
                                    <div className="home-category-row-card">
                                        <h3 className="home-category-row-title">
                                            {row.category}
                                        </h3>
                                    </div>
                                    <div className="home-products-grid">
                                        {row.items
                                            .slice(0, 8)
                                            .map(renderProductCard)}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
            </section>
        </main>
    );
};
