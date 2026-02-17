import React from 'react';

export const Footer: React.FC = () => {
    return (
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
                        <a href="#facebook" aria-label="Facebook">
                            <img src="/icons/facebook.png" alt="Facebook" />
                        </a>
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
    );
};
