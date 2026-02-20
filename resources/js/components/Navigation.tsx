import React, { useState, useRef, useEffect } from 'react';

export const Navigation: React.FC = () => {
    const [menuTopOffset, setMenuTopOffset] = useState(190);
    const activeNavWrapperRef = useRef<HTMLDivElement | null>(null);
    const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
    const [isMegamenuHovering, setIsMegamenuHovering] = useState(false);

    const updateMenuTopOffset = (wrapper: HTMLDivElement | null) => {
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        const mainNavTop = 74;
        const mainNavHeight = 40;
        const newTop = Math.max(mainNavTop + mainNavHeight, rect.bottom + 10);
        setMenuTopOffset(newTop);
    };

    const handleMenuMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
        activeNavWrapperRef.current = event.currentTarget;
        setHoveredMenu('active');
        updateMenuTopOffset(event.currentTarget);
    };

    const handleMenuMouseLeave = () => {
        activeNavWrapperRef.current = null;
        setHoveredMenu(null);
        setMenuTopOffset(190);
        setIsMegamenuHovering(false);
    };

    const handleMegamenuEnter = () => {
        setIsMegamenuHovering(true);
    };

    const handleMegamenuLeave = () => {
        setIsMegamenuHovering(false);
    };

    useEffect(() => {
        if (!hoveredMenu) return;

        const handleViewportChange = () => {
            updateMenuTopOffset(activeNavWrapperRef.current);
        };

        handleViewportChange();
        window.addEventListener('scroll', handleViewportChange, { passive: true });
        window.addEventListener('resize', handleViewportChange);

        return () => {
            window.removeEventListener('scroll', handleViewportChange);
            window.removeEventListener('resize', handleViewportChange);
        };
    }, [hoveredMenu]);

    return (
        <nav
            className={`main-nav ${isMegamenuHovering ? 'megamenu-hovering' : ''}`}
            style={{ '--menu-top-offset': `${menuTopOffset}px` } as React.CSSProperties}
        >
            {/* Electronics */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#electronics" className="nav-item">ELECTRONICS</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
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

            {/* Collectibles */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#collectibles" className="nav-item">COLLECTIBLES</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
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

            {/* Art */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#art" className="nav-item">ART</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
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

            {/* Luxury */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
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

            {/* Antiques */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
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
                            <h3>Featured Auctions</h3>
                            <div className="featured-items">
                                <div className="featured-item">Premium Pieces</div>
                                <div className="featured-item">Authenticated</div>
                            </div>
                        </div>
                    </div>
                    <div className="megamenu-brands">
                        <h3>Periods</h3>
                        <div className="brand-grid">
                            <div className="brand-box">Victorian</div>
                            <div className="brand-box">Art Deco</div>
                            <div className="brand-box">Georgian</div>
                            <div className="brand-box">Edwardian</div>
                            <div className="brand-box">Mid-Century</div>
                            <div className="brand-box">Baroque</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vehicles */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#vehicles" className="nav-item">VEHICLES</a>
                <div className="nav-megamenu">
                    <div className="megamenu-sidebar">
                        <div className="megamenu-section-title">Vehicles</div>
                        <a href="#classic-cars" className="megamenu-link">Classic Cars</a>
                        <a href="#motorcycles" className="megamenu-link">Motorcycles</a>
                        <a href="#vintage-bikes" className="megamenu-link">Vintage Bikes</a>
                        <a href="#sports-cars" className="megamenu-link">Sports Cars</a>
                        <a href="#luxury-cars" className="megamenu-link">Luxury Vehicles</a>
                        <a href="#parts" className="megamenu-link">Parts & Accessories</a>
                    </div>
                    <div className="megamenu-content">
                        <div className="megamenu-header">Vehicles</div>
                        <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                        <div className="megamenu-featured">
                            <h3>Featured Auctions</h3>
                            <div className="featured-items">
                                <div className="featured-item">Collector Cars</div>
                                <div className="featured-item">Restored Vehicles</div>
                            </div>
                        </div>
                    </div>
                    <div className="megamenu-brands">
                        <h3>Popular Brands</h3>
                        <div className="brand-grid">
                            <div className="brand-box">Ferrari</div>
                            <div className="brand-box">Bugatti</div>
                            <div className="brand-box">Mercedes</div>
                            <div className="brand-box">Porsche</div>
                            <div className="brand-box">Harley</div>
                            <div className="brand-box">BMW</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fashion */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#fashion" className="nav-item">FASHION</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
                    <div className="megamenu-sidebar">
                        <div className="megamenu-section-title">Fashion</div>
                        <a href="#vintage-dresses" className="megamenu-link">Vintage Dresses</a>
                        <a href="#designer-shoes" className="megamenu-link">Designer Shoes</a>
                        <a href="#mens-suits" className="megamenu-link">Men's Suits</a>
                        <a href="#accessories" className="megamenu-link">Accessories</a>
                        <a href="#streetwear" className="megamenu-link">Streetwear</a>
                        <a href="#haute-couture" className="megamenu-link">Haute Couture</a>
                    </div>
                    <div className="megamenu-content">
                        <div className="megamenu-header">Fashion</div>
                        <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                        <div className="megamenu-featured">
                            <h3>Featured Auctions</h3>
                            <div className="featured-items">
                                <div className="featured-item">Designer Collections</div>
                                <div className="featured-item">Limited Editions</div>
                            </div>
                        </div>
                    </div>
                    <div className="megamenu-brands">
                        <h3>Fashion Brands</h3>
                        <div className="brand-grid">
                            <div className="brand-box">Versace</div>
                            <div className="brand-box">Prada</div>
                            <div className="brand-box">Dior</div>
                            <div className="brand-box">Balenciaga</div>
                            <div className="brand-box">Givenchy</div>
                            <div className="brand-box">Fendi</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Property */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#property" className="nav-item">PROPERTY</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
                    <div className="megamenu-sidebar">
                        <div className="megamenu-section-title">Property</div>
                        <a href="#residential" className="megamenu-link">Residential</a>
                        <a href="#commercial" className="megamenu-link">Commercial</a>
                        <a href="#land" className="megamenu-link">Land</a>
                        <a href="#historic" className="megamenu-link">Historic Buildings</a>
                        <a href="#condominiums" className="megamenu-link">Condominiums</a>
                        <a href="#foreclosures" className="megamenu-link">Foreclosures</a>
                    </div>
                    <div className="megamenu-content">
                        <div className="megamenu-header">Property</div>
                        <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                        <div className="megamenu-featured">
                            <h3>Featured Auctions</h3>
                            <div className="featured-items">
                                <div className="featured-item">Premium Properties</div>
                                <div className="featured-item">Investment Opportunities</div>
                            </div>
                        </div>
                    </div>
                    <div className="megamenu-brands">
                        <h3>Popular Locations</h3>
                        <div className="brand-grid">
                            <div className="brand-box">Manila</div>
                            <div className="brand-box">Makati</div>
                            <div className="brand-box">BGC</div>
                            <div className="brand-box">Tagaytay</div>
                            <div className="brand-box">Cebu</div>
                            <div className="brand-box">Davao</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Niche */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#niche" className="nav-item">NICHE</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
                    <div className="megamenu-sidebar">
                        <div className="megamenu-section-title">Niche</div>
                        <a href="#rare-finds" className="megamenu-link">Rare Finds</a>
                        <a href="#oddities" className="megamenu-link">Oddities</a>
                        <a href="#handmade" className="megamenu-link">Handmade Crafts</a>
                        <a href="#movie-props" className="megamenu-link">Movie Props</a>
                        <a href="#historical" className="megamenu-link">Historical Items</a>
                        <a href="#one-of-a-kind" className="megamenu-link">One-of-a-Kind</a>
                    </div>
                    <div className="megamenu-content">
                        <div className="megamenu-header">Niche</div>
                        <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                        <div className="megamenu-featured">
                            <h3>Featured Auctions</h3>
                            <div className="featured-items">
                                <div className="featured-item">Unique Finds</div>
                                <div className="featured-item">Rare Collections</div>
                            </div>
                        </div>
                    </div>
                    <div className="megamenu-brands">
                        <h3>Categories</h3>
                        <div className="brand-grid">
                            <div className="brand-box">Vintage</div>
                            <div className="brand-box">Steampunk</div>
                            <div className="brand-box">Gothic</div>
                            <div className="brand-box">Retro</div>
                            <div className="brand-box">Curiosities</div>
                            <div className="brand-box">Unique</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* School */}
            <div className="nav-item-wrapper" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                <a href="#school" className="nav-item">SCHOOL</a>
                <div className="nav-megamenu" onMouseEnter={handleMegamenuEnter} onMouseLeave={handleMegamenuLeave}>
                    <div className="megamenu-sidebar">
                        <div className="megamenu-section-title">School</div>
                        <a href="#textbooks" className="megamenu-link">Textbooks</a>
                        <a href="#laptops" className="megamenu-link">Laptops & Tablets</a>
                        <a href="#scientific" className="megamenu-link">Scientific Equipment</a>
                        <a href="#stationery" className="megamenu-link">Stationery</a>
                        <a href="#uniforms" className="megamenu-link">Uniforms</a>
                        <a href="#school-bags" className="megamenu-link">School Bags</a>
                    </div>
                    <div className="megamenu-content">
                        <div className="megamenu-header">School</div>
                        <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                        <div className="megamenu-featured">
                            <h3>Featured Auctions</h3>
                            <div className="featured-items">
                                <div className="featured-item">Educational Tech</div>
                                <div className="featured-item">School Essentials</div>
                            </div>
                        </div>
                    </div>
                    <div className="megamenu-brands">
                        <h3>Popular Items</h3>
                        <div className="brand-grid">
                            <div className="brand-box">Calculators</div>
                            <div className="brand-box">Notebooks</div>
                            <div className="brand-box">Backpacks</div>
                            <div className="brand-box">Tablets</div>
                            <div className="brand-box">Lab Kits</div>
                            <div className="brand-box">Art Supplies</div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};
