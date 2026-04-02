import React, { useState } from 'react';
import { AccountVerificationSection } from '@/pages/account-sections/AccountVerificationSection';
import { DeleteAccountSection } from '@/pages/account-sections/DeleteAccountSection';
import { AccountSidebar } from '../components/AccountSidebar';
import { useAuth } from '../contexts/AuthContext';
import { sellerService } from '../services/api';
import type { AccountSection } from '../types';
import { AddressesSection } from './account-sections/AddressesSection';
import { BecomeSellerSection } from './account-sections/BecomeSellerSection';
import { CashbackSection } from './account-sections/CashbackSection';
import { DetailsSection } from './account-sections/DetailsSection';
import { OrdersSection } from './account-sections/OrdersSection';
import { PreferencesSection } from './account-sections/PreferencesSection';
import { ReviewsSection } from './account-sections/ReviewsSection';
import { WalletTopUpSection } from './account-sections/WalletTopUpSection';
import { WishlistSection } from './account-sections/WishlistSection';
import { ZVIPSection } from './account-sections/ZVIPSection';

interface AccountPageProps {
    activeSection: AccountSection;
    onSectionChange: (section: AccountSection) => void;
    onAccountDeleted: () => void;
    onNavigateToAuction: (
        auctionId: number,
        source?: 'home' | 'seller-store' | 'account-orders' | 'account-reviews',
    ) => void;
    onNavigateSellerStore: (
        sellerId: number,
        sellerName?: string,
        source?: 'home' | 'seller-dashboard' | 'account-orders' | null,
    ) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
    activeSection,
    onSectionChange,
    onAccountDeleted,
    onNavigateToAuction,
    onNavigateSellerStore,
}) => {
    const { authUser } = useAuth();
    const isSellerVerified = Boolean(authUser?.is_verified);
    const [showSellerGateModal, setShowSellerGateModal] = useState(false);
    const [showRestrictionModal, setShowRestrictionModal] = useState(false);
    const [restrictionTitle, setRestrictionTitle] = useState('');
    const [restrictionMessage, setRestrictionMessage] = useState('');
    const [isSellerRevoked, setIsSellerRevoked] = useState(false);
    const [sellerRevokedReason, setSellerRevokedReason] = useState<
        string | null
    >(null);

    React.useEffect(() => {
        let isActive = true;

        const loadSellerState = async () => {
            try {
                const response = await sellerService.getRegistration();
                if (!isActive) {
                    return;
                }

                const status = (
                    response.registration?.status ?? ''
                ).toLowerCase();
                const revoked = status === 'revoked';
                setIsSellerRevoked(revoked);
                setSellerRevokedReason(
                    response.registration?.revoked_reason ?? null,
                );
            } catch {
                if (isActive) {
                    setIsSellerRevoked(false);
                    setSellerRevokedReason(null);
                }
            }
        };

        void loadSellerState();

        return () => {
            isActive = false;
        };
    }, []);

    React.useEffect(() => {
        if (!isSellerRevoked) {
            return;
        }

        if (activeSection === 'verification' || activeSection === 'seller') {
            onSectionChange('details');
        }
    }, [activeSection, isSellerRevoked, onSectionChange]);

    const showRevokedRestrictionDialog = () => {
        const reason = sellerRevokedReason?.trim();
        const suffix = reason ? ` Reason: ${reason}` : '';
        const title = 'Seller Access Revoked';
        const message = `Your seller account has been revoked by admin, so Become a Seller is unavailable.${suffix}`;

        setRestrictionTitle(title);
        setRestrictionMessage(message);
        setShowRestrictionModal(true);
    };

    const handleBecomeSellerClick = () => {
        if (isSellerRevoked) {
            showRevokedRestrictionDialog();
            return;
        }

        if (isSellerVerified) {
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
                return <WalletTopUpSection />;
            case 'zvip':
                return <ZVIPSection />;
            case 'orders':
                return (
                    <OrdersSection
                        onNavigateToAuction={onNavigateToAuction}
                        onNavigateSellerStore={onNavigateSellerStore}
                    />
                );
            case 'reviews':
                return (
                    <ReviewsSection onNavigateToAuction={onNavigateToAuction} />
                );
            case 'wishlist':
                return (
                    <WishlistSection
                        onNavigateToAuction={onNavigateToAuction}
                    />
                );
            case 'cashback':
                return <CashbackSection />;
            case 'seller':
                return <BecomeSellerSection />;
            case 'verification':
                return <AccountVerificationSection />;
            case 'delete-account':
                return (
                    <DeleteAccountSection onAccountDeleted={onAccountDeleted} />
                );
            default:
                return <DetailsSection onNavigateSection={onSectionChange} />;
        }
    };

    return (
        <section className="account-layout">
            <AccountSidebar
                activeSection={activeSection}
                onSectionChange={onSectionChange}
                isSellerVerified={isSellerVerified}
                isSellerAccessAllowed={!isSellerRevoked}
                revokedNotice={
                    isSellerRevoked
                        ? sellerRevokedReason?.trim() ||
                          'Seller access revoked by admin'
                        : null
                }
                onBecomeSellerClick={handleBecomeSellerClick}
            />
            <div className="account-main">{renderSection()}</div>
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
                            <h2 className="delete-modal-title">
                                Complete seller verification first
                            </h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Seller verification is only needed when you
                                want to become a seller. Finish this step to
                                unlock seller registration and listing tools.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() =>
                                        setShowSellerGateModal(false)
                                    }
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
                                    Start Seller Verification
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRestrictionModal && (
                <div
                    className="delete-modal-overlay"
                    onClick={() => setShowRestrictionModal(false)}
                >
                    <div
                        className="delete-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">
                                {restrictionTitle}
                            </h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                {restrictionMessage}
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() =>
                                        setShowRestrictionModal(false)
                                    }
                                >
                                    Okay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
