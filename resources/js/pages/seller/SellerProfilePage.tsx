import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerOrderHistory } from '../../hooks/useOrderHistory';
import { sellerService } from '../../services/api';
import type { AuctionProduct, SellerRegistration } from '../../types';
import { getAuctionDisplayStatus } from '../../utils/auctionStatus';

interface SellerProfilePageProps {
    onNavigateSellerDashboard: (section?: 'products' | 'shipping' | 'orders') => void;
    onNavigateSellerStore: (shopName?: string) => void;
}

export const SellerProfilePage: React.FC<SellerProfilePageProps> = ({
    onNavigateSellerDashboard,
    onNavigateSellerStore,
}) => {
    const { authUser } = useAuth();
    const { orders } = useSellerOrderHistory(authUser?.id);
    const [registration, setRegistration] = useState<SellerRegistration | null>(null);
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            setLoading(true);
            try {
                const [registrationResponse, productsResponse] = await Promise.all([
                    sellerService.getRegistration(),
                    sellerService.getMyProducts(),
                ]);

                if (!isActive) {
                    return;
                }

                setRegistration(registrationResponse.registration ?? null);
                setProducts(productsResponse);
            } catch {
                if (!isActive) {
                    return;
                }

                setRegistration(null);
                setProducts([]);
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            isActive = false;
        };
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            maximumFractionDigits: 2,
        }).format(Number.isFinite(value) ? value : 0);
    };

    const formatDate = (value?: string | null) => {
        if (!value) {
            return 'Not available';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'Not available';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    const resolveMediaUrl = (url?: string) => {
        if (!url) {
            return '';
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
        if (!apiBase) {
            return url;
        }

        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const shopName = registration?.shop_name?.trim() || authUser?.name || 'Your shop';
    const sellerTypeLabel = registration?.seller_type === 'corp'
        ? 'Corporation'
        : registration?.seller_type === 'opc'
            ? 'One Person Corporation'
            : registration?.seller_type === 'sole'
                ? 'Sole Proprietorship'
                : 'Independent Seller';
    const sellerStatus = registration?.status?.trim() || 'active';
    const openProducts = products.filter((product) => getAuctionDisplayStatus(product) === 'open');
    const closedProducts = products.filter((product) => getAuctionDisplayStatus(product) === 'closed');
    const scheduledProducts = products.filter((product) => getAuctionDisplayStatus(product) === 'scheduled');
    const deliveredOrders = orders.filter((order) => order.status === 'delivered');
    const processingOrders = orders.filter((order) => order.status === 'processing');
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.amount_paid || 0), 0);
    const completionRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;
    const featuredProducts = products.slice().sort((left, right) => {
        return new Date(right.created_at || right.ends_at).getTime() - new Date(left.created_at || left.ends_at).getTime();
    }).slice(0, 4);

    const sellerTags = useMemo(() => {
        return [
            registration?.general_location?.trim(),
            sellerTypeLabel,
            registration?.vat_status === 'vat' ? 'VAT Registered' : registration?.vat_status === 'non-vat' ? 'Non-VAT' : null,
            registration?.contact_email?.trim() ? 'Email Verified for Operations' : null,
        ].filter((value): value is string => Boolean(value));
    }, [registration, sellerTypeLabel]);

    if (!authUser) {
        return null;
    }

    return (
        <section className="seller-profile-page">
            <div className="seller-profile-breadcrumb">
                <button type="button" onClick={() => onNavigateSellerDashboard('products')}>Seller Dashboard</button>
                <span>›</span>
                <span>Seller Details</span>
            </div>

            <div className="seller-profile-hero">
                <div className="seller-profile-hero-grid">
                    <div>
                        <p className="seller-profile-kicker">Seller Identity</p>
                        <div className="seller-profile-title-row">
                            <h1 className="seller-profile-title">{shopName}</h1>
                            <div className="seller-profile-status">
                                <span className="seller-profile-status-dot" aria-hidden="true"></span>
                                <span>{sellerStatus.replace(/_/g, ' ')}</span>
                            </div>
                        </div>
                        <p className="seller-profile-subtitle">
                            Manage the storefront details buyers trust most: business identity, fulfillment contacts, listing activity, and order performance in one seller-focused space.
                        </p>
                        <div className="seller-profile-tags">
                            {sellerTags.map((tag) => (
                                <span key={tag} className="seller-profile-tag">{tag}</span>
                            ))}
                        </div>
                        <div className="seller-profile-actions">
                            <button type="button" className="seller-profile-cta" onClick={() => onNavigateSellerStore(registration?.shop_name || authUser.name)}>
                                View Seller Store
                            </button>
                            <button type="button" className="seller-profile-cta-secondary" onClick={() => onNavigateSellerDashboard('shipping')}>
                                Edit Seller Info
                            </button>
                            <button type="button" className="seller-profile-cta-secondary" onClick={() => onNavigateSellerDashboard('orders')}>
                                Review Orders
                            </button>
                        </div>
                    </div>

                    <aside className="seller-profile-summary-card">
                        <div className="seller-profile-summary-head">
                            <div>
                                <h3>Store Snapshot</h3>
                                <p>Current seller-side health at a glance.</p>
                            </div>
                        </div>
                        <div className="seller-profile-summary-grid">
                            <div className="seller-profile-summary-metric">
                                <span>Live Listings</span>
                                <strong>{openProducts.length}</strong>
                                <p>Auctions open for bidding</p>
                            </div>
                            <div className="seller-profile-summary-metric">
                                <span>Revenue</span>
                                <strong>{formatCurrency(totalRevenue)}</strong>
                                <p>Delivered order earnings</p>
                            </div>
                            <div className="seller-profile-summary-metric">
                                <span>Processing</span>
                                <strong>{processingOrders.length}</strong>
                                <p>Orders awaiting fulfillment</p>
                            </div>
                            <div className="seller-profile-summary-metric">
                                <span>Completion</span>
                                <strong>{completionRate}%</strong>
                                <p>Delivered versus total orders</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <div className="seller-profile-layout">
                <div className="seller-profile-main">
                    <article className="seller-profile-panel">
                        <div className="seller-profile-panel-head">
                            <div>
                                <h3>Business Details</h3>
                                <p>Core seller information shown to operations and used across your storefront setup.</p>
                            </div>
                        </div>
                        <div className="seller-profile-info-grid">
                            <div className="seller-profile-info-card">
                                <span>Owner</span>
                                <p>{authUser.name}</p>
                            </div>
                            <div className="seller-profile-info-card">
                                <span>Primary Email</span>
                                <p>{registration?.contact_email || authUser.email || 'Not available'}</p>
                            </div>
                            <div className="seller-profile-info-card">
                                <span>Business Type</span>
                                <p>{sellerTypeLabel}</p>
                            </div>
                            <div className="seller-profile-info-card">
                                <span>Contact Number</span>
                                <p>{registration?.contact_phone || authUser.phone || 'Not available'}</p>
                            </div>
                            <div className="seller-profile-info-card">
                                <span>General Location</span>
                                <p>{registration?.general_location || 'Not available'}</p>
                            </div>
                            <div className="seller-profile-info-card">
                                <span>Pickup Address</span>
                                <p>{registration?.pickup_address_summary || registration?.registered_address || 'Not available'}</p>
                            </div>
                        </div>
                    </article>

                    <article className="seller-profile-panel">
                        <div className="seller-profile-panel-head">
                            <div>
                                <h3>Performance Breakdown</h3>
                                <p>Key marketplace metrics buyers and internal operations care about most.</p>
                            </div>
                        </div>
                        <div className="seller-profile-highlight-grid">
                            <div className="seller-profile-highlight">
                                <span>Total Products</span>
                                <strong>{products.length}</strong>
                                <p>All active, scheduled, and archived listings</p>
                            </div>
                            <div className="seller-profile-highlight">
                                <span>Closed Auctions</span>
                                <strong>{closedProducts.length}</strong>
                                <p>Listings already completed or ended</p>
                            </div>
                            <div className="seller-profile-highlight">
                                <span>Scheduled</span>
                                <strong>{scheduledProducts.length}</strong>
                                <p>Upcoming listings waiting to go live</p>
                            </div>
                        </div>
                    </article>

                    <article className="seller-profile-panel">
                        <div className="seller-profile-panel-head">
                            <div>
                                <h3>Recent Listings</h3>
                                <p>The latest products published from this seller account.</p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="seller-profile-empty">Loading seller details...</div>
                        ) : featuredProducts.length === 0 ? (
                            <div className="seller-profile-empty">No products published yet. Add your first listing from Seller Dashboard.</div>
                        ) : (
                            <div className="seller-profile-product-list">
                                {featuredProducts.map((product) => {
                                    const media = (product.media ?? []).find((item) => item.media_type === 'image') ?? product.media?.[0];
                                    const status = getAuctionDisplayStatus(product);
                                    return (
                                        <div key={product.id} className="seller-profile-product-item">
                                            {media ? (
                                                <img className="seller-profile-product-thumb" src={resolveMediaUrl(media.url)} alt={product.title} />
                                            ) : (
                                                <div className="seller-profile-product-thumb-empty">No image</div>
                                            )}
                                            <div className="seller-profile-product-copy">
                                                <h4>{product.title}</h4>
                                                <p>{product.category || 'General'} • Current price {formatCurrency(Number(product.current_price || product.starting_price || 0))}</p>
                                            </div>
                                            <span className={`seller-profile-product-status seller-profile-product-status-${status}`}>{status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </article>
                </div>

                <aside className="seller-profile-side">
                    <article className="seller-profile-side-card">
                        <h4>Verification & Operations</h4>
                        <div className="seller-profile-side-list">
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>Submitted</span>
                                    <strong>{formatDate(registration?.submitted_at || registration?.created_at)}</strong>
                                </div>
                            </div>
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>Tax Status</span>
                                    <strong>{registration?.vat_status === 'vat' ? 'VAT Registered' : registration?.vat_status === 'non-vat' ? 'Non-VAT' : 'Not set'}</strong>
                                </div>
                            </div>
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>Primary Document</span>
                                    <strong>{registration?.primary_document_type || 'Not submitted'}</strong>
                                </div>
                            </div>
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>Government ID</span>
                                    <strong>{registration?.government_id_type || 'Not submitted'}</strong>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="seller-profile-side-card">
                        <h4>Seller Contacts</h4>
                        <p>Operational contact points used for shipping coordination and buyer confidence.</p>
                        <div className="seller-profile-side-list">
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>Business Email</span>
                                    <strong>{registration?.business_email || registration?.contact_email || authUser.email}</strong>
                                </div>
                            </div>
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>Business Phone</span>
                                    <strong>{registration?.business_phone_number || registration?.contact_phone || authUser.phone || 'Not available'}</strong>
                                </div>
                            </div>
                            <div className="seller-profile-side-list-item">
                                <div>
                                    <span>ZIP Code</span>
                                    <strong>{registration?.zip_code || 'Not available'}</strong>
                                </div>
                            </div>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
};