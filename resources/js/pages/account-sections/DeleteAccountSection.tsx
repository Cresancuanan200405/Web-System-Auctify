import React, { useState } from 'react';
import { toast } from 'react-toastify';
import * as apiClient from '../../api/client';

interface DeleteAccountSectionProps {
    onAccountDeleted: () => void;
}

export const DeleteAccountSection: React.FC<DeleteAccountSectionProps> = ({ onAccountDeleted }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    return (
        <div className="delete-main">
            <div className="delete-header">
                <div className="delete-title-row">
                    <span className="delete-title-icon" aria-hidden="true">
                        ⚠
                    </span>
                    <h1 className="delete-title">Request Account Deletion</h1>
                </div>
            </div>

            <div className="delete-card">
                <div className="delete-info-header">
                    <span className="delete-info-icon" aria-hidden="true">!</span>
                    <span className="delete-info-title">
                        Important information &amp; disclaimers
                    </span>
                </div>

                <div className="delete-info-text">
                    <ol className="delete-list">
                        <li>
                            Once your account is deleted, your profile, preferences and saved
                            auctions will be permanently removed. Any remaining wallet balance or
                            cashback will be forfeited.
                        </li>
                        <li>
                            Make sure there are no ongoing auctions, unpaid orders or pending
                            withdrawals. If there are any active activities, your deletion request
                            may be delayed or rejected.
                        </li>
                        <li>
                            Auctify may retain limited transactional records as required for
                            financial auditing, fraud prevention and regulatory obligations.
                        </li>
                        <li>
                            After deletion, you will no longer be able to access your Auctify
                            account, view order history or download invoices using this login.
                        </li>
                        <li>
                            Submitting a deletion request will sign you out from all active
                            sessions. You will need to create a new account if you wish to bid on
                            Auctify again in the future.
                        </li>
                    </ol>
                </div>

                <div className="delete-button-row">
                    <button
                        type="button"
                        className="delete-button"
                        onClick={() => setIsDeleteModalOpen(true)}
                    >
                        Continue to account deletion
                    </button>
                </div>
            </div>

            {isDeleteModalOpen && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">Delete Your Account?</h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Once you confirm to delete your account, your account data will be permanently and
                                irreversibly deleted.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                >
                                    Keep my account
                                </button>
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={async () => {
                                        try {
                                            await apiClient.apiDelete<{ message: string }>('/api/auth/delete-account');
                                            setIsDeleteModalOpen(false);
                                            toast.success('Your Auctify account was deleted successfully.', {
                                                autoClose: 3500,
                                            });
                                            onAccountDeleted();
                                        } catch (apiError: any) {
                                            const errorMessage =
                                                (apiError && (apiError.message as string)) ||
                                                'Something went wrong while deleting your account.';

                                            toast.error(errorMessage);
                                        }
                                    }}
                                >
                                    Delete my account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
