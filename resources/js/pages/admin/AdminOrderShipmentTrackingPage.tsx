import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    adminApi,
    type AdminOrderShipmentEntry,
} from '../../services/adminApi';

interface AdminOrderShipmentTrackingPageProps {
    token: string | null;
}

const formatPeso = (value?: string | number) => {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string | null) => {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const prettify = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const AdminOrderShipmentTrackingPage: React.FC<
    AdminOrderShipmentTrackingPageProps
> = ({ token }) => {
    const [orders, setOrders] = useState<AdminOrderShipmentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    const load = async () => {
        if (!token) {
            setOrders([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await adminApi.getOrderShipments(token, {
                status: statusFilter,
                search,
            });
            setOrders(response.orders ?? []);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to load shipment records.';
            toast.error(message);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [token, statusFilter]);

    const summary = useMemo(() => {
        let pending = 0;
        let inTransit = 0;
        let delivered = 0;

        orders.forEach((order) => {
            if (order.shipping_status === 'pending') {
                pending += 1;
            }
            if (
                order.shipping_status === 'shipped' ||
                order.shipping_status === 'in_transit'
            ) {
                inTransit += 1;
            }
            if (order.shipping_status === 'delivered') {
                delivered += 1;
            }
        });

        return {
            total: orders.length,
            pending,
            inTransit,
            delivered,
        };
    }, [orders]);

    return (
        <section className="admin-dashboard-content" aria-label="Order shipment tracker">
            <article className="admin-panel-card admin-panel-card-full">
                <div className="admin-panel-title-row">
                    <h2>Order Shipment Tracking</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            className="admin-search-input"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search order, buyer, seller, auction"
                        />
                        <button
                            type="button"
                            className="admin-neo-ghost-btn"
                            onClick={() => {
                                void load();
                            }}
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div className="admin-settings-group-tabs" style={{ marginBottom: '12px' }}>
                    {['all', 'pending', 'in_transit', 'delivered', 'failed'].map((status) => (
                        <button
                            key={status}
                            type="button"
                            className={`admin-settings-group-tab ${statusFilter === status ? 'is-active' : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {prettify(status)}
                        </button>
                    ))}
                </div>

                <div className="admin-monitor-summary-grid" style={{ marginBottom: '14px' }}>
                    <article className="admin-monitor-summary-card">
                        <p>Total Orders</p>
                        <strong>{summary.total}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>Pending</p>
                        <strong>{summary.pending}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>In Transit</p>
                        <strong>{summary.inTransit}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>Delivered</p>
                        <strong>{summary.delivered}</strong>
                    </article>
                </div>

                <div className="admin-users-table-wrap">
                    <table className="admin-users-table admin-neo-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Auction</th>
                                <th>Buyer</th>
                                <th>Seller</th>
                                <th>Amount</th>
                                <th>Shipping</th>
                                <th>Tracking</th>
                                <th>Placed At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="admin-users-empty">
                                        Loading shipment records...
                                    </td>
                                </tr>
                            )}
                            {!loading && orders.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="admin-users-empty">
                                        No shipment records found.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                orders.map((order) => {
                                    const latestShipment = order.shipments?.[0] ?? null;

                                    return (
                                        <tr key={order.id}>
                                            <td>
                                                {(order.order_number || String(order.id)).toUpperCase()}
                                            </td>
                                            <td>{order.auction?.title || 'N/A'}</td>
                                            <td>{order.buyer?.name || 'N/A'}</td>
                                            <td>{order.seller?.name || 'N/A'}</td>
                                            <td>{formatPeso(order.total_amount)}</td>
                                            <td>
                                                <span className="admin-user-chip pending">
                                                    {prettify(order.shipping_status)}
                                                </span>
                                            </td>
                                            <td>
                                                {latestShipment?.tracking_number || 'N/A'}
                                            </td>
                                            <td>{formatDate(order.placed_at)}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </article>
        </section>
    );
};
