import React, { useRef } from 'react';

interface HomePageProps {
    onNavigateToRegister: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRegister }) => {
    const carouselRef = useRef<HTMLDivElement>(null);

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

            <div className="hero-banner">
                <div className="hero-content">
                    <h2 className="hero-subtitle">WEEKEND SPECIAL</h2>
                    <h1 className="hero-title">Exceptional Finds</h1>
                    <h1 className="hero-price">Up to 60% Off</h1>
                    <div className="hero-brands">
                        <span>Rolex</span>
                        <span>Ferrari</span>
                        <span>Picasso</span>
                    </div>
                    <button className="hero-btn" onClick={onNavigateToRegister}>BID NOW →</button>
                    <p className="hero-disclaimer">T&Cs apply. Ends February 18, 12 noon.<br/>Live Auction Starts at 2PM</p>
                </div>
                <div className="hero-image">
                    <div className="hero-placeholder">🏆</div>
                </div>
            </div>

            <section className="features-section">
                <h2 className="section-title">Why Choose Auctify?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🔄</div>
                        <h3 className="feature-title">7 Days Returns</h3>
                        <p className="feature-description">Easy returns within 7 days. T&Cs apply.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">👑</div>
                        <h3 className="feature-title">VIP Customer Service</h3>
                        <p className="feature-description">24/7 support for all your auction needs.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📱</div>
                        <h3 className="feature-title">App Exclusive Offers</h3>
                        <p className="feature-description">25% Off + ₱150 Off + Free Shipping on app.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🚚</div>
                        <h3 className="feature-title">Free Shipping</h3>
                        <p className="feature-description">Free delivery on orders above ₱500.</p>
                    </div>
                </div>
            </section>
        </main>
    );
};
