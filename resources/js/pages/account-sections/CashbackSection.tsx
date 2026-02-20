import React from 'react';

export const CashbackSection: React.FC = () => {
    const handleGoShopping = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return (
        <div className="cashback-main">
            <div className="cashback-header">
                <div className="cashback-header-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v10M9 9h3.5a2.5 2.5 0 0 1 0 5H10" />
                    </svg>
                </div>
                <h2 className="cashback-header-title">Cashback</h2>
            </div>
            <div className="cashback-balance-card">
                <div className="cashback-balance-illustration" aria-hidden="true">
                    <div className="cashback-coin">
                        <div className="cashback-coin-inner">₱</div>
                    </div>
                    <div className="cashback-arrow" />
                </div>
                <div className="cashback-balance-content">
                    <div className="cashback-balance-label">You have</div>
                    <div className="cashback-balance-amount">Php 0.00</div>
                    <div className="cashback-balance-subtext">available cashback to spend!</div>
                </div>
            </div>

            <div className="cashback-empty-card">
                <div className="cashback-empty-icon" aria-hidden="true">
                    <svg
                        width="60"
                        height="60"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                    >
                        <path d="M4 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                        <path d="M9 9V7a3 3 0 0 1 6 0v2" />
                        <path d="M10 13h4" />
                    </svg>
                </div>
                <div className="cashback-empty-text">Start shopping now to earn cashback!</div>
                <button type="button" className="cashback-empty-button" onClick={handleGoShopping}>
                    Let&apos;s go Shopping!
                </button>
            </div>
        </div>
    );
};
