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

const formatAuditAction = (value: string) =>
    value
        .replace(/^admin-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const AdminAccountsPage: React.FC<AdminAccountsPageProps> = ({
    token,
}) => {
    const [accounts, setAccounts] = useState<AdminAccountIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingAccountId, setProcessingAccountId] = useState<number | null>(
        null,
    );

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

    const runAction = async (
        account: AdminAccountIdentity,
        action: 'force-logout' | 'require-reset' | 'deactivate' | 'reactivate',
    ) => {
        if (!token) {
            return;
        }

        if (
            action === 'deactivate' &&
            account.isCurrent
        ) {
            toast.error('You cannot deactivate your own admin account.');
            return;
        }

        setProcessingAccountId(account.id);

        try {
            if (action === 'force-logout') {
                await adminApi.forceLogoutAdminAccount(token, account.id);
                toast.success('Admin sessions revoked successfully.');
            }

            if (action === 'require-reset') {
                await adminApi.requireAdminPasswordReset(token, account.id);
                toast.success('Password reset requirement was set.');
            }

            if (action === 'deactivate') {
                const reason = window.prompt(
                    'Enter reason for deactivation:',
                    'Temporary access freeze',
                );

                if (!reason || reason.trim().length < 5) {
                    toast.error('Please enter a reason with at least 5 characters.');
                    return;
                }

                await adminApi.deactivateAdminAccount(
                    token,
                    account.id,
                    reason.trim(),
                );
                toast.success('Admin account marked as inactive.');
            }

            if (action === 'reactivate') {
                await adminApi.reactivateAdminAccount(token, account.id);
                toast.success('Admin account reactivated.');
            }

            await loadAccounts();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to perform admin action.';
            toast.error(message);
        } finally {
            setProcessingAccountId(null);
        }
    };

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
                                <th>Security</th>
                                <th>Last Seen</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="admin-users-empty">
                                        Loading admin accounts...
                                    </td>
                                </tr>
                            )}

                            {!loading && accounts.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="admin-users-empty">
                                        No admin identities found.
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                accounts.map((account) => (
                                    <React.Fragment key={account.id}>
                                        <tr>
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
                                            <td>
                                                <span
                                                    className={`admin-user-chip ${account.isInactive ? 'pending' : account.requiresPasswordReset ? 'pending' : 'verified'}`}
                                                >
                                                    {account.isInactive
                                                        ? 'Inactive'
                                                        : account.requiresPasswordReset
                                                            ? 'Reset required'
                                                            : 'Normal'}
                                                </span>
                                            </td>
                                            <td>{formatDateTime(account.lastSeenAt)}</td>
                                            <td>{formatDateTime(account.createdAt)}</td>
                                            <td>
                                                <div className="admin-monitor-action-list">
                                                    <button
                                                        type="button"
                                                        className="admin-monitor-action-btn"
                                                        onClick={() => {
                                                            void runAction(account, 'force-logout');
                                                        }}
                                                        disabled={processingAccountId === account.id}
                                                    >
                                                        Force logout
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-monitor-action-btn"
                                                        onClick={() => {
                                                            void runAction(account, 'require-reset');
                                                        }}
                                                        disabled={processingAccountId === account.id}
                                                    >
                                                        Require reset
                                                    </button>
                                                    {!account.isInactive ? (
                                                        <button
                                                            type="button"
                                                            className="admin-monitor-action-btn danger"
                                                            onClick={() => {
                                                                void runAction(account, 'deactivate');
                                                            }}
                                                            disabled={
                                                                processingAccountId === account.id ||
                                                                account.isCurrent
                                                            }
                                                            title={
                                                                account.isCurrent
                                                                    ? 'You cannot deactivate your own account'
                                                                    : 'Deactivate admin account'
                                                            }
                                                        >
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="admin-monitor-action-btn"
                                                            onClick={() => {
                                                                void runAction(account, 'reactivate');
                                                            }}
                                                            disabled={processingAccountId === account.id}
                                                        >
                                                            Reactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className="admin-account-audit-row">
                                            <td colSpan={7}>
                                                <div className="admin-account-audit-shell">
                                                    <strong>Governance Activity</strong>
                                                    {account.recentActivity &&
                                                    account.recentActivity.length > 0 ? (
                                                        <ul className="admin-account-audit-list">
                                                            {account.recentActivity.map((item, index) => (
                                                                <li key={`${account.id}-${item.action}-${item.createdAt ?? index}`}>
                                                                    <span className="admin-account-audit-action">
                                                                        {formatAuditAction(item.action)}
                                                                    </span>
                                                                    <span>
                                                                        by {item.triggeredByName || 'Unknown admin'}
                                                                        {item.triggeredByEmail ? ` (${item.triggeredByEmail})` : ''}
                                                                    </span>
                                                                    <span>{formatDateTime(item.createdAt)}</span>
                                                                    <small>{item.reason}</small>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="admin-account-audit-empty">
                                                            No governance activity yet for this admin account.
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </section>
    );
};
