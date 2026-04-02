import type { FormEvent } from 'react';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useWallet } from '../../hooks/useWallet';
import { walletService } from '../../services/api';
import type { WalletTransaction } from '../../types';
import { formatCurrency } from '../../utils/helpers';

const PAYMENT_METHODS = [
    { value: 'visa', label: 'Visa' },
    { value: 'mastercard', label: 'Mastercard' },
    { value: 'jcb', label: 'JCB' },
    { value: 'gcash', label: 'GCash' },
    { value: 'maya', label: 'Maya' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const WalletTopUpSection: React.FC = () => {
    const { walletBalance, addFunds } = useWallet();
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('visa');
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvc, setCvc] = useState('');
    const [amount, setAmount] = useState('');
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);

    const topUpAmount = Number(amount);
    const supportedMethods = useMemo(
        () => PAYMENT_METHODS.map((method) => method.label).join(', '),
        [],
    );

    const resetTopUpForm = () => {
        setPaymentMethod('visa');
        setCardholderName('');
        setCardNumber('');
        setExpiryDate('');
        setCvc('');
        setAmount('');
    };

    const loadTransactions = React.useCallback(async () => {
        try {
            const response = await walletService.getHistory();
            setTransactions(response.transactions ?? []);
        } catch {
            setTransactions([]);
        } finally {
            setTransactionsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadTransactions();

        return undefined;
    }, [loadTransactions]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        const normalizedName = cardholderName.trim();
        const normalizedNumber = cardNumber.replace(/\s+/g, '').trim();
        const normalizedExpiry = expiryDate.trim();
        const normalizedCvc = cvc.trim();
        const amountValue = Number(amount);

        if (!normalizedName) {
            toast.error('Please enter the cardholder name.');
            return;
        }

        if (!/^[0-9]{13,19}$/.test(normalizedNumber)) {
            toast.error('Please enter a valid card number.');
            return;
        }

        if (!/^[0-9]{2}\/([0-9]{2}|[0-9]{4})$/.test(normalizedExpiry)) {
            toast.error('Please enter a valid expiry date in MM/YY format.');
            return;
        }

        if (!/^[0-9]{3,4}$/.test(normalizedCvc)) {
            toast.error('Please enter a valid CVC.');
            return;
        }

        if (!Number.isFinite(amountValue) || amountValue <= 0) {
            toast.error('Please enter a valid top up amount.');
            return;
        }

        const topUpResult = await addFunds(amountValue);

        if (!topUpResult.ok) {
            toast.error(
                topUpResult.message ||
                    'Unable to update your wallet balance right now.',
            );
            return;
        }

        await loadTransactions();

        toast.success(
            `${formatCurrency(amountValue)} added to your wallet using ${paymentMethod.toUpperCase()}.`,
            { autoClose: 2800 },
        );
        setIsTopUpModalOpen(false);
        resetTopUpForm();
    };

    return (
        <div className="wallet-main">
            <div className="wallet-header">
                <div className="wallet-header-icon" aria-hidden="true">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    >
                        <rect x="3" y="7" width="18" height="12" rx="3" />
                        <path d="M7 7V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                    </svg>
                </div>
                <h2 className="wallet-header-title">My Wallet</h2>
            </div>

            <div className="wallet-balance-card">
                <div className="wallet-balance-illustration" aria-hidden="true">
                    <div className="wallet-illustration-main">
                        <div className="wallet-illustration-chip" />
                        <div className="wallet-illustration-lines">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                </div>
                <div className="wallet-balance-content">
                    <div className="wallet-balance-label">Available wallet balance</div>
                    <div className="wallet-balance-amount">
                        {formatCurrency(walletBalance)}
                    </div>
                    <div className="wallet-balance-subtext">
                        Top up here and use this balance for bids and purchases.
                    </div>
                    <div className="wallet-balance-actions">
                        <button
                            type="button"
                            className="wallet-topup-button"
                            onClick={() => setIsTopUpModalOpen(true)}
                        >
                            Top Up Now
                        </button>
                        <button
                            type="button"
                            className="wallet-balance-link"
                            onClick={() => setShowHowItWorks(true)}
                        >
                            How does it work?
                        </button>
                    </div>
                </div>
            </div>

            <div className="wallet-code-card">
                <div className="wallet-code-header">
                    <div className="wallet-code-icon" aria-hidden="true">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                        >
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="M7 9h10" />
                            <path d="M9 13h2" />
                            <path d="M13 13h2" />
                        </svg>
                    </div>
                    <div className="wallet-code-title">Need a reminder?</div>
                </div>
                <p className="wallet-code-text">
                    Supported top up methods: {supportedMethods}.
                </p>
            </div>

            <div className="wallet-history-card">
                <div className="wallet-history-header">
                    <div>
                        <h3 className="wallet-history-title">
                            Transaction History
                        </h3>
                        <p className="wallet-history-subtitle">
                            Recent wallet top ups and deductions.
                        </p>
                    </div>
                    <span className="wallet-history-count">
                        {transactions.length}
                    </span>
                </div>

                {transactionsLoading ? (
                    <p className="wallet-history-empty">Loading history...</p>
                ) : transactions.length === 0 ? (
                    <p className="wallet-history-empty">
                        No wallet transactions yet.
                    </p>
                ) : (
                    <div className="wallet-history-list">
                        {transactions.map((transaction) => (
                            <article
                                key={transaction.id}
                                className={`wallet-history-item ${transaction.type === 'top-up' ? 'is-credit' : 'is-debit'}`}
                            >
                                <div>
                                    <div className="wallet-history-item-title">
                                        {transaction.type === 'top-up'
                                            ? 'Top Up'
                                            : 'Spend'}
                                    </div>
                                    <div className="wallet-history-item-meta">
                                        {transaction.description ||
                                            transaction.reference ||
                                            'Wallet transaction'}
                                    </div>
                                </div>
                                <div className="wallet-history-item-values">
                                    <strong>
                                        {transaction.type === 'top-up' ? '+' : '-'}
                                        {formatCurrency(transaction.amount)}
                                    </strong>
                                    <span>
                                        Balance: {formatCurrency(transaction.balance_after)}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {isTopUpModalOpen && (
                <div
                    className="card-drawer-overlay"
                    onClick={() => setIsTopUpModalOpen(false)}
                >
                    <div
                        className="card-drawer-panel wallet-topup-panel"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="card-drawer-header">
                            <button
                                type="button"
                                className="card-drawer-close"
                                onClick={() => setIsTopUpModalOpen(false)}
                                aria-label="Close top up panel"
                            >
                                ×
                            </button>
                            <h2 className="card-drawer-title">Top Up Wallet</h2>
                        </div>

                        <form className="card-drawer-form" onSubmit={handleSubmit}>
                            <div className="card-drawer-field">
                                <label htmlFor="paymentMethod">Payment Method *</label>
                                <select
                                    id="paymentMethod"
                                    value={paymentMethod}
                                    onChange={(event) =>
                                        setPaymentMethod(event.target.value as PaymentMethod)
                                    }
                                    required
                                >
                                    {PAYMENT_METHODS.map((method) => (
                                        <option key={method.value} value={method.value}>
                                            {method.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="card-drawer-field">
                                <label htmlFor="cardholderName">Cardholder Name *</label>
                                <input
                                    id="cardholderName"
                                    type="text"
                                    placeholder="Name on card"
                                    value={cardholderName}
                                    onChange={(event) =>
                                        setCardholderName(event.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="card-drawer-field">
                                <label htmlFor="cardNumber">Card Number *</label>
                                <input
                                    id="cardNumber"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0000 0000 0000 0000"
                                    value={cardNumber}
                                    onChange={(event) =>
                                        setCardNumber(event.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="card-drawer-row">
                                <div className="card-drawer-field">
                                    <label htmlFor="expiryDate">Expiry Date *</label>
                                    <input
                                        id="expiryDate"
                                        type="text"
                                        placeholder="MM/YY"
                                        value={expiryDate}
                                        onChange={(event) =>
                                            setExpiryDate(event.target.value)
                                        }
                                        required
                                    />
                                </div>
                                <div className="card-drawer-field">
                                    <label htmlFor="cvc">CVC *</label>
                                    <input
                                        id="cvc"
                                        type="password"
                                        inputMode="numeric"
                                        placeholder="123"
                                        value={cvc}
                                        onChange={(event) => setCvc(event.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="card-drawer-field">
                                <label htmlFor="amount">Top Up Amount *</label>
                                <input
                                    id="amount"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Enter amount"
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="wallet-topup-summary">
                                <span>Current balance</span>
                                <strong>{formatCurrency(walletBalance)}</strong>
                            </div>

                            <div className="card-drawer-actions">
                                <button
                                    type="button"
                                    className="card-drawer-cancel"
                                    onClick={() => setIsTopUpModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="card-drawer-submit">
                                    Top Up {topUpAmount > 0 ? formatCurrency(topUpAmount) : ''}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showHowItWorks && (
                <div
                    className="delete-modal-overlay"
                    onClick={() => setShowHowItWorks(false)}
                >
                    <div
                        className="delete-modal delete-modal-large"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">
                                How does My Wallet work?
                            </h2>
                            <button
                                type="button"
                                className="delete-modal-close"
                                onClick={() => setShowHowItWorks(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="wallet-info-content">
                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">
                                        💳 Wallet Balance
                                    </h3>
                                    <p className="wallet-info-text">
                                        Your wallet balance is the money you can
                                        use immediately for bidding and
                                        checkout. Top up any time to add more
                                        funds.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">
                                        🧾 Top Up Method
                                    </h3>
                                    <p className="wallet-info-text">
                                        Choose your preferred card, enter the
                                        required details, and submit the amount
                                        you want to add.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">
                                        🛍️ Use for Payments
                                    </h3>
                                    <p className="wallet-info-text">
                                        Wallet funds are the primary payment
                                        method across the system, including
                                        auction bids and checkout payments.
                                    </p>
                                </div>

                                <div className="wallet-info-section">
                                    <h3 className="wallet-info-title">
                                        ℹ️ Important Notes
                                    </h3>
                                    <ul className="wallet-info-list">
                                        <li>
                                            Your wallet balance updates
                                            instantly after a successful top up
                                        </li>
                                        <li>
                                            If your wallet is low, top up first
                                            before bidding or checking out
                                        </li>
                                        <li>
                                            All payments now use wallet balance
                                            instead of saved cards
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="confirm-modal-confirm"
                                    onClick={() => setShowHowItWorks(false)}
                                >
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
