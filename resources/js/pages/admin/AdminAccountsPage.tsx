import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    adminApi,
    type AdminAccountIdentity,
} from '../../services/adminApi';

interface AdminAccountsPageProps {
    token: string | null;
}

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

export const AdminAccountsPage: React.FC<AdminAccountsPageProps> = ({
    token,
}) => {
    const [accounts, setAccounts] = useState<AdminAccountIdentity[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAccounts = async () => {
        if (!token) {
            setAccounts([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await adminApi.getAdminAccounts(token);
            setAccounts(response.accounts ?? []);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to load admin accounts.';
            toast.error(message);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAccounts();
    }, [token]);

    const summary = useMemo(() => {
        const active24h = accounts.filter((item) => {
            if (!item.lastSeenAt) {
                return false;
            }

            const ts = new Date(item.lastSeenAt).getTime();
            return Number.isFinite(ts) && Date.now() - ts <= 24 * 60 * 60 * 1000;
        }).length;

        return {
            total: accounts.length,
            active24h,
        };
    }, [accounts]);

    return (
        <section className="admin-dashboard-content" aria-label="Admin accounts">
            <article className="admin-panel-card admin-panel-card-full">
                <div className="admin-panel-title-row">
                    <h2>Admin Accounts</h2>
                    <button
                        type="button"
                        className="admin-neo-ghost-btn"
                        onClick={() => {
                            void loadAccounts();
                        }}
                    >
                        Refresh
                    </button>
                </div>

                <p className="admin-user-status-copy" style={{ marginBottom: '12px' }}>
                    Admin identities are managed separately from marketplace users.
                    Use this panel for visibility and session governance.
                </p>

                <div className="admin-monitor-summary-grid" style={{ marginBottom: '14px' }}>
                    <article className="admin-monitor-summary-card">
                        <p>Total Admin Accounts</p>
                        <strong>{summary.total}</strong>
                    </article>
                    <article className="admin-monitor-summary-card">
                        <p>Active in 24 Hours</p>
                        <strong>{summary.active24h}</strong>
                    </article>
                </div>

                <div className="admin-users-table-wrap">
                    <table className="admin-users-table admin-neo-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Identity</th>
                                <th>Last Seen</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="admin-users-empty">
                                        Loading admin accounts...
                                    </td>
                                </tr>
                            )}

                            {!loading && accounts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="admin-users-empty">
                                        No admin identities found.
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                accounts.map((account) => (
                                    <tr key={account.id}>
                                        <td>{account.name}</td>
                                        <td>{account.email}</td>
                                        <td>
                                            <span
                                                className={`admin-user-chip ${account.isCurrent ? 'verified' : 'pending'}`}
                                            >
                                                {account.isCurrent
                                                    ? 'Current session'
                                                    : 'Admin account'}
                                            </span>
                                        </td>
                                        <td>{formatDateTime(account.lastSeenAt)}</td>
                                        <td>{formatDateTime(account.createdAt)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </section>
    );
};
