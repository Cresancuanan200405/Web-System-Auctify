import React from 'react';

interface BagPageProps {
    onNavigateHome: () => void;
}

export const BagPage: React.FC<BagPageProps> = ({ onNavigateHome }) => {
    return (
        <main className="content">
            <div className="bag-page-container">
                <div className="bag-empty-state">
                    <div className="bag-icon-wrapper">
                        <svg
                            className="bag-icon"
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
                            <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                            <path d="M9 13h6" strokeLinecap="round" />
                        </svg>
                        <div className="sparkle sparkle-1">✨</div>
                        <div className="sparkle sparkle-2">✨</div>
                    </div>
                    <h1 className="bag-title">Your Bag is empty.</h1>
                    <p className="bag-subtitle">Start filling it up with your favourites.</p>
                    <button
                        type="button"
                        className="bag-cta-btn"
                        onClick={onNavigateHome}
                    >
                        Let's go Shopping!
                    </button>
                </div>
            </div>
        </main>
    );
};
