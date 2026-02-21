import React, { useState } from 'react';
import { AccountVerificationSection } from '@/pages/account-sections/AccountVerificationSection';
import { DeleteAccountSection } from '@/pages/account-sections/DeleteAccountSection';
import { AccountSidebar } from '../components/AccountSidebar';
import { useAuth } from '../contexts/AuthContext';
import type { AccountSection } from '../types';
import { AddressesSection } from './account-sections/AddressesSection';
import { BecomeSellerSection } from './account-sections/BecomeSellerSection';
import { CashbackSection } from './account-sections/CashbackSection';
import { DetailsSection } from './account-sections/DetailsSection';
import { MyCardsSection } from './account-sections/MyCardsSection';
import { OrdersSection } from './account-sections/OrdersSection';
import { PreferencesSection } from './account-sections/PreferencesSection';
import { ReviewsSection } from './account-sections/ReviewsSection';
import { WalletSection } from './account-sections/WalletSection';
import { WishlistSection } from './account-sections/WishlistSection';
import { ZVIPSection } from './account-sections/ZVIPSection';

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
    const { authUser } = useAuth();
    const isVerified = Boolean(authUser?.is_verified);
    const [showSellerGateModal, setShowSellerGateModal] = useState(false);

    const handleBecomeSellerClick = () => {
        if (isVerified) {
            onSectionChange('seller');
        } else {
            setShowSellerGateModal(true);
        }
    };

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
            case 'seller':
                return <BecomeSellerSection />;
            case 'verification':
                return <AccountVerificationSection />;
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
                isVerified={isVerified}
                onBecomeSellerClick={handleBecomeSellerClick}
            />
            <div className="account-main">
                {renderSection()}
            </div>
            {showSellerGateModal && (
                <div
                    className="delete-modal-overlay"
                    onClick={() => setShowSellerGateModal(false)}
                >
                    <div
                        className="delete-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">Verify your account to become a seller</h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                To become a seller on AUCTIFY and start listing your own auctions,
                                you need to complete account verification first.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() => setShowSellerGateModal(false)}
                                >
                                    Not now
                                </button>
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() => {
                                        setShowSellerGateModal(false);
                                        onSectionChange('verification');
                                    }}
                                >
                                    Go to Account Verification
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
