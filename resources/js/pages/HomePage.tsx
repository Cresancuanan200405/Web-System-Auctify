import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { auctionService } from '../services/api';
import type { AuctionProduct, WishlistItem } from '../types';
import {
    getAuctionDashboardDisappearanceTime,
    getAuctionDisplayStatus,
    isAuctionVisibleOnDashboard,
} from '../utils/auctionStatus';

interface HomePageProps {
    selectedCategory: string | null;
    isCategoryPage?: boolean;
    onNavigateHome?: () => void;
    onNavigateCategory?: (category: string) => void;
    onNavigateToRegister: () => void;
    onNavigateToWishlist: () => void;
    onNavigateToAuction: (auctionId: number) => void;
}

const DASHBOARD_GRACE_PERIOD_MS = 30 * 60 * 1000;
const CATEGORY_PAGE_SIZE = 12;

const getDashboardDisappearanceTime = (product: AuctionProduct) => {
    return getAuctionDashboardDisappearanceTime(product, DASHBOARD_GRACE_PERIOD_MS);
};

const getProductDisplayStatus = (product: AuctionProduct, referenceTime = Date.now()): 'open' | 'closed' | 'scheduled' => {
    return getAuctionDisplayStatus(product, referenceTime);
};

const isVisibleOnDashboard = (product: AuctionProduct, referenceTime = Date.now()) => {
    return isAuctionVisibleOnDashboard(product, referenceTime, DASHBOARD_GRACE_PERIOD_MS);
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

const DashboardDisappearanceCountdown: React.FC<{ targetTime: number; onExpire: () => void }> = ({ targetTime, onExpire }) => {
    const [label, setLabel] = useState(() => formatRemainingCountdown(targetTime));

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

        setLabel(formatRemainingCountdown(targetTime));

        return () => window.clearInterval(interval);
    }, [onExpire, targetTime]);

    return <p className="home-product-expiry-note">Disappears in {label}</p>;
};

const CAROUSEL_SLIDES = [
    {
        subtitle: 'WEEKEND SPECIAL',
        title: 'Exceptional Finds',
        price: 'Up to 60% Off',
        brands: ['Rolex', 'Ferrari', 'Picasso'],
        disclaimer: 'T&Cs apply. Ends February 18, 12 noon.\nLive Auction Starts at 2PM',
        image: '/carousel/1.jpg'
    },
    {
        subtitle: 'FLASH SALE',
        title: 'Limited Edition',
        price: 'Up to 70% Off',
        brands: ['Omega', 'Tesla', 'Van Gogh'],
        disclaimer: 'Limited time offer. While stocks last.\nExclusive members only',
        image: '/carousel/2.jpg'
    },
    {
        subtitle: 'LUXURY COLLECTION',
        title: 'Premium Selection',
        price: 'Up to 50% Off',
        brands: ['Hermes', 'Mercedes', 'Monet'],
        disclaimer: 'Curated by experts. Quality guaranteed.\nAuthenticity certified',
        image: '/carousel/3.jpg'
    },
    {
        subtitle: 'COLLECTORS CHOICE',
        title: 'Rare Treasures',
        price: 'Up to 80% Off',
        brands: ['Patek Philippe', 'Ferrari', 'Picasso'],
        disclaimer: 'Authenticated pieces. Certificate included.\nInvestment grade items',
        image: '/carousel/4.jpg'
    }
];

export const HomePage: React.FC<HomePageProps> = ({ selectedCategory, isCategoryPage = false, onNavigateHome, onNavigateCategory, onNavigateToRegister, onNavigateToWishlist, onNavigateToAuction }) => {
    const { authUser } = useAuth();
    const carouselRef = useRef<HTMLDivElement>(null);
    const productsSectionRef = useRef<HTMLElement | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [categoryPage, setCategoryPage] = useState(1);
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [wishlistPulseId, setWishlistPulseId] = useState<number | null>(null);
    const [expiredProductIds, setExpiredProductIds] = useState<number[]>([]);

    const wishlistKey = `wishlist_items_${authUser?.id ?? 'guest'}`;
    const [wishlistItems, setWishlistItems] = useLocalStorage<WishlistItem[]>(wishlistKey, []);

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

    useEffect(() => {
        if (isCategoryPage) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
        }, 5000); // Auto-rotate every 5 seconds

        return () => clearInterval(interval);
    }, [isCategoryPage]);

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

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
        if (!apiBase) {
            return url;
        }

        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const currentSlideData = CAROUSEL_SLIDES[currentSlide];

    const isInWishlist = (productId: number) => wishlistItems.some((item) => item.id === productId);

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
            setWishlistItems(wishlistItems.filter((item) => item.id !== product.id));
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

    const normalizedSelectedCategory = selectedCategory?.trim().toLowerCase() ?? null;

    const selectedCategoryProducts = useMemo(() => {
        if (!normalizedSelectedCategory) {
            return [];
        }

        return visibleProducts.filter((product) => {
            const categoryLabel = product.category?.trim().toLowerCase() || 'others';
            return categoryLabel === normalizedSelectedCategory;
        });
    }, [normalizedSelectedCategory, visibleProducts]);

    const totalCategoryPages = Math.max(1, Math.ceil(selectedCategoryProducts.length / CATEGORY_PAGE_SIZE));

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

        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [selectedCategory]);

    const paginatedCategoryProducts = useMemo(() => {
        const startIndex = (categoryPage - 1) * CATEGORY_PAGE_SIZE;
        return selectedCategoryProducts.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE);
    }, [categoryPage, selectedCategoryProducts]);

    const renderProductCard = (product: AuctionProduct) => {
        const thumbnailMedia = (product.media ?? []).find((media) => media.media_type === 'image');
        const displayStatus = getProductDisplayStatus(product);
        const isWishlistDisabled = displayStatus === 'closed' && !isInWishlist(product.id);
        const disappearanceTime = displayStatus === 'closed' ? getDashboardDisappearanceTime(product) : null;
        const sellerName = product.user?.seller_registration?.shop_name?.trim()
            || product.user?.name
            || `Seller #${product.user_id}`;

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
                        <img className="home-product-image" src={resolveMediaUrl(thumbnailMedia.url)} alt={product.title} />
                    ) : (
                        <div className="home-product-image home-product-image-placeholder">No image</div>
                    )}
                </div>

                <div className="home-product-content">
                    <div className="home-product-meta-row">
                        <p className="home-product-brand">{(product.category || 'Product').toUpperCase()}</p>
                        <span className={`home-product-status-chip home-product-status-chip-${displayStatus}`}>
                            {displayStatus}
                        </span>
                    </div>
                    <p className="home-product-name">{product.title}</p>
                    <p className="home-product-seller" title={sellerName}>Sold by {sellerName}</p>
                    <div className="home-product-price-row">
                        <div>
                            <p className="home-product-price-label">Current bid</p>
                            <p className="home-product-price">{formatPeso(product.current_price || product.starting_price)}</p>
                        </div>
                        <button
                            type="button"
                            className={`home-product-wishlist-btn-bottom ${isInWishlist(product.id) ? 'active' : ''} ${wishlistPulseId === product.id ? 'pulse' : ''}`}
                            aria-label={isWishlistDisabled ? 'Closed auction cannot be wishlisted' : 'Add to wishlist'}
                            disabled={isWishlistDisabled}
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleWishlist(product);
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.7">
                                <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                            </svg>
                        </button>
                    </div>
                    {displayStatus === 'closed' && disappearanceTime && (
                        <DashboardDisappearanceCountdown
                            targetTime={disappearanceTime}
                            onExpire={() => {
                                setExpiredProductIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]));
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
                const aPriority = priority.findIndex((item) => item.toLowerCase() === a.toLowerCase());
                const bPriority = priority.findIndex((item) => item.toLowerCase() === b.toLowerCase());

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
                <div className="page-breadcrumb home-category-breadcrumb" aria-label="Category breadcrumb navigation">
                    <button type="button" onClick={() => onNavigateHome?.()}>Home</button>
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
                        <button className="carousel-btn carousel-btn-prev" onClick={scrollCarouselLeft} aria-label="Previous">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <div className="brand-carousel" ref={carouselRef}>
                            <div className="brand-circle">
                                <div className="circle yellow">
                                    <span className="circle-text">FLASH<br/>SALE</span>
                                </div>
                                <p className="circle-label">Up to 70% Off!</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">ROLEX<br/>OMEGA</span>
                                </div>
                                <p className="circle-label">Up to 15% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">CLASSIC<br/>CARS</span>
                                </div>
                                <p className="circle-label">Up to 85% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">HERMES<br/>GUCCI</span>
                                </div>
                                <p className="circle-label">Up to 25% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">FINE<br/>ART</span>
                                </div>
                                <p className="circle-label">Up to 50% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">VINTAGE<br/>WATCHES</span>
                                </div>
                                <p className="circle-label">Up to 30% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">RARE<br/>COINS</span>
                                </div>
                                <p className="circle-label">Up to 40% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">JEWELRY</span>
                                </div>
                                <p className="circle-label">Up to 45% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">GAMING<br/>CONSOLES</span>
                                </div>
                                <p className="circle-label">Up to 35% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">FASHION<br/>BRANDS</span>
                                </div>
                                <p className="circle-label">Up to 55% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">VEHICLES<br/>MEMORABILIA</span>
                                </div>
                                <p className="circle-label">Up to 60% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">RARE<br/>BOOKS</span>
                                </div>
                                <p className="circle-label">Up to 45% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">WINE &<br/>SPIRITS</span>
                                </div>
                                <p className="circle-label">Up to 30% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">MUSICAL<br/>INSTRUMENTS</span>
                                </div>
                                <p className="circle-label">Up to 50% Off</p>
                            </div>
                            <div className="brand-circle">
                                <div className="circle black">
                                    <span className="circle-text">PHOTOGRAPHY<br/>GEAR</span>
                                </div>
                                <p className="circle-label">Up to 40% Off</p>
                            </div>
                        </div>
                        <button className="carousel-btn carousel-btn-next" onClick={scrollCarouselRight} aria-label="Next">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    <div className="hero-banner" style={{backgroundImage: `url('${currentSlideData.image}')`}}>
                        <div className="hero-banner-overlay"></div>
                        <div className="hero-content">
                            <h2 className="hero-subtitle">{currentSlideData.subtitle}</h2>
                            <h1 className="hero-title">{currentSlideData.title}</h1>
                            <h1 className="hero-price">{currentSlideData.price}</h1>
                            <div className="hero-brands">
                                {currentSlideData.brands.map((brand, idx) => (
                                    <span key={idx}>{brand}</span>
                                ))}
                            </div>
                            <button className="hero-btn" onClick={onNavigateToRegister}>BID NOW →</button>
                            <p className="hero-disclaimer">{currentSlideData.disclaimer}</p>
                        </div>
                        <div className="hero-carousel-nav">
                            {CAROUSEL_SLIDES.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`carousel-dot ${currentSlide === idx ? 'active' : ''}`}
                                    onClick={() => setCurrentSlide(idx)}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    <section className="video-ad-section" aria-label="Video Advertisement Placeholder">
                        <div className="video-ad-placeholder">
                            <div className="video-ad-label">VIDEO ADS PLACEHOLDER</div>
                            <div className="video-ad-size">1920 × 600 recommended</div>
                        </div>
                    </section>
                </>
            )}

            <section className="home-products-section" aria-label="Recommended products" id="home-products-section" ref={productsSectionRef}>
                <h2 className="home-products-title">{isCategoryPage && selectedCategory ? `${selectedCategory} Auctions` : 'You Might Like This'}</h2>

                {productsLoading && <p className="home-products-state">Loading products...</p>}

                {!productsLoading && products.length === 0 && (
                    <p className="home-products-state">No products available yet.</p>
                )}

                {!productsLoading && selectedCategory && (
                    <>
                        <div className="home-category-result-meta">
                            <p className="home-category-result-title">{selectedCategory}</p>
                            <p className="home-category-result-count">{selectedCategoryProducts.length} products found</p>
                        </div>

                        {selectedCategoryProducts.length === 0 && (
                            <p className="home-products-state">No products available in this category yet.</p>
                        )}

                        {selectedCategoryProducts.length > 0 && (
                            <>
                                <div className="home-products-grid">
                                    {paginatedCategoryProducts.map(renderProductCard)}
                                </div>

                                {totalCategoryPages > 1 && (
                                    <div className="home-pagination" role="navigation" aria-label="Category product pagination">
                                        <button
                                            type="button"
                                            className="home-pagination-btn"
                                            onClick={() => setCategoryPage((prev) => Math.max(1, prev - 1))}
                                            disabled={categoryPage === 1}
                                        >
                                            Previous
                                        </button>

                                        <div className="home-pagination-pages">
                                            {Array.from({ length: totalCategoryPages }, (_, index) => index + 1).map((page) => (
                                                <button
                                                    key={page}
                                                    type="button"
                                                    className={`home-pagination-page ${page === categoryPage ? 'active' : ''}`}
                                                    onClick={() => setCategoryPage(page)}
                                                    aria-label={`Go to page ${page}`}
                                                    aria-current={page === categoryPage ? 'page' : undefined}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="home-pagination-btn"
                                            onClick={() => setCategoryPage((prev) => Math.min(totalCategoryPages, prev + 1))}
                                            disabled={categoryPage === totalCategoryPages}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {!productsLoading && !selectedCategory && categoryRows.length > 0 && (
                    <div className="home-category-rows">
                        {categoryRows.map((row) => (
                            <section key={row.category} className="home-category-row" aria-label={`${row.category} products`}>
                                <div className="home-category-row-card">
                                    <h3 className="home-category-row-title">{row.category}</h3>
                                </div>
                                <div className="home-products-grid">
                                    {row.items.slice(0, 8).map(renderProductCard)}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </section>

        </main>
    );
};
