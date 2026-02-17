import React, { useState } from 'react';

export const ZVIPSection: React.FC = () => {
    const [zvipCarouselPage, setZvipCarouselPage] = useState(0);

    return (
        <div className="zvip-main">
            <div className="zvip-header">
                <div className="zvip-header-icon" aria-hidden="true">
                    <span>VIP</span>
                </div>
                <h2 className="zvip-header-title">My ZVIP</h2>
            </div>
            <div className="zvip-banner">
                <div className="zvip-badge" aria-hidden="true">
                    <span className="zvip-badge-label">VIP</span>
                </div>
                <div className="zvip-banner-content">
                    <div className="zvip-banner-title">
                        Enjoy 1-year of Unlimited Free Shipping
                    </div>
                    <div className="zvip-banner-subtext">
                        to all Sold by AUCTIFY and Havaianas items for Php 500.00{' '}
                        <span className="zvip-banner-strikethrough">750.00!</span>
                    </div>
                </div>
                <div className="zvip-banner-arrow" aria-hidden="true">
                    ›
                </div>
            </div>

            <h3 className="zvip-subscribe-title">Subscribe to AUCTIFY VIP</h3>

            <div className="zvip-benefits">
                <div className="zvip-benefit-card">
                    <div
                        className="zvip-benefit-image"
                        style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)' }}
                    />
                    <h4 className="zvip-benefit-title">Unlimited Free Shipping with no min spend</h4>
                    <p className="zvip-benefit-desc">For products sold by AUCTIFY and participating sellers.</p>
                </div>
                <div className="zvip-benefit-card">
                    <div
                        className="zvip-benefit-image"
                        style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' }}
                    />
                    <h4 className="zvip-benefit-title">Full Rebate</h4>
                    <p className="zvip-benefit-desc">Get Php 600 worth of vouchers</p>
                </div>
                <div className="zvip-benefit-card">
                    <div
                        className="zvip-benefit-image"
                        style={{ background: 'linear-gradient(135deg, #fb7185, #fda4af)' }}
                    />
                    <h4 className="zvip-benefit-title">Priority Access to Exclusive Sales</h4>
                    <p className="zvip-benefit-desc">Get the best deals before everyone else.</p>
                </div>
                <div className="zvip-benefit-card">
                    <div
                        className="zvip-benefit-image"
                        style={{ background: 'linear-gradient(135deg, #fb923c, #fdba74)' }}
                    />
                    <h4 className="zvip-benefit-title">Exclusive Rewards from Partners</h4>
                    <p className="zvip-benefit-desc">Enjoy specially curated deals from Klook, Parlon, and many more.</p>
                </div>
            </div>

            <div className="zvip-carousel-nav">
                <button
                    type="button"
                    className="zvip-nav-button"
                    disabled={zvipCarouselPage === 0}
                    onClick={() => setZvipCarouselPage((prev) => Math.max(0, prev - 1))}
                >
                    ‹ Back
                </button>
                <div className="zvip-dots">
                    <button
                        type="button"
                        className={`zvip-dot ${zvipCarouselPage === 0 ? 'active' : ''}`}
                        aria-label="Go to ZVIP slide 1"
                        aria-current={zvipCarouselPage === 0}
                        onClick={() => setZvipCarouselPage(0)}
                    />
                    <button
                        type="button"
                        className={`zvip-dot ${zvipCarouselPage === 1 ? 'active' : ''}`}
                        aria-label="Go to ZVIP slide 2"
                        aria-current={zvipCarouselPage === 1}
                        onClick={() => setZvipCarouselPage(1)}
                    />
                </div>
                <button
                    type="button"
                    className="zvip-nav-button"
                    disabled={zvipCarouselPage === 1}
                    onClick={() => setZvipCarouselPage((prev) => Math.min(1, prev + 1))}
                >
                    Next ›
                </button>
            </div>

            <button type="button" className="zvip-add-button">
                Add to Bag
            </button>
        </div>
    );
};
