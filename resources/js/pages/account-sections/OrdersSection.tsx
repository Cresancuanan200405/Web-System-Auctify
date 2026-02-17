import React, { useState } from 'react';

type OrdersTab = 'all' | 'unpaid' | 'processing' | 'delivered' | 'returns' | 'cancelled';

export const OrdersSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState<OrdersTab>('all');

    return (
        <div className="orders-main">
            <div className="orders-header">
                <div className="orders-header-icon" aria-hidden="true">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    >
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M7 8h10" />
                        <path d="M7 12h10" />
                    </svg>
                </div>
                <h2 className="orders-header-title">Orders &amp; Tracking</h2>
            </div>

            <div className="orders-tabs">
                <button
                    className={`orders-tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All
                </button>
                <button
                    className={`orders-tab ${activeTab === 'unpaid' ? 'active' : ''}`}
                    onClick={() => setActiveTab('unpaid')}
                >
                    Unpaid
                </button>
                <button
                    className={`orders-tab ${activeTab === 'processing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('processing')}
                >
                    Processing
                </button>
                <button
                    className={`orders-tab ${activeTab === 'delivered' ? 'active' : ''}`}
                    onClick={() => setActiveTab('delivered')}
                >
                    Delivered
                </button>
                <button
                    className={`orders-tab ${activeTab === 'returns' ? 'active' : ''}`}
                    onClick={() => setActiveTab('returns')}
                >
                    Returns/Exchanges
                </button>
                <button
                    className={`orders-tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cancelled')}
                >
                    Cancelled
                </button>
            </div>

            {activeTab === 'all' && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <path d="M3 9h18l-2 9H5z" />
                            <path d="M8 9l1-4h6l1 4" />
                        </svg>
                    </div>
                    <div className="orders-empty-title">No products at this moment</div>
                    <div className="orders-empty-text">
                        Once you place an order, it will show here so you can
                        track its status.
                    </div>
                    <button type="button" className="orders-empty-button">
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'unpaid' && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <path d="M3 9h18l-2 9H5z" />
                            <path d="M8 9l1-4h6l1 4" />
                        </svg>
                    </div>
                    <div className="orders-empty-title">You have no unpaid orders</div>
                    <div className="orders-empty-text">
                        Any orders waiting for payment will appear here until
                        you complete checkout.
                    </div>
                    <button type="button" className="orders-empty-button">
                        Go to Checkout
                    </button>
                </div>
            )}

            {activeTab === 'processing' && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <path d="M3 9h18l-2 9H5z" />
                            <path d="M8 9l1-4h6l1 4" />
                        </svg>
                    </div>
                    <div className="orders-empty-title">No processing orders right now</div>
                    <div className="orders-empty-text">
                        When sellers are preparing your items, you&apos;ll see
                        those orders in this tab.
                    </div>
                    <button type="button" className="orders-empty-button">
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'delivered' && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <path d="M3 9h18l-2 9H5z" />
                            <path d="M8 9l1-4h6l1 4" />
                        </svg>
                    </div>
                    <div className="orders-empty-title">No delivered orders yet</div>
                    <div className="orders-empty-text">
                        Once your items arrive, your completed orders will be
                        listed here.
                    </div>
                    <button type="button" className="orders-empty-button">
                        Start Bidding
                    </button>
                </div>
            )}

            {activeTab === 'returns' && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <path d="M3 9h18l-2 9H5z" />
                            <path d="M8 9l1-4h6l1 4" />
                        </svg>
                    </div>
                    <div className="orders-empty-title">No returns or exchanges</div>
                    <div className="orders-empty-text">
                        Any items you send back or exchange will be tracked in
                        this tab.
                    </div>
                    <button type="button" className="orders-empty-button">
                        View Return Policy
                    </button>
                </div>
            )}

            {activeTab === 'cancelled' && (
                <div className="orders-empty-card">
                    <div className="orders-empty-icon" aria-hidden="true">
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        >
                            <path d="M3 9h18l-2 9H5z" />
                            <path d="M8 9l1-4h6l1 4" />
                        </svg>
                    </div>
                    <div className="orders-empty-title">You have no cancelled orders</div>
                    <div className="orders-empty-text">
                        If any orders are cancelled, you&apos;ll see them listed
                        here for your reference.
                    </div>
                    <button type="button" className="orders-empty-button">
                        Continue Shopping
                    </button>
                </div>
            )}
        </div>
    );
};
