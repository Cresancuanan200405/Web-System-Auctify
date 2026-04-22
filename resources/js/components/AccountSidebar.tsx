import React from 'react';
import type { AccountSection } from '../types';

interface AccountSidebarProps {
    activeSection: AccountSection;
    onSectionChange: (section: AccountSection) => void;
    isSellerVerified: boolean;
    isSellerAccessAllowed?: boolean;
    revokedNotice?: string | null;
    onBecomeSellerClick: () => void;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
    activeSection,
    onSectionChange,
    isSellerVerified,
    isSellerAccessAllowed = true,
    revokedNotice = null,
    onBecomeSellerClick,
}) => {
    const menuItems: { section: AccountSection; label: string }[] = [
        { section: 'details', label: 'Account information' },
        { section: 'wallet', label: 'My Wallet' },
        { section: 'orders', label: 'Orders & Tracking' },
        { section: 'reviews', label: 'My Reviews' },
        { section: 'addresses', label: 'Saved Addresses' },
        { section: 'preferences', label: 'Preferences' },
        { section: 'wishlist', label: 'Wishlist' },
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
                    className={`account-sidebar-item account-sidebar-item-secondary become-seller-item ${
                        activeSection === 'seller' ? 'active' : ''
                    } ${!isSellerVerified || !isSellerAccessAllowed ? 'disabled' : ''}`}
                    type="button"
                    onClick={onBecomeSellerClick}
                >
                    <span>Become a Seller</span>
                    {!isSellerAccessAllowed && (
                        <span className="account-sidebar-item-note">
                            {revokedNotice ||
                                'Unavailable: seller access revoked'}
                        </span>
                    )}
                    {isSellerAccessAllowed && !isSellerVerified && (
                        <span className="account-sidebar-item-note">
                            Complete seller registration for admin approval
                        </span>
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
