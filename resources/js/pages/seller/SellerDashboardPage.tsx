import React from 'react';

interface SellerDashboardPageProps {
    onNavigateAddProduct: () => void;
}

export const SellerDashboardPage: React.FC<SellerDashboardPageProps> = ({ onNavigateAddProduct }) => {
    return (
        <section className="seller-dashboard-page">
            <aside className="seller-dashboard-sidebar">
                <h3 className="seller-dashboard-brand">Seller Center</h3>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Order</p>
                    <button type="button" className="seller-dashboard-link">My Orders</button>
                    <button type="button" className="seller-dashboard-link">Mass Ship</button>
                    <button type="button" className="seller-dashboard-link">Shipping Setting</button>
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Product</p>
                    <button type="button" className="seller-dashboard-link">My Products</button>
                    <button
                        type="button"
                        className="seller-dashboard-link seller-dashboard-link-active"
                        onClick={onNavigateAddProduct}
                    >
                        Add New Product
                    </button>
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Marketing</p>
                    <button type="button" className="seller-dashboard-link">Campaign</button>
                    <button type="button" className="seller-dashboard-link">Best Price</button>
                </div>
            </aside>

            <div className="seller-dashboard-main">
                <header className="seller-dashboard-topbar">
                    <div>
                        <h2>Seller Dashboard</h2>
                        <p className="seller-dashboard-subtext">Manage orders, products, and campaigns in one place.</p>
                    </div>
                    <div className="seller-dashboard-topbar-right">
                        <div className="seller-dashboard-profile">sellerusername</div>
                        <button type="button" className="seller-primary-btn" onClick={onNavigateAddProduct}>
                            Add Product
                        </button>
                    </div>
                </header>

                <div className="seller-dashboard-layout">
                    <div className="seller-dashboard-content">
                        <article className="seller-dashboard-card seller-dashboard-card-wide">
                            <h3 className="seller-dashboard-card-title">To Do List</h3>
                            <div className="seller-dashboard-stats">
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">To-Process Shipment</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Processed Shipment</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Return/Refund/Cancel</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Banned Products</p>
                                </div>
                            </div>
                        </article>

                        <article className="seller-dashboard-card seller-dashboard-card-wide seller-dashboard-highlight">
                            <h3 className="seller-dashboard-card-title">Business Insights</h3>
                            <div className="seller-dashboard-stats">
                                <div>
                                    <p className="seller-dashboard-stat-value">₱0</p>
                                    <p className="seller-dashboard-stat-label">Sales</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Visitors</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Page Views</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Orders</p>
                                </div>
                            </div>
                        </article>

                        <div className="seller-dashboard-grid">
                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Auctify Ads</h3>
                                <p className="seller-dashboard-card-text">
                                    Promote your listings to increase product visibility and conversions.
                                </p>
                            </article>

                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Affiliate Marketing</h3>
                                <p className="seller-dashboard-card-text">
                                    Collaborate with affiliates and grow traffic using performance-based promotions.
                                </p>
                            </article>

                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Livestream</h3>
                                <p className="seller-dashboard-card-text">
                                    Host a live selling event and engage buyers in real-time.
                                </p>
                            </article>

                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Campaigns</h3>
                                <p className="seller-dashboard-card-text">
                                    Join upcoming campaigns and boost your product reach.
                                </p>
                            </article>
                        </div>
                    </div>

                    <aside className="seller-dashboard-rail">
                        <article className="seller-dashboard-card">
                            <h3 className="seller-dashboard-card-title">Shop Performance</h3>
                            <p className="seller-dashboard-card-text">3 metrics need your attention this week.</p>
                        </article>
                        <article className="seller-dashboard-card seller-dashboard-announcements">
                            <h3 className="seller-dashboard-card-title">Announcements</h3>
                            <ul className="seller-dashboard-notice-list">
                                <li>Watch: compliance guidelines for online sellers</li>
                                <li>Order packing standards session this Friday</li>
                                <li>New campaign slots now open for eligible shops</li>
                            </ul>
                        </article>
                    </aside>
                </div>
            </div>
        </section>
    );
};
