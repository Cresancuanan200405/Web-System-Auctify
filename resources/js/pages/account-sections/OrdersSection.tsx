import React, { useState } from 'react';
import { useOrderHistory } from '../../hooks/useOrderHistory';
import { formatCurrency } from '../../utils/helpers';

type OrdersTab = 'all' | 'unpaid' | 'processing' | 'delivered' | 'returns' | 'cancelled';

export const OrdersSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState<OrdersTab>('all');
    const { orders } = useOrderHistory();

    const handleContinueShopping = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const visibleOrders = orders.filter((order) => {
        if (activeTab === 'all') {
            return true;
        }

        if (activeTab === 'unpaid' || activeTab === 'returns') {
            return false;
        }

        return order.status === activeTab;
    });

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

            {visibleOrders.length > 0 ? (
                <div className="orders-list">
                    {visibleOrders.map((order) => (
                        <article key={order.id} className="orders-item-card">
                            <div className="orders-item-head">
                                <div>
                                    <p className="orders-item-title">{order.title}</p>
                                    <p className="orders-item-meta">Seller: {order.seller_name}</p>
                                </div>
                                <span className={`orders-item-status orders-item-status-${order.status}`}>{order.status}</span>
                            </div>
                            <div className="orders-item-grid">
                                <p className="orders-item-detail">Paid: {formatCurrency(Number(order.amount_paid ?? 0))}</p>
                                <p className="orders-item-detail">Card: {order.payment_card_label}</p>
                                <p className="orders-item-detail">Purchased: {new Date(order.purchased_at).toLocaleString()}</p>
                                <p className="orders-item-detail">Ship to: {order.address_summary}</p>
                            </div>
                        </article>
                    ))}
                </div>
            ) : activeTab === 'all' ? (
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
                    <button type="button" className="orders-empty-button" onClick={handleContinueShopping}>
                        Continue Shopping
                    </button>
                </div>
            ) : null}

            {activeTab === 'unpaid' && visibleOrders.length === 0 && (
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
                    <button type="button" className="orders-empty-button" onClick={handleContinueShopping}>
                        Go to Checkout
                    </button>
                </div>
            )}

            {activeTab === 'processing' && visibleOrders.length === 0 && (
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
                    <button type="button" className="orders-empty-button" onClick={handleContinueShopping}>
                        Continue Shopping
                    </button>
                </div>
            )}

            {activeTab === 'delivered' && visibleOrders.length === 0 && (
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

            {activeTab === 'returns' && visibleOrders.length === 0 && (
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

            {activeTab === 'cancelled' && visibleOrders.length === 0 && (
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
                    <button type="button" className="orders-empty-button" onClick={handleContinueShopping}>
                        Continue Shopping
                    </button>
                </div>
            )}
        </div>
    );
};
