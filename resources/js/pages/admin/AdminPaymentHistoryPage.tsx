import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    adminApi,
    type AdminOrderPaymentEntry,
} from '../../services/adminApi';

interface AdminPaymentHistoryPageProps {
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

export const AdminPaymentHistoryPage: React.FC<AdminPaymentHistoryPageProps> = ({
    token,
}) => {
    const [payments, setPayments] = useState<AdminOrderPaymentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [search, setSearch] = useState('');

    const load = async () => {
        if (!token) {
            setPayments([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await adminApi.getOrderPayments(token, {
                status: statusFilter,
                method: methodFilter,
                search,
            });
            setPayments(response.payments ?? []);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to load payment records.';
            toast.error(message);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [token, statusFilter, methodFilter]);

    const summary = useMemo(() => {
        let paidCount = 0;
        let failedCount = 0;
        let paidAmount = 0;

        payments.forEach((payment) => {
            if (payment.status === 'paid') {
                paidCount += 1;
                const amount = Number(payment.amount ?? 0);
                if (Number.isFinite(amount)) {
                    paidAmount += amount;
                }
            }
            if (payment.status === 'failed') {
                failedCount += 1;
            }
        });

        return {
            total: payments.length,
            paidCount,
            failedCount,
            paidAmount,
        };
    }, [payments]);

    return (
        <section className="admin-dashboard-content" aria-label="Payment history">
            <article className="admin-panel-card admin-panel-card-full">
                <div className="admin-panel-title-row">
                    <h2>Order Payment History</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            className="admin-search-input"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search ref, order, payer, payee"
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
                    {['all', 'paid', 'pending', 'failed', 'refunded'].map((status) => (
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

                <div className="admin-settings-group-tabs" style={{ marginBottom: '12px' }}>
                    {['all', 'wallet', 'gcash', 'maya', 'card', 'manual'].map((method) => (
                        <button
                            key={method}
                            type="button"
                            className={`admin-settings-group-tab ${methodFilter === method ? 'is-active' : ''}`}
                            onClick={() => setMethodFilter(method)}
                        >
                            {prettify(method)}
                        </button>
                    ))}
                </div>

                <div className="admin-monitor-summary-grid" style={{ marginBottom: '14px' }}>
                    <article className="admin-monitor-summary-card">
                        <p>Total Records</p>
                        <strong>{summary.total}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>Paid</p>
                        <strong>{summary.paidCount}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>Failed</p>
                        <strong>{summary.failedCount}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>Paid Amount</p>
                        <strong>{formatPeso(summary.paidAmount)}</strong>
                    </article>
                </div>

                <div className="admin-users-table-wrap">
                    <table className="admin-users-table admin-neo-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Auction</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th>Payer</th>
                                <th>Payee</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={9} className="admin-users-empty">
                                        Loading payment history...
                                    </td>
                                </tr>
                            )}
                            {!loading && payments.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="admin-users-empty">
                                        No payment records found.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>
                                            {(payment.order?.order_number || String(payment.order_id)).toUpperCase()}
                                        </td>
                                        <td>{payment.order?.auction?.title || 'N/A'}</td>
                                        <td>{prettify(payment.method)}</td>
                                        <td>{payment.provider_reference || payment.provider || 'N/A'}</td>
                                        <td>{payment.payer?.name || payment.order?.buyer?.name || 'N/A'}</td>
                                        <td>{payment.payee?.name || payment.order?.seller?.name || 'N/A'}</td>
                                        <td>{formatPeso(payment.amount)}</td>
                                        <td>
                                            <span className="admin-user-chip pending">
                                                {prettify(payment.status)}
                                            </span>
                                        </td>
                                        <td>{formatDate(payment.paid_at || payment.created_at)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </section>
    );
};
