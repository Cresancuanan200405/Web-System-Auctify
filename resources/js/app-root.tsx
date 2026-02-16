import type { FormEvent } from 'react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { apiPost } from './api/client';

type AuthMode = 'login' | 'register';

type AuthResponse = {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

type AuthErrors = {
    message?: string;
    errors?: Record<string, string[]>;
};

export function AppRoot() {
    const [currentView, setCurrentView] = useState<'home' | 'auth'>('home');
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState<'female' | 'male'>('female');
    const [remember, setRemember] = useState(true);
    const [wantNotifications, setWantNotifications] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
    const [menuTopOffset, setMenuTopOffset] = useState(190);
    const carouselRef = useRef<HTMLDivElement>(null);
    const navWrapperRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const isRegister = mode === 'register';

    const submitLabel = useMemo(() => (isRegister ? 'Create Account' : 'Login'), [isRegister]);

    useEffect(() => {
        if (!hoveredMenu) return;

        const handleScroll = () => {
            const wrapper = navWrapperRefs.current[hoveredMenu];
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                const mainNavTop = 74; // main-nav top position
                const megamenuBottom = mainNavTop + 40; // account for main-nav height + padding
                const newTop = Math.max(mainNavTop + 40, rect.bottom + 10);
                setMenuTopOffset(newTop);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hoveredMenu]);

    const handleMenuMouseEnter = (menuId: string) => {
        setHoveredMenu(menuId);
        setMenuTopOffset(190);
    };

    const handleMenuMouseLeave = () => {
        setHoveredMenu(null);
        setMenuTopOffset(190);
    };

    const navigateToAuth = (authMode: AuthMode = 'login') => {
        setMode(authMode);
        setCurrentView('auth');
        window.scrollTo(0, 0);
    };

    const navigateToHome = () => {
        setCurrentView('home');
        window.scrollTo(0, 0);
    };

    const scrollCarouselLeft = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -280, behavior: 'smooth' });
        }
    };

    const scrollCarouselRight = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const payload = isRegister
                ? { name, email, password, password_confirmation: password }
                : { email, password, remember };

            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const response = await apiPost<AuthResponse>(endpoint, payload);

            localStorage.setItem('auth_token', response.token);
            setMessage(`Welcome ${response.user.name}! You are signed in.`);
        } catch (err) {
            const parsed = err as AuthErrors;
            const details = parsed.errors
                ? Object.values(parsed.errors)
                      .flat()
                      .join(' ')
                : parsed.message || 'Authentication failed.';
            setError(details);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="promo-banner">
                <div className="promo-item">
                    🎯 7 Days Free Returns | T&C Apply
                </div>
                <div className="promo-item">
                    ⭐ Become an AUCTIFY VIP today!
                </div>
                <div className="promo-item">
                    📱 Save more on the AUCTIFY App! 25% Off + ₱150 Off + Free Shipping
                </div>
            </div>
            <header className="topbar">
                <a onClick={navigateToHome} className="brand">AUCTIFY</a>
                <div className="search-bar">
                    <input type="text" placeholder="Search for auctions, items, categories..." />
                    <button className="search-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </button>
                </div>
                <div className="actions">
                    <div className="dropdown-wrapper">
                        <span className="dropdown-trigger">Login / Register</span>
                        <div className="dropdown-menu">
                            <div onClick={() => navigateToAuth('login')} className="dropdown-item clickable">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                                </svg>
                                Login
                            </div>
                            <div onClick={() => navigateToAuth('register')} className="dropdown-item clickable">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                    <polyline points="12 12 12 12 16 16 16 20"/>
                                    <line x1="12" y1="12" x2="12" y2="20"/>
                                </svg>
                                Register
                            </div>
                            <a href="#orders" className="dropdown-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                </svg>
                                Orders
                            </a>
                            <a href="#faq" className="dropdown-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
                                </svg>
                                FAQ
                            </a>
                        </div>
                    </div>
                    <a href="#favorites" className="fav-link">Fav</a>
                    <div className="dropdown-wrapper bag-dropdown">
                        <span className="dropdown-trigger">Bag</span>
                        <div className="dropdown-menu bag-menu">
                            <div className="bag-empty-state">
                                <div className="bag-icon-wrapper">
                                    <svg className="bag-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="7" width="18" height="13" rx="2" ry="2"/>
                                        <path d="M8 7V5a4 4 0 0 1 8 0v2"/>
                                        <path d="M12 12v3" strokeLinecap="round"/>
                                        <circle cx="12" cy="15" r="0.5" fill="currentColor"/>
                                    </svg>
                                    <div className="sparkle sparkle-1">✨</div>
                                    <div className="sparkle sparkle-2">✨</div>
                                </div>
                                <h3 className="bag-title">Your Bag is empty.</h3>
                                <p className="bag-subtitle">Start filling it up with your favourites.</p>
                                <button className="bag-cta-btn">See what's new</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="main-nav">
                <div 
                    className="nav-item-wrapper"
                    ref={(el) => { if (el) navWrapperRefs.current['electronics'] = el; }}
                    onMouseEnter={() => handleMenuMouseEnter('electronics')}
                    onMouseLeave={handleMenuMouseLeave}
                >
                    <a href="#electronics" className="nav-item">ELECTRONICS</a>
                    <div className="nav-megamenu" style={{ top: `${menuTopOffset}px` }}>
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Electronics</div>
                            <a href="#new-auctions" className="megamenu-link">New Auctions</a>
                            <a href="#ending-soon" className="megamenu-link">Ending Soon</a>
                            <a href="#hot-items" className="megamenu-link">Hot Items</a>
                            <a href="#laptops" className="megamenu-link">Laptops & Computers</a>
                            <a href="#phones" className="megamenu-link">Phones & Accessories</a>
                            <a href="#audio" className="megamenu-link">Audio & Video</a>
                            <a href="#gaming" className="megamenu-link">Gaming</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Electronics</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Latest Gadgets</div>
                                    <div className="featured-item">Premium Brands</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Popular Sellers</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Apple</div>
                                <div className="brand-box">Samsung</div>
                                <div className="brand-box">Sony</div>
                                <div className="brand-box">LG</div>
                                <div className="brand-box">Dell</div>
                                <div className="brand-box">HP</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div 
                    className="nav-item-wrapper"
                    ref={(el) => { if (el) navWrapperRefs.current['collectibles'] = el; }}
                    onMouseEnter={() => handleMenuMouseEnter('collectibles')}
                    onMouseLeave={handleMenuMouseLeave}
                >
                    <a href="#collectibles" className="nav-item">COLLECTIBLES</a>
                    <div className="nav-megamenu" style={{ top: `${menuTopOffset}px` }}>
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Collectibles</div>
                            <a href="#coins" className="megamenu-link">Rare Coins</a>
                            <a href="#trading-cards" className="megamenu-link">Trading Cards</a>
                            <a href="#memorabilia" className="megamenu-link">Sports Memorabilia</a>
                            <a href="#vintage-items" className="megamenu-link">Vintage Items</a>
                            <a href="#stamps" className="megamenu-link">Stamps & Documents</a>
                            <a href="#action-figures" className="megamenu-link">Action Figures</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Collectibles</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Trending Now</h3>
                                <div className="featured-items">
                                    <div className="featured-item">High Value Items</div>
                                    <div className="featured-item">Authenticated Items</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Categories</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Graded Items</div>
                                <div className="brand-box">Vintage</div>
                                <div className="brand-box">Modern</div>
                                <div className="brand-box">Rare</div>
                                <div className="brand-box">Limited</div>
                                <div className="brand-box">Unique</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#art" className="nav-item">ART</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Art</div>
                            <a href="#paintings" className="megamenu-link">Paintings</a>
                            <a href="#sculptures" className="megamenu-link">Sculptures</a>
                            <a href="#photography" className="megamenu-link">Photography</a>
                            <a href="#prints" className="megamenu-link">Prints & Drawings</a>
                            <a href="#contemporary" className="megamenu-link">Contemporary Art</a>
                            <a href="#digital" className="megamenu-link">Digital Art</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Art</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Artist Collections</div>
                                    <div className="featured-item">Signed Works</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Art Styles</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Abstract</div>
                                <div className="brand-box">Modern</div>
                                <div className="brand-box">Classical</div>
                                <div className="brand-box">Contemporary</div>
                                <div className="brand-box">Surreal</div>
                                <div className="brand-box">Impressionist</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#luxury" className="nav-item">LUXURY</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Luxury</div>
                            <a href="#designer-bags" className="megamenu-link">Designer Bags</a>
                            <a href="#luxury-watches" className="megamenu-link">Luxury Watches</a>
                            <a href="#fine-jewelry" className="megamenu-link">Fine Jewelry</a>
                            <a href="#designer-fashion" className="megamenu-link">Designer Fashion</a>
                            <a href="#luxury-accessories" className="megamenu-link">Accessories</a>
                            <a href="#haute-couture" className="megamenu-link">Haute Couture</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Luxury</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Premium Collections</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Certified Authentic</div>
                                    <div className="featured-item">Limited Edition</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Luxury Brands</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Hermès</div>
                                <div className="brand-box">Gucci</div>
                                <div className="brand-box">Louis Vuitton</div>
                                <div className="brand-box">Chanel</div>
                                <div className="brand-box">Cartier</div>
                                <div className="brand-box">Rolex</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#antiques" className="nav-item">ANTIQUES</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Antiques</div>
                            <a href="#furniture" className="megamenu-link">Antique Furniture</a>
                            <a href="#porcelain" className="megamenu-link">Porcelain & Pottery</a>
                            <a href="#silver" className="megamenu-link">Silver & Metals</a>
                            <a href="#textiles" className="megamenu-link">Textiles & Rugs</a>
                            <a href="#decor" className="megamenu-link">Decorative Items</a>
                            <a href="#vintage-tools" className="megamenu-link">Vintage Tools</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Antiques</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Rare Finds</h3>
                                <div className="featured-items">
                                    <div className="featured-item">18th Century</div>
                                    <div className="featured-item">Victorian Era</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Periods</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Art Deco</div>
                                <div className="brand-box">Victorian</div>
                                <div className="brand-box">Edwardian</div>
                                <div className="brand-box">Medieval</div>
                                <div className="brand-box">Colonial</div>
                                <div className="brand-box">Ancient</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#vehicles" className="nav-item">VEHICLES</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Vehicles</div>
                            <a href="#classic-cars" className="megamenu-link">Classic Cars</a>
                            <a href="#motorcycles" className="megamenu-link">Motorcycles</a>
                            <a href="#rare-vehicles" className="megamenu-link">Rare Vehicles</a>
                            <a href="#auto-parts" className="megamenu-link">Auto Parts</a>
                            <a href="#memorabilia" className="megamenu-link">Automotive Memorabilia</a>
                            <a href="#restoration" className="megamenu-link">Restoration Projects</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Vehicles</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Certified Pre-Owned</div>
                                    <div className="featured-item">Collector's Items</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Popular Makes</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Ferrari</div>
                                <div className="brand-box">Bugatti</div>
                                <div className="brand-box">Mercedes</div>
                                <div className="brand-box">Lamborghini</div>
                                <div className="brand-box">Porsche</div>
                                <div className="brand-box">Harley</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#fashion" className="nav-item">FASHION</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Fashion</div>
                            <a href="#dresses" className="megamenu-link">Dresses</a>
                            <a href="#menswear" className="megamenu-link">Menswear</a>
                            <a href="#footwear" className="megamenu-link">Footwear</a>
                            <a href="#outerwear" className="megamenu-link">Outerwear</a>
                            <a href="#accessories-fashion" className="megamenu-link">Fashion Accessories</a>
                            <a href="#sportswear" className="megamenu-link">Sportswear</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Fashion</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>New Arrivals</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Designer Collections</div>
                                    <div className="featured-item">Vintage Fashion</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Top Brands</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Versace</div>
                                <div className="brand-box">Prada</div>
                                <div className="brand-box">Dior</div>
                                <div className="brand-box">Valentino</div>
                                <div className="brand-box">Armani</div>
                                <div className="brand-box">Balenciaga</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#property" className="nav-item">PROPERTY</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Property</div>
                            <a href="#residential" className="megamenu-link">Residential</a>
                            <a href="#commercial" className="megamenu-link">Commercial</a>
                            <a href="#land" className="megamenu-link">Land & Lots</a>
                            <a href="#foreclosures" className="megamenu-link">Foreclosures</a>
                            <a href="#lease" className="megamenu-link">Lease Auctions</a>
                            <a href="#unique-properties" className="megamenu-link">Unique Properties</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Property</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Prime Locations</div>
                                    <div className="featured-item">Investment Properties</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Property Types</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Apartments</div>
                                <div className="brand-box">Houses</div>
                                <div className="brand-box">Offices</div>
                                <div className="brand-box">Retail</div>
                                <div className="brand-box">Warehouse</div>
                                <div className="brand-box">Estates</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#niche" className="nav-item">NICHE</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Niche</div>
                            <a href="#unique-items" className="megamenu-link">Unique Items</a>
                            <a href="#novelty" className="megamenu-link">Novelty & Fun</a>
                            <a href="#handmade" className="megamenu-link">Handmade Crafts</a>
                            <a href="#collectibles-niche" className="megamenu-link">Specialized Collections</a>
                            <a href="#pop-culture" className="megamenu-link">Pop Culture</a>
                            <a href="#experiential" className="megamenu-link">Experiential Auctions</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Niche</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Trending</h3>
                                <div className="featured-items">
                                    <div className="featured-item">One-of-a-Kind</div>
                                    <div className="featured-item">Exclusive Finds</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Collections</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Toys</div>
                                <div className="brand-box">Gifts</div>
                                <div className="brand-box">Curiosities</div>
                                <div className="brand-box">Art Crafts</div>
                                <div className="brand-box">Oddities</div>
                                <div className="brand-box">Premium</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#school" className="nav-item">SCHOOL</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">School</div>
                            <a href="#textbooks" className="megamenu-link">Textbooks</a>
                            <a href="#supplies" className="megamenu-link">School Supplies</a>
                            <a href="#equipment" className="megamenu-link">Educational Equipment</a>
                            <a href="#uniforms" className="megamenu-link">Uniforms & Gear</a>
                            <a href="#sports-equip" className="megamenu-link">Sports Equipment</a>
                            <a href="#tech-learning" className="megamenu-link">Learning Tech</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">School</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Essential Items</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Back-to-School</div>
                                    <div className="featured-item">Bulk Supplies</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Categories</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Early Years</div>
                                <div className="brand-box">Primary</div>
                                <div className="brand-box">Secondary</div>
                                <div className="brand-box">Higher Ed</div>
                                <div className="brand-box">Specialized</div>
                                <div className="brand-box">Bulk</div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="content">
                {currentView === 'home' ? (
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
                        <button className="hero-btn" onClick={() => navigateToAuth('register')}>BID NOW →</button>
                        <p className="hero-disclaimer">T&Cs apply. Ends February 18, 12 noon.<br/>Live Auction Starts at 2PM</p>
                    </div>
                    <div className="hero-image">
                        <div className="hero-placeholder">🏆</div>
                    </div>
                </div>
                </>
                ) : (
                <section className="auth-card" id="auth">
                    <div className="tabs">
                        <div
                            className={`tab ${mode === 'login' ? 'active' : ''}`}
                            onClick={() => setMode('login')}
                            onKeyDown={(event) => event.key === 'Enter' && setMode('login')}
                            role="button"
                            tabIndex={0}
                        >
                            Login
                        </div>
                        <div
                            className={`tab ${mode === 'register' ? 'active' : ''}`}
                            onClick={() => setMode('register')}
                            onKeyDown={(event) => event.key === 'Enter' && setMode('register')}
                            role="button"
                            tabIndex={0}
                        >
                            Sign up
                        </div>
                    </div>

                    <div className="social-row">
                        <div className="social-btn">f</div>
                        <div className="social-btn">G</div>
                    </div>

                    <div className="divider">Or continue with</div>

                    <form onSubmit={handleSubmit}>
                        {isRegister && (
                            <>
                                <div className="field">
                                    <label htmlFor="name">First Name *</label>
                                    <input
                                        id="name"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Your first name"
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label htmlFor="birthday">Birthday (optional)</label>
                                    <input
                                        id="birthday"
                                        type="date"
                                        value={birthday}
                                        onChange={(event) => setBirthday(event.target.value)}
                                        className="date-input"
                                    />
                                </div>
                                <div className="field">
                                    <label>Preferred auction category *</label>
                                    <div className="gender-row">
                                        <label className="radio-label">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="female"
                                                checked={gender === 'female'}
                                                onChange={() => setGender('female')}
                                            />
                                            <span>Electronics</span>
                                        </label>
                                        <label className="radio-label">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="male"
                                                checked={gender === 'male'}
                                                onChange={() => setGender('male')}
                                            />
                                            <span>Collectibles</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="field">
                            <label htmlFor="email">Email Address *</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="password">Password *</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="********"
                                required
                            />
                        </div>

                        {isRegister && (
                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(event) => setRemember(event.target.checked)}
                                    />
                                    Keep me signed in
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={wantNotifications}
                                        onChange={(event) => setWantNotifications(event.target.checked)}
                                    />
                                    I want auction alerts, new listings and bidding updates sent to my inbox!
                                </label>
                            </div>
                        )}

                        {!isRegister && (
                            <div className="row">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(event) => setRemember(event.target.checked)}
                                    />
                                    Keep me signed in
                                </label>
                                <span>Forgot Password?</span>
                            </div>
                        )}

                        <button className="primary-btn" type="submit" disabled={loading}>
                            {loading ? 'Please wait...' : submitLabel}
                        </button>
                    </form>

                    {message && <div className="message">{message}</div>}
                    {error && <div className="message error">{error}</div>}

                    <div className="hint">
                        By continuing you agree to our Terms and Conditions and Privacy Policy.
                    </div>
                </section>
                )}
            </main>

            <button className="chat-button" aria-label="Help">
                <span>A</span>
            </button>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3 className="footer-title">AUCTIFY</h3>
                        <p className="footer-desc">
                            As the Premier Online Auction Platform, we create endless bidding possibilities through an
                            ever-expanding range of products from the most coveted international and local sellers,
                            putting you at the centre of it all. With AUCTIFY, You Own Now.
                        </p>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">CUSTOMER SERVICE</h4>
                        <ul className="footer-links">
                            <li><a href="#faq">FAQ</a></li>
                            <li><a href="#guide">Bidding Guide</a></li>
                            <li><a href="#returns">Returns & Refunds</a></li>
                            <li><a href="#contact">Contact Us</a></li>
                            <li><a href="#gift">Buy Gift Cards</a></li>
                            <li><a href="#index">Product Index</a></li>
                            <li><a href="#sellers">Sellers</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">ABOUT US</h4>
                        <ul className="footer-links">
                            <li><a href="#who">Who We Are</a></li>
                            <li><a href="#property">Intellectual Property</a></li>
                            <li><a href="#sell">Sell With Us</a></li>
                            <li><a href="#careers">Careers</a></li>
                            <li><a href="#promotions">Promotions</a></li>
                            <li><a href="#influencer">Influencer Program</a></li>
                            <li><a href="#partner">Partner Program</a></li>
                            <li><a href="#advertise">Advertise with Us</a></li>
                            <li><a href="#terms">Terms & Conditions</a></li>
                            <li><a href="#privacy">Privacy Policy</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">NEW TO AUCTIFY?</h4>
                        <p className="footer-newsletter-text">
                            Get the latest auction listings and product launches just by subscribing to our newsletter.
                        </p>
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="footer-email-input"
                        />
                        <div className="footer-buttons">
                            <button className="footer-btn">FOR ELECTRONICS</button>
                            <button className="footer-btn">FOR COLLECTIBLES</button>
                        </div>
                        <p className="footer-privacy-note">
                            By signing up, you agree to the terms in our Privacy Policy
                        </p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-social">
                        <h4 className="social-title">FIND US ON</h4>
                        <div className="social-icons">
                            <a href="#facebook" aria-label="Facebook">f</a>
                            <a href="#instagram" aria-label="Instagram">📷</a>
                            <a href="#twitter" aria-label="Twitter">🐦</a>
                            <a href="#blog" aria-label="Blog">📝</a>
                            <a href="#youtube" aria-label="YouTube">▶</a>
                            <a href="#linkedin" aria-label="LinkedIn">in</a>
                        </div>
                    </div>

                    <div className="footer-app">
                        <h4 className="app-title">DOWNLOAD OUR APP NOW</h4>
                        <div className="app-buttons">
                            <button className="app-store-btn">Google Play</button>
                            <button className="app-store-btn">App Store</button>
                        </div>
                    </div>
                </div>

                <div className="footer-copyright">
                    <div className="copyright-links">
                        <a href="#about">About</a>
                        <span>|</span>
                        <a href="#privacy">Privacy</a>
                        <span>|</span>
                        <a href="#terms">Terms of Service</a>
                    </div>
                    <p>&copy; 2012-2026 Auctify</p>
                </div>
            </footer>
        </div>
    );
}
