import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { orderService } from '../../services/api';
import type { SellerOrderRecord } from '../../types';

const formatPeso = (value?: string | number) => {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDateTime = (value?: string | null) => {
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

const prettyStatus = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const SellerOrderShipmentTrackingPage: React.FC = () => {
    const [orders, setOrders] = useState<SellerOrderRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<number | null>(
        null,
    );

    const loadOrders = async () => {
        setLoading(true);

        try {
            const response = await orderService.getSellerOrders();
            setOrders(response.orders ?? []);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to load seller orders.';
            toast.error(message);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadOrders();
    }, []);

    const visibleOrders = useMemo(() => {
        if (statusFilter === 'all') {
            return orders;
        }

        return orders.filter((order) => order.shipping_status === statusFilter);
    }, [orders, statusFilter]);

    const shipmentSummary = useMemo(() => {
        const counts = {
            total: orders.length,
            pending: 0,
            in_transit: 0,
            delivered: 0,
        };

        orders.forEach((order) => {
            if (order.shipping_status === 'pending') {
                counts.pending += 1;
            }
            if (
                order.shipping_status === 'in_transit' ||
                order.shipping_status === 'shipped'
            ) {
                counts.in_transit += 1;
            }
            if (order.shipping_status === 'delivered') {
                counts.delivered += 1;
            }
        });

        return counts;
    }, [orders]);

    const handleShippingUpdate = async (
        order: SellerOrderRecord,
        nextStatus:
            | 'packed'
            | 'shipped'
            | 'in_transit'
            | 'delivered'
            | 'failed'
            | 'cancelled',
    ) => {
        setIsUpdatingOrderId(order.id);

        try {
            const trackingNumber =
                nextStatus === 'shipped' || nextStatus === 'in_transit'
                    ? window.prompt(
                          'Tracking number (optional):',
                          order.shipments?.[0]?.tracking_number ?? '',
                      ) ?? undefined
                    : undefined;

            const carrier =
                nextStatus === 'shipped' || nextStatus === 'in_transit'
                    ? window.prompt(
                          'Courier/carrier (optional):',
                          order.shipments?.[0]?.carrier ?? '',
                      ) ?? undefined
                    : undefined;

            await orderService.updateSellerShippingStatus(order.id, {
                status: nextStatus,
                tracking_number: trackingNumber,
                carrier,
            });

            toast.success('Shipping status updated.');
            await loadOrders();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to update shipping status.';
            toast.error(message);
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    const handleCapturePayment = async (order: SellerOrderRecord) => {
        const method = window.prompt('Payment method (e.g., wallet, gcash):', 'wallet');

        if (!method || method.trim().length === 0) {
            return;
        }

        const amountRaw = window.prompt(
            'Captured amount:',
            String(order.total_amount ?? '0'),
        );

        if (amountRaw === null) {
            return;
        }

        const amount = Number(amountRaw);
        if (!Number.isFinite(amount) || amount < 0) {
            toast.error('Invalid payment amount.');
            return;
        }

        const providerReference =
            window.prompt('Payment reference (optional):', '') ?? undefined;

        setIsUpdatingOrderId(order.id);

        try {
            await orderService.captureSellerPayment(order.id, {
                method: method.trim(),
                status: 'paid',
                amount,
                provider_reference: providerReference,
            });

            toast.success('Payment record captured.');
            await loadOrders();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to capture payment record.';
            toast.error(message);
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    return (
        <>
            <article className="seller-dashboard-card seller-dashboard-card-wide">
                <div className="seller-products-head">
                    <div>
                        <h3 className="seller-dashboard-card-title">Shipment Tracking</h3>
                        <p className="seller-dashboard-card-text">
                            Manage order fulfillment, update tracking, and confirm deliveries.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="seller-orders-refresh-btn"
                        onClick={() => {
                            void loadOrders();
                        }}
                    >
                        Refresh
                    </button>
                </div>

                <div className="seller-orders-summary">
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{shipmentSummary.total}</p>
                        <p className="seller-dashboard-stat-label">Total</p>
                    </div>
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{shipmentSummary.pending}</p>
                        <p className="seller-dashboard-stat-label">Pending</p>
                    </div>
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{shipmentSummary.in_transit}</p>
                        <p className="seller-dashboard-stat-label">In Transit</p>
                    </div>
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{shipmentSummary.delivered}</p>
                        <p className="seller-dashboard-stat-label">Delivered</p>
                    </div>
                </div>

                <div className="seller-orders-tabs" style={{ marginTop: '16px' }}>
                    <button
                        type="button"
                        className={`seller-orders-tab ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`seller-orders-tab ${statusFilter === 'pending' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('pending')}
                    >
                        Pending
                    </button>
                    <button
                        type="button"
                        className={`seller-orders-tab ${statusFilter === 'in_transit' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('in_transit')}
                    >
                        In Transit
                    </button>
                    <button
                        type="button"
                        className={`seller-orders-tab ${statusFilter === 'delivered' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('delivered')}
                    >
                        Delivered
                    </button>
                </div>
            </article>

            <article className="seller-dashboard-card seller-dashboard-card-wide">
                {loading && (
                    <p className="seller-orders-empty-text">Loading shipment data...</p>
                )}

                {!loading && visibleOrders.length === 0 && (
                    <p className="seller-orders-empty-text">No orders found for the selected filter.</p>
                )}

                {!loading && visibleOrders.length > 0 && (
                    <div className="seller-order-history">
                        <table className="seller-order-history-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Buyer</th>
                                    <th>Total</th>
                                    <th>Shipping</th>
                                    <th>Tracking</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleOrders.map((order) => {
                                    const latestShipment = order.shipments?.[0] ?? null;
                                    const media = order.auction?.media?.[0] ?? null;
                                    const mediaUrl = media?.url ?? '';

                                    return (
                                        <tr key={order.id} className="seller-order-history-row">
                                            <td className="seller-order-history-product-cell">
                                                <div className="seller-order-history-thumb-wrap">
                                                    {mediaUrl ? (
                                                        <img
                                                            className="seller-order-history-thumb"
                                                            src={mediaUrl}
                                                            alt={order.auction?.title ?? 'Order'}
                                                        />
                                                    ) : (
                                                        <div className="seller-order-history-thumb seller-order-history-thumb-placeholder">
                                                            📦
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="seller-order-history-id">
                                                        #{(order.order_number || String(order.id)).toUpperCase()}
                                                    </p>
                                                    <p className="seller-order-history-title">
                                                        {order.auction?.title ?? 'Auction item'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="seller-order-history-buyer-cell">
                                                <p className="seller-order-history-buyer-name">
                                                    {order.buyer?.name ?? 'N/A'}
                                                </p>
                                                <p className="seller-order-history-buyer-email">
                                                    {order.buyer?.email ?? ''}
                                                </p>
                                            </td>
                                            <td className="seller-order-history-amount-cell">
                                                {formatPeso(order.total_amount)}
                                            </td>
                                            <td>
                                                <span className={`seller-order-status seller-order-status-${order.shipping_status}`}>
                                                    {prettyStatus(order.shipping_status)}
                                                </span>
                                                <p className="seller-order-history-buyer-email">
                                                    {formatDateTime(order.placed_at)}
                                                </p>
                                            </td>
                                            <td>
                                                <p className="seller-order-history-buyer-name">
                                                    {latestShipment?.tracking_number || 'N/A'}
                                                </p>
                                                <p className="seller-order-history-buyer-email">
                                                    {latestShipment?.carrier || 'No carrier'}
                                                </p>
                                            </td>
                                            <td className="seller-order-history-actions-cell">
                                                <button
                                                    type="button"
                                                    className="seller-order-action-btn"
                                                    onClick={() =>
                                                        handleShippingUpdate(order, 'shipped')
                                                    }
                                                    disabled={isUpdatingOrderId === order.id}
                                                    title="Mark shipped"
                                                >
                                                    Ship
                                                </button>
                                                <button
                                                    type="button"
                                                    className="seller-order-action-btn"
                                                    onClick={() =>
                                                        handleShippingUpdate(order, 'delivered')
                                                    }
                                                    disabled={isUpdatingOrderId === order.id}
                                                    title="Mark delivered"
                                                >
                                                    Delivered
                                                </button>
                                                <button
                                                    type="button"
                                                    className="seller-order-action-btn"
                                                    onClick={() => handleCapturePayment(order)}
                                                    disabled={isUpdatingOrderId === order.id}
                                                    title="Capture payment"
                                                >
                                                    Payment
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </article>
        </>
    );
};
