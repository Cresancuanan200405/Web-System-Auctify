import React from 'react';
import { AccountSection } from '../types';
import { AccountSidebar } from '../components/AccountSidebar';
import { DetailsSection } from './account-sections/DetailsSection';
import { AddressesSection } from './account-sections/AddressesSection';
import { PreferencesSection } from './account-sections/PreferencesSection';
import { WalletSection } from './account-sections/WalletSection';
import { MyCardsSection } from './account-sections/MyCardsSection';
import { ZVIPSection } from './account-sections/ZVIPSection';
import { OrdersSection } from './account-sections/OrdersSection';
import { ReviewsSection } from './account-sections/ReviewsSection';
import { WishlistSection } from './account-sections/WishlistSection';
import { CashbackSection } from './account-sections/CashbackSection';
import { DeleteAccountSection } from '@/pages/account-sections/DeleteAccountSection';

interface AccountPageProps {
    activeSection: AccountSection;
    onSectionChange: (section: AccountSection) => void;
    onAccountDeleted: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
    activeSection,
    onSectionChange,
    onAccountDeleted
}) => {
    const renderSection = () => {
        switch (activeSection) {
            case 'details':
                return <DetailsSection onNavigateSection={onSectionChange} />;
            case 'addresses':
                return <AddressesSection />;
            case 'preferences':
                return <PreferencesSection />;
            case 'wallet':
                return <WalletSection />;
            case 'cards':
                return <MyCardsSection />;
            case 'zvip':
                return <ZVIPSection />;
            case 'orders':
                return <OrdersSection />;
            case 'reviews':
                return <ReviewsSection />;
            case 'wishlist':
                return <WishlistSection />;
            case 'cashback':
                return <CashbackSection />;
            case 'delete-account':
                return <DeleteAccountSection onAccountDeleted={onAccountDeleted} />;
            default:
                return <DetailsSection onNavigateSection={onSectionChange} />;
        }
    };

    return (
        <section className="account-layout">
            <AccountSidebar
                activeSection={activeSection}
                onSectionChange={onSectionChange}
            />
            <div className="account-main">
                {renderSection()}
            </div>
        </section>
    );
};
