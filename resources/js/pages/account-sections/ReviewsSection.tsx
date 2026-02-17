import React, { useState } from 'react';

type ReviewsTab = 'to-review' | 'submitted';

export const ReviewsSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReviewsTab>('to-review');

    return (
        <div className="reviews-main">
            <div className="reviews-tabs">
                <button
                    className={`reviews-tab ${activeTab === 'to-review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('to-review')}
                >
                    To Review
                </button>
                <button
                    className={`reviews-tab ${activeTab === 'submitted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submitted')}
                >
                    Submitted
                </button>
            </div>

            {activeTab === 'to-review' && (
                <div className="reviews-empty-card">
                    <div className="reviews-empty-icon" aria-hidden="true">
                        <svg
                            width="90"
                            height="90"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 6.5l1.76 3.57 3.94.57-2.85 2.77.67 3.89L12 15.8l-3.52 1.9.67-3.89-2.85-2.77 3.94-.57z" />
                        </svg>
                    </div>
                    <div className="reviews-empty-text-main">
                        No products to review yet. Start shopping and write a review after the
                        delivery!
                    </div>
                    <button type="button" className="reviews-empty-button">
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'submitted' && (
                <div className="reviews-empty-card">
                    <div className="reviews-empty-icon" aria-hidden="true">
                        <svg
                            width="90"
                            height="90"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 6.5l1.76 3.57 3.94.57-2.85 2.77.67 3.89L12 15.8l-3.52 1.9.67-3.89-2.85-2.77 3.94-.57z" />
                        </svg>
                    </div>
                    <div className="reviews-empty-text-main">
                        You haven&apos;t submitted any product reviews yet.
                    </div>
                    <button type="button" className="reviews-empty-button">
                        Continue Shopping
                    </button>
                </div>
            )}
        </div>
    );
};
