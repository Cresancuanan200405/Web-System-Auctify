import React from 'react';
import type { AccountSection } from '../types';

interface AccountSidebarProps {
    activeSection: AccountSection;
    onSectionChange: (section: AccountSection) => void;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
    activeSection,
    onSectionChange
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
        { section: 'wishlist', label: 'Wishlist' },
        { section: 'delete-account', label: 'Request Account Deletion' }
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
        </aside>
    );
};
