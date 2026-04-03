import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { orderService } from '../../services/api';
import type { OrderPaymentRecord } from '../../types';

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

export const SellerPaymentHistoryPage: React.FC = () => {
    const [payments, setPayments] = useState<OrderPaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPayments = async () => {
        setLoading(true);

        try {
            const response = await orderService.getSellerPaymentHistory();
            setPayments(response.payments ?? []);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to load payment history.';
            toast.error(message);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPayments();
    }, []);

    const summary = useMemo(() => {
        let paid = 0;
        let failed = 0;
        let totalAmount = 0;

        payments.forEach((payment) => {
            const amount = Number(payment.amount ?? 0);
            if (payment.status === 'paid') {
                paid += 1;
                if (Number.isFinite(amount)) {
                    totalAmount += amount;
                }
            }
            if (payment.status === 'failed') {
                failed += 1;
            }
        });

        return {
            total: payments.length,
            paid,
            failed,
            totalAmount,
        };
    }, [payments]);

    return (
        <>
            <article className="seller-dashboard-card seller-dashboard-card-wide">
                <div className="seller-products-head">
                    <div>
                        <h3 className="seller-dashboard-card-title">Payment History</h3>
                        <p className="seller-dashboard-card-text">
                            Review captured payments linked to your seller orders.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="seller-orders-refresh-btn"
                        onClick={() => {
                            void loadPayments();
                        }}
                    >
                        Refresh
                    </button>
                </div>

                <div className="seller-orders-summary">
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{summary.total}</p>
                        <p className="seller-dashboard-stat-label">Records</p>
                    </div>
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{summary.paid}</p>
                        <p className="seller-dashboard-stat-label">Paid</p>
                    </div>
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">{summary.failed}</p>
                        <p className="seller-dashboard-stat-label">Failed</p>
                    </div>
                    <div className="seller-order-summary-card">
                        <p className="seller-dashboard-stat-value">
                            {formatPeso(summary.totalAmount)}
                        </p>
                        <p className="seller-dashboard-stat-label">Total Paid</p>
                    </div>
                </div>
            </article>

            <article className="seller-dashboard-card seller-dashboard-card-wide">
                {loading && (
                    <p className="seller-orders-empty-text">Loading payment history...</p>
                )}

                {!loading && payments.length === 0 && (
                    <p className="seller-orders-empty-text">No payment records yet.</p>
                )}

                {!loading && payments.length > 0 && (
                    <div className="seller-order-history">
                        <table className="seller-order-history-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Buyer</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="seller-order-history-row">
                                        <td>
                                            <p className="seller-order-history-id">
                                                #{(payment.order?.order_number || String(payment.order_id)).toUpperCase()}
                                            </p>
                                            <p className="seller-order-history-buyer-email">
                                                {payment.order?.auction?.title || 'Auction item'}
                                            </p>
                                        </td>
                                        <td>
                                            <p className="seller-order-history-buyer-name">
                                                {payment.order?.buyer?.name || payment.payer?.name || 'N/A'}
                                            </p>
                                            <p className="seller-order-history-buyer-email">
                                                {payment.order?.buyer?.email || payment.payer?.email || ''}
                                            </p>
                                        </td>
                                        <td>
                                            <p className="seller-order-history-buyer-name">
                                                {prettify(payment.method)}
                                            </p>
                                            <p className="seller-order-history-buyer-email">
                                                {payment.provider_reference || payment.provider || 'No reference'}
                                            </p>
                                        </td>
                                        <td className="seller-order-history-amount-cell">
                                            {formatPeso(payment.amount)}
                                        </td>
                                        <td>
                                            <span className={`seller-order-status seller-order-status-${payment.status}`}>
                                                {prettify(payment.status)}
                                            </span>
                                        </td>
                                        <td>{formatDate(payment.paid_at || payment.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </article>
        </>
    );
};
