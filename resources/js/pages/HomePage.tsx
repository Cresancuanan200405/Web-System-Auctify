import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auctionService } from '../services/api';
import type { AuctionProduct, AuctionProductDetail } from '../types';

interface HomePageProps {
    onNavigateToRegister: () => void;
}

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

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRegister }) => {
    const { authUser } = useAuth();
    const carouselRef = useRef<HTMLDivElement>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [selectedAuction, setSelectedAuction] = useState<AuctionProductDetail | null>(null);
    const [auctionDetailLoading, setAuctionDetailLoading] = useState(false);
    const [auctionDetailError, setAuctionDetailError] = useState('');
    const [activeAuctionMediaIndex, setActiveAuctionMediaIndex] = useState(0);
    const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [placingBid, setPlacingBid] = useState(false);

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
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
        }, 5000); // Auto-rotate every 5 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let isActive = true;

        const fetchProducts = async () => {
            setProductsLoading(true);
            try {
                const data = await auctionService.getAllProducts();
                if (isActive) {
                    setProducts(data);
                }
            } catch {
                if (isActive) {
                    setProducts([]);
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

    const formatDate = (value?: string | null) => {
        if (!value) {
            return '—';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
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

    const getHighestBid = (auction: AuctionProductDetail) => {
        const bids = auction.bids ?? [];
        if (bids.length === 0) {
            return null;
        }

        return bids.reduce((highest, current) => {
            const currentAmount = Number(current.amount ?? 0);
            const highestAmount = Number(highest.amount ?? 0);
            return currentAmount > highestAmount ? current : highest;
        });
    };

    const fetchAuctionDetail = async (productId: number) => {
        const detail = await auctionService.getProductDetails(productId);
        setSelectedAuction(detail);
        setProducts((prev) =>
            prev.map((item) =>
                item.id === detail.id
                    ? {
                        ...item,
                        current_price: detail.current_price,
                        status: detail.status,
                        starts_at: detail.starts_at,
                        ends_at: detail.ends_at,
                        media: detail.media,
                    }
                    : item,
            ),
        );
    };

    const openAuctionDetail = async (productId: number) => {
        setAuctionDetailLoading(true);
        setAuctionDetailError('');
        setSelectedAuction(null);
        setActiveAuctionMediaIndex(0);
        setIsBidDialogOpen(false);
        setBidAmount('');
        setBidError('');

        try {
            await fetchAuctionDetail(productId);
        } catch {
            setAuctionDetailError('Unable to load auction details right now.');
        } finally {
            setAuctionDetailLoading(false);
        }
    };

    const closeAuctionDetail = () => {
        setSelectedAuction(null);
        setAuctionDetailLoading(false);
        setAuctionDetailError('');
        setActiveAuctionMediaIndex(0);
        setIsBidDialogOpen(false);
        setBidAmount('');
        setBidError('');
    };

    const minBidValue = selectedAuction
        ? Math.max(Number(selectedAuction.starting_price || 0), Number(selectedAuction.current_price || 0)) + 0.01
        : 0.01;

    const handlePlaceBid = async () => {
        if (!selectedAuction || !authUser) {
            return;
        }

        const amount = Number(bidAmount);
        if (!Number.isFinite(amount) || amount <= minBidValue - 0.01) {
            setBidError(`Bid must be higher than ${formatPeso(String(minBidValue - 0.01))}.`);
            return;
        }

        setPlacingBid(true);
        setBidError('');
        try {
            await auctionService.placeBid(selectedAuction.id, amount);
            await fetchAuctionDetail(selectedAuction.id);
            setIsBidDialogOpen(false);
            setBidAmount('');
        } catch (error) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to place bid.';
            setBidError(message);
        } finally {
            setPlacingBid(false);
        }
    };

    return (
        <main className="content">
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

            <section className="home-products-section" aria-label="Recommended products">
                <h2 className="home-products-title">You Might Like This</h2>

                {productsLoading && <p className="home-products-state">Loading products...</p>}

                {!productsLoading && products.length === 0 && (
                    <p className="home-products-state">No products available yet.</p>
                )}

                {!productsLoading && products.length > 0 && (
                    <div className="home-products-grid">
                        {products.slice(0, 12).map((product) => {
                            const firstMedia = product.media?.[0];

                            return (
                                <article key={product.id} className="home-product-card">
                                    <div className="home-product-image-wrap">
                                        {firstMedia ? (
                                            firstMedia.media_type === 'video' ? (
                                                <video className="home-product-image" src={resolveMediaUrl(firstMedia.url)} muted preload="metadata" />
                                            ) : (
                                                <img className="home-product-image" src={resolveMediaUrl(firstMedia.url)} alt={product.title} />
                                            )
                                        ) : (
                                            <div className="home-product-image home-product-image-placeholder">No Media</div>
                                        )}
                                    </div>

                                    <div className="home-product-content">
                                        <p className="home-product-brand">{(product.category || 'Product').toUpperCase()}</p>
                                        <p className="home-product-name">{product.title}</p>
                                        <p className="home-product-price">{formatPeso(product.current_price || product.starting_price)}</p>
                                        <button
                                            type="button"
                                            className="home-product-btn"
                                            onClick={() => {
                                                void openAuctionDetail(product.id);
                                            }}
                                        >
                                            View Auction
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {(auctionDetailLoading || selectedAuction || auctionDetailError) && (
                <div className="auction-detail-backdrop" onClick={closeAuctionDetail} role="presentation">
                    <div
                        className="auction-detail-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Auction details"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button type="button" className="auction-detail-close" onClick={closeAuctionDetail} aria-label="Close auction details">
                            ×
                        </button>

                        {auctionDetailLoading && <p className="auction-detail-state">Loading auction details...</p>}
                        {!auctionDetailLoading && auctionDetailError && <p className="auction-detail-state auction-detail-state-error">{auctionDetailError}</p>}

                        {!auctionDetailLoading && selectedAuction && (
                            <div className="auction-detail-layout">
                                <section className="auction-detail-gallery">
                                    <div className="auction-detail-featured-wrap">
                                        {selectedAuction.media?.[activeAuctionMediaIndex]?.media_type === 'video' ? (
                                            <video
                                                className="auction-detail-featured"
                                                src={resolveMediaUrl(selectedAuction.media[activeAuctionMediaIndex]?.url)}
                                                controls
                                                preload="metadata"
                                            />
                                        ) : (
                                            <img
                                                className="auction-detail-featured"
                                                src={resolveMediaUrl(selectedAuction.media?.[activeAuctionMediaIndex]?.url)}
                                                alt={selectedAuction.title}
                                            />
                                        )}
                                    </div>

                                    <div className="auction-detail-media-grid">
                                        {(selectedAuction.media ?? []).map((media, index) => (
                                            <button
                                                key={media.id}
                                                type="button"
                                                className={`auction-detail-media-btn ${activeAuctionMediaIndex === index ? 'active' : ''}`}
                                                onClick={() => setActiveAuctionMediaIndex(index)}
                                            >
                                                {media.media_type === 'video' ? (
                                                    <video className="auction-detail-media-thumb" src={resolveMediaUrl(media.url)} preload="metadata" />
                                                ) : (
                                                    <img className="auction-detail-media-thumb" src={resolveMediaUrl(media.url)} alt={selectedAuction.title} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <aside className="auction-detail-info">
                                    <p className="auction-detail-category">{selectedAuction.category || 'General'}</p>
                                    <h3 className="auction-detail-title">{selectedAuction.title}</h3>
                                    <p className="auction-detail-seller">Seller: {selectedAuction.user?.name || 'Unknown Seller'}</p>

                                    <div className="auction-owner-bidder-box">
                                        <p className="auction-owner-bidder-title">Owner</p>
                                        <p className="auction-owner-bidder-value">{selectedAuction.user?.name || 'Unknown Seller'}</p>
                                        <p className="auction-owner-bidder-sub">{selectedAuction.user?.email || 'No email available'}</p>

                                        <p className="auction-owner-bidder-title">Bidder</p>
                                        {(() => {
                                            const highestBid = getHighestBid(selectedAuction);

                                            if (!highestBid) {
                                                return <p className="auction-owner-bidder-sub">No bids yet.</p>;
                                            }

                                            return (
                                                <>
                                                    <p className="auction-owner-bidder-value">
                                                        {highestBid.user?.name || `User #${highestBid.user_id}`}
                                                    </p>
                                                    <p className="auction-owner-bidder-sub">
                                                        Highest bid: {formatPeso(highestBid.amount)}
                                                    </p>
                                                </>
                                            );
                                        })()}

                                        {selectedAuction.bids && selectedAuction.bids.length > 0 && (
                                            <div className="auction-bidder-list">
                                                <p className="auction-bidder-list-title">Recent bids</p>
                                                {selectedAuction.bids.slice(0, 5).map((bid) => (
                                                    <div key={bid.id} className="auction-bidder-item">
                                                        <span>{bid.user?.name || `User #${bid.user_id}`}</span>
                                                        <span>{formatPeso(bid.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <p className="auction-detail-price">Current Price: {formatPeso(selectedAuction.current_price || selectedAuction.starting_price)}</p>
                                    <p className="auction-detail-meta">Starting Price: {formatPeso(selectedAuction.starting_price)}</p>
                                    <p className="auction-detail-meta">Maximum Increment: {formatPeso(selectedAuction.max_increment)}</p>
                                    <p className="auction-detail-meta">Starts At: {formatDate(selectedAuction.starts_at ?? null)}</p>
                                    <p className="auction-detail-meta">Ends At: {formatDate(selectedAuction.ends_at)}</p>
                                    <p className="auction-detail-meta">Status: {selectedAuction.status}</p>
                                    <p className="auction-detail-meta">Total Bids: {selectedAuction.bids_count ?? selectedAuction.bids?.length ?? 0}</p>

                                    <div className="auction-detail-description-wrap">
                                        <p className="auction-detail-description-title">Description</p>
                                        <p className="auction-detail-description">
                                            {selectedAuction.description?.trim() || 'No description provided.'}
                                        </p>
                                    </div>

                                    {authUser ? (
                                        <button
                                            type="button"
                                            className="auction-detail-cta"
                                            onClick={() => {
                                                setBidAmount(minBidValue.toFixed(2));
                                                setBidError('');
                                                setIsBidDialogOpen(true);
                                            }}
                                            disabled={selectedAuction.status === 'closed'}
                                        >
                                            {selectedAuction.status === 'closed' ? 'Auction Closed' : 'Place Bid'}
                                        </button>
                                    ) : (
                                        <button type="button" className="auction-detail-cta" onClick={onNavigateToRegister}>
                                            Sign in to Bid
                                        </button>
                                    )}
                                </aside>
                            </div>
                        )}

                        {selectedAuction && authUser && isBidDialogOpen && (
                            <div className="auction-bid-dialog-backdrop" onClick={() => setIsBidDialogOpen(false)} role="presentation">
                                <div
                                    className="auction-bid-dialog"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label="Place a bid"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <h4 className="auction-bid-title">Place your bid</h4>
                                    <p className="auction-bid-subtitle">Minimum next bid: {formatPeso(minBidValue.toFixed(2))}</p>

                                    <input
                                        type="number"
                                        min={minBidValue.toFixed(2)}
                                        step="0.01"
                                        className="auction-bid-input"
                                        value={bidAmount}
                                        onChange={(event) => setBidAmount(event.target.value)}
                                    />

                                    {bidError && <p className="auction-bid-error">{bidError}</p>}

                                    <div className="auction-bid-actions">
                                        <button
                                            type="button"
                                            className="auction-bid-cancel"
                                            onClick={() => setIsBidDialogOpen(false)}
                                            disabled={placingBid}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="auction-bid-submit"
                                            onClick={() => {
                                                void handlePlaceBid();
                                            }}
                                            disabled={placingBid}
                                        >
                                            {placingBid ? 'Placing...' : 'Confirm Bid'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
};
