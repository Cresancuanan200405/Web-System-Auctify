import React, { useRef, useState, useEffect } from 'react';

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
    const carouselRef = useRef<HTMLDivElement>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

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

    const currentSlideData = CAROUSEL_SLIDES[currentSlide];

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
        </main>
    );
};
