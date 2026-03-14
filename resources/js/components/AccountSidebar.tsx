import React from 'react';
import type { AccountSection } from '../types';

interface AccountSidebarProps {
    activeSection: AccountSection;
    onSectionChange: (section: AccountSection) => void;
    isVerified: boolean;
    isVerificationAllowed?: boolean;
    revokedNotice?: string | null;
    onBecomeSellerClick: () => void;
    onVerificationClick: () => void;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
    activeSection,
    onSectionChange,
    isVerified,
    isVerificationAllowed = true,
    revokedNotice = null,
    onBecomeSellerClick,
    onVerificationClick,
}) => {
    const menuItems: { section: AccountSection; label: string }[] = [
        { section: 'details', label: 'Account information' },
        { section: 'wallet', label: 'My Wallet' },
        { section: 'cashback', label: 'My Cashback' },
        { section: 'zvip', label: 'My ZVIP' },
        { section: 'orders', label: 'Orders & Tracking' },
        { section: 'reviews', label: 'My Reviews' },
        { section: 'cards', label: 'My Cards' },
        { section: 'addresses', label: 'Saved Addresses' },
        { section: 'preferences', label: 'Preferences' },
        { section: 'wishlist', label: 'Wishlist' }
    ];

    return (
        <aside className="account-sidebar">
            <h2 className="account-sidebar-title">MY ACCOUNT</h2>
            {menuItems.map((item) => (
                <button
                    key={item.section}
                    className={`account-sidebar-item ${activeSection === item.section ? 'active' : ''}`}
                    onClick={() => onSectionChange(item.section)}
                >
                    {item.label}
                </button>
            ))}

            <div className="account-sidebar-secondary">
                <button
                    className={`account-sidebar-item account-sidebar-item-secondary ${
                        activeSection === 'verification' ? 'active' : ''
                    } ${!isVerificationAllowed ? 'disabled' : ''}`}
                    onClick={onVerificationClick}
                >
                    <span>Account Verification</span>
                    {!isVerificationAllowed && (
                        <span className="account-sidebar-item-note">{revokedNotice || 'Unavailable: seller access revoked'}</span>
                    )}
                </button>
                <button
                    className={`account-sidebar-item account-sidebar-item-secondary become-seller-item ${
                        activeSection === 'seller' ? 'active' : ''
                    } ${(!isVerified || !isVerificationAllowed) ? 'disabled' : ''}`}
                    type="button"
                    onClick={onBecomeSellerClick}
                >
                    <span>Become a Seller</span>
                    {!isVerificationAllowed && (
                        <span className="account-sidebar-item-note">{revokedNotice || 'Unavailable: seller access revoked'}</span>
                    )}
                    {isVerificationAllowed && !isVerified && (
                        <span className="account-sidebar-item-note">Complete account verification first</span>
                    )}
                </button>
            </div>

            <button
                className={`account-sidebar-item ${activeSection === 'delete-account' ? 'active' : ''}`}
                onClick={() => onSectionChange('delete-account')}
            >
                Request Account Deletion
            </button>
        </aside>
    );
};
